using Ikho.SharedLibrary;
using Ikho.Warehouse.Outbound.Shared;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Warehouse.Outbound.Features.Shipments;

/// <summary>Minimal API endpoint mappings for the Shipments feature.</summary>
public static class ShipmentsEndpoints
{
    /// <summary>
    /// Maps the dispatch endpoint under <c>/api/warehouse/outbound/sales-orders/{id}/dispatch</c>
    /// and the shipment read endpoints under <c>/api/warehouse/outbound/shipments</c>.
    /// </summary>
    public static IEndpointRouteBuilder MapShipmentsEndpoints(this IEndpointRouteBuilder app)
    {
        var salesOrdersGroup = app.MapGroup("/api/warehouse/outbound/sales-orders").WithTags("Shipments");

        salesOrdersGroup.MapPost("/{salesOrderId:guid}/dispatch",
            async Task<Results<Created<ShipmentResponse>, NotFound<string>, Conflict<string>, ProblemHttpResult>> (
                Guid salesOrderId,
                ShipmentsService service,
                HttpContext httpContext,
                CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, shipment, error) = await service.DispatchAsync(salesOrderId, correlationId, cancellationToken);

            return outcome switch
            {
                DispatchSalesOrderOutcome.SalesOrderNotFound => TypedResults.NotFound(error),
                DispatchSalesOrderOutcome.NotAllocated => TypedResults.Conflict(error),
                DispatchSalesOrderOutcome.InventoryFulfillFailed =>
                    TypedResults.Problem(detail: error, statusCode: StatusCodes.Status502BadGateway),
                _ => TypedResults.Created($"/api/warehouse/outbound/shipments/{shipment!.Id}", shipment),
            };
        });

        var shipmentsGroup = app.MapGroup("/api/warehouse/outbound/shipments").WithTags("Shipments");

        shipmentsGroup.MapGet("/{id:guid}", async Task<Results<Ok<ShipmentResponse>, NotFound>> (
            Guid id,
            ShipmentsService service,
            CancellationToken cancellationToken) =>
        {
            var shipment = await service.GetByIdAsync(id, cancellationToken);
            return shipment is null ? TypedResults.NotFound() : TypedResults.Ok(shipment);
        });

        shipmentsGroup.MapGet("/", async (ShipmentsService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetAllAsync(cancellationToken)));

        return app;
    }
}
