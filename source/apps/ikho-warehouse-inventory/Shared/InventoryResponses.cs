namespace Ikho.WarehouseInventory.Shared;

/// <summary>
/// Response DTO for a <see cref="Domain.StockItem"/>, including all quantity buckets. Shared
/// across the StockReceipts, StockAdjustments, and StockBalances features (all of which read or
/// mutate stock items), per the vertical-slice rule that cross-feature sharing goes through a
/// shared contract rather than one feature referencing another feature's types.
/// </summary>
public sealed record StockItemResponse(
    Guid Id,
    Guid ProductId,
    Guid WarehouseId,
    Guid BinId,
    Guid? LotId,
    Guid? SerialNumberId,
    decimal OnHandQuantity,
    decimal ReservedQuantity,
    decimal DamagedQuantity,
    decimal QuarantineQuantity,
    decimal AvailableQuantity,
    DateTimeOffset CreatedOnUtc,
    DateTimeOffset UpdatedOnUtc)
{
    /// <summary>Projects a <see cref="Domain.StockItem"/> entity to its response DTO.</summary>
    public static StockItemResponse FromEntity(Domain.StockItem stockItem) =>
        new(stockItem.Id, stockItem.ProductId, stockItem.WarehouseId, stockItem.BinId,
            stockItem.LotId, stockItem.SerialNumberId,
            stockItem.OnHandQuantity, stockItem.ReservedQuantity, stockItem.DamagedQuantity,
            stockItem.QuarantineQuantity, stockItem.AvailableQuantity,
            stockItem.CreatedOnUtc, stockItem.UpdatedOnUtc);
}

/// <summary>Response DTO for a <see cref="Domain.StockBalance"/> rollup, shared across StockReceipts/StockAdjustments/StockReservations/StockBalances.</summary>
public sealed record StockBalanceResponse(
    Guid Id,
    Guid ProductId,
    Guid WarehouseId,
    decimal OnHandQuantity,
    decimal ReservedQuantity,
    decimal DamagedQuantity,
    decimal QuarantineQuantity,
    decimal AvailableQuantity,
    DateTimeOffset UpdatedOnUtc)
{
    /// <summary>Projects a <see cref="Domain.StockBalance"/> entity to its response DTO.</summary>
    public static StockBalanceResponse FromEntity(Domain.StockBalance balance) =>
        new(balance.Id, balance.ProductId, balance.WarehouseId,
            balance.OnHandQuantity, balance.ReservedQuantity, balance.DamagedQuantity, balance.QuarantineQuantity,
            balance.OnHandQuantity - balance.ReservedQuantity - balance.DamagedQuantity - balance.QuarantineQuantity,
            balance.UpdatedOnUtc);
}

/// <summary>Response DTO for a <see cref="Domain.StockLedgerEntry"/>, used by the ledger-history query in StockBalances.</summary>
public sealed record StockLedgerEntryResponse(
    Guid Id,
    Guid StockItemId,
    Guid ProductId,
    Guid WarehouseId,
    Guid BinId,
    Guid? LotId,
    Guid? SerialNumberId,
    string MovementType,
    decimal QuantityDelta,
    string? ReasonCode,
    string? ReferenceType,
    string? ReferenceId,
    string? CorrelationId,
    DateTimeOffset OccurredOnUtc)
{
    /// <summary>Projects a <see cref="Domain.StockLedgerEntry"/> entity to its response DTO.</summary>
    public static StockLedgerEntryResponse FromEntity(Domain.StockLedgerEntry entry) =>
        new(entry.Id, entry.StockItemId, entry.ProductId, entry.WarehouseId, entry.BinId,
            entry.LotId, entry.SerialNumberId, entry.MovementType.ToString(), entry.QuantityDelta,
            entry.ReasonCode, entry.ReferenceType, entry.ReferenceId, entry.CorrelationId, entry.OccurredOnUtc);
}

/// <summary>Response DTO for a <see cref="Domain.StockReservation"/>.</summary>
public sealed record StockReservationResponse(
    Guid Id,
    Guid StockItemId,
    Guid ProductId,
    Guid WarehouseId,
    decimal Quantity,
    string Status,
    string? ReferenceType,
    string? ReferenceId,
    DateTimeOffset CreatedOnUtc,
    DateTimeOffset? ReleasedOnUtc)
{
    /// <summary>Projects a <see cref="Domain.StockReservation"/> entity to its response DTO.</summary>
    public static StockReservationResponse FromEntity(Domain.StockReservation reservation) =>
        new(reservation.Id, reservation.StockItemId, reservation.ProductId, reservation.WarehouseId,
            reservation.Quantity, reservation.Status.ToString(), reservation.ReferenceType, reservation.ReferenceId,
            reservation.CreatedOnUtc, reservation.ReleasedOnUtc);
}
