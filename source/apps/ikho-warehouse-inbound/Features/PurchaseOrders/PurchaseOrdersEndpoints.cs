using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Warehouse.Inbound.Features.PurchaseOrders;

/// <summary>Minimal API endpoint mappings for the PurchaseOrders feature.</summary>
public static class PurchaseOrdersEndpoints
{
    /// <summary>Maps purchase-order creation and query endpoints under <c>/api/warehouse/inbound/purchase-orders</c>.</summary>
    public static IEndpointRouteBuilder MapPurchaseOrdersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/inbound/purchase-orders").WithTags("PurchaseOrders");

        group.MapPost("/", async Task<Results<Created<PurchaseOrderResponse>, NotFound<string>, Conflict<string>, BadRequest<string>>> (
            CreatePurchaseOrderRequest request,
            PurchaseOrdersService service,
            CancellationToken cancellationToken) =>
        {
            var (outcome, purchaseOrder, error) = await service.CreateAsync(request, cancellationToken);

            return outcome switch
            {
                CreatePurchaseOrderOutcome.ValidationFailed =>
                    TypedResults.BadRequest(error ?? "The purchase order request is invalid."),
                CreatePurchaseOrderOutcome.SupplierNotFound =>
                    TypedResults.NotFound(error ?? $"Supplier '{request.SupplierId}' was not found or is inactive."),
                CreatePurchaseOrderOutcome.WarehouseNotFound =>
                    TypedResults.NotFound(error ?? $"Warehouse '{request.WarehouseId}' was not found."),
                CreatePurchaseOrderOutcome.WarehouseInactive =>
                    TypedResults.Conflict(error ?? $"Warehouse '{request.WarehouseId}' is not currently active."),
                CreatePurchaseOrderOutcome.ProductNotFound =>
                    TypedResults.NotFound(error ?? "One or more ordered products were not found or are inactive."),
                _ => TypedResults.Created($"/api/warehouse/inbound/purchase-orders/{purchaseOrder!.Id}", purchaseOrder),
            };
        });

        group.MapGet("/{id:guid}", async Task<Results<Ok<PurchaseOrderResponse>, NotFound>> (
            Guid id,
            PurchaseOrdersService service,
            CancellationToken cancellationToken) =>
        {
            var purchaseOrder = await service.GetByIdAsync(id, cancellationToken);
            return purchaseOrder is null ? TypedResults.NotFound() : TypedResults.Ok(purchaseOrder);
        });

        group.MapGet("/", async (PurchaseOrdersService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetAllAsync(cancellationToken)));

        return app;
    }
}
