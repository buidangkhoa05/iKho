namespace Ikho.Warehouse.Outbound.Domain;

/// <summary>The lifecycle state of a <see cref="SalesOrder"/>.</summary>
public enum SalesOrderStatus
{
    /// <summary>Created, but not every line has been allocated against Inventory yet.</summary>
    Open,

    /// <summary>Every line has a confirmed <see cref="Allocation"/>.</summary>
    Allocated,

    /// <summary>A <see cref="Shipment"/> has been dispatched for this order.</summary>
    Shipped,

    /// <summary>The order was cancelled before shipment.</summary>
    Cancelled,
}

/// <summary>
/// A customer's request to ship product from a warehouse. Snapshots the customer's code/name and
/// each line's SKU/product name at creation time, since Outbound does not own customer or product
/// master data (that lives in Partner and Catalog respectively) and must remain readable even if
/// those upstream records later change or are deleted.
/// </summary>
public sealed class SalesOrder
{
    /// <summary>Stable identifier for this sales order.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK into the Partner service's Customer aggregate (referenced by id only).</summary>
    public Guid CustomerId { get; set; }

    /// <summary>Customer code as it existed in Partner at order-creation time.</summary>
    public string CustomerCodeSnapshot { get; set; } = string.Empty;

    /// <summary>Customer name as it existed in Partner at order-creation time.</summary>
    public string CustomerNameSnapshot { get; set; } = string.Empty;

    /// <summary>FK into the Organization service's Warehouse aggregate (referenced by id only).</summary>
    public Guid WarehouseId { get; set; }

    /// <summary>Current lifecycle state of this order.</summary>
    public SalesOrderStatus Status { get; set; } = SalesOrderStatus.Open;

    /// <summary>When this order was created, in UTC.</summary>
    public DateTimeOffset CreatedOnUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>The lines requested on this order.</summary>
    public ICollection<SalesOrderLine> Lines { get; set; } = new List<SalesOrderLine>();
}
