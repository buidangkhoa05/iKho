using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Warehouse.Reporting.Features.InboundStatus;

/// <summary>Minimal API endpoint mappings for the InboundStatus (read-only query) feature.</summary>
public static class InboundStatusEndpoints
{
    /// <summary>Maps the inbound-status query endpoints under <c>/api/warehouse/reporting</c>.</summary>
    public static IEndpointRouteBuilder MapInboundStatusEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/reporting").WithTags("InboundStatus");

        group.MapGet("/inbound-status", async (
            InboundStatusService service,
            CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.ListAsync(cancellationToken)));

        group.MapGet("/inbound-status/{purchaseOrderId:guid}", async Task<Results<Ok<InboundStatusResponse>, NotFound<string>>> (
            Guid purchaseOrderId,
            InboundStatusService service,
            CancellationToken cancellationToken) =>
        {
            var status = await service.GetAsync(purchaseOrderId, cancellationToken);
            return status is null
                ? TypedResults.NotFound($"No inbound status for purchase order '{purchaseOrderId}'.")
                : TypedResults.Ok(status);
        });

        return app;
    }
}
