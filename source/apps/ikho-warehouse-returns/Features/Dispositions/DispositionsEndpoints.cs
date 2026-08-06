using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehouseReturns.Features.Dispositions;

/// <summary>Minimal API endpoint mappings for the Dispositions feature.</summary>
public static class DispositionsEndpoints
{
    /// <summary>Maps the disposition endpoint under <c>/api/warehouse/returns/orders/{id}/lines/{lineId}/disposition</c>.</summary>
    public static IEndpointRouteBuilder MapDispositionsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/returns/orders").WithTags("Dispositions");

        group.MapPost("/{id:guid}/lines/{lineId:guid}/disposition",
            async Task<Results<Created<DispositionResponse>, NotFound<string>, Conflict<string>, BadRequest<string>>> (
                Guid id,
                Guid lineId,
                CreateDispositionRequest request,
                DispositionsService service,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, disposition, error) = await service.DispositionAsync(id, lineId, request, correlationId, cancellationToken);

            return outcome switch
            {
                CreateDispositionOutcome.ValidationFailed =>
                    TypedResults.BadRequest(error ?? "The disposition request is invalid."),
                CreateDispositionOutcome.ReturnOrderNotFound =>
                    TypedResults.NotFound(error ?? $"Return order '{id}' was not found."),
                CreateDispositionOutcome.ReturnOrderLineNotFound =>
                    TypedResults.NotFound(error ?? $"Return order line '{lineId}' was not found on return order '{id}'."),
                CreateDispositionOutcome.LineNotInspected =>
                    TypedResults.Conflict(error ?? $"Return order line '{lineId}' has not been inspected yet."),
                CreateDispositionOutcome.AlreadyDispositioned =>
                    TypedResults.Conflict(error ?? $"Return order line '{lineId}' already has a disposition recorded."),
                CreateDispositionOutcome.InventoryBadRequest =>
                    TypedResults.BadRequest(error ?? "Inventory rejected the disposition as invalid."),
                CreateDispositionOutcome.InventoryNotFound =>
                    TypedResults.NotFound(error ?? "Inventory reported the product or bin was not found."),
                CreateDispositionOutcome.InventoryConflict =>
                    TypedResults.Conflict(error ?? "Inventory reported a conflict while executing the disposition."),
                CreateDispositionOutcome.InventoryUnexpectedError =>
                    TypedResults.Conflict(error ?? "Inventory returned an unexpected error while executing the disposition."),
                _ => TypedResults.Created($"/api/warehouse/returns/orders/{id}/lines/{lineId}/disposition", disposition),
            };
        });

        return app;
    }
}
