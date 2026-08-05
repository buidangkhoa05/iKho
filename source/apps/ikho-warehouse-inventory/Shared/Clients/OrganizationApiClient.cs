using System.Net;
using System.Net.Http.Json;

namespace Ikho.WarehouseInventory.Shared.Clients;

/// <inheritdoc cref="IOrganizationApiClient" />
public sealed class OrganizationApiClient(HttpClient httpClient) : IOrganizationApiClient
{
    /// <inheritdoc />
    public async Task<BinValidationInfo> ValidateBinAsync(Guid binId, CancellationToken cancellationToken)
    {
        using var response = await httpClient.GetAsync($"/api/warehouse/organization/bins/{binId}/validate", cancellationToken);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<LocationValidationResponseShape>(cancellationToken);
        return new BinValidationInfo(result?.IsValid ?? false, result?.Reason);
    }

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
    /// Local mirror of Organization's
    /// <c>Ikho.WarehouseOrganization.Features.Locations.LocationValidationResponse</c>.
    /// </summary>
    private sealed record LocationValidationResponseShape(bool IsValid, string? Reason);

    /// <summary>
    /// Local mirror of only the fields Inventory needs from Organization's
    /// <c>Ikho.WarehouseOrganization.Features.Warehouses.WarehouseResponse</c>.
    /// </summary>
    private sealed record WarehouseResponseShape(Guid Id, Guid CompanyId, string Code, string Name, bool IsActive);
}
