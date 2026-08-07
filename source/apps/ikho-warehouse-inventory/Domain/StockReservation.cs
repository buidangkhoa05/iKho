namespace Ikho.Warehouse.Inventory.Domain;

/// <summary>The lifecycle state of a <see cref="StockReservation"/>.</summary>
public enum ReservationStatus
{
    /// <summary>Quantity is currently held against this reservation.</summary>
    Active,

    /// <summary>The reservation was released back to available stock without shipping.</summary>
    Released,

    /// <summary>The reservation was consumed by outbound execution.</summary>
    Fulfilled,
}

/// <summary>
/// A hold against a single <see cref="StockItem"/>'s available quantity, taken on behalf of an
/// outbound process (e.g. a sales order). Splitting a single reservation across multiple stock
/// items is out of scope for this slice — a reservation always resolves to exactly one stock
/// item with sufficient available quantity.
/// </summary>
public sealed class StockReservation
{
    /// <summary>Stable identifier for this reservation.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The <see cref="StockItem"/> this reservation holds quantity against.</summary>
    public Guid StockItemId { get; set; }

    /// <summary>Denormalized from the stock item, for querying without a join.</summary>
    public Guid ProductId { get; set; }

    /// <summary>Denormalized from the stock item, for querying without a join.</summary>
    public Guid WarehouseId { get; set; }

    /// <summary>Quantity held by this reservation.</summary>
    public decimal Quantity { get; set; }

    /// <summary>Current lifecycle state of this reservation.</summary>
    public ReservationStatus Status { get; set; } = ReservationStatus.Active;

    /// <summary>The kind of record that requested this reservation (e.g. <c>SalesOrder</c>).</summary>
    public string? ReferenceType { get; set; }

    /// <summary>The id of the record that requested this reservation, as a string.</summary>
    public string? ReferenceId { get; set; }

    /// <summary>When this reservation was created, in UTC.</summary>
    public DateTimeOffset CreatedOnUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>When this reservation was released, or <see langword="null"/> while still active.</summary>
    public DateTimeOffset? ReleasedOnUtc { get; set; }
}
