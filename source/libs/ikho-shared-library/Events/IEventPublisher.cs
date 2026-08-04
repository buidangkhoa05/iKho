namespace Ikho.SharedLibrary.Events;

/// <summary>
/// Publishes integration events to the platform's shared message broker (Kafka). Consumers
/// should depend on this abstraction rather than the concrete Kafka producer so publishing
/// can be tested or swapped without touching business logic.
/// </summary>
public interface IEventPublisher
{
    /// <summary>
    /// Publishes an event envelope for <paramref name="eventType"/> carrying
    /// <paramref name="payloadJson"/> (already-serialized JSON), tagged with
    /// <paramref name="correlationId"/> for cross-service tracing.
    /// </summary>
    Task PublishAsync(string eventType, string payloadJson, string? correlationId, CancellationToken cancellationToken = default);
}
