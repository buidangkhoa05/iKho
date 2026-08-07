using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Warehouse.Catalog.Features.UnitsOfMeasure;

/// <summary>Minimal API endpoint mappings for the Units of Measure feature.</summary>
public static class UnitsOfMeasureEndpoints
{
    /// <summary>
    /// Maps UOM CRUD endpoints under <c>/api/warehouse/catalog/units-of-measure</c>.
    /// </summary>
    public static IEndpointRouteBuilder MapUnitsOfMeasureEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/catalog/units-of-measure").WithTags("UnitsOfMeasure");

        group.MapPost("/", async Task<Results<Created<UomResponse>, Conflict<string>, BadRequest<string>>> (
            CreateUomRequest request,
            UnitsOfMeasureService service,
            CancellationToken cancellationToken) =>
        {
            var (outcome, uom) = await service.CreateAsync(request, cancellationToken);

            return outcome switch
            {
                CreateUomOutcome.ValidationFailed => TypedResults.BadRequest("Code and Name are required."),
                CreateUomOutcome.CodeAlreadyExists => TypedResults.Conflict($"UOM code '{request.Code}' is already in use."),
                _ => TypedResults.Created($"/api/warehouse/catalog/units-of-measure/{uom!.Id}", uom),
            };
        });

        group.MapPut("/{id:guid}", async Task<Results<Ok<UomResponse>, NotFound, BadRequest<string>>> (
            Guid id,
            UpdateUomRequest request,
            UnitsOfMeasureService service,
            CancellationToken cancellationToken) =>
        {
            var (outcome, uom) = await service.UpdateAsync(id, request, cancellationToken);

            return outcome switch
            {
                UpdateUomOutcome.NotFound => TypedResults.NotFound(),
                UpdateUomOutcome.ValidationFailed => TypedResults.BadRequest("Name is required."),
                _ => TypedResults.Ok(uom!),
            };
        });

        group.MapGet("/{id:guid}", async Task<Results<Ok<UomResponse>, NotFound>> (
            Guid id,
            UnitsOfMeasureService service,
            CancellationToken cancellationToken) =>
        {
            var uom = await service.GetByIdAsync(id, cancellationToken);
            return uom is null ? TypedResults.NotFound() : TypedResults.Ok(uom);
        });

        group.MapGet("/", async (UnitsOfMeasureService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetAllAsync(cancellationToken)));

        return app;
    }
}
