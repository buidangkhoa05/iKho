using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Warehouse.Reporting.Features.OutboundStatus;

/// <summary>Minimal API endpoint mappings for the OutboundStatus (read-only query) feature.</summary>
public static class OutboundStatusEndpoints
{
    /// <summary>Maps the outbound-status query endpoints under <c>/api/warehouse/reporting</c>.</summary>
    public static IEndpointRouteBuilder MapOutboundStatusEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/reporting").WithTags("OutboundStatus");

        group.MapGet("/outbound-status", async (
            OutboundStatusService service,
            CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.ListAsync(cancellationToken)));

        group.MapGet("/outbound-status/{salesOrderId:guid}", async Task<Results<Ok<OutboundStatusResponse>, NotFound<string>>> (
            Guid salesOrderId,
            OutboundStatusService service,
            CancellationToken cancellationToken) =>
        {
            var status = await service.GetAsync(salesOrderId, cancellationToken);
            return status is null
                ? TypedResults.NotFound($"No outbound status for sales order '{salesOrderId}'.")
                : TypedResults.Ok(status);
        });

        return app;
    }
}
