namespace Ikho.Warehouse.Outbound.Domain;

/// <summary>The lifecycle state of an <see cref="Allocation"/>.</summary>
public enum AllocationStatus
{
    /// <summary>Stock is held in Inventory against this allocation's reservation.</summary>
    Reserved,

    /// <summary>The reservation was consumed by a dispatched <see cref="Shipment"/>.</summary>
    Fulfilled,

    /// <summary>The reservation was released without shipping.</summary>
    Released,
}

/// <summary>
/// Links a <see cref="SalesOrderLine"/> to the stock reservation Inventory created on its behalf.
/// Outbound does not own stock truth — this row only tracks the reservation id returned by
/// Inventory's <c>POST /api/warehouse/inventory/reservations</c> and this allocation's own
/// lifecycle relative to the sales order/shipment workflow.
/// </summary>
public sealed class Allocation
{
    /// <summary>Stable identifier for this allocation.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The <see cref="SalesOrderLine"/> this allocation was created for.</summary>
    public Guid SalesOrderLineId { get; set; }

    /// <summary>Denormalized from the line, for querying without a join.</summary>
    public Guid ProductId { get; set; }

    /// <summary>Denormalized from the order, for querying without a join.</summary>
    public Guid WarehouseId { get; set; }

    /// <summary>Quantity held by this allocation, matching the source line's quantity.</summary>
    public decimal Quantity { get; set; }

    /// <summary>The id of the <c>StockReservation</c> Inventory created for this allocation.</summary>
    public Guid InventoryReservationId { get; set; }

    /// <summary>Current lifecycle state of this allocation.</summary>
    public AllocationStatus Status { get; set; } = AllocationStatus.Reserved;

    /// <summary>When this allocation was created, in UTC.</summary>
    public DateTimeOffset CreatedOnUtc { get; set; } = DateTimeOffset.UtcNow;
}
