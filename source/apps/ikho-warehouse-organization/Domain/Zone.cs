namespace Ikho.Warehouse.Organization.Domain;

/// <summary>
/// A zone within a <see cref="Warehouse"/> (e.g. receiving, bulk storage, pick face). Groups
/// aisles for slotting and reporting purposes.
/// </summary>
public sealed class Zone
{
    /// <summary>
    /// Stable identifier for this zone.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The owning warehouse.
    /// </summary>
    public Guid WarehouseId { get; set; }

    /// <summary>
    /// Short, unique-within-warehouse business code (e.g. <c>ZONE-A</c>).
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the zone.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Whether the zone is currently active for operations.
    /// </summary>
    public bool IsActive { get; set; } = true;
}
