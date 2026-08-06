namespace Ikho.WarehouseInbound.Features.Receipts;

/// <summary>Request body for a single line being received against a purchase order line.</summary>
public sealed record ReceiptLineRequest(
    Guid PurchaseOrderLineId,
    Guid BinId,
    decimal Quantity,
    string? LotNumber,
    DateTimeOffset? ExpirationDateUtc,
    List<string>? SerialNumbers);

/// <summary>Request body to record a receipt against a purchase order.</summary>
public sealed record CreateReceiptRequest(Guid PurchaseOrderId, List<ReceiptLineRequest> Lines);

/// <summary>Response DTO for a received, put-away line.</summary>
public sealed record ReceiptLineResponse(
    Guid Id,
    Guid PurchaseOrderLineId,
    Guid ProductId,
    Guid BinId,
    decimal Quantity,
    string? LotNumber,
    DateTimeOffset? ExpirationDateUtc,
    IReadOnlyList<string> SerialNumbers)
{
    /// <summary>
    /// Projects a <see cref="Domain.ReceiptLine"/> entity to its response DTO, splitting the
    /// stored comma-joined serial numbers back into a list (see the remarks on
    /// <see cref="Domain.ReceiptLine.SerialNumbersCsv"/> for why they are stored joined).
    /// </summary>
    public static ReceiptLineResponse FromEntity(Domain.ReceiptLine line) =>
        new(line.Id, line.PurchaseOrderLineId, line.ProductId, line.BinId, line.Quantity, line.LotNumber, line.ExpirationDateUtc,
            string.IsNullOrEmpty(line.SerialNumbersCsv)
                ? []
                : line.SerialNumbersCsv.Split(',', StringSplitOptions.RemoveEmptyEntries));
}

/// <summary>Response DTO for a receipt, including its lines.</summary>
public sealed record ReceiptResponse(
    Guid Id,
    Guid PurchaseOrderId,
    Guid WarehouseId,
    string Status,
    DateTimeOffset CreatedOnUtc,
    IReadOnlyList<ReceiptLineResponse> Lines)
{
    /// <summary>Projects a <see cref="Domain.Receipt"/> entity to its response DTO.</summary>
    public static ReceiptResponse FromEntity(Domain.Receipt receipt) =>
        new(receipt.Id, receipt.PurchaseOrderId, receipt.WarehouseId, receipt.Status.ToString(), receipt.CreatedOnUtc,
            receipt.Lines.Select(ReceiptLineResponse.FromEntity).ToList());
}
