namespace Ikho.Warehouse.Outbound.Domain;

/// <summary>A single fulfilled <see cref="Allocation"/> within a <see cref="Shipment"/>.</summary>
public sealed class ShipmentLine
{
    /// <summary>Stable identifier for this shipment line.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The <see cref="Shipment"/> this line belongs to.</summary>
    public Guid ShipmentId { get; set; }

    /// <summary>The <see cref="Allocation"/> fulfilled by this line.</summary>
    public Guid AllocationId { get; set; }

    /// <summary>Denormalized from the allocation, for querying without a join.</summary>
    public Guid ProductId { get; set; }

    /// <summary>Quantity shipped, matching the fulfilled allocation's quantity.</summary>
    public decimal Quantity { get; set; }
}
