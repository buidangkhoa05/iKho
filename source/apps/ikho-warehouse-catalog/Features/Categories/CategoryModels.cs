namespace Ikho.Warehouse.Catalog.Features.Categories;

/// <summary>Request body to create a new product category.</summary>
public sealed record CreateCategoryRequest(string Code, string Name);

/// <summary>Request body to update an existing category.</summary>
public sealed record UpdateCategoryRequest(string Name, bool IsActive);

/// <summary>Response DTO for a product category.</summary>
public sealed record CategoryResponse(Guid Id, string Code, string Name, bool IsActive)
{
    /// <summary>Projects a <see cref="Domain.Category"/> entity to its response DTO.</summary>
    public static CategoryResponse FromEntity(Domain.Category category) =>
        new(category.Id, category.Code, category.Name, category.IsActive);
}
