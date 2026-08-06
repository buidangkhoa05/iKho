namespace Ikho.WarehouseInventory.Domain;

/// <summary>The kind of operation that produced a <see cref="StockLedgerEntry"/>.</summary>
public enum StockMovementType
{
    /// <summary>Stock arrived into the warehouse from an external source.</summary>
    Receipt,

    /// <summary>A manual correction to on-hand quantity (cycle count, damage, shrinkage, etc.).</summary>
    Adjustment,

    /// <summary>Quantity moved from available into the reserved bucket. Does not change on-hand.</summary>
    Reservation,

    /// <summary>A previously active reservation was released back to available. Does not change on-hand.</summary>
    Release,

    /// <summary>A previously active reservation was fulfilled and physically shipped out. Decrements on-hand.</summary>
    Shipment,
}

/// <summary>
/// Append-only history of every quantity-affecting operation against a <see cref="StockItem"/>.
/// No repository method updates or deletes a ledger row — it exists purely to reconstruct how a
/// stock item reached its current quantities.
/// </summary>
public sealed class StockLedgerEntry
{
    /// <summary>Stable identifier for this ledger row.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The <see cref="StockItem"/> this entry describes a mutation of.</summary>
    public Guid StockItemId { get; set; }

    /// <summary>Denormalized from the stock item, for querying without a join.</summary>
    public Guid ProductId { get; set; }

    /// <summary>Denormalized from the stock item, for querying without a join.</summary>
    public Guid WarehouseId { get; set; }

    /// <summary>Denormalized from the stock item, for querying without a join.</summary>
    public Guid BinId { get; set; }

    /// <summary>Denormalized from the stock item, set only for lot-controlled products.</summary>
    public Guid? LotId { get; set; }

    /// <summary>Denormalized from the stock item, set only for serial-controlled products.</summary>
    public Guid? SerialNumberId { get; set; }

    /// <summary>The kind of operation that produced this entry.</summary>
    public StockMovementType MovementType { get; set; }

    /// <summary>
    /// Signed change this entry represents. For <see cref="StockMovementType.Reservation"/> and
    /// <see cref="StockMovementType.Release"/> this is always zero, since those operations move
    /// quantity between the on-hand and reserved buckets rather than changing on-hand itself.
    /// </summary>
    public decimal QuantityDelta { get; set; }

    /// <summary>Free-text reason, populated for <see cref="StockMovementType.Adjustment"/> entries.</summary>
    public string? ReasonCode { get; set; }

    /// <summary>The kind of record that caused this entry (e.g. <c>InventoryAdjustment</c>, <c>StockReservation</c>).</summary>
    public string? ReferenceType { get; set; }

    /// <summary>The id of the record that caused this entry, as a string.</summary>
    public string? ReferenceId { get; set; }

    /// <summary>Correlation id captured from the originating request, for tracing.</summary>
    public string? CorrelationId { get; set; }

    /// <summary>When this entry was recorded, in UTC.</summary>
    public DateTimeOffset OccurredOnUtc { get; set; } = DateTimeOffset.UtcNow;
}
