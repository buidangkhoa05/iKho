namespace Ikho.SharedLibrary.Outbox;

/// <summary>
/// Default <see cref="IOutboxWriter"/> implementation. Stateless — it only constructs the
/// entity; persistence happens when the caller's <c>DbContext</c> saves changes.
/// </summary>
public sealed class OutboxWriter : IOutboxWriter
{
    /// <inheritdoc />
    public OutboxMessage Enqueue(string eventType, string payloadJson, string? correlationId)
    {
        return new OutboxMessage
        {
            Type = eventType,
            Payload = payloadJson,
            CorrelationId = correlationId,
            OccurredAtUtc = DateTimeOffset.UtcNow,
        };
    }
}
