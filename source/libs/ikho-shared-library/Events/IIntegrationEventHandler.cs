namespace Ikho.SharedLibrary.Events;

/// <summary>
/// Handles a single deserialized integration event consumed from Kafka. Implementations are
/// registered per <typeparamref name="TEvent"/> via <c>AddKafkaConsumer</c> and resolved from a
/// fresh DI scope for every inbound message, so they may safely depend on scoped services
/// (e.g. a <c>DbContext</c>).
/// </summary>
public interface IIntegrationEventHandler<TEvent>
{
    /// <summary>
    /// Applies the effects of <paramref name="event"/>. Throwing causes
    /// <c>KafkaConsumerBackgroundService{TDbContext,TEvent}</c> to log the failure and leave the
    /// message unmarked/uncommitted so it is redelivered rather than lost.
    /// </summary>
    Task HandleAsync(TEvent @event, string? correlationId, CancellationToken cancellationToken);
}
