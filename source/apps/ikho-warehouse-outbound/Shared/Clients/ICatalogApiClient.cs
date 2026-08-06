namespace Ikho.WarehouseOutbound.Shared.Clients;

/// <summary>
/// The subset of the Catalog service's product data that Outbound needs to validate and snapshot
/// sales order lines. Deliberately not the full Catalog <c>ProductResponse</c> shape — Outbound
/// only deserializes the fields it actually uses.
/// </summary>
public sealed record CatalogProductInfo(Guid Id, string Sku, string Name, bool IsActive);

/// <summary>
/// Typed HTTP client for reading product master data from the Catalog service
/// (<c>ikho-warehouse-catalog</c>), used to validate a sales order line's product and snapshot its
/// SKU/name onto the line.
/// </summary>
public interface ICatalogApiClient
{
    /// <summary>
    /// Fetches a product by id, or <see langword="null"/> if the Catalog service reports it does
    /// not exist (HTTP 404).
    /// </summary>
    Task<CatalogProductInfo?> GetProductAsync(Guid productId, CancellationToken cancellationToken);
}
