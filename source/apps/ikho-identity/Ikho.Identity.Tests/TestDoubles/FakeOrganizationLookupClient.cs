using Ikho.Identity.Shared.Organization;

namespace Ikho.Identity.Tests.TestDoubles;

/// <summary>Test double for <see cref="IOrganizationLookupClient"/> with in-memory, test-controlled data.</summary>
public sealed class FakeOrganizationLookupClient : IOrganizationLookupClient
{
    public Dictionary<string, Guid> CompaniesByExternalOrgId { get; } = [];

    public HashSet<(Guid CompanyId, Guid WarehouseId)> Warehouses { get; } = [];

    public Task<Guid?> GetCompanyIdByExternalOrgIdAsync(string externalOrgId, CancellationToken cancellationToken) =>
        Task.FromResult(CompaniesByExternalOrgId.TryGetValue(externalOrgId, out var companyId) ? (Guid?)companyId : null);

    public Task<bool> WarehouseExistsAsync(Guid companyId, Guid warehouseId, CancellationToken cancellationToken) =>
        Task.FromResult(Warehouses.Contains((companyId, warehouseId)));
}
