using Ikho.WarehouseCatalog.Domain;
using Ikho.WarehouseCatalog.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseCatalog.Features.Categories;

/// <summary>Data access for <see cref="Category"/>.</summary>
public interface ICategoryRepository
{
    /// <summary>Finds a category by id, or <see langword="null"/> if not found.</summary>
    Task<Category?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Returns all categories ordered by code.</summary>
    Task<List<Category>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if a category with <paramref name="code"/> already exists.</summary>
    Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken);

    /// <summary>Tracks a new category for insertion.</summary>
    void Add(Category category);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class CategoryRepository(CatalogDbContext dbContext) : ICategoryRepository
{
    /// <inheritdoc />
    public Task<Category?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Categories.SingleOrDefaultAsync(c => c.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<List<Category>> GetAllAsync(CancellationToken cancellationToken) =>
        dbContext.Categories.OrderBy(c => c.Code).ToListAsync(cancellationToken);

    /// <inheritdoc />
    public Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken) =>
        dbContext.Categories.AnyAsync(c => c.Code == code, cancellationToken);

    /// <inheritdoc />
    public void Add(Category category) => dbContext.Categories.Add(category);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
