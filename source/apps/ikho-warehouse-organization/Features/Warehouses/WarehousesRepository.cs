using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseOrganization.Domain;
using Ikho.WarehouseOrganization.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseOrganization.Features.Warehouses;

/// <summary>
/// Data access for <see cref="Warehouse"/>, including the company-existence check needed to
/// validate warehouse creation.
/// </summary>
/// <remarks>
/// <see cref="CompanyExistsAsync"/> reads the <c>Companies</c> table, which is owned by the
/// Companies slice. This is an intentional, narrow exception to the "slices should not
/// reference other slices" rule: a parent-existence check is a simple, read-only
/// <c>AnyAsync</c> lookup against the shared <see cref="Shared.OrganizationDbContext"/> rather
/// than a call into another slice's repository/service. Cross-slice writes or business logic
/// must still go through the owning slice's service.
/// </remarks>
public interface IWarehouseRepository
{
    /// <summary>
    /// Finds a warehouse by id, or <see langword="null"/> if it does not exist.
    /// </summary>
    Task<Warehouse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>
    /// Returns all warehouses for <paramref name="companyId"/>, or all warehouses if
    /// <paramref name="companyId"/> is <see langword="null"/>, ordered by code.
    /// </summary>
    Task<List<Warehouse>> GetAllAsync(Guid? companyId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns <see langword="true"/> if a company with <paramref name="companyId"/> exists.
    /// </summary>
    Task<bool> CompanyExistsAsync(Guid companyId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns <see langword="true"/> if <paramref name="code"/> is already used by another
    /// warehouse within <paramref name="companyId"/>.
    /// </summary>
    Task<bool> CodeExistsAsync(Guid companyId, string code, CancellationToken cancellationToken);

    /// <summary>
    /// Tracks a new warehouse for insertion on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(Warehouse warehouse);

    /// <summary>
    /// Tracks a new outbox message for insertion so it commits atomically with the business
    /// write on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(OutboxMessage message);

    /// <summary>
    /// Persists tracked changes to the database.
    /// </summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class WarehouseRepository(OrganizationDbContext dbContext) : IWarehouseRepository
{
    /// <inheritdoc />
    public Task<Warehouse?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Warehouses.SingleOrDefaultAsync(w => w.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<List<Warehouse>> GetAllAsync(Guid? companyId, CancellationToken cancellationToken)
    {
        var query = dbContext.Warehouses.AsQueryable();
        if (companyId is { } id)
        {
            query = query.Where(w => w.CompanyId == id);
        }

        return query.OrderBy(w => w.Code).ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public Task<bool> CompanyExistsAsync(Guid companyId, CancellationToken cancellationToken) =>
        dbContext.Companies.AnyAsync(c => c.Id == companyId, cancellationToken);

    /// <inheritdoc />
    public Task<bool> CodeExistsAsync(Guid companyId, string code, CancellationToken cancellationToken) =>
        dbContext.Warehouses.AnyAsync(w => w.CompanyId == companyId && w.Code == code, cancellationToken);

    /// <inheritdoc />
    public void Add(Warehouse warehouse) => dbContext.Warehouses.Add(warehouse);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
