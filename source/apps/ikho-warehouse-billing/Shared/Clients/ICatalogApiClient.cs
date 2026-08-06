namespace Ikho.WarehouseBilling.Shared.Clients;

/// <summary>
/// The subset of the Catalog service's product data that Billing needs to validate invoice and
/// credit-note lines and snapshot business-readable fields onto them. Deliberately not the full
/// Catalog <c>ProductResponse</c> shape — Billing only deserializes the fields it actually uses.
/// </summary>
public sealed record CatalogProductInfo(Guid Id, string Sku, string Name, bool IsActive);

/// <summary>
/// Typed HTTP client for reading product master data from the Catalog service
/// (<c>ikho-warehouse-catalog</c>), used to validate that a product referenced by an invoice or
/// credit-note line exists and is active, and to snapshot its code/name at issuance time.
/// </summary>
public interface ICatalogApiClient
{
    /// <summary>
    /// Fetches a product by id, or <see langword="null"/> if the Catalog service reports it does
    /// not exist (HTTP 404).
    /// </summary>
    Task<CatalogProductInfo?> GetProductAsync(Guid productId, CancellationToken cancellationToken);
}
