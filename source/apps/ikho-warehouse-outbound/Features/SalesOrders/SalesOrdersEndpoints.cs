using Ikho.Warehouse.Outbound.Shared;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Warehouse.Outbound.Features.SalesOrders;

/// <summary>Minimal API endpoint mappings for the SalesOrders feature.</summary>
public static class SalesOrdersEndpoints
{
    /// <summary>Maps the sales-order create/read endpoints under <c>/api/warehouse/outbound/sales-orders</c>.</summary>
    public static IEndpointRouteBuilder MapSalesOrdersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/outbound/sales-orders").WithTags("SalesOrders");

        group.MapPost("/", async Task<Results<Created<SalesOrderResponse>, NotFound<string>, Conflict<string>, BadRequest<string>>> (
            CreateSalesOrderRequest request,
            SalesOrdersService service,
            CancellationToken cancellationToken) =>
        {
            var (outcome, salesOrder, error) = await service.CreateAsync(request, cancellationToken);

            return outcome switch
            {
                CreateSalesOrderOutcome.ValidationFailed =>
                    TypedResults.BadRequest(error ?? "The sales order request is invalid."),
                CreateSalesOrderOutcome.CustomerNotFound =>
                    TypedResults.NotFound(error ?? $"Customer '{request.CustomerId}' was not found or is inactive."),
                CreateSalesOrderOutcome.WarehouseNotFound =>
                    TypedResults.NotFound(error ?? $"Warehouse '{request.WarehouseId}' was not found."),
                CreateSalesOrderOutcome.WarehouseInactive =>
                    TypedResults.Conflict(error ?? $"Warehouse '{request.WarehouseId}' is not active."),
                CreateSalesOrderOutcome.ProductNotFound =>
                    TypedResults.NotFound(error ?? "One or more products were not found or are inactive."),
                _ => TypedResults.Created($"/api/warehouse/outbound/sales-orders/{salesOrder!.Id}", salesOrder),
            };
        });

        group.MapGet("/{id:guid}", async Task<Results<Ok<SalesOrderResponse>, NotFound>> (
            Guid id,
            SalesOrdersService service,
            CancellationToken cancellationToken) =>
        {
            var salesOrder = await service.GetByIdAsync(id, cancellationToken);
            return salesOrder is null ? TypedResults.NotFound() : TypedResults.Ok(salesOrder);
        });

        group.MapGet("/", async (SalesOrdersService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetAllAsync(cancellationToken)));

        return app;
    }
}
