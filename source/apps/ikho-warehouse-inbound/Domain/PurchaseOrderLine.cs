namespace Ikho.Warehouse.Inbound.Domain;

/// <summary>
/// A single ordered product line on a <see cref="PurchaseOrder"/>. Snapshots the product's SKU
/// and name at creation time so the line remains business-readable even if the product's record
/// later changes in the Catalog service.
/// </summary>
public sealed class PurchaseOrderLine
{
    /// <summary>Stable identifier for this line.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK to the owning <see cref="PurchaseOrder"/>.</summary>
    public Guid PurchaseOrderId { get; set; }

    /// <summary>FK into the Catalog service's Product aggregate (referenced by id only).</summary>
    public Guid ProductId { get; set; }

    /// <summary>Product SKU captured at creation time, for business-readable display without calling Catalog.</summary>
    public string SkuSnapshot { get; set; } = string.Empty;

    /// <summary>Product name captured at creation time, for business-readable display without calling Catalog.</summary>
    public string ProductNameSnapshot { get; set; } = string.Empty;

    /// <summary>Quantity ordered from the supplier.</summary>
    public decimal OrderedQuantity { get; set; }

    /// <summary>Quantity received against this line so far, across one or more receipts. Never exceeds <see cref="OrderedQuantity"/>.</summary>
    public decimal ReceivedQuantity { get; set; }
}
