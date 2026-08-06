namespace Ikho.WarehouseOutbound.Shared.Clients;

/// <summary>
/// The subset of an Inventory <c>StockReservationResponse</c> that Outbound needs to track an
/// allocation and, later, dispatch a shipment against it.
/// </summary>
public sealed record InventoryReservationInfo(
    Guid Id,
    Guid StockItemId,
    Guid ProductId,
    Guid WarehouseId,
    decimal Quantity,
    string Status,
    string? ReferenceType,
    string? ReferenceId,
    DateTimeOffset CreatedOnUtc,
    DateTimeOffset? ReleasedOnUtc);

/// <summary>Distinguishes why a reservation attempt did or did not succeed against Inventory.</summary>
public enum InventoryReserveOutcome
{
    /// <summary>The reservation was created successfully.</summary>
    Created,

    /// <summary>Inventory reported no single stock item has enough available quantity (HTTP 409).</summary>
    InsufficientStock,

    /// <summary>Inventory returned an unexpected error.</summary>
    Error,
}

/// <summary>Distinguishes why a fulfill attempt did or did not succeed against Inventory.</summary>
public enum InventoryFulfillOutcome
{
    /// <summary>The reservation was fulfilled (converted into an actual stock decrement) successfully.</summary>
    Fulfilled,

    /// <summary>Inventory reported the reservation does not exist (HTTP 404).</summary>
    NotFound,

    /// <summary>Inventory reported the reservation is not currently active (HTTP 409).</summary>
    NotActive,

    /// <summary>Inventory returned an unexpected error.</summary>
    Error,
}

/// <summary>
/// Typed HTTP client for reserving and fulfilling stock against the Inventory service
/// (<c>ikho-warehouse-inventory</c>) on behalf of the allocation and dispatch workflows.
/// </summary>
public interface IInventoryApiClient
{
    /// <summary>
    /// Reserves stock for a product/warehouse by calling Inventory's
    /// <c>POST /api/warehouse/inventory/reservations</c>. Returns
    /// <see cref="InventoryReserveOutcome.InsufficientStock"/> rather than throwing when Inventory
    /// reports HTTP 409, so callers can surface it as a typed outcome.
    /// </summary>
    Task<(InventoryReserveOutcome Outcome, InventoryReservationInfo? Reservation)> ReserveAsync(
        Guid productId, Guid warehouseId, decimal quantity, string? referenceType, string? referenceId, CancellationToken cancellationToken);

    /// <summary>
    /// Converts an active reservation into an actual stock decrement by calling Inventory's
    /// <c>POST /api/warehouse/inventory/reservations/{id}/fulfill</c>.
    /// </summary>
    Task<(InventoryFulfillOutcome Outcome, InventoryReservationInfo? Reservation)> FulfillReservationAsync(
        Guid reservationId, CancellationToken cancellationToken);
}
