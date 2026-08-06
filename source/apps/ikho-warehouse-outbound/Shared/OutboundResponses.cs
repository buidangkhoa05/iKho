namespace Ikho.WarehouseOutbound.Shared;

/// <summary>Response DTO for a <see cref="Domain.SalesOrderLine"/>.</summary>
public sealed record SalesOrderLineResponse(
    Guid Id,
    Guid ProductId,
    string SkuSnapshot,
    string ProductNameSnapshot,
    decimal Quantity,
    Guid? AllocationId)
{
    /// <summary>Projects a <see cref="Domain.SalesOrderLine"/> entity to its response DTO.</summary>
    public static SalesOrderLineResponse FromEntity(Domain.SalesOrderLine line) =>
        new(line.Id, line.ProductId, line.SkuSnapshot, line.ProductNameSnapshot, line.Quantity, line.AllocationId);
}

/// <summary>
/// Response DTO for a <see cref="Domain.SalesOrder"/> including its lines. Shared across the
/// SalesOrders and Allocations features (both of which read/return a sales order), per the
/// vertical-slice rule that cross-feature sharing goes through a shared contract rather than one
/// feature referencing another feature's types.
/// </summary>
public sealed record SalesOrderResponse(
    Guid Id,
    Guid CustomerId,
    string CustomerCodeSnapshot,
    string CustomerNameSnapshot,
    Guid WarehouseId,
    string Status,
    DateTimeOffset CreatedOnUtc,
    IReadOnlyList<SalesOrderLineResponse> Lines)
{
    /// <summary>Projects a <see cref="Domain.SalesOrder"/> entity to its response DTO.</summary>
    public static SalesOrderResponse FromEntity(Domain.SalesOrder salesOrder) =>
        new(salesOrder.Id, salesOrder.CustomerId, salesOrder.CustomerCodeSnapshot, salesOrder.CustomerNameSnapshot,
            salesOrder.WarehouseId, salesOrder.Status.ToString(), salesOrder.CreatedOnUtc,
            salesOrder.Lines.Select(SalesOrderLineResponse.FromEntity).ToList());
}

/// <summary>Response DTO for a <see cref="Domain.ShipmentLine"/>.</summary>
public sealed record ShipmentLineResponse(Guid Id, Guid AllocationId, Guid ProductId, decimal Quantity)
{
    /// <summary>Projects a <see cref="Domain.ShipmentLine"/> entity to its response DTO.</summary>
    public static ShipmentLineResponse FromEntity(Domain.ShipmentLine line) =>
        new(line.Id, line.AllocationId, line.ProductId, line.Quantity);
}

/// <summary>Response DTO for a <see cref="Domain.Shipment"/> including its lines.</summary>
public sealed record ShipmentResponse(
    Guid Id,
    Guid SalesOrderId,
    Guid WarehouseId,
    string Status,
    DateTimeOffset DispatchedOnUtc,
    IReadOnlyList<ShipmentLineResponse> Lines)
{
    /// <summary>Projects a <see cref="Domain.Shipment"/> entity to its response DTO.</summary>
    public static ShipmentResponse FromEntity(Domain.Shipment shipment) =>
        new(shipment.Id, shipment.SalesOrderId, shipment.WarehouseId, shipment.Status.ToString(), shipment.DispatchedOnUtc,
            shipment.Lines.Select(ShipmentLineResponse.FromEntity).ToList());
}
