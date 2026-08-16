using System.Text.Json;
using Ikho.SharedLibrary.Outbox;
using Ikho.SchemaManagement.Contracts.WarehouseOrganization.Events.V1;
using Ikho.Warehouse.Organization.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Organization.Features.Companies;

/// <summary>Distinguishes why a company creation attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum CreateCompanyOutcome
{
    /// <summary>The company was created successfully.</summary>
    Created,

    /// <summary>The request failed local validation (a blank code or name).</summary>
    ValidationFailed,

    /// <summary><c>Code</c> is already in use.</summary>
    CodeAlreadyExists,
}

/// <summary>Distinguishes why a company update attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum UpdateCompanyOutcome
{
    /// <summary>The company was updated successfully.</summary>
    Updated,

    /// <summary>The company does not exist.</summary>
    NotFound,

    /// <summary>The request failed local validation (a blank name).</summary>
    ValidationFailed,
}

/// <summary>
/// Business logic for creating, updating, and reading companies. Publishes
/// <c>CompanyCreated</c> via the transactional outbox on creation.
/// </summary>
public sealed class CompaniesService(ICompanyRepository repository, IOutboxWriter outbox)
{
    /// <summary>
    /// Attempts to create a new company. See <see cref="CreateCompanyOutcome"/> for the possible
    /// failure reasons.
    /// </summary>
    public async Task<(CreateCompanyOutcome Outcome, CompanyResponse? Company)> CreateAsync(CreateCompanyRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
        {
            return (CreateCompanyOutcome.ValidationFailed, null);
        }

        if (await repository.CodeExistsAsync(request.Code, cancellationToken))
        {
            return (CreateCompanyOutcome.CodeAlreadyExists, null);
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
            return (CreateCompanyOutcome.CodeAlreadyExists, null);
        }

        return (CreateCompanyOutcome.Created, CompanyResponse.FromEntity(company));
    }

    /// <summary>
    /// Attempts to update an existing company's name and active status. See
    /// <see cref="UpdateCompanyOutcome"/> for the possible failure reasons.
    /// </summary>
    public async Task<(UpdateCompanyOutcome Outcome, CompanyResponse? Company)> UpdateAsync(Guid id, UpdateCompanyRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return (UpdateCompanyOutcome.ValidationFailed, null);
        }

        var company = await repository.GetByIdAsync(id, cancellationToken);
        if (company is null)
        {
            return (UpdateCompanyOutcome.NotFound, null);
        }

        company.Name = request.Name;
        company.IsActive = request.IsActive;
        company.ExternalOrgId = request.ExternalOrgId;

        await repository.SaveChangesAsync(cancellationToken);

        return (UpdateCompanyOutcome.Updated, CompanyResponse.FromEntity(company));
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
