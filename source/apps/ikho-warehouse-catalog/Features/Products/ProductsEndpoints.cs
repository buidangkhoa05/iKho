using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehouseCatalog.Features.Products;

/// <summary>
/// Minimal API endpoint mappings for the Products feature, including barcode management.
/// </summary>
public static class ProductsEndpoints
{
    /// <summary>
    /// Maps product CRUD and barcode endpoints under
    /// <c>/api/warehouse/catalog/products</c>.
    /// </summary>
    public static IEndpointRouteBuilder MapProductsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/catalog/products").WithTags("Products");

        group.MapPost("/", async Task<Results<Created<ProductResponse>, Conflict<string>>> (
            CreateProductRequest request,
            ProductsService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var product = await service.CreateAsync(request, correlationId, cancellationToken);

            return product is null
                ? TypedResults.Conflict($"SKU '{request.Sku}' is already in use.")
                : TypedResults.Created($"/api/warehouse/catalog/products/{product.Id}", product);
        });

        group.MapPut("/{id:guid}", async Task<Results<Ok<ProductResponse>, NotFound>> (
            Guid id,
            UpdateProductRequest request,
            ProductsService service,
            CancellationToken cancellationToken) =>
        {
            var product = await service.UpdateAsync(id, request, cancellationToken);
            return product is null ? TypedResults.NotFound() : TypedResults.Ok(product);
        });

        group.MapPatch("/{id:guid}/status", async Task<Results<Ok<ProductResponse>, NotFound>> (
            Guid id,
            SetProductStatusRequest request,
            ProductsService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var product = await service.SetStatusAsync(id, request, correlationId, cancellationToken);
            return product is null ? TypedResults.NotFound() : TypedResults.Ok(product);
        });

        group.MapGet("/{id:guid}", async Task<Results<Ok<ProductResponse>, NotFound>> (
            Guid id,
            ProductsService service,
            CancellationToken cancellationToken) =>
        {
            var product = await service.GetByIdAsync(id, cancellationToken);
            return product is null ? TypedResults.NotFound() : TypedResults.Ok(product);
        });

        group.MapGet("/by-sku/{sku}", async Task<Results<Ok<ProductResponse>, NotFound>> (
            string sku,
            ProductsService service,
            CancellationToken cancellationToken) =>
        {
            var product = await service.GetBySkuAsync(sku, cancellationToken);
            return product is null ? TypedResults.NotFound() : TypedResults.Ok(product);
        });

        group.MapGet("/", async (ProductsService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetAllAsync(cancellationToken)));

        group.MapPost("/{id:guid}/barcodes",
            async Task<Results<Created<BarcodeResponse>, NotFound<string>, Conflict<string>>> (
                Guid id,
                AddBarcodeRequest request,
                ProductsService service,
                CancellationToken cancellationToken) =>
        {
            var (outcome, barcode) = await service.AddBarcodeAsync(id, request, cancellationToken);

            return outcome switch
            {
                AddBarcodeOutcome.ProductNotFound =>
                    TypedResults.NotFound($"Product '{id}' not found."),
                AddBarcodeOutcome.CodeAlreadyExists =>
                    TypedResults.Conflict($"Barcode '{request.Code}' is already registered."),
                _ => TypedResults.Created(
                    $"/api/warehouse/catalog/products/{id}/barcodes/{barcode!.Id}", barcode),
            };
        });

        return app;
    }
}
