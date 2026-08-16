namespace Ikho.Warehouse.Organization.Domain;

/// <summary>
/// A tenant-level company that owns one or more warehouses. The top of the Organization
/// location hierarchy (<c>Company -> Warehouse -> Zone -> Aisle -> Bin</c>, plus <c>Dock</c>).
/// </summary>
public sealed class Company
{
    /// <summary>
    /// Stable identifier referenced by other services (e.g. Inventory, Inbound, Outbound).
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Short, unique business code (e.g. <c>ACME</c>).
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the company.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The linked identity provider's organization id (Clerk's <c>org_...</c> id), or
    /// <see langword="null"/> if this company has not been linked to an identity-provider
    /// organization yet. Set once via <c>PUT .../companies/{id}</c>.
    /// </summary>
    public string? ExternalOrgId { get; set; }

    /// <summary>
    /// Whether the company is currently active. Inactive companies reject new warehouse
    /// operations but retain historical data.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// When this company was created, in UTC.
    /// </summary>
    public DateTimeOffset CreatedOnUtc { get; set; } = DateTimeOffset.UtcNow;
}
