namespace Ikho.Warehouse.Inventory.Domain;

/// <summary>
/// A receiving batch of a lot-controlled product, identified by a lot number unique per
/// product. Every <see cref="StockItem"/> for a lot-controlled product references exactly one
/// <see cref="Lot"/>.
/// </summary>
public sealed class Lot
{
    /// <summary>Stable identifier for this lot.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK into the Catalog service's Product aggregate (referenced by id only).</summary>
    public Guid ProductId { get; set; }

    /// <summary>Business-facing lot number, unique per product.</summary>
    public string LotNumber { get; set; } = string.Empty;

    /// <summary>Optional expiration date for this lot.</summary>
    public DateTimeOffset? ExpirationDateUtc { get; set; }

    /// <summary>When this lot was first received, in UTC.</summary>
    public DateTimeOffset ReceivedOnUtc { get; set; } = DateTimeOffset.UtcNow;
}
