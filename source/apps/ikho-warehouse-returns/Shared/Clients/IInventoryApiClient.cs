namespace Ikho.Warehouse.Returns.Shared.Clients;

/// <summary>Distinguishes why a call to Inventory's receive-stock or receive-quarantine command did or did not succeed.</summary>
public enum InventoryReceiveOutcome
{
    /// <summary>Inventory accepted the request and created/updated a stock item.</summary>
    Success,

    /// <summary>Inventory rejected the request as invalid (HTTP 400 — e.g. a lot/serial tracking rule violation).</summary>
    BadRequest,

    /// <summary>Inventory reported the referenced product or bin does not exist (HTTP 404).</summary>
    NotFound,

    /// <summary>Inventory reported a state conflict (HTTP 409 — e.g. the bin exists but is not currently usable).</summary>
    Conflict,

    /// <summary>Inventory returned an unexpected, non-success status code.</summary>
    UnexpectedError,
}

/// <summary>The subset of Inventory's <c>StockItemResponse</c> that Returns needs after a successful receive/quarantine command.</summary>
public sealed record InventoryStockItemInfo(Guid Id, Guid ProductId, Guid WarehouseId, Guid BinId, decimal OnHandQuantity, decimal QuarantineQuantity);

/// <summary>Result of calling one of Inventory's receive commands.</summary>
public sealed record InventoryReceiveResult(InventoryReceiveOutcome Outcome, InventoryStockItemInfo? StockItem, string? Error);

/// <summary>
/// Typed HTTP client for handing disposition outcomes off to the Inventory service
/// (<c>ikho-warehouse-inventory</c>). Returns owns the reverse-logistics workflow (return orders,
/// receipts, inspections, dispositions); Inventory owns stock truth — this client is the boundary
/// between the two, used only for the <c>Restock</c> and <c>Quarantine</c> disposition outcomes
/// (<c>Scrap</c> and <c>VendorReturn</c> never call Inventory).
/// </summary>
public interface IInventoryApiClient
{
    /// <summary>
    /// Calls Inventory's <c>POST /api/warehouse/inventory/receipts</c> to add
    /// <paramref name="quantity"/> of <paramref name="productId"/> back into on-hand stock in
    /// <paramref name="binId"/> within <paramref name="warehouseId"/>, for a
    /// <see cref="Domain.DispositionOutcome.Restock"/> disposition.
    /// </summary>
    Task<InventoryReceiveResult> ReceiveStockAsync(
        Guid productId, Guid warehouseId, Guid binId, decimal quantity, CancellationToken cancellationToken);

    /// <summary>
    /// Calls Inventory's <c>POST /api/warehouse/inventory/receipts/quarantine</c> to add
    /// <paramref name="quantity"/> of <paramref name="productId"/> into quarantined stock in
    /// <paramref name="binId"/> within <paramref name="warehouseId"/>, for a
    /// <see cref="Domain.DispositionOutcome.Quarantine"/> disposition.
    /// </summary>
    Task<InventoryReceiveResult> ReceiveQuarantineAsync(
        Guid productId, Guid warehouseId, Guid binId, decimal quantity, CancellationToken cancellationToken);
}
