using Ikho.SchemaManagement.Contracts.WarehouseOutbound.Events.V1;
using Ikho.SharedLibrary.Events;

namespace Ikho.Warehouse.Reporting.Features.FulfillmentKpis.Handlers;

/// <summary>
/// Projects the Outbound service's <c>AllocationConfirmed</c> event onto the daily
/// fulfillment-KPI counters. Registered against the same Kafka topic as
/// <see cref="Ikho.Warehouse.Reporting.Features.OutboundStatus.Handlers.AllocationConfirmedHandler"/>
/// under its own consumer group, so the two projections stay independent instead of one slice
/// reaching into the other's repository.
/// </summary>
public sealed class AllocationConfirmedKpiHandler(IFulfillmentKpiRepository repository) : IIntegrationEventHandler<AllocationConfirmed>
{
    /// <inheritdoc />
    public async Task HandleAsync(AllocationConfirmed @event, string? correlationId, CancellationToken cancellationToken)
    {
        var confirmedOn = DateTimeOffset.Parse(@event.confirmedOn);

        var kpi = await repository.GetOrCreateAsync(DateOnly.FromDateTime(confirmedOn.UtcDateTime), cancellationToken);
        kpi.TotalAllocationsConfirmed += 1;
        kpi.UpdatedOnUtc = DateTimeOffset.UtcNow;

        await repository.SaveChangesAsync(cancellationToken);
    }
}
