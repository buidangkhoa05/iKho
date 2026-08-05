using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseInventory.Domain;
using Ikho.WarehouseInventory.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseInventory.Features.StockReceipts;

/// <summary>Data access for the stock-receipt flow: lots, serial numbers, stock items, balances, and the ledger.</summary>
public interface IStockReceiptsRepository
{
    /// <summary>Finds an existing lot for a product by lot number, or <see langword="null"/> if none exists yet.</summary>
    Task<Lot?> GetLotAsync(Guid productId, string lotNumber, CancellationToken cancellationToken);

    /// <summary>Finds an existing serial number for a product by serial value, or <see langword="null"/> if none exists yet.</summary>
    Task<SerialNumber?> GetSerialNumberAsync(Guid productId, string serialValue, CancellationToken cancellationToken);

    /// <summary>
    /// Finds the single stock item matching the given identity, using explicit null-aware
    /// equality on <paramref name="lotId"/>/<paramref name="serialNumberId"/> so untracked
    /// products (where both are null) still resolve to a single matching row instead of relying
    /// on a database unique constraint (which cannot enforce this — see the caveat on
    /// <see cref="Domain.StockItem"/>).
    /// </summary>
    Task<StockItem?> GetStockItemAsync(
        Guid productId, Guid warehouseId, Guid binId, Guid? lotId, Guid? serialNumberId, CancellationToken cancellationToken);

    /// <summary>Finds the stock balance rollup for a product/warehouse pair, or <see langword="null"/> if none exists yet.</summary>
    Task<StockBalance?> GetStockBalanceAsync(Guid productId, Guid warehouseId, CancellationToken cancellationToken);

    /// <summary>Tracks a new lot for insertion.</summary>
    void Add(Lot lot);

    /// <summary>Tracks a new serial number for insertion.</summary>
    void Add(SerialNumber serialNumber);

    /// <summary>Tracks a new stock item for insertion.</summary>
    void Add(StockItem stockItem);

    /// <summary>Tracks a new stock balance for insertion.</summary>
    void Add(StockBalance stockBalance);

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
public sealed class StockReceiptsRepository(InventoryDbContext dbContext) : IStockReceiptsRepository
{
    /// <inheritdoc />
    public Task<Lot?> GetLotAsync(Guid productId, string lotNumber, CancellationToken cancellationToken) =>
        dbContext.Lots.SingleOrDefaultAsync(l => l.ProductId == productId && l.LotNumber == lotNumber, cancellationToken);

    /// <inheritdoc />
    public Task<SerialNumber?> GetSerialNumberAsync(Guid productId, string serialValue, CancellationToken cancellationToken) =>
        dbContext.SerialNumbers.SingleOrDefaultAsync(s => s.ProductId == productId && s.SerialValue == serialValue, cancellationToken);

    /// <inheritdoc />
    public Task<StockItem?> GetStockItemAsync(
        Guid productId, Guid warehouseId, Guid binId, Guid? lotId, Guid? serialNumberId, CancellationToken cancellationToken) =>
        dbContext.StockItems.SingleOrDefaultAsync(
            x => x.ProductId == productId && x.WarehouseId == warehouseId && x.BinId == binId
                 && x.LotId == lotId && x.SerialNumberId == serialNumberId,
            cancellationToken);

    /// <inheritdoc />
    public Task<StockBalance?> GetStockBalanceAsync(Guid productId, Guid warehouseId, CancellationToken cancellationToken) =>
        dbContext.StockBalances.SingleOrDefaultAsync(b => b.ProductId == productId && b.WarehouseId == warehouseId, cancellationToken);

    /// <inheritdoc />
    public void Add(Lot lot) => dbContext.Lots.Add(lot);

    /// <inheritdoc />
    public void Add(SerialNumber serialNumber) => dbContext.SerialNumbers.Add(serialNumber);

    /// <inheritdoc />
    public void Add(StockItem stockItem) => dbContext.StockItems.Add(stockItem);

    /// <inheritdoc />
    public void Add(StockBalance stockBalance) => dbContext.StockBalances.Add(stockBalance);

    /// <inheritdoc />
    public void Add(StockLedgerEntry ledgerEntry) => dbContext.StockLedgerEntries.Add(ledgerEntry);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
