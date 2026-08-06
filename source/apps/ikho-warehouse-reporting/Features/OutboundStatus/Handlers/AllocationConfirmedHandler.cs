using Ikho.SchemaManagement.Contracts.WarehouseOutbound.Events.V1;
using Ikho.SharedLibrary.Events;
using Ikho.WarehouseReporting.Features.FulfillmentKpis;

namespace Ikho.WarehouseReporting.Features.OutboundStatus.Handlers;

/// <summary>
/// Projects the Outbound service's <c>AllocationConfirmed</c> event onto both the
/// outbound-status read model (per sales order) and the daily fulfillment-KPI counters.
/// </summary>
public sealed class AllocationConfirmedHandler(
    IOutboundStatusRepository outboundStatusRepository,
    IFulfillmentKpiRepository fulfillmentKpiRepository) : IIntegrationEventHandler<AllocationConfirmed>
{
    /// <inheritdoc />
    public async Task HandleAsync(AllocationConfirmed @event, string? correlationId, CancellationToken cancellationToken)
    {
        var salesOrderId = Guid.Parse(@event.salesOrderId);
        var warehouseId = Guid.Parse(@event.warehouseId);
        var confirmedOn = DateTimeOffset.Parse(@event.confirmedOn);

        var status = await outboundStatusRepository.GetOrCreateAsync(salesOrderId, cancellationToken);
        status.WarehouseId = warehouseId;
        status.AllocationsConfirmedCount += 1;
        status.UpdatedOnUtc = DateTimeOffset.UtcNow;

        var kpi = await fulfillmentKpiRepository.GetOrCreateAsync(DateOnly.FromDateTime(confirmedOn.UtcDateTime), cancellationToken);
        kpi.TotalAllocationsConfirmed += 1;
        kpi.UpdatedOnUtc = DateTimeOffset.UtcNow;

        // Both repositories share the same scoped ReportingDbContext, so a single SaveChanges
        // call commits both mutations atomically.
        await outboundStatusRepository.SaveChangesAsync(cancellationToken);
    }
}
