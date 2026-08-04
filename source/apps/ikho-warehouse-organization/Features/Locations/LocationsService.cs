using System.Text.Json;
using Ikho.SharedLibrary.Outbox;
using Ikho.SchemaManagement.Contracts.WarehouseOrganization.Events.V1;
using Ikho.WarehouseOrganization.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseOrganization.Features.Locations;

/// <summary>
/// Result of a location creation attempt, distinguishing failure reasons so endpoints can
/// return accurate status codes.
/// </summary>
public enum CreateLocationOutcome
{
    /// <summary>The location was created successfully.</summary>
    Created,

    /// <summary>The referenced parent location does not exist.</summary>
    ParentNotFound,

    /// <summary><c>Code</c> is already in use within the parent location.</summary>
    CodeAlreadyExists,
}

/// <summary>
/// Business logic for the zone/aisle/bin/dock location hierarchy, including bin/dock
/// operational validation used by downstream services (Inventory, Inbound, Outbound). Publishes
/// <c>BinCreated</c> and <c>BinStatusChanged</c> via the transactional outbox.
/// </summary>
public sealed class LocationsService(ILocationRepository repository, IOutboxWriter outbox)
{
    /// <summary>Creates a new zone under a warehouse.</summary>
    public async Task<(CreateLocationOutcome Outcome, ZoneResponse? Zone)> CreateZoneAsync(CreateZoneRequest request, CancellationToken cancellationToken)
    {
        if (!await repository.WarehouseExistsAsync(request.WarehouseId, cancellationToken))
        {
            return (CreateLocationOutcome.ParentNotFound, null);
        }

        if (await repository.ZoneCodeExistsAsync(request.WarehouseId, request.Code, cancellationToken))
        {
            return (CreateLocationOutcome.CodeAlreadyExists, null);
        }

        var zone = new Zone { WarehouseId = request.WarehouseId, Code = request.Code, Name = request.Name };
        repository.Add(zone);

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Unique index on (WarehouseId, Code) caught a race with a concurrent create.
            return (CreateLocationOutcome.CodeAlreadyExists, null);
        }

        return (CreateLocationOutcome.Created, ZoneResponse.FromEntity(zone));
    }

    /// <summary>Creates a new aisle under a zone.</summary>
    public async Task<(CreateLocationOutcome Outcome, AisleResponse? Aisle)> CreateAisleAsync(CreateAisleRequest request, CancellationToken cancellationToken)
    {
        if (!await repository.ZoneExistsAsync(request.ZoneId, cancellationToken))
        {
            return (CreateLocationOutcome.ParentNotFound, null);
        }

        if (await repository.AisleCodeExistsAsync(request.ZoneId, request.Code, cancellationToken))
        {
            return (CreateLocationOutcome.CodeAlreadyExists, null);
        }

        var aisle = new Aisle { ZoneId = request.ZoneId, Code = request.Code, Name = request.Name };
        repository.Add(aisle);

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Unique index on (ZoneId, Code) caught a race with a concurrent create.
            return (CreateLocationOutcome.CodeAlreadyExists, null);
        }

        return (CreateLocationOutcome.Created, AisleResponse.FromEntity(aisle));
    }

    /// <summary>Creates a new bin under an aisle, publishing <c>BinCreated</c>.</summary>
    public async Task<(CreateLocationOutcome Outcome, BinResponse? Bin)> CreateBinAsync(CreateBinRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        var aisle = await repository.GetAisleByIdAsync(request.AisleId, cancellationToken);
        if (aisle is null)
        {
            return (CreateLocationOutcome.ParentNotFound, null);
        }

        if (await repository.BinCodeExistsAsync(request.AisleId, request.Code, cancellationToken))
        {
            return (CreateLocationOutcome.CodeAlreadyExists, null);
        }

        var zone = await repository.GetZoneByIdAsync(aisle.ZoneId, cancellationToken);
        var bin = new Bin { AisleId = request.AisleId, Code = request.Code };
        repository.Add(bin);

        var @event = new BinCreated
        {
            eventId = Guid.NewGuid().ToString(),
            binId = bin.Id.ToString(),
            aisleId = bin.AisleId.ToString(),
            warehouseId = (zone?.WarehouseId ?? Guid.Empty).ToString(),
            code = bin.Code,
            createdOn = bin.CreatedOnUtc.ToString("O"),
        };
        outbox.Enqueue(nameof(BinCreated), JsonSerializer.Serialize(@event), correlationId);

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Unique index on (AisleId, Code) caught a race with a concurrent create.
            return (CreateLocationOutcome.CodeAlreadyExists, null);
        }

        return (CreateLocationOutcome.Created, BinResponse.FromEntity(bin));
    }

    /// <summary>Creates a new dock under a warehouse.</summary>
    public async Task<(CreateLocationOutcome Outcome, DockResponse? Dock)> CreateDockAsync(CreateDockRequest request, CancellationToken cancellationToken)
    {
        if (!await repository.WarehouseExistsAsync(request.WarehouseId, cancellationToken))
        {
            return (CreateLocationOutcome.ParentNotFound, null);
        }

        if (await repository.DockCodeExistsAsync(request.WarehouseId, request.Code, cancellationToken))
        {
            return (CreateLocationOutcome.CodeAlreadyExists, null);
        }

        var dock = new Dock { WarehouseId = request.WarehouseId, Code = request.Code, Name = request.Name };
        repository.Add(dock);

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Unique index on (WarehouseId, Code) caught a race with a concurrent create.
            return (CreateLocationOutcome.CodeAlreadyExists, null);
        }

        return (CreateLocationOutcome.Created, DockResponse.FromEntity(dock));
    }

    /// <summary>Activates or deactivates a zone. Returns <see langword="null"/> if it does not exist.</summary>
    public async Task<ZoneResponse?> SetZoneStatusAsync(Guid id, SetLocationStatusRequest request, CancellationToken cancellationToken)
    {
        var zone = await repository.GetZoneByIdAsync(id, cancellationToken);
        if (zone is null)
        {
            return null;
        }

        zone.IsActive = request.IsActive;
        await repository.SaveChangesAsync(cancellationToken);

        return ZoneResponse.FromEntity(zone);
    }

    /// <summary>Activates or deactivates an aisle. Returns <see langword="null"/> if it does not exist.</summary>
    public async Task<AisleResponse?> SetAisleStatusAsync(Guid id, SetLocationStatusRequest request, CancellationToken cancellationToken)
    {
        var aisle = await repository.GetAisleByIdAsync(id, cancellationToken);
        if (aisle is null)
        {
            return null;
        }

        aisle.IsActive = request.IsActive;
        await repository.SaveChangesAsync(cancellationToken);

        return AisleResponse.FromEntity(aisle);
    }

    /// <summary>
    /// Activates or deactivates a bin, publishing <c>BinStatusChanged</c> when the status
    /// actually changes. Returns <see langword="null"/> if it does not exist.
    /// </summary>
    public async Task<BinResponse?> SetBinStatusAsync(Guid id, SetLocationStatusRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        var bin = await repository.GetBinByIdAsync(id, cancellationToken);
        if (bin is null)
        {
            return null;
        }

        if (bin.IsActive != request.IsActive)
        {
            bin.IsActive = request.IsActive;

            var @event = new BinStatusChanged
            {
                eventId = Guid.NewGuid().ToString(),
                binId = bin.Id.ToString(),
                isActive = bin.IsActive,
                changedOn = DateTimeOffset.UtcNow.ToString("O"),
            };
            outbox.Enqueue(nameof(BinStatusChanged), JsonSerializer.Serialize(@event), correlationId);
        }

        await repository.SaveChangesAsync(cancellationToken);

        return BinResponse.FromEntity(bin);
    }

    /// <summary>Activates or deactivates a dock. Returns <see langword="null"/> if it does not exist.</summary>
    public async Task<DockResponse?> SetDockStatusAsync(Guid id, SetLocationStatusRequest request, CancellationToken cancellationToken)
    {
        var dock = await repository.GetDockByIdAsync(id, cancellationToken);
        if (dock is null)
        {
            return null;
        }

        dock.IsActive = request.IsActive;
        await repository.SaveChangesAsync(cancellationToken);

        return DockResponse.FromEntity(dock);
    }

    /// <summary>
    /// Validates whether a bin is currently usable for putaway/picking operations: it must
    /// exist and be active.
    /// </summary>
    public async Task<LocationValidationResponse> ValidateBinAsync(Guid id, CancellationToken cancellationToken)
    {
        var bin = await repository.GetBinByIdAsync(id, cancellationToken);
        return bin switch
        {
            null => new LocationValidationResponse(false, "Bin does not exist."),
            { IsActive: false } => new LocationValidationResponse(false, "Bin is inactive."),
            _ => new LocationValidationResponse(true, null),
        };
    }

    /// <summary>
    /// Validates whether a dock is currently usable for receiving/shipment staging: it must
    /// exist and be active.
    /// </summary>
    public async Task<LocationValidationResponse> ValidateDockAsync(Guid id, CancellationToken cancellationToken)
    {
        var dock = await repository.GetDockByIdAsync(id, cancellationToken);
        return dock switch
        {
            null => new LocationValidationResponse(false, "Dock does not exist."),
            { IsActive: false } => new LocationValidationResponse(false, "Dock is inactive."),
            _ => new LocationValidationResponse(true, null),
        };
    }

    /// <summary>Builds the full zone/aisle/bin/dock hierarchy for a warehouse.</summary>
    public async Task<WarehouseHierarchyResponse?> GetHierarchyAsync(Guid warehouseId, CancellationToken cancellationToken)
    {
        if (!await repository.WarehouseExistsAsync(warehouseId, cancellationToken))
        {
            return null;
        }

        var (zones, aisles, bins, docks) = await repository.GetHierarchyAsync(warehouseId, cancellationToken);

        var zoneNodes = zones.Select(zone => new ZoneNode(
            zone.Id,
            zone.Code,
            zone.Name,
            zone.IsActive,
            aisles.Where(a => a.ZoneId == zone.Id).Select(aisle => new AisleNode(
                aisle.Id,
                aisle.Code,
                aisle.Name,
                aisle.IsActive,
                bins.Where(b => b.AisleId == aisle.Id).Select(BinResponse.FromEntity).ToList())).ToList())).ToList();

        return new WarehouseHierarchyResponse(warehouseId, zoneNodes, docks.Select(DockResponse.FromEntity).ToList());
    }
}
