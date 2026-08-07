namespace Ikho.Warehouse.Reporting.Domain;

/// <summary>
/// Denormalized rollup of a product's stock position within a single warehouse, keyed by
/// <c>(ProductId, WarehouseId)</c> and rebuilt incrementally from Inventory service events
/// (<c>InventoryReceived</c>, <c>StockReserved</c>, <c>StockReleased</c>, <c>StockShipped</c>,
/// <c>StockAdjusted</c>, <c>StockQuarantined</c>). <see cref="ProductId"/>/<see cref="WarehouseId"/>
/// are opaque references into Catalog/Organization - Reporting never joins against those
/// services' databases.
/// </summary>
public sealed class InventoryPositionReadModel
{
    /// <summary>Stable identifier for this read-model row.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Opaque reference to the Catalog service's Product aggregate.</summary>
    public Guid ProductId { get; set; }

    /// <summary>Opaque reference to the Organization service's Warehouse aggregate.</summary>
    public Guid WarehouseId { get; set; }

    /// <summary>Total physical quantity on hand, regardless of state.</summary>
    public decimal OnHandQuantity { get; set; }

    /// <summary>Portion of <see cref="OnHandQuantity"/> held against active reservations.</summary>
    public decimal ReservedQuantity { get; set; }

    /// <summary>Portion of <see cref="OnHandQuantity"/> held in quarantine, pending disposition.</summary>
    public decimal QuarantineQuantity { get; set; }

    /// <summary>Portion of <see cref="OnHandQuantity"/> marked damaged and unsellable.</summary>
    public decimal DamagedQuantity { get; set; }

    /// <summary>When this row was last updated by an incoming event, in UTC.</summary>
    public DateTimeOffset UpdatedOnUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Quantity actually available to reserve or ship. Getter-only with no backing field, so EF
    /// Core does not map it to a column by convention (defensively also excluded via
    /// <c>Ignore</c> in <see cref="Shared.ReportingDbContext"/>).
    /// </summary>
    public decimal AvailableQuantity => OnHandQuantity - ReservedQuantity - QuarantineQuantity - DamagedQuantity;
}
