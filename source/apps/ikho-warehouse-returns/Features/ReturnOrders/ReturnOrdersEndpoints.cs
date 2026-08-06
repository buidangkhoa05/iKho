using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehouseReturns.Features.ReturnOrders;

/// <summary>Minimal API endpoint mappings for the ReturnOrders feature.</summary>
public static class ReturnOrdersEndpoints
{
    /// <summary>Maps return-order creation and query endpoints under <c>/api/warehouse/returns/orders</c>.</summary>
    public static IEndpointRouteBuilder MapReturnOrdersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/returns/orders").WithTags("ReturnOrders");

        group.MapPost("/", async Task<Results<Created<ReturnOrderResponse>, NotFound<string>, Conflict<string>, BadRequest<string>>> (
            CreateReturnOrderRequest request,
            ReturnOrdersService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, returnOrder, error) = await service.CreateAsync(request, correlationId, cancellationToken);

            return outcome switch
            {
                CreateReturnOrderOutcome.ValidationFailed =>
                    TypedResults.BadRequest(error ?? "The return order request is invalid."),
                CreateReturnOrderOutcome.CustomerNotFound =>
                    TypedResults.NotFound(error ?? $"Customer '{request.CustomerId}' was not found or is inactive."),
                CreateReturnOrderOutcome.SupplierNotFound =>
                    TypedResults.NotFound(error ?? $"Supplier '{request.SupplierId}' was not found or is inactive."),
                CreateReturnOrderOutcome.WarehouseNotFound =>
                    TypedResults.NotFound(error ?? $"Warehouse '{request.WarehouseId}' was not found."),
                CreateReturnOrderOutcome.WarehouseInactive =>
                    TypedResults.Conflict(error ?? $"Warehouse '{request.WarehouseId}' is not currently active."),
                CreateReturnOrderOutcome.ProductNotFound =>
                    TypedResults.NotFound(error ?? "One or more returned products were not found or are inactive."),
                _ => TypedResults.Created($"/api/warehouse/returns/orders/{returnOrder!.Id}", returnOrder),
            };
        });

        group.MapGet("/{id:guid}", async Task<Results<Ok<ReturnOrderResponse>, NotFound>> (
            Guid id,
            ReturnOrdersService service,
            CancellationToken cancellationToken) =>
        {
            var returnOrder = await service.GetByIdAsync(id, cancellationToken);
            return returnOrder is null ? TypedResults.NotFound() : TypedResults.Ok(returnOrder);
        });

        group.MapGet("/", async (string? sourceReferenceId, ReturnOrdersService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetAllAsync(sourceReferenceId, cancellationToken)));

        return app;
    }
}
