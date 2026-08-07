namespace Ikho.Warehouse.Returns.Domain;

/// <summary>Distinguishes whether a <see cref="ReturnOrder"/> originates from a customer or a supplier.</summary>
public enum ReturnOrderType
{
    /// <summary>Goods are coming back from a customer (e.g. an unwanted or defective sale).</summary>
    CustomerReturn,

    /// <summary>Goods are going back to a supplier (e.g. rejected or defective inbound stock).</summary>
    SupplierReturn,
}

/// <summary>Lifecycle status of a <see cref="ReturnOrder"/>.</summary>
public enum ReturnOrderStatus
{
    /// <summary>The order was created but the goods have not yet physically arrived.</summary>
    Created,

    /// <summary>A <see cref="ReturnReceipt"/> has been recorded against the order.</summary>
    Received,

    /// <summary>Every line on the order has an <see cref="Inspection"/> outcome recorded.</summary>
    Inspected,

    /// <summary>Every line on the order has a <see cref="Disposition"/> outcome recorded.</summary>
    Dispositioned,
}

/// <summary>
/// A reverse-logistics order tracking goods coming back from a customer or going back to a
/// supplier. Owns the full workflow from creation through receipt, inspection, and disposition,
/// but never owns stock truth itself — disposition outcomes that affect on-hand or quarantine
/// quantity are executed against the Inventory service (see the Dispositions feature).
/// </summary>
public sealed class ReturnOrder
{
    /// <summary>Stable identifier for this return order.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Whether this order is a customer return or a supplier return.</summary>
    public ReturnOrderType Type { get; set; }

    /// <summary>FK into the Partner service's Customer aggregate (referenced by id only); set only when <see cref="Type"/> is <see cref="ReturnOrderType.CustomerReturn"/>.</summary>
    public Guid? CustomerId { get; set; }

    /// <summary>FK into the Partner service's Supplier aggregate (referenced by id only); set only when <see cref="Type"/> is <see cref="ReturnOrderType.SupplierReturn"/>.</summary>
    public Guid? SupplierId { get; set; }

    /// <summary>FK into the Organization service's Warehouse aggregate (referenced by id only) — where the returned goods will be handled.</summary>
    public Guid WarehouseId { get; set; }

    /// <summary>
    /// The kind of record this return traces back to (e.g. <c>Shipment</c>, <c>PurchaseOrder</c>),
    /// or <see langword="null"/> if the return has no traceable source. There is no Kafka consumer
    /// wiring in this codebase yet, so this and <see cref="SourceReferenceId"/> are supplied
    /// directly on the create request rather than resolved from a <c>ShipmentDispatched</c> event.
    /// </summary>
    public string? SourceReferenceType { get; set; }

    /// <summary>The id of the source record this return traces back to, as a string, or <see langword="null"/>.</summary>
    public string? SourceReferenceId { get; set; }

    /// <summary>Current lifecycle status of this return order.</summary>
    public ReturnOrderStatus Status { get; set; } = ReturnOrderStatus.Created;

    /// <summary>When this return order was created, in UTC.</summary>
    public DateTimeOffset CreatedOnUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>The lines making up this return order.</summary>
    public ICollection<ReturnOrderLine> Lines { get; set; } = new List<ReturnOrderLine>();
}

/// <summary>
/// A single returned product line on a <see cref="ReturnOrder"/>. Tracks its own inspection and
/// disposition outcomes so the parent order's status can be derived from whether every line has
/// progressed through both steps.
/// </summary>
public sealed class ReturnOrderLine
{
    /// <summary>Stable identifier for this line.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK to the owning <see cref="ReturnOrder"/>.</summary>
    public Guid ReturnOrderId { get; set; }

    /// <summary>FK into the Catalog service's Product aggregate (referenced by id only).</summary>
    public Guid ProductId { get; set; }

    /// <summary>Quantity being returned on this line.</summary>
    public decimal Quantity { get; set; }

    /// <summary>Free-text reason the goods are being returned (e.g. <c>Damaged</c>, <c>WrongItem</c>, <c>NoLongerNeeded</c>).</summary>
    public string ReasonCode { get; set; } = string.Empty;

    /// <summary>FK to the <see cref="Inspection"/> recorded for this line, or <see langword="null"/> until inspected.</summary>
    public Guid? InspectionId { get; set; }

    /// <summary>FK to the <see cref="Disposition"/> recorded for this line, or <see langword="null"/> until dispositioned.</summary>
    public Guid? DispositionId { get; set; }
}
