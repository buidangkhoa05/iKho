using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseCatalog.Features.Categories;

/// <summary>
/// Business logic for creating and updating product categories.
/// </summary>
public sealed class CategoriesService(ICategoryRepository repository)
{
    /// <summary>
    /// Creates a new category. Returns <see langword="null"/> if the code is already in use.
    /// </summary>
    public async Task<CategoryResponse?> CreateAsync(
        CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        if (await repository.CodeExistsAsync(request.Code, cancellationToken))
        {
            return null;
        }

        var category = new Domain.Category { Code = request.Code, Name = request.Name };
        repository.Add(category);

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return null;
        }

        return CategoryResponse.FromEntity(category);
    }

    /// <summary>
    /// Updates an existing category's name and active status. Returns <see langword="null"/> if not found.
    /// </summary>
    public async Task<CategoryResponse?> UpdateAsync(
        Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        var category = await repository.GetByIdAsync(id, cancellationToken);
        if (category is null)
        {
            return null;
        }

        category.Name = request.Name;
        category.IsActive = request.IsActive;
        await repository.SaveChangesAsync(cancellationToken);

        return CategoryResponse.FromEntity(category);
    }

    /// <summary>Returns a single category by id, or <see langword="null"/> if not found.</summary>
    public async Task<CategoryResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var category = await repository.GetByIdAsync(id, cancellationToken);
        return category is null ? null : CategoryResponse.FromEntity(category);
    }

    /// <summary>Returns all categories ordered by code.</summary>
    public async Task<List<CategoryResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var categories = await repository.GetAllAsync(cancellationToken);
        return categories.ConvertAll(CategoryResponse.FromEntity);
    }
}
