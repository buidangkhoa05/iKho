using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehouseCatalog.Features.Brands;

/// <summary>Minimal API endpoint mappings for the Brands feature.</summary>
public static class BrandsEndpoints
{
    /// <summary>Maps brand CRUD endpoints under <c>/api/warehouse/catalog/brands</c>.</summary>
    public static IEndpointRouteBuilder MapBrandsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/catalog/brands").WithTags("Brands");

        group.MapPost("/", async Task<Results<Created<BrandResponse>, Conflict<string>>> (
            CreateBrandRequest request,
            BrandsService service,
            CancellationToken cancellationToken) =>
        {
            var brand = await service.CreateAsync(request, cancellationToken);

            return brand is null
                ? TypedResults.Conflict($"Brand code '{request.Code}' is already in use.")
                : TypedResults.Created($"/api/warehouse/catalog/brands/{brand.Id}", brand);
        });

        group.MapPut("/{id:guid}", async Task<Results<Ok<BrandResponse>, NotFound>> (
            Guid id,
            UpdateBrandRequest request,
            BrandsService service,
            CancellationToken cancellationToken) =>
        {
            var brand = await service.UpdateAsync(id, request, cancellationToken);
            return brand is null ? TypedResults.NotFound() : TypedResults.Ok(brand);
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
