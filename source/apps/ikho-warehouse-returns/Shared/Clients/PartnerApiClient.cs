using System.Net;
using System.Net.Http.Json;

namespace Ikho.Warehouse.Returns.Shared.Clients;

/// <inheritdoc cref="IPartnerApiClient" />
public sealed class PartnerApiClient(HttpClient httpClient) : IPartnerApiClient
{
    /// <inheritdoc />
    public async Task<PartnerCustomerInfo?> GetCustomerAsync(Guid customerId, CancellationToken cancellationToken)
    {
        using var response = await httpClient.GetAsync($"/api/warehouse/partner/customers/{customerId}", cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        var customer = await response.Content.ReadFromJsonAsync<PartnerPartyResponseShape>(cancellationToken);
        return customer is null ? null : new PartnerCustomerInfo(customer.Id, customer.IsActive);
    }

    /// <inheritdoc />
    public async Task<PartnerSupplierInfo?> GetSupplierAsync(Guid supplierId, CancellationToken cancellationToken)
    {
        using var response = await httpClient.GetAsync($"/api/warehouse/partner/suppliers/{supplierId}", cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        var supplier = await response.Content.ReadFromJsonAsync<PartnerPartyResponseShape>(cancellationToken);
        return supplier is null ? null : new PartnerSupplierInfo(supplier.Id, supplier.IsActive);
    }

    /// <summary>
    /// Local mirror of only the fields Returns needs from Partner's
    /// <c>Ikho.Warehouse.Partner.Features.Customers.CustomerResponse</c> and
    /// <c>Ikho.Warehouse.Partner.Features.Suppliers.SupplierResponse</c> — both share the same
    /// shape for the fields Returns cares about.
    /// </summary>
    private sealed record PartnerPartyResponseShape(Guid Id, bool IsActive);
}
