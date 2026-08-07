using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Inventory.Domain;
using Ikho.Warehouse.Inventory.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Inventory.Features.StockAdjustments;

/// <summary>Data access for the stock-adjustment flow: stock items, balances, adjustments, and the ledger.</summary>
public interface IStockAdjustmentsRepository
{
    /// <summary>Finds a stock item by id, or <see langword="null"/> if it does not exist.</summary>
    Task<StockItem?> GetStockItemAsync(Guid stockItemId, CancellationToken cancellationToken);

    /// <summary>Finds the stock balance rollup for a product/warehouse pair, or <see langword="null"/> if none exists yet.</summary>
    Task<StockBalance?> GetStockBalanceAsync(Guid productId, Guid warehouseId, CancellationToken cancellationToken);

    /// <summary>Tracks a new stock balance for insertion.</summary>
    void Add(StockBalance stockBalance);

    /// <summary>Tracks a new adjustment audit record for insertion.</summary>
    void Add(InventoryAdjustment adjustment);

    /// <summary>Tracks a new ledger entry for insertion. Ledger rows are append-only — never updated or removed.</summary>
    void Add(StockLedgerEntry ledgerEntry);

    /// <summary>
    /// Tracks a new outbox message for insertion so it commits atomically with the business
    /// write on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(OutboxMessage message);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class StockAdjustmentsRepository(InventoryDbContext dbContext) : IStockAdjustmentsRepository
{
    /// <inheritdoc />
    public Task<StockItem?> GetStockItemAsync(Guid stockItemId, CancellationToken cancellationToken) =>
        dbContext.StockItems.SingleOrDefaultAsync(x => x.Id == stockItemId, cancellationToken);

    /// <inheritdoc />
    public Task<StockBalance?> GetStockBalanceAsync(Guid productId, Guid warehouseId, CancellationToken cancellationToken) =>
        dbContext.StockBalances.SingleOrDefaultAsync(b => b.ProductId == productId && b.WarehouseId == warehouseId, cancellationToken);

    /// <inheritdoc />
    public void Add(StockBalance stockBalance) => dbContext.StockBalances.Add(stockBalance);

    /// <inheritdoc />
    public void Add(InventoryAdjustment adjustment) => dbContext.InventoryAdjustments.Add(adjustment);

    /// <inheritdoc />
    public void Add(StockLedgerEntry ledgerEntry) => dbContext.StockLedgerEntries.Add(ledgerEntry);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
