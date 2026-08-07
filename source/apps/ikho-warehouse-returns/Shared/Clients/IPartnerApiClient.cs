namespace Ikho.Warehouse.Returns.Shared.Clients;

/// <summary>
/// The subset of the Partner service's customer data that Returns needs to validate a customer
/// return's <c>CustomerId</c>.
/// </summary>
public sealed record PartnerCustomerInfo(Guid Id, bool IsActive);

/// <summary>
/// The subset of the Partner service's supplier data that Returns needs to validate a supplier
/// return's <c>SupplierId</c>.
/// </summary>
public sealed record PartnerSupplierInfo(Guid Id, bool IsActive);

/// <summary>
/// Typed HTTP client for reading customer and supplier master data from the Partner service
/// (<c>ikho-warehouse-partner</c>), used to validate the party referenced by a return order —
/// whichever one applies for its <see cref="Domain.ReturnOrderType"/>.
/// </summary>
public interface IPartnerApiClient
{
    /// <summary>
    /// Fetches a customer by id, or <see langword="null"/> if the Partner service reports it does
    /// not exist (HTTP 404).
    /// </summary>
    Task<PartnerCustomerInfo?> GetCustomerAsync(Guid customerId, CancellationToken cancellationToken);

    /// <summary>
    /// Fetches a supplier by id, or <see langword="null"/> if the Partner service reports it does
    /// not exist (HTTP 404).
    /// </summary>
    Task<PartnerSupplierInfo?> GetSupplierAsync(Guid supplierId, CancellationToken cancellationToken);
}
