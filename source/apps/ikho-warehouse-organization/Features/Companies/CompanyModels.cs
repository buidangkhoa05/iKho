namespace Ikho.WarehouseOrganization.Features.Companies;

/// <summary>
/// Request body to create a new <see cref="Domain.Company"/>.
/// </summary>
public sealed record CreateCompanyRequest(string Code, string Name);

/// <summary>
/// Request body to update an existing <see cref="Domain.Company"/>.
/// </summary>
public sealed record UpdateCompanyRequest(string Name, bool IsActive);

/// <summary>
/// Response shape returned for company reads and writes.
/// </summary>
public sealed record CompanyResponse(Guid Id, string Code, string Name, bool IsActive, DateTimeOffset CreatedOnUtc)
{
    /// <summary>
    /// Projects a <see cref="Domain.Company"/> entity to its response DTO.
    /// </summary>
    public static CompanyResponse FromEntity(Domain.Company company) =>
        new(company.Id, company.Code, company.Name, company.IsActive, company.CreatedOnUtc);
}
