using System.Text.Json;
using Ikho.SharedLibrary.Outbox;
using Ikho.SchemaManagement.Contracts.WarehouseOrganization.Events.V1;
using Ikho.Warehouse.Organization.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Organization.Features.Companies;

/// <summary>
/// Business logic for creating, updating, and reading companies. Publishes
/// <c>CompanyCreated</c> via the transactional outbox on creation.
/// </summary>
public sealed class CompaniesService(ICompanyRepository repository, IOutboxWriter outbox)
{
    /// <summary>
    /// Creates a new company. Returns <see langword="null"/> if <paramref name="request"/>'s
    /// code is already in use.
    /// </summary>
    public async Task<CompanyResponse?> CreateAsync(CreateCompanyRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (await repository.CodeExistsAsync(request.Code, cancellationToken))
        {
            return null;
        }

        var company = new Company
        {
            Code = request.Code,
            Name = request.Name,
        };

        repository.Add(company);

        var @event = new CompanyCreated
        {
            eventId = Guid.NewGuid().ToString(),
            companyId = company.Id.ToString(),
            code = company.Code,
            name = company.Name,
            createdOn = company.CreatedOnUtc.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(CompanyCreated), JsonSerializer.Serialize(@event), correlationId));

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Unique index on Code caught a race with a concurrent create using the same
            // upfront-checked code; treat it the same as the pre-check failing.
            return null;
        }

        return CompanyResponse.FromEntity(company);
    }

    /// <summary>
    /// Updates an existing company's name and active status. Returns <see langword="null"/> if
    /// the company does not exist.
    /// </summary>
    public async Task<CompanyResponse?> UpdateAsync(Guid id, UpdateCompanyRequest request, CancellationToken cancellationToken)
    {
        var company = await repository.GetByIdAsync(id, cancellationToken);
        if (company is null)
        {
            return null;
        }

        company.Name = request.Name;
        company.IsActive = request.IsActive;

        await repository.SaveChangesAsync(cancellationToken);

        return CompanyResponse.FromEntity(company);
    }

    /// <summary>
    /// Returns a single company by id, or <see langword="null"/> if it does not exist.
    /// </summary>
    public async Task<CompanyResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var company = await repository.GetByIdAsync(id, cancellationToken);
        return company is null ? null : CompanyResponse.FromEntity(company);
    }

    /// <summary>
    /// Returns all companies ordered by code.
    /// </summary>
    public async Task<IReadOnlyList<CompanyResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var companies = await repository.GetAllAsync(cancellationToken);
        return companies.Select(CompanyResponse.FromEntity).ToList();
    }
}
