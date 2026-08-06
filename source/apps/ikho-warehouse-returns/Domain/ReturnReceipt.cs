namespace Ikho.WarehouseReturns.Domain;

/// <summary>
/// Record of the physical arrival of a <see cref="ReturnOrder"/>'s goods at the warehouse. A
/// return order has at most one receipt in this slice — see the conflict check in
/// <c>ReturnReceiptsService</c>.
/// </summary>
public sealed class ReturnReceipt
{
    /// <summary>Stable identifier for this receipt.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK to the <see cref="ReturnOrder"/> this receipt was recorded against.</summary>
    public Guid ReturnOrderId { get; set; }

    /// <summary>When this receipt was recorded, in UTC.</summary>
    public DateTimeOffset ReceivedOnUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Optional free-text notes captured at receiving time (e.g. packaging condition).</summary>
    public string? Notes { get; set; }
}
