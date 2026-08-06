namespace Ikho.WarehouseOutbound.Shared.Clients;

/// <summary>The subset of the Organization service's warehouse data that Outbound needs.</summary>
public sealed record OrganizationWarehouseInfo(Guid Id, Guid CompanyId, string Code, string Name, bool IsActive);

/// <summary>
/// Typed HTTP client for reading warehouse master data from the Organization service
/// (<c>ikho-warehouse-organization</c>), used to validate that a sales order's warehouse exists
/// and is currently active.
/// </summary>
public interface IOrganizationApiClient
{
    /// <summary>
    /// Fetches a warehouse by id, or <see langword="null"/> if the Organization service reports
    /// it does not exist (HTTP 404).
    /// </summary>
    Task<OrganizationWarehouseInfo?> GetWarehouseAsync(Guid warehouseId, CancellationToken cancellationToken);
}
