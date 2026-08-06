namespace Ikho.WarehouseInbound.Features.PurchaseOrders;

/// <summary>Request body for a single line on a new purchase order.</summary>
public sealed record PurchaseOrderLineRequest(Guid ProductId, decimal Quantity);

/// <summary>Request body to create a new purchase order.</summary>
public sealed record CreatePurchaseOrderRequest(Guid SupplierId, Guid WarehouseId, List<PurchaseOrderLineRequest> Lines);

/// <summary>Response DTO for a purchase order line.</summary>
public sealed record PurchaseOrderLineResponse(
    Guid Id, Guid ProductId, string SkuSnapshot, string ProductNameSnapshot, decimal OrderedQuantity, decimal ReceivedQuantity)
{
    /// <summary>Projects a <see cref="Domain.PurchaseOrderLine"/> entity to its response DTO.</summary>
    public static PurchaseOrderLineResponse FromEntity(Domain.PurchaseOrderLine line) =>
        new(line.Id, line.ProductId, line.SkuSnapshot, line.ProductNameSnapshot, line.OrderedQuantity, line.ReceivedQuantity);
}

/// <summary>Response DTO for a purchase order, including its lines.</summary>
public sealed record PurchaseOrderResponse(
    Guid Id,
    Guid SupplierId,
    string SupplierCodeSnapshot,
    string SupplierNameSnapshot,
    Guid WarehouseId,
    string Status,
    DateTimeOffset CreatedOnUtc,
    IReadOnlyList<PurchaseOrderLineResponse> Lines)
{
    /// <summary>Projects a <see cref="Domain.PurchaseOrder"/> entity to its response DTO.</summary>
    public static PurchaseOrderResponse FromEntity(Domain.PurchaseOrder purchaseOrder) =>
        new(purchaseOrder.Id, purchaseOrder.SupplierId, purchaseOrder.SupplierCodeSnapshot, purchaseOrder.SupplierNameSnapshot,
            purchaseOrder.WarehouseId, purchaseOrder.Status.ToString(), purchaseOrder.CreatedOnUtc,
            purchaseOrder.Lines.Select(PurchaseOrderLineResponse.FromEntity).ToList());
}
