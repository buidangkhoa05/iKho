namespace Ikho.Warehouse.Returns.Domain;

/// <summary>Outcome of physically inspecting a returned <see cref="ReturnOrderLine"/>.</summary>
public enum InspectionResult
{
    /// <summary>The goods are in sellable/restockable condition.</summary>
    Good,

    /// <summary>The goods are physically damaged.</summary>
    Damaged,

    /// <summary>The goods are functionally defective.</summary>
    Defective,
}

/// <summary>
/// Record of inspecting a single returned line to determine its condition. Exactly one
/// <see cref="Inspection"/> is recorded per <see cref="ReturnOrderLine"/> in this slice — see the
/// conflict check in <c>InspectionsService</c>.
/// </summary>
public sealed class Inspection
{
    /// <summary>Stable identifier for this inspection.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK to the <see cref="ReturnOrderLine"/> this inspection was recorded for.</summary>
    public Guid ReturnOrderLineId { get; set; }

    /// <summary>The condition the inspector found the goods in.</summary>
    public InspectionResult Result { get; set; }

    /// <summary>Optional free-text notes captured during inspection.</summary>
    public string? Notes { get; set; }

    /// <summary>When this inspection was recorded, in UTC.</summary>
    public DateTimeOffset InspectedOnUtc { get; set; } = DateTimeOffset.UtcNow;
}
