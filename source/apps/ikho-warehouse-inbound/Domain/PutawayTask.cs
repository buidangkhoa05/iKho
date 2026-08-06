namespace Ikho.WarehouseInbound.Domain;

/// <summary>Lifecycle status of a <see cref="PutawayTask"/>.</summary>
public enum PutawayTaskStatus
{
    /// <summary>
    /// The task's quantity has already been placed into its bin. This slice folds putaway into
    /// the receive-into-bin flow rather than modeling a separate staging-then-putaway workflow —
    /// mirroring how Inventory's own receive endpoint already assigns a destination bin directly
    /// instead of staging stock first — so every <see cref="PutawayTask"/> is created in this
    /// status; there is currently no pending/in-progress state.
    /// </summary>
    Completed,
}

/// <summary>
/// Record of stock being placed into its destination bin as part of a <see cref="ReceiptLine"/>.
/// See <see cref="PutawayTaskStatus.Completed"/> for why this slice creates every task already
/// completed rather than modeling a multi-step putaway workflow.
/// </summary>
public sealed class PutawayTask
{
    /// <summary>Stable identifier for this putaway task.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK to the <see cref="ReceiptLine"/> this task was created for (one task per receipt line in this slice).</summary>
    public Guid ReceiptLineId { get; set; }

    /// <summary>FK into the Catalog service's Product aggregate (referenced by id only); copied from the receipt line.</summary>
    public Guid ProductId { get; set; }

    /// <summary>FK into the Organization service's Bin aggregate (referenced by id only); copied from the receipt line.</summary>
    public Guid BinId { get; set; }

    /// <summary>Quantity placed into the bin.</summary>
    public decimal Quantity { get; set; }

    /// <summary>Current lifecycle status of this task.</summary>
    public PutawayTaskStatus Status { get; set; } = PutawayTaskStatus.Completed;

    /// <summary>When this task was completed, in UTC.</summary>
    public DateTimeOffset CompletedOnUtc { get; set; } = DateTimeOffset.UtcNow;
}
