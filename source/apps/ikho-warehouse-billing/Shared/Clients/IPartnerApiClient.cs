namespace Ikho.Warehouse.Billing.Shared.Clients;

/// <summary>
/// The subset of the Partner service's customer data that Billing needs to validate invoices and
/// credit notes. Deliberately not the full Partner <c>CustomerResponse</c> shape — Billing only
/// deserializes the fields it actually uses.
/// </summary>
public sealed record PartnerCustomerInfo(Guid Id, string Code, string Name, bool IsActive);

/// <summary>
/// Typed HTTP client for reading customer master data from the Partner service
/// (<c>ikho-warehouse-partner</c>), used to validate that a customer referenced by an invoice or
/// credit note exists and is active.
/// </summary>
public interface IPartnerApiClient
{
    /// <summary>
    /// Fetches a customer by id, or <see langword="null"/> if the Partner service reports it does
    /// not exist (HTTP 404).
    /// </summary>
    Task<PartnerCustomerInfo?> GetCustomerAsync(Guid customerId, CancellationToken cancellationToken);
}
