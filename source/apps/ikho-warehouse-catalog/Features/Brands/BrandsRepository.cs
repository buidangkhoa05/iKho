using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Catalog.Domain;
using Ikho.Warehouse.Catalog.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Catalog.Features.Brands;

/// <summary>Data access for <see cref="Brand"/>.</summary>
public interface IBrandRepository
{
    /// <summary>Finds a brand by id, or <see langword="null"/> if not found.</summary>
    Task<Brand?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Returns all brands ordered by code.</summary>
    Task<List<Brand>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if a brand with <paramref name="code"/> already exists.</summary>
    Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken);

    /// <summary>Tracks a new brand for insertion.</summary>
    void Add(Brand brand);

    /// <summary>
    /// Tracks a new outbox message for insertion so it commits atomically with the business
    /// write on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(OutboxMessage message);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class BrandRepository(CatalogDbContext dbContext) : IBrandRepository
{
    /// <inheritdoc />
    public Task<Brand?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Brands.SingleOrDefaultAsync(b => b.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<List<Brand>> GetAllAsync(CancellationToken cancellationToken) =>
        dbContext.Brands.OrderBy(b => b.Code).ToListAsync(cancellationToken);

    /// <inheritdoc />
    public Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken) =>
        dbContext.Brands.AnyAsync(b => b.Code == code, cancellationToken);

    /// <inheritdoc />
    public void Add(Brand brand) => dbContext.Brands.Add(brand);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
