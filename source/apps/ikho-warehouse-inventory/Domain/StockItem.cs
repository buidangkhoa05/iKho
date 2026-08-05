namespace Ikho.WarehouseInventory.Domain;

/// <summary>
/// The per-location stock record — a specific product/lot/serial combination sitting in a
/// specific bin within a warehouse. This is the atomic row every quantity-affecting operation
/// (receipt, adjustment, reservation, release) reads and mutates.
/// </summary>
/// <remarks>
/// Postgres unique indexes treat <c>NULL != NULL</c>, so a unique index on
/// <c>(ProductId, WarehouseId, BinId, LotId, SerialNumberId)</c> does not actually prevent
/// duplicate rows when <see cref="LotId"/>/<see cref="SerialNumberId"/> are both null (the
/// common case for untracked products). Correctness is instead enforced in the repository's
/// "find matching stock item" query, which uses explicit null-aware equality before deciding
/// whether to create a new row.
/// </remarks>
public sealed class StockItem
{
    /// <summary>Stable identifier for this stock record.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK into the Catalog service's Product aggregate (referenced by id only).</summary>
    public Guid ProductId { get; set; }

    /// <summary>FK into the Organization service's Warehouse aggregate (referenced by id only).</summary>
    public Guid WarehouseId { get; set; }

    /// <summary>FK into the Organization service's Bin aggregate (referenced by id only).</summary>
    public Guid BinId { get; set; }

    /// <summary>Optional FK into <see cref="Lot"/>, set only for lot-controlled products.</summary>
    public Guid? LotId { get; set; }

    /// <summary>Optional FK into <see cref="SerialNumber"/>, set only for serial-controlled products.</summary>
    public Guid? SerialNumberId { get; set; }

    /// <summary>Total physical quantity present at this location, regardless of state.</summary>
    public decimal OnHandQuantity { get; set; }

    /// <summary>Portion of <see cref="OnHandQuantity"/> held against an active reservation.</summary>
    public decimal ReservedQuantity { get; set; }

    /// <summary>Portion of <see cref="OnHandQuantity"/> marked damaged and unsellable.</summary>
    public decimal DamagedQuantity { get; set; }

    /// <summary>Portion of <see cref="OnHandQuantity"/> held in quarantine, pending disposition.</summary>
    public decimal QuarantineQuantity { get; set; }

    /// <summary>When this stock record was first created, in UTC.</summary>
    public DateTimeOffset CreatedOnUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>When this stock record was last mutated, in UTC.</summary>
    public DateTimeOffset UpdatedOnUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Quantity actually available to reserve or ship. Getter-only with no backing field, so EF
    /// Core does not map it to a column by convention (defensively also excluded via
    /// <c>Ignore</c> in <see cref="Shared.InventoryDbContext"/>).
    /// </summary>
    public decimal AvailableQuantity => OnHandQuantity - ReservedQuantity - DamagedQuantity - QuarantineQuantity;
}
