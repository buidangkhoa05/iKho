namespace Ikho.WarehouseReporting.Features.OutboundStatus;

/// <summary>
/// Read-only query logic over the outbound-status read model. This feature's endpoints never
/// mutate state - see the event handlers in this folder for how the read model is kept up to date.
/// </summary>
public sealed class OutboundStatusService(IOutboundStatusRepository repository)
{
    /// <summary>Returns the outbound status for a sales order, or <see langword="null"/> if none exists yet.</summary>
    public async Task<OutboundStatusResponse?> GetAsync(Guid salesOrderId, CancellationToken cancellationToken)
    {
        var model = await repository.GetAsync(salesOrderId, cancellationToken);
        return model is null ? null : OutboundStatusResponse.FromEntity(model);
    }

    /// <summary>Returns every outbound-status row.</summary>
    public async Task<List<OutboundStatusResponse>> ListAsync(CancellationToken cancellationToken)
    {
        var models = await repository.ListAsync(cancellationToken);
        return models.ConvertAll(OutboundStatusResponse.FromEntity);
    }
}
