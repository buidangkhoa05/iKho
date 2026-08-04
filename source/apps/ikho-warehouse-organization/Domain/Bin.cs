namespace Ikho.WarehouseOrganization.Domain;

/// <summary>
/// A storage bin within an <see cref="Aisle"/> — the leaf node of the location hierarchy that
/// Inventory, Inbound, and Outbound reference for putaway, picking, and stock location.
/// </summary>
public sealed class Bin
{
    /// <summary>
    /// Stable identifier referenced by other services for stock location.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The owning aisle.
    /// </summary>
    public Guid AisleId { get; set; }

    /// <summary>
    /// Short, unique-within-aisle business code (e.g. <c>A01-01-01</c>).
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Whether the bin is currently active. Inactive bins fail validation for putaway/picking.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// When this bin was created, in UTC.
    /// </summary>
    public DateTimeOffset CreatedOnUtc { get; set; } = DateTimeOffset.UtcNow;
}
