using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehouseReporting.Features.FulfillmentKpis;

/// <summary>Minimal API endpoint mappings for the FulfillmentKpis (read-only query) feature.</summary>
public static class FulfillmentKpiEndpoints
{
    /// <summary>Maps the KPI query endpoints under <c>/api/warehouse/reporting</c>.</summary>
    public static IEndpointRouteBuilder MapFulfillmentKpiEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/reporting").WithTags("FulfillmentKpis");

        group.MapGet("/kpis", async (
            DateOnly? date,
            FulfillmentKpiService service,
            CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetAsync(date ?? DateOnly.FromDateTime(DateTime.UtcNow), cancellationToken)));

        group.MapGet("/kpis/range", async Task<Results<Ok<List<FulfillmentKpiResponse>>, BadRequest<string>>> (
            DateOnly from,
            DateOnly to,
            FulfillmentKpiService service,
            CancellationToken cancellationToken) =>
        {
            if (to < from)
            {
                return TypedResults.BadRequest("'to' must not be earlier than 'from'.");
            }

            return TypedResults.Ok(await service.GetRangeAsync(from, to, cancellationToken));
        });

        return app;
    }
}
