using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehouseReturns.Features.Inspections;

/// <summary>Minimal API endpoint mappings for the Inspections feature.</summary>
public static class InspectionsEndpoints
{
    /// <summary>Maps the inspection endpoint under <c>/api/warehouse/returns/orders/{id}/lines/{lineId}/inspection</c>.</summary>
    public static IEndpointRouteBuilder MapInspectionsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/returns/orders").WithTags("Inspections");

        group.MapPost("/{id:guid}/lines/{lineId:guid}/inspection",
            async Task<Results<Created<InspectionResponse>, NotFound<string>, Conflict<string>>> (
                Guid id,
                Guid lineId,
                CreateInspectionRequest request,
                InspectionsService service,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, inspection, error) = await service.InspectAsync(id, lineId, request, correlationId, cancellationToken);

            return outcome switch
            {
                CreateInspectionOutcome.ReturnOrderNotFound =>
                    TypedResults.NotFound(error ?? $"Return order '{id}' was not found."),
                CreateInspectionOutcome.ReturnOrderLineNotFound =>
                    TypedResults.NotFound(error ?? $"Return order line '{lineId}' was not found on return order '{id}'."),
                CreateInspectionOutcome.ReturnOrderNotReceived =>
                    TypedResults.Conflict(error ?? $"Return order '{id}' has not been received yet."),
                CreateInspectionOutcome.AlreadyInspected =>
                    TypedResults.Conflict(error ?? $"Return order line '{lineId}' already has an inspection recorded."),
                _ => TypedResults.Created($"/api/warehouse/returns/orders/{id}/lines/{lineId}/inspection", inspection),
            };
        });

        return app;
    }
}
