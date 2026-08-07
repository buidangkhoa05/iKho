namespace Ikho.SharedLibrary.Events;

/// <summary>
/// Handles a single deserialized integration event consumed from Kafka. Implementations are
/// registered via <c>AddKafkaConsumer</c> (one or more per <typeparamref name="TEvent"/>, each
/// under its own consumer name/group) and resolved from a fresh DI scope for every inbound
/// message, so they may safely depend on scoped services (e.g. a <c>DbContext</c>).
/// </summary>
public interface IIntegrationEventHandler<TEvent>
{
    /// <summary>
    /// Applies the effects of <paramref name="event"/>. Throwing causes
    /// <c>KafkaConsumerBackgroundService{TDbContext,TEvent,THandler}</c> to log the failure and
    /// leave the message unmarked/uncommitted so it is redelivered rather than lost (unless the
    /// failure is a payload-parsing error, which is treated as unrecoverable and skipped instead
    /// of retried forever).
    /// </summary>
    Task HandleAsync(TEvent @event, string? correlationId, CancellationToken cancellationToken);
}
