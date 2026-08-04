using Microsoft.EntityFrameworkCore;

namespace Ikho.SharedLibrary.Idempotency;

/// <summary>
/// Implemented by a service's <c>DbContext</c> to expose the processed-messages table so
/// <see cref="EfIdempotencyStore{TDbContext}"/> can query it without depending on the
/// concrete <c>DbContext</c> type of every consuming service.
/// </summary>
public interface IHasProcessedMessages
{
    /// <summary>
    /// The processed-messages table, mapped via <see cref="ProcessedMessageEntityTypeConfiguration"/>.
    /// </summary>
    DbSet<ProcessedMessage> ProcessedMessages { get; }
}
