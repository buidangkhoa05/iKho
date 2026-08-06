namespace Ikho.WarehouseInbound.Shared.Clients;

/// <summary>
/// The subset of the Partner service's supplier data that Inbound needs to validate purchase
/// orders and snapshot business-readable fields onto them. Deliberately not the full Partner
/// <c>SupplierResponse</c> shape — Inbound only deserializes the fields it actually uses.
/// </summary>
public sealed record PartnerSupplierInfo(Guid Id, string Code, string Name, bool IsActive);

/// <summary>
/// Typed HTTP client for reading supplier master data from the Partner service
/// (<c>ikho-warehouse-partner</c>), used to validate that a supplier referenced by a purchase
/// order exists and is active, and to snapshot its code/name at order-creation time.
/// </summary>
public interface IPartnerApiClient
{
    /// <summary>
    /// Fetches a supplier by id, or <see langword="null"/> if the Partner service reports it does
    /// not exist (HTTP 404).
    /// </summary>
    Task<PartnerSupplierInfo?> GetSupplierAsync(Guid supplierId, CancellationToken cancellationToken);
}
