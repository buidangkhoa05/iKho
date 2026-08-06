using System.Net;
using System.Net.Http.Json;

namespace Ikho.WarehouseReturns.Shared.Clients;

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
        return warehouse is null ? null : new OrganizationWarehouseInfo(warehouse.Id, warehouse.IsActive);
    }

    /// <summary>
    /// Local mirror of only the fields Returns needs from Organization's
    /// <c>Ikho.WarehouseOrganization.Features.Warehouses.WarehouseResponse</c>.
    /// </summary>
    private sealed record WarehouseResponseShape(Guid Id, bool IsActive);
}
