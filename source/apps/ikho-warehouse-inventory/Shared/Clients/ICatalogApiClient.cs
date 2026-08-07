namespace Ikho.Warehouse.Inventory.Shared.Clients;

/// <summary>
/// The subset of the Catalog service's product data that Inventory needs to validate stock
/// operations (lot/serial tracking policy and active status). Deliberately not the full Catalog
/// <c>ProductResponse</c> shape — Inventory only deserializes the fields it actually uses.
/// </summary>
public sealed record CatalogProductInfo(Guid Id, string Sku, bool IsLotControlled, bool IsSerialControlled, bool IsActive);

/// <summary>
/// Typed HTTP client for reading product master data from the Catalog service
/// (<c>ikho-warehouse-catalog</c>). This is the first synchronous service-to-service call in the
/// platform: Inventory must know a product's lot/serial tracking policy before accepting a stock
/// receipt, and that policy lives in Catalog, not in Inventory's own database.
/// </summary>
public interface ICatalogApiClient
{
    /// <summary>
    /// Fetches a product by id, or <see langword="null"/> if the Catalog service reports it does
    /// not exist (HTTP 404).
    /// </summary>
    Task<CatalogProductInfo?> GetProductAsync(Guid productId, CancellationToken cancellationToken);
}
