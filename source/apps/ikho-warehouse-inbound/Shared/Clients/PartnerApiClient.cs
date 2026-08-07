using System.Net;
using System.Net.Http.Json;

namespace Ikho.Warehouse.Inbound.Shared.Clients;

/// <inheritdoc cref="IPartnerApiClient" />
public sealed class PartnerApiClient(HttpClient httpClient) : IPartnerApiClient
{
    /// <inheritdoc />
    public async Task<PartnerSupplierInfo?> GetSupplierAsync(Guid supplierId, CancellationToken cancellationToken)
    {
        using var response = await httpClient.GetAsync($"/api/warehouse/partner/suppliers/{supplierId}", cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        var supplier = await response.Content.ReadFromJsonAsync<SupplierResponseShape>(cancellationToken);
        return supplier is null
            ? null
            : new PartnerSupplierInfo(supplier.Id, supplier.Code, supplier.Name, supplier.IsActive);
    }

    /// <summary>
    /// Local mirror of only the fields Inbound needs from Partner's
    /// <c>Ikho.Warehouse.Partner.Features.Suppliers.SupplierResponse</c>. Deserializing loosely
    /// against a narrow local shape means unrelated fields added to the Partner response never
    /// break this client.
    /// </summary>
    private sealed record SupplierResponseShape(Guid Id, string Code, string Name, bool IsActive);
}
