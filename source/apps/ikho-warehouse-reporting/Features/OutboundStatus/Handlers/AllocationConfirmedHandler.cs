using Ikho.SchemaManagement.Contracts.WarehouseOutbound.Events.V1;
using Ikho.SharedLibrary.Events;

namespace Ikho.Warehouse.Reporting.Features.OutboundStatus.Handlers;

/// <summary>
/// Projects the Outbound service's <c>AllocationConfirmed</c> event onto the outbound-status
/// read model (per sales order). Daily fulfillment-KPI counters are updated independently by
/// <see cref="Ikho.Warehouse.Reporting.Features.FulfillmentKpis.Handlers.AllocationConfirmedKpiHandler"/>,
/// registered against the same topic under its own consumer group.
/// </summary>
public sealed class AllocationConfirmedHandler(IOutboundStatusRepository repository) : IIntegrationEventHandler<AllocationConfirmed>
{
    /// <inheritdoc />
    public async Task HandleAsync(AllocationConfirmed @event, string? correlationId, CancellationToken cancellationToken)
    {
        var salesOrderId = Guid.Parse(@event.salesOrderId);
        var warehouseId = Guid.Parse(@event.warehouseId);

        var status = await repository.GetOrCreateAsync(salesOrderId, cancellationToken);
        status.WarehouseId = warehouseId;
        status.AllocationsConfirmedCount += 1;
        status.UpdatedOnUtc = DateTimeOffset.UtcNow;

        await repository.SaveChangesAsync(cancellationToken);
    }
}
