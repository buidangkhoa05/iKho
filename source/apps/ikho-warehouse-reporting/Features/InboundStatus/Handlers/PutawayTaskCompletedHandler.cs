using Ikho.SchemaManagement.Contracts.WarehouseInbound.Events.V1;
using Ikho.SharedLibrary.Events;
using Ikho.Warehouse.Reporting.Domain;

namespace Ikho.Warehouse.Reporting.Features.InboundStatus.Handlers;

/// <summary>
/// Projects the Inbound service's <c>PutawayTaskCompleted</c> event onto the inbound-status read
/// model. The published payload (<c>putawayTaskId</c>, <c>productId</c>, <c>binId</c>,
/// <c>quantity</c>, <c>completedOn</c>) does not carry a purchase order id, so putaway
/// completions cannot be attributed to a specific purchase order here. As a deliberate
/// simplification, every completion increments a single sentinel row keyed by
/// <see cref="InboundStatusReadModel.UnattributedPurchaseOrderId"/>, tracking a running total
/// rather than per-order putaway progress.
/// </summary>
public sealed class PutawayTaskCompletedHandler(IInboundStatusRepository repository) : IIntegrationEventHandler<PutawayTaskCompleted>
{
    /// <inheritdoc />
    public async Task HandleAsync(PutawayTaskCompleted @event, string? correlationId, CancellationToken cancellationToken)
    {
        var status = await repository.GetOrCreateAsync(InboundStatusReadModel.UnattributedPurchaseOrderId, cancellationToken);
        status.PutawayTasksCompletedCount += 1;
        status.UpdatedOnUtc = DateTimeOffset.UtcNow;

        await repository.SaveChangesAsync(cancellationToken);
    }
}
