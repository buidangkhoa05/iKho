using System.Net;
using System.Net.Http.Json;

namespace Ikho.WarehouseReturns.Shared.Clients;

/// <inheritdoc cref="ICatalogApiClient" />
public sealed class CatalogApiClient(HttpClient httpClient) : ICatalogApiClient
{
    /// <inheritdoc />
    public async Task<CatalogProductInfo?> GetProductAsync(Guid productId, CancellationToken cancellationToken)
    {
        using var response = await httpClient.GetAsync($"/api/warehouse/catalog/products/{productId}", cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        var product = await response.Content.ReadFromJsonAsync<CatalogProductResponseShape>(cancellationToken);
        return product is null ? null : new CatalogProductInfo(product.Id, product.IsActive);
    }

    /// <summary>
    /// Local mirror of only the fields Returns needs from Catalog's
    /// <c>Ikho.WarehouseCatalog.Features.Products.ProductResponse</c>. Deserializing loosely
    /// against a narrow local shape means unrelated fields added to the Catalog response never
    /// break this client.
    /// </summary>
    private sealed record CatalogProductResponseShape(Guid Id, bool IsActive);
}
