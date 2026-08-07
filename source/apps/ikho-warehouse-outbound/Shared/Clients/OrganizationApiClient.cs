using System.Net;
using System.Net.Http.Json;

namespace Ikho.Warehouse.Outbound.Shared.Clients;

/// <inheritdoc cref="IOrganizationApiClient" />
public sealed class OrganizationApiClient(HttpClient httpClient) : IOrganizationApiClient
{
    /// <inheritdoc />
    public async Task<OrganizationWarehouseInfo?> GetWarehouseAsync(Guid warehouseId, CancellationToken cancellationToken)
    {
        using var response = await httpClient.GetAsync($"/api/warehouse/organization/warehouses/{warehouseId}", cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        var warehouse = await response.Content.ReadFromJsonAsync<WarehouseResponseShape>(cancellationToken);
        return warehouse is null
            ? null
            : new OrganizationWarehouseInfo(warehouse.Id, warehouse.CompanyId, warehouse.Code, warehouse.Name, warehouse.IsActive);
    }

    /// <summary>
    /// Local mirror of only the fields Outbound needs from Organization's
    /// <c>Ikho.Warehouse.Organization.Features.Warehouses.WarehouseResponse</c>.
    /// </summary>
    private sealed record WarehouseResponseShape(Guid Id, Guid CompanyId, string Code, string Name, bool IsActive);
}
