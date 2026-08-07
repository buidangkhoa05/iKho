namespace Ikho.Warehouse.Inbound.Shared.Clients;

/// <summary>Distinguishes why a call to Inventory's receive-stock command did or did not succeed.</summary>
public enum InventoryReceiveOutcome
{
    /// <summary>Inventory accepted the receipt and created/updated a stock item.</summary>
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

/// <summary>
/// The subset of Inventory's <c>StockItemResponse</c> that Inbound needs after a successful
/// receive-stock command.
/// </summary>
public sealed record InventoryStockItemInfo(
    Guid Id, Guid ProductId, Guid WarehouseId, Guid BinId, decimal OnHandQuantity);

/// <summary>Result of calling Inventory's receive-stock command.</summary>
public sealed record InventoryReceiveResult(InventoryReceiveOutcome Outcome, InventoryStockItemInfo? StockItem, string? Error);

/// <summary>
/// Typed HTTP client for handing off received stock to the Inventory service
/// (<c>ikho-warehouse-inventory</c>) via its receive-stock command. Inbound owns the receiving
/// workflow (purchase orders, receipts, putaway); Inventory owns stock truth — this client is the
/// boundary between the two.
/// </summary>
public interface IInventoryApiClient
{
    /// <summary>
    /// Calls Inventory's <c>POST /api/warehouse/inventory/receipts</c> to receive
    /// <paramref name="quantity"/> of <paramref name="productId"/> into <paramref name="binId"/>
    /// within <paramref name="warehouseId"/>. Non-success responses are surfaced as a typed
    /// <see cref="InventoryReceiveResult"/> rather than thrown, so the caller can translate them
    /// into a meaningful response for its own client instead of an unhandled exception.
    /// </summary>
    Task<InventoryReceiveResult> ReceiveStockAsync(
        Guid productId,
        Guid warehouseId,
        Guid binId,
        decimal quantity,
        string? lotNumber,
        DateTimeOffset? expirationDateUtc,
        List<string>? serialNumbers,
        CancellationToken cancellationToken);
}
