using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Warehouse.Catalog.Features.Categories;

/// <summary>
/// Minimal API endpoint mappings for the Categories feature.
/// </summary>
public static class CategoriesEndpoints
{
    /// <summary>
    /// Maps category CRUD endpoints under <c>/api/warehouse/catalog/categories</c>.
    /// </summary>
    public static IEndpointRouteBuilder MapCategoriesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/catalog/categories").WithTags("Categories");

        group.MapPost("/", async Task<Results<Created<CategoryResponse>, Conflict<string>, BadRequest<string>>> (
            CreateCategoryRequest request,
            CategoriesService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, category) = await service.CreateAsync(request, correlationId, cancellationToken);

            return outcome switch
            {
                CreateCategoryOutcome.ValidationFailed => TypedResults.BadRequest("Code and Name are required."),
                CreateCategoryOutcome.CodeAlreadyExists => TypedResults.Conflict($"Category code '{request.Code}' is already in use."),
                _ => TypedResults.Created($"/api/warehouse/catalog/categories/{category!.Id}", category),
            };
        });

        group.MapPut("/{id:guid}", async Task<Results<Ok<CategoryResponse>, NotFound, BadRequest<string>>> (
            Guid id,
            UpdateCategoryRequest request,
            CategoriesService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, category) = await service.UpdateAsync(id, request, correlationId, cancellationToken);

            return outcome switch
            {
                UpdateCategoryOutcome.NotFound => TypedResults.NotFound(),
                UpdateCategoryOutcome.ValidationFailed => TypedResults.BadRequest("Name is required."),
                _ => TypedResults.Ok(category!),
            };
        });

        group.MapGet("/{id:guid}", async Task<Results<Ok<CategoryResponse>, NotFound>> (
            Guid id,
            CategoriesService service,
            CancellationToken cancellationToken) =>
        {
            var category = await service.GetByIdAsync(id, cancellationToken);
            return category is null ? TypedResults.NotFound() : TypedResults.Ok(category);
        });

        group.MapGet("/", async (CategoriesService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetAllAsync(cancellationToken)));

        return app;
    }
}
