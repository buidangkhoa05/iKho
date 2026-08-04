using Microsoft.EntityFrameworkCore;

namespace Ikho.SharedLibrary.Outbox;

/// <summary>
/// Implemented by a service's <c>DbContext</c> to expose the outbox table so
/// <see cref="OutboxPublisherBackgroundService{TDbContext}"/> can poll it without depending on
/// the concrete <c>DbContext</c> type of every consuming service.
/// </summary>
public interface IHasOutboxMessages
{
    /// <summary>
    /// The outbox table, mapped via <see cref="OutboxEntityTypeConfiguration"/>.
    /// </summary>
    DbSet<OutboxMessage> OutboxMessages { get; }
}
