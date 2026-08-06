namespace Ikho.WarehouseInbound.Shared.Clients;

/// <summary>Result of asking the Organization service whether a bin is currently usable.</summary>
public sealed record BinValidationInfo(bool IsValid, string? Reason)
{
    /// <summary>
    /// <see langword="true"/> when <see cref="Reason"/> indicates the bin does not exist at all
    /// (as opposed to existing but being inactive) — used to pick between a 404 and a 409
    /// response at the endpoint.
    /// </summary>
    public bool BinDoesNotExist => Reason?.Contains("does not exist", StringComparison.OrdinalIgnoreCase) == true;
}

/// <summary>The subset of the Organization service's warehouse data that Inbound needs.</summary>
public sealed record OrganizationWarehouseInfo(Guid Id, Guid CompanyId, string Code, string Name, bool IsActive);

/// <summary>
/// Typed HTTP client for reading location/warehouse master data from the Organization service
/// (<c>ikho-warehouse-organization</c>), used to validate that a bin referenced by a receipt
/// actually exists and is currently active, and that a warehouse referenced by a purchase order
/// actually exists and is currently active.
/// </summary>
public interface IOrganizationApiClient
{
    /// <summary>
    /// Validates whether a bin exists and is active, by calling Organization's
    /// <c>GET /api/warehouse/organization/bins/{id}/validate</c>.
    /// </summary>
    Task<BinValidationInfo> ValidateBinAsync(Guid binId, CancellationToken cancellationToken);

    /// <summary>
    /// Fetches a warehouse by id, or <see langword="null"/> if the Organization service reports
    /// it does not exist (HTTP 404).
    /// </summary>
    Task<OrganizationWarehouseInfo?> GetWarehouseAsync(Guid warehouseId, CancellationToken cancellationToken);
}
