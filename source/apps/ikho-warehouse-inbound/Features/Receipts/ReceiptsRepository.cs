using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Inbound.Domain;
using Ikho.Warehouse.Inbound.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Inbound.Features.Receipts;

/// <summary>Data access for the Receipts feature: purchase orders (for validation/mutation), receipts, and putaway tasks.</summary>
public interface IReceiptsRepository
{
    /// <summary>Fetches a purchase order with its lines, tracked for mutation (updating line/order status), or <see langword="null"/> if not found.</summary>
    Task<PurchaseOrder?> GetPurchaseOrderWithLinesAsync(Guid purchaseOrderId, CancellationToken cancellationToken);

    /// <summary>Fetches a receipt with its lines by id, or <see langword="null"/> if not found.</summary>
    Task<Receipt?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Fetches every receipt with its lines, ordered by creation time descending.</summary>
    Task<List<Receipt>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>Tracks a new receipt (and its lines, via the navigation collection) for insertion.</summary>
    void Add(Receipt receipt);

    /// <summary>Tracks a new putaway task for insertion.</summary>
    void Add(PutawayTask putawayTask);

    /// <summary>
    /// Tracks a new outbox message for insertion so it commits atomically with the business
    /// write on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(OutboxMessage message);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class ReceiptsRepository(InboundDbContext dbContext) : IReceiptsRepository
{
    /// <inheritdoc />
    public Task<PurchaseOrder?> GetPurchaseOrderWithLinesAsync(Guid purchaseOrderId, CancellationToken cancellationToken) =>
        dbContext.PurchaseOrders.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == purchaseOrderId, cancellationToken);

    /// <inheritdoc />
    public Task<Receipt?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Receipts.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<List<Receipt>> GetAllAsync(CancellationToken cancellationToken) =>
        dbContext.Receipts.Include(x => x.Lines).OrderByDescending(x => x.CreatedOnUtc).ToListAsync(cancellationToken);

    /// <inheritdoc />
    public void Add(Receipt receipt) => dbContext.Receipts.Add(receipt);

    /// <inheritdoc />
    public void Add(PutawayTask putawayTask) => dbContext.PutawayTasks.Add(putawayTask);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
