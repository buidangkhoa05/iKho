namespace Ikho.WarehouseInbound.Domain;

/// <summary>Lifecycle status of a <see cref="Receipt"/>.</summary>
public enum ReceiptStatus
{
    /// <summary>
    /// The receipt was recorded and its stock handed off to Inventory. This slice keeps receiving
    /// a single-step operation (no staged in-progress receipt workflow), so <c>Completed</c> is
    /// currently the only status a <see cref="Receipt"/> can have.
    /// </summary>
    Completed,
}

/// <summary>
/// A single receiving event against a <see cref="PurchaseOrder"/> — the record that stock for one
/// or more of its lines physically arrived and was handed off to Inventory.
/// </summary>
public sealed class Receipt
{
    /// <summary>Stable identifier for this receipt.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK to the <see cref="PurchaseOrder"/> this receipt was recorded against.</summary>
    public Guid PurchaseOrderId { get; set; }

    /// <summary>FK into the Organization service's Warehouse aggregate (referenced by id only); copied from the parent purchase order.</summary>
    public Guid WarehouseId { get; set; }

    /// <summary>Current lifecycle status of this receipt.</summary>
    public ReceiptStatus Status { get; set; } = ReceiptStatus.Completed;

    /// <summary>When this receipt was recorded, in UTC.</summary>
    public DateTimeOffset CreatedOnUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>The lines received as part of this receipt.</summary>
    public ICollection<ReceiptLine> Lines { get; set; } = new List<ReceiptLine>();
}
