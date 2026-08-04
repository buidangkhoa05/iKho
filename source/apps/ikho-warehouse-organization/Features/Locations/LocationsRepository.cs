using Ikho.WarehouseOrganization.Domain;
using Ikho.WarehouseOrganization.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseOrganization.Features.Locations;

/// <summary>
/// Data access for the zone/aisle/bin/dock location hierarchy beneath a warehouse.
/// </summary>
/// <remarks>
/// <see cref="WarehouseExistsAsync"/>, <see cref="ZoneExistsAsync"/> and <see cref="AisleExistsAsync"/>
/// read the <c>Warehouses</c>/<c>Zones</c>/<c>Aisles</c> tables, which are owned by sibling
/// feature slices. This is an intentional, narrow exception to the "slices should not reference
/// other slices" rule: parent-existence checks are simple, read-only <c>AnyAsync</c> lookups
/// against the shared <see cref="OrganizationDbContext"/> rather than calls into another
/// slice's repository/service. Cross-slice writes or business logic must still go through the
/// owning slice's service.
/// </remarks>
public interface ILocationRepository
{
    /// <summary>Returns <see langword="true"/> if the warehouse exists.</summary>
    Task<bool> WarehouseExistsAsync(Guid warehouseId, CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if the zone exists.</summary>
    Task<bool> ZoneExistsAsync(Guid zoneId, CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if the aisle exists.</summary>
    Task<bool> AisleExistsAsync(Guid aisleId, CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if <paramref name="code"/> is already used by another zone in the warehouse.</summary>
    Task<bool> ZoneCodeExistsAsync(Guid warehouseId, string code, CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if <paramref name="code"/> is already used by another aisle in the zone.</summary>
    Task<bool> AisleCodeExistsAsync(Guid zoneId, string code, CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if <paramref name="code"/> is already used by another bin in the aisle.</summary>
    Task<bool> BinCodeExistsAsync(Guid aisleId, string code, CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if <paramref name="code"/> is already used by another dock in the warehouse.</summary>
    Task<bool> DockCodeExistsAsync(Guid warehouseId, string code, CancellationToken cancellationToken);

    /// <summary>Finds a zone by id, or <see langword="null"/> if it does not exist.</summary>
    Task<Zone?> GetZoneByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Finds an aisle by id, or <see langword="null"/> if it does not exist.</summary>
    Task<Aisle?> GetAisleByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Finds a bin by id, or <see langword="null"/> if it does not exist.</summary>
    Task<Bin?> GetBinByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Finds a dock by id, or <see langword="null"/> if it does not exist.</summary>
    Task<Dock?> GetDockByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Loads the full zone/aisle/bin/dock hierarchy for a warehouse.</summary>
    Task<(List<Zone> Zones, List<Aisle> Aisles, List<Bin> Bins, List<Dock> Docks)> GetHierarchyAsync(Guid warehouseId, CancellationToken cancellationToken);

    /// <summary>Tracks a new zone for insertion.</summary>
    void Add(Zone zone);

    /// <summary>Tracks a new aisle for insertion.</summary>
    void Add(Aisle aisle);

    /// <summary>Tracks a new bin for insertion.</summary>
    void Add(Bin bin);

    /// <summary>Tracks a new dock for insertion.</summary>
    void Add(Dock dock);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class LocationRepository(OrganizationDbContext dbContext) : ILocationRepository
{
    /// <inheritdoc />
    public Task<bool> WarehouseExistsAsync(Guid warehouseId, CancellationToken cancellationToken) =>
        dbContext.Warehouses.AnyAsync(w => w.Id == warehouseId, cancellationToken);

    /// <inheritdoc />
    public Task<bool> ZoneExistsAsync(Guid zoneId, CancellationToken cancellationToken) =>
        dbContext.Zones.AnyAsync(z => z.Id == zoneId, cancellationToken);

    /// <inheritdoc />
    public Task<bool> AisleExistsAsync(Guid aisleId, CancellationToken cancellationToken) =>
        dbContext.Aisles.AnyAsync(a => a.Id == aisleId, cancellationToken);

    /// <inheritdoc />
    public Task<bool> ZoneCodeExistsAsync(Guid warehouseId, string code, CancellationToken cancellationToken) =>
        dbContext.Zones.AnyAsync(z => z.WarehouseId == warehouseId && z.Code == code, cancellationToken);

    /// <inheritdoc />
    public Task<bool> AisleCodeExistsAsync(Guid zoneId, string code, CancellationToken cancellationToken) =>
        dbContext.Aisles.AnyAsync(a => a.ZoneId == zoneId && a.Code == code, cancellationToken);

    /// <inheritdoc />
    public Task<bool> BinCodeExistsAsync(Guid aisleId, string code, CancellationToken cancellationToken) =>
        dbContext.Bins.AnyAsync(b => b.AisleId == aisleId && b.Code == code, cancellationToken);

    /// <inheritdoc />
    public Task<bool> DockCodeExistsAsync(Guid warehouseId, string code, CancellationToken cancellationToken) =>
        dbContext.Docks.AnyAsync(d => d.WarehouseId == warehouseId && d.Code == code, cancellationToken);

    /// <inheritdoc />
    public Task<Zone?> GetZoneByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Zones.SingleOrDefaultAsync(z => z.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<Aisle?> GetAisleByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Aisles.SingleOrDefaultAsync(a => a.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<Bin?> GetBinByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Bins.SingleOrDefaultAsync(b => b.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<Dock?> GetDockByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Docks.SingleOrDefaultAsync(d => d.Id == id, cancellationToken);

    /// <inheritdoc />
    public async Task<(List<Zone> Zones, List<Aisle> Aisles, List<Bin> Bins, List<Dock> Docks)> GetHierarchyAsync(Guid warehouseId, CancellationToken cancellationToken)
    {
        var zones = await dbContext.Zones.Where(z => z.WarehouseId == warehouseId).OrderBy(z => z.Code).ToListAsync(cancellationToken);
        var zoneIds = zones.Select(z => z.Id).ToList();

        var aisles = await dbContext.Aisles.Where(a => zoneIds.Contains(a.ZoneId)).OrderBy(a => a.Code).ToListAsync(cancellationToken);
        var aisleIds = aisles.Select(a => a.Id).ToList();

        var bins = await dbContext.Bins.Where(b => aisleIds.Contains(b.AisleId)).OrderBy(b => b.Code).ToListAsync(cancellationToken);
        var docks = await dbContext.Docks.Where(d => d.WarehouseId == warehouseId).OrderBy(d => d.Code).ToListAsync(cancellationToken);

        return (zones, aisles, bins, docks);
    }

    /// <inheritdoc />
    public void Add(Zone zone) => dbContext.Zones.Add(zone);

    /// <inheritdoc />
    public void Add(Aisle aisle) => dbContext.Aisles.Add(aisle);

    /// <inheritdoc />
    public void Add(Bin bin) => dbContext.Bins.Add(bin);

    /// <inheritdoc />
    public void Add(Dock dock) => dbContext.Docks.Add(dock);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
