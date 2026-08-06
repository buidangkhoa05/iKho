namespace Ikho.WarehouseReporting.Domain;

/// <summary>
/// Denormalized rollup of a purchase order's inbound execution progress, keyed by
/// <see cref="PurchaseOrderId"/> and rebuilt incrementally from Inbound service events
/// (<c>ReceiptCompleted</c>, <c>PutawayTaskCompleted</c>).
/// </summary>
/// <remarks>
/// <c>PutawayTaskCompleted</c>'s published payload (<c>putawayTaskId</c>, <c>productId</c>,
/// <c>binId</c>, <c>quantity</c>, <c>completedOn</c>) does not carry a purchase order id, so
/// putaway completions cannot be attributed to a specific row here. As a deliberate
/// simplification, all putaway completions increment a single sentinel row keyed by
/// <see cref="PurchaseOrderId"/> = <see cref="UnattributedPurchaseOrderId"/>, tracking a running
/// total rather than per-order putaway progress. See <c>PutawayTaskCompletedHandler</c>.
/// </remarks>
public sealed class InboundStatusReadModel
{
    /// <summary>
    /// Sentinel <see cref="PurchaseOrderId"/> used to accumulate putaway completions that cannot
    /// be attributed to a specific purchase order - see the remarks on this type.
    /// </summary>
    public static readonly Guid UnattributedPurchaseOrderId = Guid.Empty;

    /// <summary>Stable identifier for this read-model row.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Opaque reference to the Inbound service's PurchaseOrder aggregate.</summary>
    public Guid PurchaseOrderId { get; set; }

    /// <summary>
    /// Opaque reference to the Organization service's Warehouse aggregate. Only known once at
    /// least one <c>ReceiptCompleted</c> event has been observed for this purchase order; left
    /// as <see langword="null"/> for the sentinel putaway-only row.
    /// </summary>
    public Guid? WarehouseId { get; set; }

    /// <summary>Count of completed receipts observed for this purchase order.</summary>
    public int ReceiptsCompletedCount { get; set; }

    /// <summary>Count of completed putaway tasks (see remarks on this type for attribution caveat).</summary>
    public int PutawayTasksCompletedCount { get; set; }

    /// <summary>When the most recent receipt was completed, in UTC.</summary>
    public DateTimeOffset? LastReceiptOnUtc { get; set; }

    /// <summary>When this row was last updated by an incoming event, in UTC.</summary>
    public DateTimeOffset UpdatedOnUtc { get; set; } = DateTimeOffset.UtcNow;
}
