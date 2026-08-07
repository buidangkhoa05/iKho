namespace Ikho.Warehouse.Reporting.Domain;

/// <summary>
/// Denormalized rollup of a sales order's outbound execution progress, keyed by
/// <see cref="SalesOrderId"/> and rebuilt incrementally from Outbound service events
/// (<c>AllocationConfirmed</c>, <c>ShipmentDispatched</c>).
/// </summary>
public sealed class OutboundStatusReadModel
{
    /// <summary>Stable identifier for this read-model row.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Opaque reference to the Outbound service's SalesOrder aggregate.</summary>
    public Guid SalesOrderId { get; set; }

    /// <summary>
    /// Opaque reference to the Organization service's Warehouse aggregate. Populated from
    /// whichever event was observed most recently, since both carry it.
    /// </summary>
    public Guid? WarehouseId { get; set; }

    /// <summary>Count of confirmed allocations observed for this sales order.</summary>
    public int AllocationsConfirmedCount { get; set; }

    /// <summary>Count of dispatched shipments observed for this sales order.</summary>
    public int ShipmentsDispatchedCount { get; set; }

    /// <summary>When the most recent shipment was dispatched, in UTC.</summary>
    public DateTimeOffset? LastShipmentOnUtc { get; set; }

    /// <summary>When this row was last updated by an incoming event, in UTC.</summary>
    public DateTimeOffset UpdatedOnUtc { get; set; } = DateTimeOffset.UtcNow;
}
