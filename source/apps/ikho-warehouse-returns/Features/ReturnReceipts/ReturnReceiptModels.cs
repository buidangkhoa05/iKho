namespace Ikho.WarehouseReturns.Features.ReturnReceipts;

/// <summary>Request body to record a return receipt against a return order.</summary>
public sealed record CreateReturnReceiptRequest(string? Notes);

/// <summary>Response DTO for a return receipt.</summary>
public sealed record ReturnReceiptResponse(Guid Id, Guid ReturnOrderId, DateTimeOffset ReceivedOnUtc, string? Notes)
{
    /// <summary>Projects a <see cref="Domain.ReturnReceipt"/> entity to its response DTO.</summary>
    public static ReturnReceiptResponse FromEntity(Domain.ReturnReceipt receipt) =>
        new(receipt.Id, receipt.ReturnOrderId, receipt.ReceivedOnUtc, receipt.Notes);
}
