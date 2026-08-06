using Ikho.SharedLibrary;
using Ikho.WarehouseOutbound.Shared;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehouseOutbound.Features.Allocations;

/// <summary>Minimal API endpoint mappings for the Allocations feature.</summary>
public static class AllocationsEndpoints
{
    /// <summary>Maps the allocate endpoint under <c>/api/warehouse/outbound/sales-orders/{id}/allocate</c>.</summary>
    public static IEndpointRouteBuilder MapAllocationsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/outbound/sales-orders").WithTags("Allocations");

        group.MapPost("/{salesOrderId:guid}/allocate", async Task<Results<Ok<SalesOrderResponse>, NotFound<string>, Conflict<string>>> (
            Guid salesOrderId,
            AllocationsService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, salesOrder, failedProductIds) = await service.AllocateAsync(salesOrderId, correlationId, cancellationToken);

            return outcome switch
            {
                AllocateSalesOrderOutcome.SalesOrderNotFound =>
                    TypedResults.NotFound($"Sales order '{salesOrderId}' was not found."),
                AllocateSalesOrderOutcome.InsufficientStock =>
                    TypedResults.Conflict($"Insufficient stock to allocate product(s): {string.Join(", ", failedProductIds)}."),
                _ => TypedResults.Ok(salesOrder),
            };
        });

        return app;
    }
}
