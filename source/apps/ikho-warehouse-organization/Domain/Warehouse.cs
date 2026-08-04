namespace Ikho.WarehouseOrganization.Domain;

/// <summary>
/// A physical warehouse belonging to exactly one <see cref="Company"/>. Owns zones, aisles,
/// bins, and docks beneath it in the location hierarchy.
/// </summary>
public sealed class Warehouse
{
    /// <summary>
    /// Stable identifier referenced by other services (e.g. Inventory, Inbound, Outbound).
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The owning company. A warehouse belongs to exactly one company (domain invariant).
    /// </summary>
    public Guid CompanyId { get; set; }

    /// <summary>
    /// Short, unique-within-company business code (e.g. <c>WH-01</c>).
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the warehouse.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Whether the warehouse currently accepts operational activity. Inactive warehouses fail
    /// location validation for downstream services.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// When this warehouse was created, in UTC.
    /// </summary>
    public DateTimeOffset CreatedOnUtc { get; set; } = DateTimeOffset.UtcNow;
}
