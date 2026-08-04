namespace Ikho.SharedLibrary.Idempotency;

/// <summary>
/// A record of a successfully handled inbound message, keyed by the consuming handler name
/// and the message id, so a message redelivered by the broker (at-least-once delivery) is
/// not processed twice. A unique index on (<see cref="ConsumerName"/>, <see cref="MessageId"/>)
/// is the source of truth for deduplication under concurrent delivery.
/// </summary>
public sealed class ProcessedMessage
{
    /// <summary>
    /// Surrogate primary key.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Name of the consumer/handler that processed the message (e.g. <c>ReserveStockOnOrderPlaced</c>).
    /// </summary>
    public string ConsumerName { get; set; } = string.Empty;

    /// <summary>
    /// The unique id of the inbound message, as assigned by the publisher.
    /// </summary>
    public string MessageId { get; set; } = string.Empty;

    /// <summary>
    /// When this message was recorded as processed.
    /// </summary>
    public DateTimeOffset ProcessedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
