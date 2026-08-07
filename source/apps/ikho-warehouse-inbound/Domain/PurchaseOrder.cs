namespace Ikho.Warehouse.Inbound.Domain;

/// <summary>Lifecycle status of a <see cref="PurchaseOrder"/>.</summary>
public enum PurchaseOrderStatus
{
    /// <summary>No lines have been received yet.</summary>
    Open,

    /// <summary>At least one line has been partially or fully received, but not every line is fully received.</summary>
    PartiallyReceived,

    /// <summary>Every line has been received in full.</summary>
    Received,

    /// <summary>The order was cancelled and can no longer be received against.</summary>
    Cancelled,
}

/// <summary>
/// A purchase order raised against a supplier for delivery into a specific warehouse. Snapshots
/// the supplier's code and name at creation time (per the "ID plus snapshot" reference pattern in
/// <c>docs/architecture/warehouse-db-relationships.md</c>) so the order remains business-readable
/// even if the supplier's record later changes in the Partner service.
/// </summary>
public sealed class PurchaseOrder
{
    /// <summary>Stable identifier for this purchase order.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK into the Partner service's Supplier aggregate (referenced by id only).</summary>
    public Guid SupplierId { get; set; }

    /// <summary>Supplier code captured at creation time, for business-readable display without calling Partner.</summary>
    public string SupplierCodeSnapshot { get; set; } = string.Empty;

    /// <summary>Supplier name captured at creation time, for business-readable display without calling Partner.</summary>
    public string SupplierNameSnapshot { get; set; } = string.Empty;

    /// <summary>FK into the Organization service's Warehouse aggregate (referenced by id only).</summary>
    public Guid WarehouseId { get; set; }

    /// <summary>Current lifecycle status of this purchase order.</summary>
    public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Open;

    /// <summary>When this purchase order was created, in UTC.</summary>
    public DateTimeOffset CreatedOnUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>The ordered lines making up this purchase order.</summary>
    public ICollection<PurchaseOrderLine> Lines { get; set; } = new List<PurchaseOrderLine>();
}
