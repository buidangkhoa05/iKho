using Ikho.Warehouse.Inventory.Shared;

namespace Ikho.Warehouse.Inventory.Features.StockBalances;

/// <summary>
/// Read-only query logic over stock balances, stock items, and the stock ledger. This feature
/// never mutates state and never publishes events.
/// </summary>
public sealed class StockBalancesService(IStockBalancesRepository repository)
{
    /// <summary>Returns stock balances optionally filtered by product and/or warehouse.</summary>
    public async Task<List<StockBalanceResponse>> GetBalancesAsync(Guid? productId, Guid? warehouseId, CancellationToken cancellationToken)
    {
        var balances = await repository.GetBalancesAsync(productId, warehouseId, cancellationToken);
        return balances.ConvertAll(StockBalanceResponse.FromEntity);
    }

    /// <summary>Returns stock items optionally filtered by product, warehouse, and/or bin.</summary>
    public async Task<List<StockItemResponse>> GetStockItemsAsync(Guid? productId, Guid? warehouseId, Guid? binId, CancellationToken cancellationToken)
    {
        var stockItems = await repository.GetStockItemsAsync(productId, warehouseId, binId, cancellationToken);
        return stockItems.ConvertAll(StockItemResponse.FromEntity);
    }

    /// <summary>
    /// Returns the full ledger history for a stock item, or <see langword="null"/> if the stock
    /// item does not exist.
    /// </summary>
    public async Task<List<StockLedgerEntryResponse>?> GetLedgerAsync(Guid stockItemId, CancellationToken cancellationToken)
    {
        if (!await repository.StockItemExistsAsync(stockItemId, cancellationToken))
        {
            return null;
        }

        var entries = await repository.GetLedgerAsync(stockItemId, cancellationToken);
        return entries.ConvertAll(StockLedgerEntryResponse.FromEntity);
    }
}
