using Ikho.Warehouse.Catalog.Domain;
using Ikho.Warehouse.Catalog.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Catalog.Features.UnitsOfMeasure;

/// <summary>Data access for <see cref="UnitOfMeasure"/>.</summary>
public interface IUomRepository
{
    /// <summary>Finds a UOM by id, or <see langword="null"/> if not found.</summary>
    Task<UnitOfMeasure?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Returns all UOMs ordered by code.</summary>
    Task<List<UnitOfMeasure>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if a UOM with <paramref name="code"/> already exists.</summary>
    Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken);

    /// <summary>Tracks a new UOM for insertion.</summary>
    void Add(UnitOfMeasure uom);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class UomRepository(CatalogDbContext dbContext) : IUomRepository
{
    /// <inheritdoc />
    public Task<UnitOfMeasure?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.UnitsOfMeasure.SingleOrDefaultAsync(u => u.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<List<UnitOfMeasure>> GetAllAsync(CancellationToken cancellationToken) =>
        dbContext.UnitsOfMeasure.OrderBy(u => u.Code).ToListAsync(cancellationToken);

    /// <inheritdoc />
    public Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken) =>
        dbContext.UnitsOfMeasure.AnyAsync(u => u.Code == code, cancellationToken);

    /// <inheritdoc />
    public void Add(UnitOfMeasure uom) => dbContext.UnitsOfMeasure.Add(uom);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
