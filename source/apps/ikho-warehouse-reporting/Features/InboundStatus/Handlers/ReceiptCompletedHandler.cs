using Ikho.SchemaManagement.Contracts.WarehouseInbound.Events.V1;
using Ikho.SharedLibrary.Events;

namespace Ikho.Warehouse.Reporting.Features.InboundStatus.Handlers;

/// <summary>
/// Projects the Inbound service's <c>ReceiptCompleted</c> event onto the inbound-status read
/// model (per purchase order). Daily fulfillment-KPI counters are updated independently by
/// <see cref="Ikho.Warehouse.Reporting.Features.FulfillmentKpis.Handlers.ReceiptCompletedKpiHandler"/>,
/// registered against the same topic under its own consumer group.
/// </summary>
public sealed class ReceiptCompletedHandler(IInboundStatusRepository repository) : IIntegrationEventHandler<ReceiptCompleted>
{
    /// <inheritdoc />
    public async Task HandleAsync(ReceiptCompleted @event, string? correlationId, CancellationToken cancellationToken)
    {
        var purchaseOrderId = Guid.Parse(@event.purchaseOrderId);
        var warehouseId = Guid.Parse(@event.warehouseId);
        var receivedOn = DateTimeOffset.Parse(@event.receivedOn);

        var status = await repository.GetOrCreateAsync(purchaseOrderId, cancellationToken);
        status.WarehouseId = warehouseId;
        status.ReceiptsCompletedCount += 1;
        status.LastReceiptOnUtc = receivedOn;
        status.UpdatedOnUtc = DateTimeOffset.UtcNow;

        await repository.SaveChangesAsync(cancellationToken);
    }
}
