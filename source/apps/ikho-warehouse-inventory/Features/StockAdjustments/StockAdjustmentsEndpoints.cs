using Ikho.SharedLibrary;
using Ikho.Warehouse.Inventory.Shared;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Warehouse.Inventory.Features.StockAdjustments;

/// <summary>Minimal API endpoint mappings for the StockAdjustments feature.</summary>
public static class StockAdjustmentsEndpoints
{
    /// <summary>Maps the stock-adjustment endpoint under <c>/api/warehouse/inventory/adjustments</c>.</summary>
    public static IEndpointRouteBuilder MapStockAdjustmentsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/inventory/adjustments").WithTags("StockAdjustments");

        group.MapPost("/", async Task<Results<Created<StockItemResponse>, NotFound<string>, BadRequest<string>>> (
            AdjustStockRequest request,
            StockAdjustmentsService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, stockItem) = await service.AdjustAsync(request, correlationId, cancellationToken);

            return outcome switch
            {
                AdjustStockOutcome.ValidationFailed =>
                    TypedResults.BadRequest("ReasonCode is required."),
                AdjustStockOutcome.StockItemNotFound =>
                    TypedResults.NotFound($"Stock item '{request.StockItemId}' was not found."),
                AdjustStockOutcome.WouldGoNegative =>
                    TypedResults.BadRequest("This adjustment would drive on-hand quantity negative."),
                _ => TypedResults.Created($"/api/warehouse/inventory/stock-items/{stockItem!.Id}", stockItem),
            };
        });

        return app;
    }
}
