namespace Ikho.WarehouseBilling.Domain;

/// <summary>
/// A single billed product line on an <see cref="Invoice"/>. Snapshots the product's code and
/// name at creation time (per the "ID plus snapshot" reference pattern in
/// <c>docs/architecture/warehouse-db-relationships.md</c>) so the line remains business-readable,
/// and preserves the commercial fact, even if the product's record later changes in the Catalog
/// service.
/// </summary>
public sealed class InvoiceLine
{
    /// <summary>Stable identifier for this line.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK to the owning <see cref="Invoice"/>.</summary>
    public Guid InvoiceId { get; set; }

    /// <summary>FK into the Catalog service's Product aggregate (referenced by id only).</summary>
    public Guid ProductId { get; set; }

    /// <summary>Product code captured at creation time, for business-readable display without calling Catalog.</summary>
    public string ProductCodeSnapshot { get; set; } = string.Empty;

    /// <summary>Product name captured at creation time, for business-readable display without calling Catalog.</summary>
    public string ProductNameSnapshot { get; set; } = string.Empty;

    /// <summary>Quantity billed on this line.</summary>
    public decimal Quantity { get; set; }

    /// <summary>Unit price billed for this line, captured at creation time.</summary>
    public decimal UnitPrice { get; set; }

    /// <summary>Line total, computed as <see cref="Quantity"/> multiplied by <see cref="UnitPrice"/>.</summary>
    public decimal LineTotal { get; set; }
}
