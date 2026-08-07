using Ikho.SchemaManagement.Contracts.WarehouseOutbound.Events.V1;
using Ikho.SharedLibrary.Events;
using Ikho.Warehouse.Reporting.Features.FulfillmentKpis;

namespace Ikho.Warehouse.Reporting.Features.OutboundStatus.Handlers;

/// <summary>
/// Projects the Outbound service's <c>ShipmentDispatched</c> event onto both the
/// outbound-status read model (per sales order) and the daily fulfillment-KPI counters.
/// </summary>
public sealed class ShipmentDispatchedHandler(
    IOutboundStatusRepository outboundStatusRepository,
    IFulfillmentKpiRepository fulfillmentKpiRepository) : IIntegrationEventHandler<ShipmentDispatched>
{
    /// <inheritdoc />
    public async Task HandleAsync(ShipmentDispatched @event, string? correlationId, CancellationToken cancellationToken)
    {
        var salesOrderId = Guid.Parse(@event.salesOrderId);
        var warehouseId = Guid.Parse(@event.warehouseId);
        var dispatchedOn = DateTimeOffset.Parse(@event.dispatchedOn);

        var status = await outboundStatusRepository.GetOrCreateAsync(salesOrderId, cancellationToken);
        status.WarehouseId = warehouseId;
        status.ShipmentsDispatchedCount += 1;
        status.LastShipmentOnUtc = dispatchedOn;
        status.UpdatedOnUtc = DateTimeOffset.UtcNow;

        var kpi = await fulfillmentKpiRepository.GetOrCreateAsync(DateOnly.FromDateTime(dispatchedOn.UtcDateTime), cancellationToken);
        kpi.TotalShipmentsDispatched += 1;
        kpi.UpdatedOnUtc = DateTimeOffset.UtcNow;

        // Both repositories share the same scoped ReportingDbContext, so a single SaveChanges
        // call commits both mutations atomically.
        await outboundStatusRepository.SaveChangesAsync(cancellationToken);
    }
}
