using Ikho.Warehouse.Outbound.Domain;
using Ikho.Warehouse.Outbound.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Outbound.Features.SalesOrders;

/// <summary>Data access for the sales-order create/read flow.</summary>
public interface ISalesOrdersRepository
{
    /// <summary>Finds a sales order (with its lines) by id, or <see langword="null"/> if it does not exist.</summary>
    Task<SalesOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Returns every sales order (with its lines), newest first.</summary>
    Task<List<SalesOrder>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>Tracks a new sales order (and its lines, via the navigation collection) for insertion.</summary>
    void Add(SalesOrder salesOrder);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class SalesOrdersRepository(OutboundDbContext dbContext) : ISalesOrdersRepository
{
    /// <inheritdoc />
    public Task<SalesOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.SalesOrders.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<List<SalesOrder>> GetAllAsync(CancellationToken cancellationToken) =>
        dbContext.SalesOrders.Include(x => x.Lines).OrderByDescending(x => x.CreatedOnUtc).ToListAsync(cancellationToken);

    /// <inheritdoc />
    public void Add(SalesOrder salesOrder) => dbContext.SalesOrders.Add(salesOrder);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
