using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehouseReturns.Features.ReturnReceipts;

/// <summary>Minimal API endpoint mappings for the ReturnReceipts feature.</summary>
public static class ReturnReceiptsEndpoints
{
    /// <summary>Maps the return-receipt endpoint under <c>/api/warehouse/returns/orders/{id}/receipt</c>.</summary>
    public static IEndpointRouteBuilder MapReturnReceiptsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/returns/orders").WithTags("ReturnReceipts");

        group.MapPost("/{id:guid}/receipt", async Task<Results<Created<ReturnReceiptResponse>, NotFound<string>, Conflict<string>>> (
            Guid id,
            CreateReturnReceiptRequest request,
            ReturnReceiptsService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, receipt, error) = await service.ReceiveAsync(id, request, correlationId, cancellationToken);

            return outcome switch
            {
                CreateReturnReceiptOutcome.ReturnOrderNotFound =>
                    TypedResults.NotFound(error ?? $"Return order '{id}' was not found."),
                CreateReturnReceiptOutcome.AlreadyReceived =>
                    TypedResults.Conflict(error ?? $"Return order '{id}' has already been received against."),
                _ => TypedResults.Created($"/api/warehouse/returns/orders/{id}/receipt", receipt),
            };
        });

        return app;
    }
}
