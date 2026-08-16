using System.Net;
using System.Net.Http.Json;

namespace Ikho.Identity.Shared.Organization;

/// <inheritdoc cref="IOrganizationLookupClient" />
public sealed class OrganizationLookupClient(HttpClient httpClient) : IOrganizationLookupClient
{
    private sealed record CompanyLookupResponse(Guid Id);

    private sealed record WarehouseLookupResponse(Guid Id, Guid CompanyId);

    /// <inheritdoc />
    public async Task<Guid?> GetCompanyIdByExternalOrgIdAsync(string externalOrgId, CancellationToken cancellationToken)
    {
        var response = await httpClient.GetAsync($"/api/warehouse/organization/companies/by-external-org/{Uri.EscapeDataString(externalOrgId)}", cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();
        var company = await response.Content.ReadFromJsonAsync<CompanyLookupResponse>(cancellationToken: cancellationToken);
        return company?.Id;
    }

    /// <inheritdoc />
    public async Task<bool> WarehouseExistsAsync(Guid companyId, Guid warehouseId, CancellationToken cancellationToken)
    {
        var response = await httpClient.GetAsync($"/api/warehouse/organization/warehouses/{warehouseId}", cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }

        response.EnsureSuccessStatusCode();
        var warehouse = await response.Content.ReadFromJsonAsync<WarehouseLookupResponse>(cancellationToken: cancellationToken);
        return warehouse is not null && warehouse.CompanyId == companyId;
    }
}
