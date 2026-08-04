using System.Text.Json;
using Confluent.Kafka;
using Ikho.SharedLibrary.Options;
using Microsoft.Extensions.Options;

namespace Ikho.SharedLibrary.Events;

/// <summary>
/// <see cref="IEventPublisher"/> implementation backed by a Confluent Kafka producer.
/// Wraps every payload in a small envelope (<see cref="EventEnvelope"/>) so consumers can
/// rely on a consistent shape regardless of the originating service.
/// </summary>
public sealed class KafkaEventPublisher : IEventPublisher, IDisposable
{
    private readonly MessageBrokerOptions _options;
    private readonly IProducer<string, string> _producer;

    /// <summary>
    /// Creates the publisher, configuring the underlying Kafka producer from
    /// <see cref="MessageBrokerOptions"/>.
    /// </summary>
    public KafkaEventPublisher(IOptions<MessageBrokerOptions> options)
    {
        _options = options.Value;

        var config = new ProducerConfig
        {
            BootstrapServers = _options.BootstrapServers,
            ClientId = _options.ClientId,
        };

        _producer = new ProducerBuilder<string, string>(config).Build();
    }

    /// <inheritdoc />
    public async Task PublishAsync(string eventType, string payloadJson, string? correlationId, CancellationToken cancellationToken = default)
    {
        var envelope = new EventEnvelope(eventType, DateTimeOffset.UtcNow, correlationId, payloadJson);
        var topic = $"{_options.TopicPrefix}.{eventType}";

        var message = new Message<string, string>
        {
            Key = eventType,
            Value = JsonSerializer.Serialize(envelope),
        };

        await _producer.ProduceAsync(topic, message, cancellationToken);
    }

    /// <inheritdoc />
    public void Dispose()
    {
        _producer.Flush(TimeSpan.FromSeconds(10));
        _producer.Dispose();
    }

    /// <summary>
    /// Standard envelope wrapping every published event so consumers can rely on a
    /// consistent shape (event type, timestamp, correlation id, and raw JSON payload).
    /// </summary>
    private sealed record EventEnvelope(string EventType, DateTimeOffset OccurredAtUtc, string? CorrelationId, string Payload);
}
