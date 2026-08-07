namespace Ikho.Warehouse.Organization.Domain;

/// <summary>
/// An aisle within a <see cref="Zone"/>. Groups bins for wayfinding and pick-path planning.
/// </summary>
public sealed class Aisle
{
    /// <summary>
    /// Stable identifier for this aisle.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The owning zone.
    /// </summary>
    public Guid ZoneId { get; set; }

    /// <summary>
    /// Short, unique-within-zone business code (e.g. <c>A01</c>).
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the aisle.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Whether the aisle is currently active for operations.
    /// </summary>
    public bool IsActive { get; set; } = true;
}
