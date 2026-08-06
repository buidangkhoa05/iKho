namespace Ikho.WarehouseReporting.Features.InventoryPosition;

/// <summary>Response DTO for an <see cref="Domain.InventoryPositionReadModel"/>.</summary>
public sealed record InventoryPositionResponse(
    Guid Id,
    Guid ProductId,
    Guid WarehouseId,
    decimal OnHandQuantity,
    decimal ReservedQuantity,
    decimal QuarantineQuantity,
    decimal DamagedQuantity,
    decimal AvailableQuantity,
    DateTimeOffset UpdatedOnUtc)
{
    /// <summary>Projects a <see cref="Domain.InventoryPositionReadModel"/> entity to its response DTO.</summary>
    public static InventoryPositionResponse FromEntity(Domain.InventoryPositionReadModel model) =>
        new(model.Id, model.ProductId, model.WarehouseId,
            model.OnHandQuantity, model.ReservedQuantity, model.QuarantineQuantity, model.DamagedQuantity,
            model.AvailableQuantity, model.UpdatedOnUtc);
}
