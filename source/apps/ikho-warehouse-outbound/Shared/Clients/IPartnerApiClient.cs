namespace Ikho.Warehouse.Outbound.Shared.Clients;

/// <summary>
/// The subset of the Partner service's customer data that Outbound needs to validate and snapshot
/// sales orders. Deliberately not the full Partner <c>CustomerResponse</c> shape — Outbound only
/// deserializes the fields it actually uses.
/// </summary>
public sealed record PartnerCustomerInfo(Guid Id, string Code, string Name, bool IsActive);

/// <summary>
/// Typed HTTP client for reading customer master data from the Partner service
/// (<c>ikho-warehouse-partner</c>), used to validate a sales order's customer and snapshot its
/// code/name onto the order.
/// </summary>
public interface IPartnerApiClient
{
    /// <summary>
    /// Fetches a customer by id, or <see langword="null"/> if the Partner service reports it does
    /// not exist (HTTP 404).
    /// </summary>
    Task<PartnerCustomerInfo?> GetCustomerAsync(Guid customerId, CancellationToken cancellationToken);
}
