using System.Net;
using System.Net.Http.Json;

namespace Ikho.WarehouseOutbound.Shared.Clients;

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

        var customer = await response.Content.ReadFromJsonAsync<PartnerCustomerResponseShape>(cancellationToken);
        return customer is null
            ? null
            : new PartnerCustomerInfo(customer.Id, customer.Code, customer.Name, customer.IsActive);
    }

    /// <summary>
    /// Local mirror of only the fields Outbound needs from Partner's
    /// <c>Ikho.WarehousePartner.Features.Customers.CustomerResponse</c>.
    /// </summary>
    private sealed record PartnerCustomerResponseShape(Guid Id, string Code, string Name, bool IsActive);
}
