using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Returns.Domain;
using Ikho.Warehouse.Returns.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Returns.Features.Dispositions;

/// <summary>Data access for the Dispositions feature.</summary>
public interface IDispositionsRepository
{
    /// <summary>Fetches a return order with its lines, tracked for mutation (updating status), or <see langword="null"/> if not found.</summary>
    Task<ReturnOrder?> GetReturnOrderWithLinesAsync(Guid returnOrderId, CancellationToken cancellationToken);

    /// <summary>Tracks a new disposition for insertion.</summary>
    void Add(Disposition disposition);

    /// <summary>
    /// Tracks a new outbox message for insertion so it commits atomically with the business
    /// write on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(OutboxMessage message);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class DispositionsRepository(ReturnsDbContext dbContext) : IDispositionsRepository
{
    /// <inheritdoc />
    public Task<ReturnOrder?> GetReturnOrderWithLinesAsync(Guid returnOrderId, CancellationToken cancellationToken) =>
        dbContext.ReturnOrders.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == returnOrderId, cancellationToken);

    /// <inheritdoc />
    public void Add(Disposition disposition) => dbContext.Dispositions.Add(disposition);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
