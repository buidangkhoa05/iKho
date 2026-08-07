namespace Ikho.Warehouse.Organization.Features.Warehouses;

/// <summary>
/// Request body to create a new <see cref="Domain.Warehouse"/>.
/// </summary>
public sealed record CreateWarehouseRequest(Guid CompanyId, string Code, string Name);

/// <summary>
/// Request body to update an existing <see cref="Domain.Warehouse"/>'s display name.
/// </summary>
public sealed record UpdateWarehouseRequest(string Name);

/// <summary>
/// Request body to activate or deactivate a warehouse.
/// </summary>
public sealed record SetWarehouseStatusRequest(bool IsActive);

/// <summary>
/// Response shape returned for warehouse reads and writes.
/// </summary>
public sealed record WarehouseResponse(Guid Id, Guid CompanyId, string Code, string Name, bool IsActive, DateTimeOffset CreatedOnUtc)
{
    /// <summary>
    /// Projects a <see cref="Domain.Warehouse"/> entity to its response DTO.
    /// </summary>
    public static WarehouseResponse FromEntity(Domain.Warehouse warehouse) =>
        new(warehouse.Id, warehouse.CompanyId, warehouse.Code, warehouse.Name, warehouse.IsActive, warehouse.CreatedOnUtc);
}
