namespace Ikho.Warehouse.Reporting.Features.OutboundStatus;

/// <summary>Response DTO for an <see cref="Domain.OutboundStatusReadModel"/>.</summary>
public sealed record OutboundStatusResponse(
    Guid SalesOrderId,
    Guid? WarehouseId,
    int AllocationsConfirmedCount,
    int ShipmentsDispatchedCount,
    DateTimeOffset? LastShipmentOnUtc,
    DateTimeOffset UpdatedOnUtc)
{
    /// <summary>Projects a <see cref="Domain.OutboundStatusReadModel"/> entity to its response DTO.</summary>
    public static OutboundStatusResponse FromEntity(Domain.OutboundStatusReadModel model) =>
        new(model.SalesOrderId, model.WarehouseId, model.AllocationsConfirmedCount, model.ShipmentsDispatchedCount,
            model.LastShipmentOnUtc, model.UpdatedOnUtc);
}
