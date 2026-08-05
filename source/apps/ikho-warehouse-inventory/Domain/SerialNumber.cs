namespace Ikho.WarehouseInventory.Domain;

/// <summary>The lifecycle state of a single serialized unit.</summary>
public enum SerialNumberStatus
{
    /// <summary>Physically present in the warehouse and not yet reserved.</summary>
    InStock,

    /// <summary>Held against an active <see cref="StockReservation"/>.</summary>
    Reserved,

    /// <summary>Shipped out of the warehouse.</summary>
    Shipped,

    /// <summary>Marked damaged and unsellable.</summary>
    Damaged,
}

/// <summary>
/// A single serialized unit of a serial-controlled product, identified by a serial value unique
/// per product. Every <see cref="StockItem"/> for a serial-controlled product references exactly
/// one <see cref="SerialNumber"/> and represents a single physical unit.
/// </summary>
public sealed class SerialNumber
{
    /// <summary>Stable identifier for this serial number.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK into the Catalog service's Product aggregate (referenced by id only).</summary>
    public Guid ProductId { get; set; }

    /// <summary>Business-facing serial value, unique per product.</summary>
    public string SerialValue { get; set; } = string.Empty;

    /// <summary>Current lifecycle state of this unit.</summary>
    public SerialNumberStatus Status { get; set; } = SerialNumberStatus.InStock;

    /// <summary>When this unit was first received, in UTC.</summary>
    public DateTimeOffset ReceivedOnUtc { get; set; } = DateTimeOffset.UtcNow;
}
