using Ikho.SharedLibrary;
using Ikho.WarehouseInventory.Shared;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehouseInventory.Features.StockReservations;

/// <summary>Minimal API endpoint mappings for the StockReservations feature.</summary>
public static class StockReservationsEndpoints
{
    /// <summary>
    /// Maps the reserve and release endpoints under <c>/api/warehouse/inventory/reservations</c>.
    /// </summary>
    public static IEndpointRouteBuilder MapStockReservationsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/inventory/reservations").WithTags("StockReservations");

        group.MapPost("/", async Task<Results<Created<StockReservationResponse>, Conflict<string>, BadRequest<string>>> (
            ReserveStockRequest request,
            StockReservationsService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, reservation) = await service.ReserveAsync(request, correlationId, cancellationToken);

            return outcome switch
            {
                ReserveStockOutcome.InsufficientStock =>
                    TypedResults.Conflict(
                        $"No single stock item for product '{request.ProductId}' in warehouse '{request.WarehouseId}' has enough available quantity."),
                ReserveStockOutcome.ValidationFailed =>
                    TypedResults.BadRequest("Quantity must be greater than zero."),
                _ => TypedResults.Created($"/api/warehouse/inventory/reservations/{reservation!.Id}", reservation),
            };
        });

        group.MapPost("/{id:guid}/release", async Task<Results<Ok<StockReservationResponse>, NotFound<string>, Conflict<string>>> (
            Guid id,
            StockReservationsService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, reservation) = await service.ReleaseAsync(id, correlationId, cancellationToken);

            return outcome switch
            {
                ReleaseStockOutcome.NotFound => TypedResults.NotFound($"Reservation '{id}' was not found."),
                ReleaseStockOutcome.NotActive => TypedResults.Conflict($"Reservation '{id}' is not active."),
                _ => TypedResults.Ok(reservation),
            };
        });

        group.MapPost("/{id:guid}/fulfill", async Task<Results<Ok<StockReservationResponse>, NotFound<string>, Conflict<string>>> (
            Guid id,
            StockReservationsService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, reservation) = await service.FulfillAsync(id, correlationId, cancellationToken);

            return outcome switch
            {
                FulfillStockOutcome.NotFound => TypedResults.NotFound($"Reservation '{id}' was not found."),
                FulfillStockOutcome.NotActive => TypedResults.Conflict($"Reservation '{id}' is not active."),
                _ => TypedResults.Ok(reservation),
            };
        });

        return app;
    }
}
