namespace Ikho.SharedLibrary.Outbox;

/// <summary>
/// Enqueues integration events into the transactional outbox. Callers must add the returned
/// entity to the same <c>DbContext</c> instance and <c>SaveChanges</c> call as the business
/// write so the event and the write commit atomically.
/// </summary>
public interface IOutboxWriter
{
    /// <summary>
    /// Creates a new, unsaved <see cref="OutboxMessage"/> for <paramref name="eventType"/>.
    /// The caller is responsible for adding it to the current <c>DbContext</c> change tracker.
    /// </summary>
    OutboxMessage Enqueue(string eventType, string payloadJson, string? correlationId);
}
