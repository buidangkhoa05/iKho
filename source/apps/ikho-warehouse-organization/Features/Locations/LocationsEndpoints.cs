using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Warehouse.Organization.Features.Locations;

/// <summary>
/// Minimal API endpoint mappings for the Locations feature (zones, aisles, bins, docks, and
/// bin/dock validation).
/// </summary>
public static class LocationsEndpoints
{
    /// <summary>
    /// Maps zone/aisle/bin/dock CRUD, status-change, validation, and hierarchy endpoints under
    /// <c>/api/warehouse/organization</c>.
    /// </summary>
    public static IEndpointRouteBuilder MapLocationsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/organization").WithTags("Locations");

        group.MapPost("/zones", async Task<Results<Created<ZoneResponse>, NotFound<string>, Conflict<string>, BadRequest<string>>> (
            CreateZoneRequest request, LocationsService service, CancellationToken cancellationToken) =>
        {
            var (outcome, zone) = await service.CreateZoneAsync(request, cancellationToken);
            return outcome switch
            {
                CreateLocationOutcome.ValidationFailed => TypedResults.BadRequest("Code and Name are required."),
                CreateLocationOutcome.ParentNotFound => TypedResults.NotFound($"Warehouse '{request.WarehouseId}' does not exist."),
                CreateLocationOutcome.CodeAlreadyExists => TypedResults.Conflict($"Zone code '{request.Code}' is already in use for this warehouse."),
                _ => TypedResults.Created($"/api/warehouse/organization/zones/{zone!.Id}", zone),
            };
        });

        group.MapPatch("/zones/{id:guid}/status", async Task<Results<Ok<ZoneResponse>, NotFound>> (
            Guid id, SetLocationStatusRequest request, LocationsService service, CancellationToken cancellationToken) =>
        {
            var zone = await service.SetZoneStatusAsync(id, request, cancellationToken);
            return zone is null ? TypedResults.NotFound() : TypedResults.Ok(zone);
        });

        group.MapPost("/aisles", async Task<Results<Created<AisleResponse>, NotFound<string>, Conflict<string>, BadRequest<string>>> (
            CreateAisleRequest request, LocationsService service, CancellationToken cancellationToken) =>
        {
            var (outcome, aisle) = await service.CreateAisleAsync(request, cancellationToken);
            return outcome switch
            {
                CreateLocationOutcome.ValidationFailed => TypedResults.BadRequest("Code and Name are required."),
                CreateLocationOutcome.ParentNotFound => TypedResults.NotFound($"Zone '{request.ZoneId}' does not exist."),
                CreateLocationOutcome.CodeAlreadyExists => TypedResults.Conflict($"Aisle code '{request.Code}' is already in use for this zone."),
                _ => TypedResults.Created($"/api/warehouse/organization/aisles/{aisle!.Id}", aisle),
            };
        });

        group.MapPatch("/aisles/{id:guid}/status", async Task<Results<Ok<AisleResponse>, NotFound>> (
            Guid id, SetLocationStatusRequest request, LocationsService service, CancellationToken cancellationToken) =>
        {
            var aisle = await service.SetAisleStatusAsync(id, request, cancellationToken);
            return aisle is null ? TypedResults.NotFound() : TypedResults.Ok(aisle);
        });

        group.MapPost("/bins", async Task<Results<Created<BinResponse>, NotFound<string>, Conflict<string>, BadRequest<string>>> (
            CreateBinRequest request, LocationsService service, HttpContext httpContext, CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, bin) = await service.CreateBinAsync(request, correlationId, cancellationToken);
            return outcome switch
            {
                CreateLocationOutcome.ValidationFailed => TypedResults.BadRequest("Code is required."),
                CreateLocationOutcome.ParentNotFound => TypedResults.NotFound($"Aisle '{request.AisleId}' does not exist."),
                CreateLocationOutcome.CodeAlreadyExists => TypedResults.Conflict($"Bin code '{request.Code}' is already in use for this aisle."),
                _ => TypedResults.Created($"/api/warehouse/organization/bins/{bin!.Id}", bin),
            };
        });

        group.MapPatch("/bins/{id:guid}/status", async Task<Results<Ok<BinResponse>, NotFound>> (
            Guid id, SetLocationStatusRequest request, LocationsService service, HttpContext httpContext, CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var bin = await service.SetBinStatusAsync(id, request, correlationId, cancellationToken);
            return bin is null ? TypedResults.NotFound() : TypedResults.Ok(bin);
        });

        group.MapGet("/bins/{id:guid}/validate", async (Guid id, LocationsService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.ValidateBinAsync(id, cancellationToken)));

        group.MapPost("/docks", async Task<Results<Created<DockResponse>, NotFound<string>, Conflict<string>, BadRequest<string>>> (
            CreateDockRequest request, LocationsService service, CancellationToken cancellationToken) =>
        {
            var (outcome, dock) = await service.CreateDockAsync(request, cancellationToken);
            return outcome switch
            {
                CreateLocationOutcome.ValidationFailed => TypedResults.BadRequest("Code and Name are required."),
                CreateLocationOutcome.ParentNotFound => TypedResults.NotFound($"Warehouse '{request.WarehouseId}' does not exist."),
                CreateLocationOutcome.CodeAlreadyExists => TypedResults.Conflict($"Dock code '{request.Code}' is already in use for this warehouse."),
                _ => TypedResults.Created($"/api/warehouse/organization/docks/{dock!.Id}", dock),
            };
        });

        group.MapPatch("/docks/{id:guid}/status", async Task<Results<Ok<DockResponse>, NotFound>> (
            Guid id, SetLocationStatusRequest request, LocationsService service, CancellationToken cancellationToken) =>
        {
            var dock = await service.SetDockStatusAsync(id, request, cancellationToken);
            return dock is null ? TypedResults.NotFound() : TypedResults.Ok(dock);
        });

        group.MapGet("/docks/{id:guid}/validate", async (Guid id, LocationsService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.ValidateDockAsync(id, cancellationToken)));

        group.MapGet("/warehouses/{warehouseId:guid}/hierarchy", async Task<Results<Ok<WarehouseHierarchyResponse>, NotFound>> (
            Guid warehouseId, LocationsService service, CancellationToken cancellationToken) =>
        {
            var hierarchy = await service.GetHierarchyAsync(warehouseId, cancellationToken);
            return hierarchy is null ? TypedResults.NotFound() : TypedResults.Ok(hierarchy);
        });

        return app;
    }
}
