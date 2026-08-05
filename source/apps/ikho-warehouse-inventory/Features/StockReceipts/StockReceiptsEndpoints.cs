using Ikho.SharedLibrary;
using Ikho.WarehouseInventory.Shared;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehouseInventory.Features.StockReceipts;

/// <summary>Minimal API endpoint mappings for the StockReceipts feature.</summary>
public static class StockReceiptsEndpoints
{
    /// <summary>Maps the stock-receipt endpoint under <c>/api/warehouse/inventory/receipts</c>.</summary>
    public static IEndpointRouteBuilder MapStockReceiptsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/inventory/receipts").WithTags("StockReceipts");

        group.MapPost("/", async Task<Results<Created<StockItemResponse>, NotFound<string>, Conflict<string>, BadRequest<string>>> (
            ReceiveStockRequest request,
            StockReceiptsService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, stockItem, error) = await service.ReceiveAsync(request, correlationId, cancellationToken);

            return outcome switch
            {
                ReceiveStockOutcome.ProductNotFound =>
                    TypedResults.NotFound(error ?? $"Product '{request.ProductId}' was not found or is inactive."),
                ReceiveStockOutcome.BinNotFound =>
                    TypedResults.NotFound(error ?? $"Bin '{request.BinId}' was not found."),
                ReceiveStockOutcome.BinInvalid =>
                    TypedResults.Conflict(error ?? $"Bin '{request.BinId}' is not currently usable."),
                ReceiveStockOutcome.ValidationFailed =>
                    TypedResults.BadRequest(error ?? "The receipt request is invalid."),
                _ => TypedResults.Created($"/api/warehouse/inventory/stock-items/{stockItem!.Id}", stockItem),
            };
        });

        return app;
    }
}
