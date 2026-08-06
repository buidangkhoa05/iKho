namespace Ikho.WarehouseReturns.Domain;

/// <summary>The final handling decision made for a returned <see cref="ReturnOrderLine"/>.</summary>
public enum DispositionOutcome
{
    /// <summary>The goods are put back into sellable on-hand stock via Inventory's receive-stock command.</summary>
    Restock,

    /// <summary>The goods are held in quarantine pending further review, via Inventory's quarantine-receive command.</summary>
    Quarantine,

    /// <summary>The goods are discarded and never re-enter Inventory-tracked stock.</summary>
    Scrap,

    /// <summary>The goods are shipped back to the originating supplier and never re-enter Inventory-tracked stock.</summary>
    VendorReturn,
}

/// <summary>
/// Record of the final handling decision made for a returned <see cref="ReturnOrderLine"/> after
/// inspection. <see cref="DispositionOutcome.Restock"/> and <see cref="DispositionOutcome.Quarantine"/>
/// call into the Inventory service and populate <see cref="InventoryReferenceId"/>;
/// <see cref="DispositionOutcome.Scrap"/> and <see cref="DispositionOutcome.VendorReturn"/> do not
/// call Inventory at all, since the goods never (re-)enter Inventory-tracked stock. Exactly one
/// <see cref="Disposition"/> is recorded per <see cref="ReturnOrderLine"/> in this slice — see the
/// conflict check in <c>DispositionsService</c>.
/// </summary>
public sealed class Disposition
{
    /// <summary>Stable identifier for this disposition.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK to the <see cref="ReturnOrderLine"/> this disposition was recorded for.</summary>
    public Guid ReturnOrderLineId { get; set; }

    /// <summary>The handling decision made for this line.</summary>
    public DispositionOutcome Outcome { get; set; }

    /// <summary>
    /// FK into the Organization service's Bin aggregate (referenced by id only) — required for
    /// <see cref="DispositionOutcome.Restock"/> and <see cref="DispositionOutcome.Quarantine"/>,
    /// <see langword="null"/> otherwise.
    /// </summary>
    public Guid? BinId { get; set; }

    /// <summary>
    /// The id of the <c>StockItem</c> Inventory returned from its receive/quarantine command, as a
    /// string, when <see cref="Outcome"/> is <see cref="DispositionOutcome.Restock"/> or
    /// <see cref="DispositionOutcome.Quarantine"/>; <see langword="null"/> for
    /// <see cref="DispositionOutcome.Scrap"/> and <see cref="DispositionOutcome.VendorReturn"/>,
    /// which never call Inventory.
    /// </summary>
    public string? InventoryReferenceId { get; set; }

    /// <summary>When this disposition was executed, in UTC.</summary>
    public DateTimeOffset ExecutedOnUtc { get; set; } = DateTimeOffset.UtcNow;
}
