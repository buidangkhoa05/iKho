namespace Ikho.Warehouse.Reporting.Features.FulfillmentKpis;

/// <summary>
/// Read-only query logic over the daily fulfillment-KPI read model. This feature's endpoints
/// never mutate state - see the event handlers in the InboundStatus/OutboundStatus features for
/// how the counters are kept up to date.
/// </summary>
public sealed class FulfillmentKpiService(IFulfillmentKpiRepository repository)
{
    /// <summary>Returns the KPIs for a specific UTC calendar day, defaulting to zeroes if no activity has been recorded yet.</summary>
    public async Task<FulfillmentKpiResponse> GetAsync(DateOnly date, CancellationToken cancellationToken)
    {
        var model = await repository.GetAsync(date, cancellationToken);
        return model is null ? FulfillmentKpiResponse.Empty(date) : FulfillmentKpiResponse.FromEntity(model);
    }

    /// <summary>Returns the KPIs for every day in the inclusive <paramref name="from"/>/<paramref name="to"/> range.</summary>
    public async Task<List<FulfillmentKpiResponse>> GetRangeAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken)
    {
        var models = await repository.GetRangeAsync(from, to, cancellationToken);
        return models.ConvertAll(FulfillmentKpiResponse.FromEntity);
    }
}
