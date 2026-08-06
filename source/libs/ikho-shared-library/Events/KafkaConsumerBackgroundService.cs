using System.Text.Json;
using Confluent.Kafka;
using Ikho.SharedLibrary.Idempotency;
using Ikho.SharedLibrary.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Ikho.SharedLibrary.Events;

/// <summary>
/// Subscribes to a single Kafka topic and dispatches each message to a scoped
/// <see cref="IIntegrationEventHandler{TEvent}"/>, using <see cref="IIdempotencyStore"/> for
/// consumer-side deduplication and manual offset commits so a message is only considered
/// "done" once it has been both handled and recorded as processed. Mirrors
/// <c>OutboxPublisherBackgroundService{TDbContext}</c>'s shape: a singleton-lifetime
/// <see cref="BackgroundService"/> that resolves scoped dependencies via
/// <see cref="IServiceScopeFactory"/> per unit of work (here, per message) rather than per poll.
/// Requires <typeparamref name="TDbContext"/> to implement <see cref="IHasProcessedMessages"/> so
/// callers can only wire this up against a service whose <c>DbContext</c> actually backs
/// <see cref="IIdempotencyStore"/> (the store itself is resolved from DI, not constructed here).
/// </summary>
public sealed class KafkaConsumerBackgroundService<TDbContext, TEvent> : BackgroundService
    where TDbContext : DbContext, IHasProcessedMessages
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly MessageBrokerOptions _options;
    private readonly ILogger<KafkaConsumerBackgroundService<TDbContext, TEvent>> _logger;
    private readonly string _topic;
    private readonly string _eventType;
    private readonly string _consumerName;

    /// <summary>
    /// Creates the consumer for a single <paramref name="topic"/>.
    /// </summary>
    /// <param name="topic">
    /// The full Kafka topic name to subscribe to (e.g. <c>warehouse.inventory.InventoryReceived</c>).
    /// Passed explicitly rather than derived from this service's own
    /// <see cref="MessageBrokerOptions.TopicPrefix"/>, because a consumer commonly needs to read
    /// topics published under a different service's prefix (e.g. Reporting subscribing to
    /// Inventory/Inbound/Outbound topics) - this service's own <c>TopicPrefix</c> only matters to
    /// the (unrelated) publish side.
    /// </param>
    /// <param name="eventType">
    /// The event type name used for logging/diagnostics (matches the envelope's <c>EventType</c>
    /// field and the <c>nameof(...)</c> value passed on the publishing side).
    /// </param>
    /// <param name="consumerName">Stable name identifying this consumer for idempotency bookkeeping.</param>
    public KafkaConsumerBackgroundService(
        IServiceScopeFactory scopeFactory,
        IOptions<MessageBrokerOptions> options,
        ILogger<KafkaConsumerBackgroundService<TDbContext, TEvent>> logger,
        string topic,
        string eventType,
        string consumerName)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
        _topic = topic;
        _eventType = eventType;
        _consumerName = consumerName;
    }

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var groupId = string.IsNullOrWhiteSpace(_options.GroupId) ? _options.ClientId : _options.GroupId;

        var config = new ConsumerConfig
        {
            BootstrapServers = _options.BootstrapServers,
            GroupId = groupId,
            ClientId = _options.ClientId,
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false,
        };

        using var consumer = new ConsumerBuilder<string, string>(config).Build();
        consumer.Subscribe(_topic);

        _logger.LogInformation(
            "Kafka consumer {ConsumerName} subscribed to topic {Topic} (event type {EventType}, group {GroupId}).",
            _consumerName, _topic, _eventType, groupId);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                ConsumeResult<string, string>? result;
                try
                {
                    result = consumer.Consume(stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    // Expected during shutdown when stoppingToken is cancelled.
                    break;
                }
                catch (ConsumeException ex)
                {
                    _logger.LogError(ex,
                        "Kafka consumer {ConsumerName} failed to consume from topic {Topic}.",
                        _consumerName, _topic);
                    continue;
                }

                if (result?.Message is null)
                {
                    continue;
                }

                await ProcessMessageAsync(consumer, result, stoppingToken);
            }
        }
        finally
        {
            consumer.Close();
        }
    }

    /// <summary>
    /// Handles a single consumed message: skips (but still commits) already-processed messages,
    /// otherwise deserializes the envelope and payload, invokes the scoped handler, records the
    /// message as processed, and commits its offset. On any failure the message is logged and
    /// left uncommitted/unmarked so the broker redelivers it - the loop itself never crashes.
    /// </summary>
    private async Task ProcessMessageAsync(
        IConsumer<string, string> consumer, ConsumeResult<string, string> result, CancellationToken cancellationToken)
    {
        var messageId = $"{result.Topic}-{result.Partition.Value}-{result.Offset.Value}";

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var idempotencyStore = scope.ServiceProvider.GetRequiredService<IIdempotencyStore>();

            if (await idempotencyStore.HasBeenProcessedAsync(_consumerName, messageId, cancellationToken))
            {
                consumer.Commit(result);
                return;
            }

            var envelope = JsonSerializer.Deserialize<IntegrationEventEnvelope>(result.Message.Value);
            if (envelope is null)
            {
                _logger.LogError(
                    "Kafka consumer {ConsumerName} could not deserialize the envelope for message {MessageId} on topic {Topic}; leaving it uncommitted for redelivery.",
                    _consumerName, messageId, result.Topic);
                return;
            }

            var @event = JsonSerializer.Deserialize<TEvent>(envelope.Payload);
            if (@event is null)
            {
                _logger.LogError(
                    "Kafka consumer {ConsumerName} could not deserialize the payload for message {MessageId} (event type {EventType}) on topic {Topic}; leaving it uncommitted for redelivery.",
                    _consumerName, messageId, _eventType, result.Topic);
                return;
            }

            var handler = scope.ServiceProvider.GetRequiredService<IIntegrationEventHandler<TEvent>>();
            await handler.HandleAsync(@event, envelope.CorrelationId, cancellationToken);

            await idempotencyStore.MarkProcessedAsync(_consumerName, messageId, cancellationToken);
            consumer.Commit(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Kafka consumer {ConsumerName} failed to process message {MessageId} (event type {EventType}) on topic {Topic} at offset {Offset}; leaving it uncommitted for redelivery.",
                _consumerName, messageId, _eventType, result.Topic, result.Offset);
        }
    }
}
