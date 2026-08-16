namespace Ikho.Identity.Shared.Organization;

/// <summary>
/// Resolves company/warehouse facts owned by <c>Ikho.Warehouse.Organization</c>. Identity never
/// stores its own copy of company or warehouse data — it always asks Organization, per the
/// architecture's no-cross-database-FK rule.
/// </summary>
public interface IOrganizationLookupClient
{
    /// <summary>Returns the iKho company id linked to <paramref name="externalOrgId"/>, or <see langword="null"/> if no company is linked to it yet.</summary>
    Task<Guid?> GetCompanyIdByExternalOrgIdAsync(string externalOrgId, CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if <paramref name="warehouseId"/> exists and belongs to <paramref name="companyId"/>.</summary>
    Task<bool> WarehouseExistsAsync(Guid companyId, Guid warehouseId, CancellationToken cancellationToken);
}
