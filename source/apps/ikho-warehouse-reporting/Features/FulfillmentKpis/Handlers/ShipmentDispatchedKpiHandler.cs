using Ikho.SchemaManagement.Contracts.WarehouseOutbound.Events.V1;
using Ikho.SharedLibrary.Events;

namespace Ikho.Warehouse.Reporting.Features.FulfillmentKpis.Handlers;

/// <summary>
/// Projects the Outbound service's <c>ShipmentDispatched</c> event onto the daily
/// fulfillment-KPI counters. Registered against the same Kafka topic as
/// <see cref="Ikho.Warehouse.Reporting.Features.OutboundStatus.Handlers.ShipmentDispatchedHandler"/>
/// under its own consumer group, so the two projections stay independent instead of one slice
/// reaching into the other's repository.
/// </summary>
public sealed class ShipmentDispatchedKpiHandler(IFulfillmentKpiRepository repository) : IIntegrationEventHandler<ShipmentDispatched>
{
    /// <inheritdoc />
    public async Task HandleAsync(ShipmentDispatched @event, string? correlationId, CancellationToken cancellationToken)
    {
        var dispatchedOn = DateTimeOffset.Parse(@event.dispatchedOn);

        var kpi = await repository.GetOrCreateAsync(DateOnly.FromDateTime(dispatchedOn.UtcDateTime), cancellationToken);
        kpi.TotalShipmentsDispatched += 1;
        kpi.UpdatedOnUtc = DateTimeOffset.UtcNow;

        await repository.SaveChangesAsync(cancellationToken);
    }
}
