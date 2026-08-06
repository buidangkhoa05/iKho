using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseReturns.Domain;
using Ikho.WarehouseReturns.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseReturns.Features.ReturnOrders;

/// <summary>Data access for the ReturnOrders feature.</summary>
public interface IReturnOrdersRepository
{
    /// <summary>Fetches a return order with its lines by id, or <see langword="null"/> if not found.</summary>
    Task<ReturnOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>
    /// Fetches every return order with its lines, ordered by creation time descending, optionally
    /// filtered to a single source reference id.
    /// </summary>
    Task<List<ReturnOrder>> GetAllAsync(string? sourceReferenceId, CancellationToken cancellationToken);

    /// <summary>Tracks a new return order (and its lines, via the navigation collection) for insertion.</summary>
    void Add(ReturnOrder returnOrder);

    /// <summary>
    /// Tracks a new outbox message for insertion so it commits atomically with the business
    /// write on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(OutboxMessage message);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class ReturnOrdersRepository(ReturnsDbContext dbContext) : IReturnOrdersRepository
{
    /// <inheritdoc />
    public Task<ReturnOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.ReturnOrders.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<List<ReturnOrder>> GetAllAsync(string? sourceReferenceId, CancellationToken cancellationToken)
    {
        var query = dbContext.ReturnOrders.Include(x => x.Lines).AsQueryable();

        if (!string.IsNullOrWhiteSpace(sourceReferenceId))
        {
            query = query.Where(x => x.SourceReferenceId == sourceReferenceId);
        }

        return query.OrderByDescending(x => x.CreatedOnUtc).ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public void Add(ReturnOrder returnOrder) => dbContext.ReturnOrders.Add(returnOrder);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
