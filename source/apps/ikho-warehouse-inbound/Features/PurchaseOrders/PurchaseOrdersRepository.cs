using Ikho.Warehouse.Inbound.Domain;
using Ikho.Warehouse.Inbound.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Inbound.Features.PurchaseOrders;

/// <summary>Data access for the PurchaseOrders feature.</summary>
public interface IPurchaseOrdersRepository
{
    /// <summary>Fetches a purchase order with its lines by id, or <see langword="null"/> if not found.</summary>
    Task<PurchaseOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Fetches every purchase order with its lines, ordered by creation time descending.</summary>
    Task<List<PurchaseOrder>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>Tracks a new purchase order (and its lines, via the navigation collection) for insertion.</summary>
    void Add(PurchaseOrder purchaseOrder);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class PurchaseOrdersRepository(InboundDbContext dbContext) : IPurchaseOrdersRepository
{
    /// <inheritdoc />
    public Task<PurchaseOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.PurchaseOrders.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<List<PurchaseOrder>> GetAllAsync(CancellationToken cancellationToken) =>
        dbContext.PurchaseOrders.Include(x => x.Lines).OrderByDescending(x => x.CreatedOnUtc).ToListAsync(cancellationToken);

    /// <inheritdoc />
    public void Add(PurchaseOrder purchaseOrder) => dbContext.PurchaseOrders.Add(purchaseOrder);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
