namespace Ikho.Warehouse.Billing.Domain;

/// <summary>Lifecycle status of an <see cref="Invoice"/>.</summary>
public enum InvoiceStatus
{
    /// <summary>The invoice has been issued to the customer and no payments have been recorded yet.</summary>
    Issued,

    /// <summary>At least one payment has been recorded, but the cumulative recorded amount is less than <see cref="Invoice.TotalAmount"/>.</summary>
    PartiallyPaid,

    /// <summary>The cumulative recorded payments equal <see cref="Invoice.TotalAmount"/>.</summary>
    Paid,

    /// <summary>The invoice was voided and no longer represents a collectible amount.</summary>
    Void,
}

/// <summary>
/// A financial document billing a customer for warehouse-adjacent activity (e.g. a shipment).
/// <see cref="WarehouseId"/> is stored as an opaque reference only — Billing does not validate it
/// against Organization or join against warehouse-topology data, per the "no cross-database
/// joins" goal in <c>docs/plans/warehouse/08-billing-service-implementation.md</c>.
/// <see cref="SourceReferenceType"/>/<see cref="SourceReferenceId"/> record the operational fact
/// (e.g. an Outbound shipment) this invoice was issued from, supplied directly by the caller
/// rather than derived from a consumed event — no Kafka consumer infrastructure exists in this
/// codebase yet (see the Payments/Invoices services for the same convention).
/// </summary>
public sealed class Invoice
{
    /// <summary>Stable identifier for this invoice.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK into the Partner service's Customer aggregate (referenced by id only).</summary>
    public Guid CustomerId { get; set; }

    /// <summary>Opaque reference into the Organization service's Warehouse aggregate — not validated or joined against.</summary>
    public Guid WarehouseId { get; set; }

    /// <summary>The kind of operational fact this invoice was issued from (e.g. <c>"OutboundShipment"</c>), or <see langword="null"/> if issued ad hoc.</summary>
    public string? SourceReferenceType { get; set; }

    /// <summary>The identifier of the operational fact this invoice was issued from, or <see langword="null"/> if issued ad hoc.</summary>
    public string? SourceReferenceId { get; set; }

    /// <summary>Current lifecycle status of this invoice.</summary>
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Issued;

    /// <summary>When this invoice was issued, in UTC.</summary>
    public DateTimeOffset IssuedOnUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Total amount due, computed as the sum of <see cref="InvoiceLine.LineTotal"/> across <see cref="Lines"/> at creation time.</summary>
    public decimal TotalAmount { get; set; }

    /// <summary>The billed lines making up this invoice.</summary>
    public ICollection<InvoiceLine> Lines { get; set; } = new List<InvoiceLine>();
}
