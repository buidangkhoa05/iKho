using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseInventory.Domain;
using Ikho.WarehouseInventory.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseInventory.Features.StockReservations;

/// <summary>Data access for the stock-reservation flow: stock item selection, balances, reservations, and the ledger.</summary>
public interface IStockReservationsRepository
{
    /// <summary>
    /// Finds a single stock item for the given product/warehouse with at least
    /// <paramref name="quantity"/> available, preferring the oldest by
    /// <see cref="StockItem.CreatedOnUtc"/> (FIFO/FEFO-lite). Filters on the raw quantity columns
    /// rather than <see cref="StockItem.AvailableQuantity"/> so the comparison translates to SQL.
    /// Returns <see langword="null"/> if no single stock item has enough available quantity.
    /// </summary>
    Task<StockItem?> FindAvailableStockItemAsync(Guid productId, Guid warehouseId, decimal quantity, CancellationToken cancellationToken);

    /// <summary>Finds a stock item by id, or <see langword="null"/> if it does not exist.</summary>
    Task<StockItem?> GetStockItemAsync(Guid stockItemId, CancellationToken cancellationToken);

    /// <summary>Finds a reservation by id, or <see langword="null"/> if it does not exist.</summary>
    Task<StockReservation?> GetReservationAsync(Guid reservationId, CancellationToken cancellationToken);

    /// <summary>Finds the stock balance rollup for a product/warehouse pair, or <see langword="null"/> if none exists yet.</summary>
    Task<StockBalance?> GetStockBalanceAsync(Guid productId, Guid warehouseId, CancellationToken cancellationToken);

    /// <summary>Tracks a new stock balance for insertion.</summary>
    void Add(StockBalance stockBalance);

    /// <summary>Tracks a new reservation for insertion.</summary>
    void Add(StockReservation reservation);

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
public sealed class StockReservationsRepository(InventoryDbContext dbContext) : IStockReservationsRepository
{
    /// <inheritdoc />
    public Task<StockItem?> FindAvailableStockItemAsync(Guid productId, Guid warehouseId, decimal quantity, CancellationToken cancellationToken) =>
        dbContext.StockItems
            .Where(x => x.ProductId == productId && x.WarehouseId == warehouseId)
            .Where(x => x.OnHandQuantity - x.ReservedQuantity - x.DamagedQuantity - x.QuarantineQuantity >= quantity)
            .OrderBy(x => x.CreatedOnUtc)
            .FirstOrDefaultAsync(cancellationToken);

    /// <inheritdoc />
    public Task<StockItem?> GetStockItemAsync(Guid stockItemId, CancellationToken cancellationToken) =>
        dbContext.StockItems.SingleOrDefaultAsync(x => x.Id == stockItemId, cancellationToken);

    /// <inheritdoc />
    public Task<StockReservation?> GetReservationAsync(Guid reservationId, CancellationToken cancellationToken) =>
        dbContext.StockReservations.SingleOrDefaultAsync(r => r.Id == reservationId, cancellationToken);

    /// <inheritdoc />
    public Task<StockBalance?> GetStockBalanceAsync(Guid productId, Guid warehouseId, CancellationToken cancellationToken) =>
        dbContext.StockBalances.SingleOrDefaultAsync(b => b.ProductId == productId && b.WarehouseId == warehouseId, cancellationToken);

    /// <inheritdoc />
    public void Add(StockBalance stockBalance) => dbContext.StockBalances.Add(stockBalance);

    /// <inheritdoc />
    public void Add(StockReservation reservation) => dbContext.StockReservations.Add(reservation);

    /// <inheritdoc />
    public void Add(StockLedgerEntry ledgerEntry) => dbContext.StockLedgerEntries.Add(ledgerEntry);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
