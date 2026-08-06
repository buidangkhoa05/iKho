using Ikho.SchemaManagement.Contracts.WarehouseInbound.Events.V1;
using Ikho.SharedLibrary.Events;
using Ikho.WarehouseReporting.Features.FulfillmentKpis;

namespace Ikho.WarehouseReporting.Features.InboundStatus.Handlers;

/// <summary>
/// Projects the Inbound service's <c>ReceiptCompleted</c> event onto both the inbound-status
/// read model (per purchase order) and the daily fulfillment-KPI counters.
/// </summary>
public sealed class ReceiptCompletedHandler(
    IInboundStatusRepository inboundStatusRepository,
    IFulfillmentKpiRepository fulfillmentKpiRepository) : IIntegrationEventHandler<ReceiptCompleted>
{
    /// <inheritdoc />
    public async Task HandleAsync(ReceiptCompleted @event, string? correlationId, CancellationToken cancellationToken)
    {
        var purchaseOrderId = Guid.Parse(@event.purchaseOrderId);
        var warehouseId = Guid.Parse(@event.warehouseId);
        var receivedOn = DateTimeOffset.Parse(@event.receivedOn);

        var status = await inboundStatusRepository.GetOrCreateAsync(purchaseOrderId, cancellationToken);
        status.WarehouseId = warehouseId;
        status.ReceiptsCompletedCount += 1;
        status.LastReceiptOnUtc = receivedOn;
        status.UpdatedOnUtc = DateTimeOffset.UtcNow;

        var kpi = await fulfillmentKpiRepository.GetOrCreateAsync(DateOnly.FromDateTime(receivedOn.UtcDateTime), cancellationToken);
        kpi.TotalReceiptsCompleted += 1;
        kpi.UpdatedOnUtc = DateTimeOffset.UtcNow;

        // Both repositories share the same scoped ReportingDbContext, so a single SaveChanges
        // call commits both mutations atomically.
        await inboundStatusRepository.SaveChangesAsync(cancellationToken);
    }
}
