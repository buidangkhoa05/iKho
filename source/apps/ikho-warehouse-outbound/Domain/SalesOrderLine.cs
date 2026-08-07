namespace Ikho.Warehouse.Outbound.Domain;

/// <summary>
/// A single requested product/quantity on a <see cref="SalesOrder"/>. Snapshots the product's SKU
/// and name from Catalog at order-creation time, for the same reason <see cref="SalesOrder"/>
/// snapshots the customer's code/name.
/// </summary>
public sealed class SalesOrderLine
{
    /// <summary>Stable identifier for this line.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The <see cref="SalesOrder"/> this line belongs to.</summary>
    public Guid SalesOrderId { get; set; }

    /// <summary>FK into the Catalog service's Product aggregate (referenced by id only).</summary>
    public Guid ProductId { get; set; }

    /// <summary>Product SKU as it existed in Catalog at order-creation time.</summary>
    public string SkuSnapshot { get; set; } = string.Empty;

    /// <summary>Product name as it existed in Catalog at order-creation time.</summary>
    public string ProductNameSnapshot { get; set; } = string.Empty;

    /// <summary>Quantity requested for this line.</summary>
    public decimal Quantity { get; set; }

    /// <summary>
    /// The <see cref="Allocation"/> that reserved stock for this line, or <see langword="null"/>
    /// until <c>POST /sales-orders/{id}/allocate</c> has succeeded for this line.
    /// </summary>
    public Guid? AllocationId { get; set; }
}
