using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Organization.Domain;
using Ikho.Warehouse.Organization.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Organization.Features.Companies;

/// <summary>
/// Data access for <see cref="Company"/>.
/// </summary>
public interface ICompanyRepository
{
    /// <summary>
    /// Finds a company by id, or <see langword="null"/> if it does not exist.
    /// </summary>
    Task<Company?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>
    /// Finds a company by its linked identity-provider organization id, or <see langword="null"/>
    /// if no company is linked to it.
    /// </summary>
    Task<Company?> GetByExternalOrgIdAsync(string externalOrgId, CancellationToken cancellationToken);

    /// <summary>
    /// Returns all companies ordered by code.
    /// </summary>
    Task<List<Company>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Returns <see langword="true"/> if a company with <paramref name="code"/> already exists.
    /// </summary>
    Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken);

    /// <summary>
    /// Tracks a new company for insertion on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(Company company);

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
public sealed class CompanyRepository(OrganizationDbContext dbContext) : ICompanyRepository
{
    /// <inheritdoc />
    public Task<Company?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Companies.SingleOrDefaultAsync(c => c.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<Company?> GetByExternalOrgIdAsync(string externalOrgId, CancellationToken cancellationToken) =>
        dbContext.Companies.SingleOrDefaultAsync(c => c.ExternalOrgId == externalOrgId, cancellationToken);

    /// <inheritdoc />
    public Task<List<Company>> GetAllAsync(CancellationToken cancellationToken) =>
        dbContext.Companies.OrderBy(c => c.Code).ToListAsync(cancellationToken);

    /// <inheritdoc />
    public Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken) =>
        dbContext.Companies.AnyAsync(c => c.Code == code, cancellationToken);

    /// <inheritdoc />
    public void Add(Company company) => dbContext.Companies.Add(company);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
