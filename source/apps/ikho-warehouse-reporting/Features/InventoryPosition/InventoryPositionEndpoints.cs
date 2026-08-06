using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehouseReporting.Features.InventoryPosition;

/// <summary>Minimal API endpoint mappings for the InventoryPosition (read-only query) feature.</summary>
public static class InventoryPositionEndpoints
{
    /// <summary>Maps the inventory-position query endpoints under <c>/api/warehouse/reporting</c>.</summary>
    public static IEndpointRouteBuilder MapInventoryPositionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/reporting").WithTags("InventoryPosition");

        group.MapGet("/inventory-position", async (
            Guid? productId,
            Guid? warehouseId,
            InventoryPositionService service,
            CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.ListAsync(productId, warehouseId, cancellationToken)));

        group.MapGet("/inventory-position/{productId:guid}/{warehouseId:guid}", async Task<Results<Ok<InventoryPositionResponse>, NotFound<string>>> (
            Guid productId,
            Guid warehouseId,
            InventoryPositionService service,
            CancellationToken cancellationToken) =>
        {
            var position = await service.GetAsync(productId, warehouseId, cancellationToken);
            return position is null
                ? TypedResults.NotFound($"No inventory position for product '{productId}' in warehouse '{warehouseId}'.")
                : TypedResults.Ok(position);
        });

        return app;
    }
}
