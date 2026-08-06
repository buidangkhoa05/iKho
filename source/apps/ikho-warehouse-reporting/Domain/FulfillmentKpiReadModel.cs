namespace Ikho.WarehouseReporting.Domain;

/// <summary>
/// One row per UTC calendar day, accumulating simple fulfillment counters across the whole
/// platform. Incremented by the same event handlers that maintain <see cref="InboundStatusReadModel"/>
/// and <see cref="OutboundStatusReadModel"/>, keyed by the event's occurrence date (UTC).
/// </summary>
public sealed class FulfillmentKpiReadModel
{
    /// <summary>Stable identifier for this read-model row.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The UTC calendar day this row summarizes.</summary>
    public DateOnly Date { get; set; }

    /// <summary>Total <c>ReceiptCompleted</c> events observed for this day.</summary>
    public int TotalReceiptsCompleted { get; set; }

    /// <summary>Total <c>ShipmentDispatched</c> events observed for this day.</summary>
    public int TotalShipmentsDispatched { get; set; }

    /// <summary>Total <c>AllocationConfirmed</c> events observed for this day.</summary>
    public int TotalAllocationsConfirmed { get; set; }

    /// <summary>When this row was last updated by an incoming event, in UTC.</summary>
    public DateTimeOffset UpdatedOnUtc { get; set; } = DateTimeOffset.UtcNow;
}
