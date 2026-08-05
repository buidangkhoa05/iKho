namespace Ikho.WarehouseInventory.Features.StockReservations;

/// <summary>
/// Request body to reserve stock for an outbound process. The reservation must resolve to a
/// single stock item with enough available quantity — splitting a reservation across multiple
/// stock items is out of scope for this slice.
/// </summary>
public sealed record ReserveStockRequest(Guid ProductId, Guid WarehouseId, decimal Quantity, string? ReferenceType, string? ReferenceId);
