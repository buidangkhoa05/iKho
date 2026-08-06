namespace Ikho.WarehouseInbound.Domain;

/// <summary>
/// A single received quantity against one <see cref="PurchaseOrderLine"/>, put away into a
/// specific bin. Each <see cref="ReceiptLine"/> corresponds to exactly one
/// <see cref="PutawayTask"/> in this slice (putaway is folded into the receive-into-bin flow —
/// see the remarks on <see cref="PutawayTask"/>).
/// </summary>
public sealed class ReceiptLine
{
    /// <summary>Stable identifier for this receipt line.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK to the owning <see cref="Receipt"/>.</summary>
    public Guid ReceiptId { get; set; }

    /// <summary>FK to the <see cref="PurchaseOrderLine"/> this quantity was received against.</summary>
    public Guid PurchaseOrderLineId { get; set; }

    /// <summary>FK into the Catalog service's Product aggregate (referenced by id only); copied from the purchase order line.</summary>
    public Guid ProductId { get; set; }

    /// <summary>FK into the Organization service's Bin aggregate (referenced by id only) — where this quantity was put away.</summary>
    public Guid BinId { get; set; }

    /// <summary>Quantity received and put away for this line.</summary>
    public decimal Quantity { get; set; }

    /// <summary>Lot number supplied for lot-controlled products, or <see langword="null"/> otherwise.</summary>
    public string? LotNumber { get; set; }

    /// <summary>Expiration date supplied for lot-controlled products, or <see langword="null"/> otherwise.</summary>
    public DateTimeOffset? ExpirationDateUtc { get; set; }

    /// <summary>
    /// Serial numbers supplied for serial-controlled products, stored as a single comma-joined
    /// string rather than a separate owned collection. EF Core primitive collections of string
    /// add mapping/index complexity (a separate collection table, ordering semantics, etc.) that
    /// is not worth it for the small, fixed-at-creation-time list this slice needs — the service
    /// layer is the only place that ever splits or joins this value, so the extra structure would
    /// buy nothing. <see langword="null"/> when the product is not serial-controlled.
    /// </summary>
    public string? SerialNumbersCsv { get; set; }
}
