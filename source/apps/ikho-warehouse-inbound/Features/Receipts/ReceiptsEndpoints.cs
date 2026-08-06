using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehouseInbound.Features.Receipts;

/// <summary>Minimal API endpoint mappings for the Receipts feature.</summary>
public static class ReceiptsEndpoints
{
    /// <summary>Maps receipt-completion and query endpoints under <c>/api/warehouse/inbound/receipts</c>.</summary>
    public static IEndpointRouteBuilder MapReceiptsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/inbound/receipts").WithTags("Receipts");

        group.MapPost("/", async Task<Results<Created<ReceiptResponse>, NotFound<string>, Conflict<string>, BadRequest<string>>> (
            CreateReceiptRequest request,
            ReceiptsService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, receipt, error) = await service.CompleteAsync(request, correlationId, cancellationToken);

            return outcome switch
            {
                CompleteReceiptOutcome.ValidationFailed =>
                    TypedResults.BadRequest(error ?? "The receipt request is invalid."),
                CompleteReceiptOutcome.PurchaseOrderNotFound =>
                    TypedResults.NotFound(error ?? $"Purchase order '{request.PurchaseOrderId}' was not found."),
                CompleteReceiptOutcome.PurchaseOrderCancelled =>
                    TypedResults.Conflict(error ?? $"Purchase order '{request.PurchaseOrderId}' is cancelled and cannot be received against."),
                CompleteReceiptOutcome.PurchaseOrderLineNotFound =>
                    TypedResults.NotFound(error ?? "One or more purchase order lines were not found."),
                CompleteReceiptOutcome.ExceedsOrderedQuantity =>
                    TypedResults.Conflict(error ?? "Receiving the requested quantity would exceed the purchase order line's ordered quantity."),
                CompleteReceiptOutcome.InventoryBadRequest =>
                    TypedResults.BadRequest(error ?? "Inventory rejected the receipt as invalid."),
                CompleteReceiptOutcome.InventoryNotFound =>
                    TypedResults.NotFound(error ?? "Inventory reported the product or bin was not found."),
                CompleteReceiptOutcome.InventoryConflict =>
                    TypedResults.Conflict(error ?? "Inventory reported a conflict while receiving stock."),
                CompleteReceiptOutcome.InventoryUnexpectedError =>
                    TypedResults.Conflict(error ?? "Inventory returned an unexpected error while receiving stock."),
                _ => TypedResults.Created($"/api/warehouse/inbound/receipts/{receipt!.Id}", receipt),
            };
        });

        group.MapGet("/{id:guid}", async Task<Results<Ok<ReceiptResponse>, NotFound>> (
            Guid id,
            ReceiptsService service,
            CancellationToken cancellationToken) =>
        {
            var receipt = await service.GetByIdAsync(id, cancellationToken);
            return receipt is null ? TypedResults.NotFound() : TypedResults.Ok(receipt);
        });

        group.MapGet("/", async (ReceiptsService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetAllAsync(cancellationToken)));

        return app;
    }
}
