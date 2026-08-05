using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseCatalog.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseCatalog.Features.Categories;

/// <summary>
/// Business logic for creating and updating product categories. Publishes <c>CategoryCreated</c>
/// on creation and <c>CategoryUpdated</c> when name or active status changes, via the
/// transactional outbox.
/// </summary>
public sealed class CategoriesService(ICategoryRepository repository, IOutboxWriter outbox)
{
    /// <summary>
    /// Creates a new category. Returns <see langword="null"/> if the code is already in use.
    /// </summary>
    public async Task<CategoryResponse?> CreateAsync(
        CreateCategoryRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (await repository.CodeExistsAsync(request.Code, cancellationToken))
        {
            return null;
        }

        var category = new Domain.Category { Code = request.Code, Name = request.Name };
        repository.Add(category);

        var @event = new CategoryCreated
        {
            eventId = Guid.NewGuid().ToString(),
            categoryId = category.Id.ToString(),
            code = category.Code,
            name = category.Name,
            createdOn = DateTimeOffset.UtcNow.ToString("O"),
        };
        outbox.Enqueue(nameof(CategoryCreated), JsonSerializer.Serialize(@event), correlationId);

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
    /// Updates an existing category's name and active status, publishing <c>CategoryUpdated</c>
    /// only when a field actually changes. Returns <see langword="null"/> if not found.
    /// </summary>
    public async Task<CategoryResponse?> UpdateAsync(
        Guid id, UpdateCategoryRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        var category = await repository.GetByIdAsync(id, cancellationToken);
        if (category is null)
        {
            return null;
        }

        if (category.Name != request.Name || category.IsActive != request.IsActive)
        {
            category.Name = request.Name;
            category.IsActive = request.IsActive;

            var @event = new CategoryUpdated
            {
                eventId = Guid.NewGuid().ToString(),
                categoryId = category.Id.ToString(),
                code = category.Code,
                name = category.Name,
                isActive = category.IsActive,
                updatedOn = DateTimeOffset.UtcNow.ToString("O"),
            };
            outbox.Enqueue(nameof(CategoryUpdated), JsonSerializer.Serialize(@event), correlationId);

            await repository.SaveChangesAsync(cancellationToken);
        }

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
