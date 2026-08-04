namespace Ikho.SharedLibrary.Idempotency;

/// <summary>
/// Tracks which inbound messages a consumer has already handled, so redelivered messages
/// (at-least-once delivery from Kafka) are safely ignored instead of reapplied.
/// </summary>
public interface IIdempotencyStore
{
    /// <summary>
    /// Returns <see langword="true"/> if <paramref name="messageId"/> has already been
    /// recorded as processed by <paramref name="consumerName"/>.
    /// </summary>
    Task<bool> HasBeenProcessedAsync(string consumerName, string messageId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Records <paramref name="messageId"/> as processed by <paramref name="consumerName"/>.
    /// Relies on a unique database index to reject duplicate inserts under concurrent delivery.
    /// </summary>
    Task MarkProcessedAsync(string consumerName, string messageId, CancellationToken cancellationToken = default);
}
