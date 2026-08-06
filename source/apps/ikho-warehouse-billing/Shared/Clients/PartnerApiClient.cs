using System.Net;
using System.Net.Http.Json;

namespace Ikho.WarehouseBilling.Shared.Clients;

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

        var customer = await response.Content.ReadFromJsonAsync<CustomerResponseShape>(cancellationToken);
        return customer is null
            ? null
            : new PartnerCustomerInfo(customer.Id, customer.Code, customer.Name, customer.IsActive);
    }

    /// <summary>
    /// Local mirror of only the fields Billing needs from Partner's
    /// <c>Ikho.WarehousePartner.Features.Customers.CustomerResponse</c>. Deserializing loosely
    /// against a narrow local shape means unrelated fields added to the Partner response never
    /// break this client.
    /// </summary>
    private sealed record CustomerResponseShape(Guid Id, string Code, string Name, bool IsActive);
}
