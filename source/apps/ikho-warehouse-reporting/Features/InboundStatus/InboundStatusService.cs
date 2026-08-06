namespace Ikho.WarehouseReporting.Features.InboundStatus;

/// <summary>
/// Read-only query logic over the inbound-status read model. This feature's endpoints never
/// mutate state - see the event handlers in this folder for how the read model is kept up to date.
/// </summary>
public sealed class InboundStatusService(IInboundStatusRepository repository)
{
    /// <summary>Returns the inbound status for a purchase order, or <see langword="null"/> if none exists yet.</summary>
    public async Task<InboundStatusResponse?> GetAsync(Guid purchaseOrderId, CancellationToken cancellationToken)
    {
        var model = await repository.GetAsync(purchaseOrderId, cancellationToken);
        return model is null ? null : InboundStatusResponse.FromEntity(model);
    }

    /// <summary>Returns every inbound-status row.</summary>
    public async Task<List<InboundStatusResponse>> ListAsync(CancellationToken cancellationToken)
    {
        var models = await repository.ListAsync(cancellationToken);
        return models.ConvertAll(InboundStatusResponse.FromEntity);
    }
}
