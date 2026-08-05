namespace Ikho.WarehouseInventory.Features.StockAdjustments;

/// <summary>Request body to apply a manual correction to a stock item's on-hand quantity.</summary>
public sealed record AdjustStockRequest(Guid StockItemId, decimal QuantityDelta, string ReasonCode, string Notes);
