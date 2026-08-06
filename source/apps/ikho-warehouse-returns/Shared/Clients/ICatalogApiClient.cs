namespace Ikho.WarehouseReturns.Shared.Clients;

/// <summary>
/// The subset of the Catalog service's product data that Returns needs to validate a return
/// order line's product. Deliberately not the full Catalog <c>ProductResponse</c> shape — Returns
/// only deserializes the fields it actually uses.
/// </summary>
public sealed record CatalogProductInfo(Guid Id, bool IsActive);

/// <summary>
/// Typed HTTP client for reading product master data from the Catalog service
/// (<c>ikho-warehouse-catalog</c>), used to validate that a product referenced by a return order
/// line exists and is active.
/// </summary>
public interface ICatalogApiClient
{
    /// <summary>
    /// Fetches a product by id, or <see langword="null"/> if the Catalog service reports it does
    /// not exist (HTTP 404).
    /// </summary>
    Task<CatalogProductInfo?> GetProductAsync(Guid productId, CancellationToken cancellationToken);
}
