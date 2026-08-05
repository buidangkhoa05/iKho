namespace Ikho.WarehouseInventory.Features.StockReceipts;

/// <summary>
/// Request body to receive stock into a bin. <see cref="LotNumber"/> is required when the
/// product is lot-controlled; <see cref="SerialNumbers"/> is required (with a count equal to
/// <see cref="Quantity"/> and no duplicates) when the product is serial-controlled.
/// </summary>
public sealed record ReceiveStockRequest(
    Guid ProductId,
    Guid WarehouseId,
    Guid BinId,
    decimal Quantity,
    string? LotNumber,
    DateTimeOffset? ExpirationDateUtc,
    List<string>? SerialNumbers);
