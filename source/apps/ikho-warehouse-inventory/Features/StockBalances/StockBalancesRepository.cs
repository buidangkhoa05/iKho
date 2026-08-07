using Ikho.Warehouse.Inventory.Domain;
using Ikho.Warehouse.Inventory.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Inventory.Features.StockBalances;

/// <summary>Read-only data access backing the balance, stock-item, and ledger query endpoints.</summary>
public interface IStockBalancesRepository
{
    /// <summary>Returns stock balances optionally filtered by product and/or warehouse.</summary>
    Task<List<StockBalance>> GetBalancesAsync(Guid? productId, Guid? warehouseId, CancellationToken cancellationToken);

    /// <summary>Returns stock items optionally filtered by product, warehouse, and/or bin.</summary>
    Task<List<StockItem>> GetStockItemsAsync(Guid? productId, Guid? warehouseId, Guid? binId, CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if a stock item with <paramref name="stockItemId"/> exists.</summary>
    Task<bool> StockItemExistsAsync(Guid stockItemId, CancellationToken cancellationToken);

    /// <summary>Returns the full ledger history for a stock item, ordered by <see cref="StockLedgerEntry.OccurredOnUtc"/>.</summary>
    Task<List<StockLedgerEntry>> GetLedgerAsync(Guid stockItemId, CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class StockBalancesRepository(InventoryDbContext dbContext) : IStockBalancesRepository
{
    /// <inheritdoc />
    public async Task<List<StockBalance>> GetBalancesAsync(Guid? productId, Guid? warehouseId, CancellationToken cancellationToken)
    {
        var query = dbContext.StockBalances.AsQueryable();

        if (productId is not null)
        {
            query = query.Where(b => b.ProductId == productId);
        }

        if (warehouseId is not null)
        {
            query = query.Where(b => b.WarehouseId == warehouseId);
        }

        return await query.OrderBy(b => b.ProductId).ThenBy(b => b.WarehouseId).ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<List<StockItem>> GetStockItemsAsync(Guid? productId, Guid? warehouseId, Guid? binId, CancellationToken cancellationToken)
    {
        var query = dbContext.StockItems.AsQueryable();

        if (productId is not null)
        {
            query = query.Where(x => x.ProductId == productId);
        }

        if (warehouseId is not null)
        {
            query = query.Where(x => x.WarehouseId == warehouseId);
        }

        if (binId is not null)
        {
            query = query.Where(x => x.BinId == binId);
        }

        return await query.OrderBy(x => x.CreatedOnUtc).ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public Task<bool> StockItemExistsAsync(Guid stockItemId, CancellationToken cancellationToken) =>
        dbContext.StockItems.AnyAsync(x => x.Id == stockItemId, cancellationToken);

    /// <inheritdoc />
    public Task<List<StockLedgerEntry>> GetLedgerAsync(Guid stockItemId, CancellationToken cancellationToken) =>
        dbContext.StockLedgerEntries
            .Where(e => e.StockItemId == stockItemId)
            .OrderBy(e => e.OccurredOnUtc)
            .ToListAsync(cancellationToken);
}
