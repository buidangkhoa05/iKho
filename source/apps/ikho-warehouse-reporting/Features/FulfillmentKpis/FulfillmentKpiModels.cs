namespace Ikho.WarehouseReporting.Features.FulfillmentKpis;

/// <summary>Response DTO for a <see cref="Domain.FulfillmentKpiReadModel"/>.</summary>
public sealed record FulfillmentKpiResponse(
    DateOnly Date,
    int TotalReceiptsCompleted,
    int TotalShipmentsDispatched,
    int TotalAllocationsConfirmed,
    DateTimeOffset UpdatedOnUtc)
{
    /// <summary>Projects a <see cref="Domain.FulfillmentKpiReadModel"/> entity to its response DTO.</summary>
    public static FulfillmentKpiResponse FromEntity(Domain.FulfillmentKpiReadModel model) =>
        new(model.Date, model.TotalReceiptsCompleted, model.TotalShipmentsDispatched, model.TotalAllocationsConfirmed, model.UpdatedOnUtc);

    /// <summary>A zeroed response for a day with no recorded activity yet.</summary>
    public static FulfillmentKpiResponse Empty(DateOnly date) => new(date, 0, 0, 0, DateTimeOffset.UtcNow);
}
