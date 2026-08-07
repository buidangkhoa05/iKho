using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Warehouse.Catalog.Features.Brands;

/// <summary>Minimal API endpoint mappings for the Brands feature.</summary>
public static class BrandsEndpoints
{
    /// <summary>Maps brand CRUD endpoints under <c>/api/warehouse/catalog/brands</c>.</summary>
    public static IEndpointRouteBuilder MapBrandsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/catalog/brands").WithTags("Brands");

        group.MapPost("/", async Task<Results<Created<BrandResponse>, Conflict<string>, BadRequest<string>>> (
            CreateBrandRequest request,
            BrandsService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, brand) = await service.CreateAsync(request, correlationId, cancellationToken);

            return outcome switch
            {
                CreateBrandOutcome.ValidationFailed => TypedResults.BadRequest("Code and Name are required."),
                CreateBrandOutcome.CodeAlreadyExists => TypedResults.Conflict($"Brand code '{request.Code}' is already in use."),
                _ => TypedResults.Created($"/api/warehouse/catalog/brands/{brand!.Id}", brand),
            };
        });

        group.MapPut("/{id:guid}", async Task<Results<Ok<BrandResponse>, NotFound, BadRequest<string>>> (
            Guid id,
            UpdateBrandRequest request,
            BrandsService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, brand) = await service.UpdateAsync(id, request, correlationId, cancellationToken);

            return outcome switch
            {
                UpdateBrandOutcome.NotFound => TypedResults.NotFound(),
                UpdateBrandOutcome.ValidationFailed => TypedResults.BadRequest("Name is required."),
                _ => TypedResults.Ok(brand!),
            };
        });

        group.MapGet("/{id:guid}", async Task<Results<Ok<BrandResponse>, NotFound>> (
            Guid id,
            BrandsService service,
            CancellationToken cancellationToken) =>
        {
            var brand = await service.GetByIdAsync(id, cancellationToken);
            return brand is null ? TypedResults.NotFound() : TypedResults.Ok(brand);
        });

        group.MapGet("/", async (BrandsService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetAllAsync(cancellationToken)));

        return app;
    }
}
