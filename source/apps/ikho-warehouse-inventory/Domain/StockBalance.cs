namespace Ikho.Warehouse.Inventory.Domain;

/// <summary>
/// Materialized rollup of stock quantities per <c>(ProductId, WarehouseId)</c>, maintained
/// transactionally alongside every <see cref="StockItem"/> mutation so warehouse-level totals
/// can be read without live-aggregating every stock item row.
/// </summary>
public sealed class StockBalance
{
    /// <summary>Stable identifier for this balance row.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK into the Catalog service's Product aggregate (referenced by id only).</summary>
    public Guid ProductId { get; set; }

    /// <summary>FK into the Organization service's Warehouse aggregate (referenced by id only).</summary>
    public Guid WarehouseId { get; set; }

    /// <summary>Sum of on-hand quantity across every <see cref="StockItem"/> for this product/warehouse.</summary>
    public decimal OnHandQuantity { get; set; }

    /// <summary>Sum of reserved quantity across every <see cref="StockItem"/> for this product/warehouse.</summary>
    public decimal ReservedQuantity { get; set; }

    /// <summary>Sum of damaged quantity across every <see cref="StockItem"/> for this product/warehouse.</summary>
    public decimal DamagedQuantity { get; set; }

    /// <summary>Sum of quarantined quantity across every <see cref="StockItem"/> for this product/warehouse.</summary>
    public decimal QuarantineQuantity { get; set; }

    /// <summary>When this balance row was last recomputed, in UTC.</summary>
    public DateTimeOffset UpdatedOnUtc { get; set; } = DateTimeOffset.UtcNow;
}
