using Ikho.WarehouseReturns.Domain;

namespace Ikho.WarehouseReturns.Features.ReturnOrders;

/// <summary>Request body for a single line on a new return order.</summary>
public sealed record ReturnOrderLineRequest(Guid ProductId, decimal Quantity, string ReasonCode);

/// <summary>
/// Request body to create a new return order. Exactly one of <see cref="CustomerId"/>/
/// <see cref="SupplierId"/> must be set, matching <see cref="Type"/> — there is no Kafka consumer
/// wiring in this codebase yet, so the reference ids that would otherwise be resolved from
/// <c>CustomerCreated</c>/<c>SupplierCreated</c>/<c>ShipmentDispatched</c> events are supplied
/// directly here and validated synchronously against Partner/Organization/Catalog.
/// </summary>
public sealed record CreateReturnOrderRequest(
    ReturnOrderType Type,
    Guid WarehouseId,
    Guid? CustomerId,
    Guid? SupplierId,
    string? SourceReferenceType,
    string? SourceReferenceId,
    List<ReturnOrderLineRequest> Lines);

/// <summary>Response DTO for a return order line.</summary>
public sealed record ReturnOrderLineResponse(
    Guid Id, Guid ProductId, decimal Quantity, string ReasonCode, Guid? InspectionId, Guid? DispositionId)
{
    /// <summary>Projects a <see cref="Domain.ReturnOrderLine"/> entity to its response DTO.</summary>
    public static ReturnOrderLineResponse FromEntity(Domain.ReturnOrderLine line) =>
        new(line.Id, line.ProductId, line.Quantity, line.ReasonCode, line.InspectionId, line.DispositionId);
}

/// <summary>Response DTO for a return order, including its lines.</summary>
public sealed record ReturnOrderResponse(
    Guid Id,
    string Type,
    Guid? CustomerId,
    Guid? SupplierId,
    Guid WarehouseId,
    string? SourceReferenceType,
    string? SourceReferenceId,
    string Status,
    DateTimeOffset CreatedOnUtc,
    IReadOnlyList<ReturnOrderLineResponse> Lines)
{
    /// <summary>Projects a <see cref="Domain.ReturnOrder"/> entity to its response DTO.</summary>
    public static ReturnOrderResponse FromEntity(Domain.ReturnOrder returnOrder) =>
        new(returnOrder.Id, returnOrder.Type.ToString(), returnOrder.CustomerId, returnOrder.SupplierId,
            returnOrder.WarehouseId, returnOrder.SourceReferenceType, returnOrder.SourceReferenceId,
            returnOrder.Status.ToString(), returnOrder.CreatedOnUtc,
            returnOrder.Lines.Select(ReturnOrderLineResponse.FromEntity).ToList());
}
