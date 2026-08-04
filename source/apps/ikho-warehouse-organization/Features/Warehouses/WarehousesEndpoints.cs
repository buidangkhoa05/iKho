using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehouseOrganization.Features.Warehouses;

/// <summary>
/// Minimal API endpoint mappings for the Warehouses feature.
/// </summary>
public static class WarehousesEndpoints
{
    /// <summary>
    /// Maps warehouse CRUD and status-change endpoints under
    /// <c>/api/warehouse/organization/warehouses</c>.
    /// </summary>
    public static IEndpointRouteBuilder MapWarehousesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/organization/warehouses").WithTags("Warehouses");

        group.MapPost("/", async Task<Results<Created<WarehouseResponse>, NotFound<string>, Conflict<string>>> (
            CreateWarehouseRequest request,
            WarehousesService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, warehouse) = await service.CreateAsync(request, correlationId, cancellationToken);

            return outcome switch
            {
                CreateWarehouseOutcome.CompanyNotFound =>
                    TypedResults.NotFound($"Company '{request.CompanyId}' does not exist."),
                CreateWarehouseOutcome.CodeAlreadyExists =>
                    TypedResults.Conflict($"Warehouse code '{request.Code}' is already in use for this company."),
                _ => TypedResults.Created($"/api/warehouse/organization/warehouses/{warehouse!.Id}", warehouse),
            };
        });

        group.MapPut("/{id:guid}", async Task<Results<Ok<WarehouseResponse>, NotFound>> (
            Guid id,
            UpdateWarehouseRequest request,
            WarehousesService service,
            CancellationToken cancellationToken) =>
        {
            var warehouse = await service.UpdateAsync(id, request, cancellationToken);
            return warehouse is null ? TypedResults.NotFound() : TypedResults.Ok(warehouse);
        });

        group.MapPatch("/{id:guid}/status", async Task<Results<Ok<WarehouseResponse>, NotFound>> (
            Guid id,
            SetWarehouseStatusRequest request,
            WarehousesService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var warehouse = await service.SetStatusAsync(id, request, correlationId, cancellationToken);
            return warehouse is null ? TypedResults.NotFound() : TypedResults.Ok(warehouse);
        });

        group.MapGet("/{id:guid}", async Task<Results<Ok<WarehouseResponse>, NotFound>> (
            Guid id,
            WarehousesService service,
            CancellationToken cancellationToken) =>
        {
            var warehouse = await service.GetByIdAsync(id, cancellationToken);
            return warehouse is null ? TypedResults.NotFound() : TypedResults.Ok(warehouse);
        });

        group.MapGet("/", async (Guid? companyId, WarehousesService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetAllAsync(companyId, cancellationToken)));

        return app;
    }
}
