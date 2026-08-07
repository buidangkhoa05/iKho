using Ikho.SchemaManagement.Contracts.WarehouseInbound.Events.V1;
using Ikho.SharedLibrary.Events;

namespace Ikho.Warehouse.Reporting.Features.FulfillmentKpis.Handlers;

/// <summary>
/// Projects the Inbound service's <c>ReceiptCompleted</c> event onto the daily fulfillment-KPI
/// counters. Registered against the same Kafka topic as
/// <see cref="Ikho.Warehouse.Reporting.Features.InboundStatus.Handlers.ReceiptCompletedHandler"/>
/// under its own consumer group, so the two projections stay independent instead of one slice
/// reaching into the other's repository.
/// </summary>
public sealed class ReceiptCompletedKpiHandler(IFulfillmentKpiRepository repository) : IIntegrationEventHandler<ReceiptCompleted>
{
    /// <inheritdoc />
    public async Task HandleAsync(ReceiptCompleted @event, string? correlationId, CancellationToken cancellationToken)
    {
        var receivedOn = DateTimeOffset.Parse(@event.receivedOn);

        var kpi = await repository.GetOrCreateAsync(DateOnly.FromDateTime(receivedOn.UtcDateTime), cancellationToken);
        kpi.TotalReceiptsCompleted += 1;
        kpi.UpdatedOnUtc = DateTimeOffset.UtcNow;

        await repository.SaveChangesAsync(cancellationToken);
    }
}
