namespace Ikho.Warehouse.Organization.Features.Locations;

/// <summary>
/// Request body to create a new <see cref="Domain.Zone"/> under a warehouse.
/// </summary>
public sealed record CreateZoneRequest(Guid WarehouseId, string Code, string Name);

/// <summary>
/// Request body to create a new <see cref="Domain.Aisle"/> under a zone.
/// </summary>
public sealed record CreateAisleRequest(Guid ZoneId, string Code, string Name);

/// <summary>
/// Request body to create a new <see cref="Domain.Bin"/> under an aisle.
/// </summary>
public sealed record CreateBinRequest(Guid AisleId, string Code);

/// <summary>
/// Request body to create a new <see cref="Domain.Dock"/> under a warehouse.
/// </summary>
public sealed record CreateDockRequest(Guid WarehouseId, string Code, string Name);

/// <summary>
/// Request body to activate or deactivate a zone, aisle, bin, or dock.
/// </summary>
public sealed record SetLocationStatusRequest(bool IsActive);

/// <summary>
/// Response shape for a zone.
/// </summary>
public sealed record ZoneResponse(Guid Id, Guid WarehouseId, string Code, string Name, bool IsActive)
{
    /// <summary>Projects a <see cref="Domain.Zone"/> entity to its response DTO.</summary>
    public static ZoneResponse FromEntity(Domain.Zone zone) =>
        new(zone.Id, zone.WarehouseId, zone.Code, zone.Name, zone.IsActive);
}

/// <summary>
/// Response shape for an aisle.
/// </summary>
public sealed record AisleResponse(Guid Id, Guid ZoneId, string Code, string Name, bool IsActive)
{
    /// <summary>Projects a <see cref="Domain.Aisle"/> entity to its response DTO.</summary>
    public static AisleResponse FromEntity(Domain.Aisle aisle) =>
        new(aisle.Id, aisle.ZoneId, aisle.Code, aisle.Name, aisle.IsActive);
}

/// <summary>
/// Response shape for a bin.
/// </summary>
public sealed record BinResponse(Guid Id, Guid AisleId, string Code, bool IsActive)
{
    /// <summary>Projects a <see cref="Domain.Bin"/> entity to its response DTO.</summary>
    public static BinResponse FromEntity(Domain.Bin bin) =>
        new(bin.Id, bin.AisleId, bin.Code, bin.IsActive);
}

/// <summary>
/// Response shape for a dock.
/// </summary>
public sealed record DockResponse(Guid Id, Guid WarehouseId, string Code, string Name, bool IsActive)
{
    /// <summary>Projects a <see cref="Domain.Dock"/> entity to its response DTO.</summary>
    public static DockResponse FromEntity(Domain.Dock dock) =>
        new(dock.Id, dock.WarehouseId, dock.Code, dock.Name, dock.IsActive);
}

/// <summary>
/// Result of validating whether a bin or dock is currently usable for operations (e.g. putaway,
/// picking, receiving, shipment staging).
/// </summary>
public sealed record LocationValidationResponse(bool IsValid, string? Reason);

/// <summary>
/// Full zone -> aisle -> bin hierarchy plus docks for a single warehouse, used by downstream
/// services (Inventory, Inbound, Outbound) to resolve valid storage/staging locations.
/// </summary>
public sealed record WarehouseHierarchyResponse(
    Guid WarehouseId,
    IReadOnlyList<ZoneNode> Zones,
    IReadOnlyList<DockResponse> Docks);

/// <summary>
/// A zone node in the warehouse hierarchy, with its child aisles.
/// </summary>
public sealed record ZoneNode(Guid Id, string Code, string Name, bool IsActive, IReadOnlyList<AisleNode> Aisles);

/// <summary>
/// An aisle node in the warehouse hierarchy, with its child bins.
/// </summary>
public sealed record AisleNode(Guid Id, string Code, string Name, bool IsActive, IReadOnlyList<BinResponse> Bins);
