using Ikho.SchemaManagement.Contracts.WarehouseOutbound.Events.V1;
using Ikho.SharedLibrary.Events;

namespace Ikho.Warehouse.Reporting.Features.OutboundStatus.Handlers;

/// <summary>
/// Projects the Outbound service's <c>ShipmentDispatched</c> event onto the outbound-status read
/// model (per sales order). Daily fulfillment-KPI counters are updated independently by
/// <see cref="Ikho.Warehouse.Reporting.Features.FulfillmentKpis.Handlers.ShipmentDispatchedKpiHandler"/>,
/// registered against the same topic under its own consumer group.
/// </summary>
public sealed class ShipmentDispatchedHandler(IOutboundStatusRepository repository) : IIntegrationEventHandler<ShipmentDispatched>
{
    /// <inheritdoc />
    public async Task HandleAsync(ShipmentDispatched @event, string? correlationId, CancellationToken cancellationToken)
    {
        var salesOrderId = Guid.Parse(@event.salesOrderId);
        var warehouseId = Guid.Parse(@event.warehouseId);
        var dispatchedOn = DateTimeOffset.Parse(@event.dispatchedOn);

        var status = await repository.GetOrCreateAsync(salesOrderId, cancellationToken);
        status.WarehouseId = warehouseId;
        status.ShipmentsDispatchedCount += 1;
        status.LastShipmentOnUtc = dispatchedOn;
        status.UpdatedOnUtc = DateTimeOffset.UtcNow;

        await repository.SaveChangesAsync(cancellationToken);
    }
}
