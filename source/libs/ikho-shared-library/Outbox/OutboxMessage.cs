namespace Ikho.SharedLibrary.Outbox;

/// <summary>
/// A pending or processed integration event captured in the same database transaction as
/// the business write that produced it (the transactional outbox pattern). A background
/// process (<see cref="OutboxPublisherBackgroundService{TDbContext}"/>) later publishes
/// unprocessed rows to the message broker, guaranteeing at-least-once delivery without
/// distributed transactions across the database and the broker.
/// </summary>
public sealed class OutboxMessage
{
    /// <summary>
    /// Unique identifier of the outbox row.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The event type name (e.g. <c>WarehouseCreated</c>), used to derive the Kafka topic.
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// The already-serialized JSON payload of the event.
    /// </summary>
    public string Payload { get; set; } = string.Empty;

    /// <summary>
    /// Correlation id captured from the originating request, propagated to the published event.
    /// </summary>
    public string? CorrelationId { get; set; }

    /// <summary>
    /// When the business transaction that produced this event committed.
    /// </summary>
    public DateTimeOffset OccurredAtUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// When the background publisher successfully published this row, or <see langword="null"/>
    /// if still pending.
    /// </summary>
    public DateTimeOffset? ProcessedAtUtc { get; set; }

    /// <summary>
    /// The most recent publish error message, if any, for diagnostics.
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Number of publish attempts made so far.
    /// </summary>
    public int RetryCount { get; set; }
}
