namespace Ikho.Warehouse.Organization.Domain;

/// <summary>
/// A shipping/receiving dock attached directly to a <see cref="Warehouse"/> (outside the
/// zone/aisle/bin storage hierarchy), used for inbound receiving and outbound shipment staging.
/// </summary>
public sealed class Dock
{
    /// <summary>
    /// Stable identifier referenced by other services (e.g. Inbound, Outbound) for staging.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The owning warehouse.
    /// </summary>
    public Guid WarehouseId { get; set; }

    /// <summary>
    /// Short, unique-within-warehouse business code (e.g. <c>DOCK-01</c>).
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the dock.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Whether the dock is currently active. Inactive docks fail validation for
    /// receiving/shipment staging.
    /// </summary>
    public bool IsActive { get; set; } = true;
}
