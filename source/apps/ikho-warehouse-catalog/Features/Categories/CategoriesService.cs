using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseCatalog.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Catalog.Features.Categories;

/// <summary>Distinguishes why a category creation attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum CreateCategoryOutcome
{
    /// <summary>The category was created successfully.</summary>
    Created,

    /// <summary>The request failed local validation (a blank code or name).</summary>
    ValidationFailed,

    /// <summary><c>Code</c> is already in use.</summary>
    CodeAlreadyExists,
}

/// <summary>Distinguishes why a category update attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum UpdateCategoryOutcome
{
    /// <summary>The category was updated successfully.</summary>
    Updated,

    /// <summary>The category does not exist.</summary>
    NotFound,

    /// <summary>The request failed local validation (a blank name).</summary>
    ValidationFailed,
}

/// <summary>
/// Business logic for creating and updating product categories. Publishes <c>CategoryCreated</c>
/// on creation and <c>CategoryUpdated</c> when name or active status changes, via the
/// transactional outbox.
/// </summary>
public sealed class CategoriesService(ICategoryRepository repository, IOutboxWriter outbox)
{
    /// <summary>
    /// Attempts to create a new category. See <see cref="CreateCategoryOutcome"/> for the
    /// possible failure reasons.
    /// </summary>
    public async Task<(CreateCategoryOutcome Outcome, CategoryResponse? Category)> CreateAsync(
        CreateCategoryRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
        {
            return (CreateCategoryOutcome.ValidationFailed, null);
        }

        if (await repository.CodeExistsAsync(request.Code, cancellationToken))
        {
            return (CreateCategoryOutcome.CodeAlreadyExists, null);
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
        repository.Add(outbox.Enqueue(nameof(CategoryCreated), JsonSerializer.Serialize(@event), correlationId));

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return (CreateCategoryOutcome.CodeAlreadyExists, null);
        }

        return (CreateCategoryOutcome.Created, CategoryResponse.FromEntity(category));
    }

    /// <summary>
    /// Attempts to update an existing category's name and active status, publishing
    /// <c>CategoryUpdated</c> only when a field actually changes. See
    /// <see cref="UpdateCategoryOutcome"/> for the possible failure reasons.
    /// </summary>
    public async Task<(UpdateCategoryOutcome Outcome, CategoryResponse? Category)> UpdateAsync(
        Guid id, UpdateCategoryRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return (UpdateCategoryOutcome.ValidationFailed, null);
        }

        var category = await repository.GetByIdAsync(id, cancellationToken);
        if (category is null)
        {
            return (UpdateCategoryOutcome.NotFound, null);
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
            repository.Add(outbox.Enqueue(nameof(CategoryUpdated), JsonSerializer.Serialize(@event), correlationId));

            await repository.SaveChangesAsync(cancellationToken);
        }

        return (UpdateCategoryOutcome.Updated, CategoryResponse.FromEntity(category));
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
