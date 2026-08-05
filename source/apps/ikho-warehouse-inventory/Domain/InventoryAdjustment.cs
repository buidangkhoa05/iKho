namespace Ikho.WarehouseInventory.Domain;

/// <summary>
/// Audit-trail record of a manual correction to a <see cref="StockItem"/>'s on-hand quantity.
/// Every adjustment also writes a corresponding <see cref="StockLedgerEntry"/> with
/// <see cref="StockLedgerEntry.MovementType"/> set to <see cref="StockMovementType.Adjustment"/>,
/// <see cref="StockLedgerEntry.ReferenceType"/> set to <c>InventoryAdjustment</c>, and
/// <see cref="StockLedgerEntry.ReferenceId"/> set to this adjustment's <see cref="Id"/>.
/// </summary>
public sealed class InventoryAdjustment
{
    /// <summary>Stable identifier for this adjustment.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The <see cref="StockItem"/> this adjustment was applied to.</summary>
    public Guid StockItemId { get; set; }

    /// <summary>Denormalized from the stock item, for querying without a join.</summary>
    public Guid ProductId { get; set; }

    /// <summary>Denormalized from the stock item, for querying without a join.</summary>
    public Guid WarehouseId { get; set; }

    /// <summary>Signed change applied to the stock item's on-hand quantity.</summary>
    public decimal QuantityDelta { get; set; }

    /// <summary>Business reason code for this adjustment (e.g. <c>DAMAGE</c>, <c>CYCLE_COUNT</c>).</summary>
    public string ReasonCode { get; set; } = string.Empty;

    /// <summary>Free-text notes explaining this adjustment.</summary>
    public string Notes { get; set; } = string.Empty;

    /// <summary>Correlation id captured from the originating request, for tracing.</summary>
    public string? CorrelationId { get; set; }

    /// <summary>When this adjustment was recorded, in UTC.</summary>
    public DateTimeOffset CreatedOnUtc { get; set; } = DateTimeOffset.UtcNow;
}
