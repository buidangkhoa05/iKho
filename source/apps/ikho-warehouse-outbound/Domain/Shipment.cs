namespace Ikho.Warehouse.Outbound.Domain;

/// <summary>
/// The lifecycle state of a <see cref="Shipment"/>. Deliberately a single value for this slice —
/// there is no separate picking/packing workflow (see <c>docs/plans/warehouse/06-outbound-service-implementation.md</c>
/// for the narrowed scope); a shipment is created already dispatched.
/// </summary>
public enum ShipmentStatus
{
    /// <summary>The shipment has been dispatched and its allocations fulfilled in Inventory.</summary>
    Dispatched,
}

/// <summary>
/// A one-shot dispatch of one or more <see cref="Allocation"/>s for a single <see cref="SalesOrder"/>.
/// </summary>
public sealed class Shipment
{
    /// <summary>Stable identifier for this shipment.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The <see cref="SalesOrder"/> this shipment was dispatched for.</summary>
    public Guid SalesOrderId { get; set; }

    /// <summary>Denormalized from the order, for querying without a join.</summary>
    public Guid WarehouseId { get; set; }

    /// <summary>Current lifecycle state of this shipment.</summary>
    public ShipmentStatus Status { get; set; } = ShipmentStatus.Dispatched;

    /// <summary>When this shipment was dispatched, in UTC.</summary>
    public DateTimeOffset DispatchedOnUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>The allocations fulfilled by this shipment.</summary>
    public ICollection<ShipmentLine> Lines { get; set; } = new List<ShipmentLine>();
}
