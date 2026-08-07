using Ikho.Warehouse.Inventory.Shared;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Warehouse.Inventory.Features.StockBalances;

/// <summary>Minimal API endpoint mappings for the StockBalances (read-only query) feature.</summary>
public static class StockBalancesEndpoints
{
    /// <summary>
    /// Maps the balance, stock-item, and ledger-history query endpoints under
    /// <c>/api/warehouse/inventory</c>.
    /// </summary>
    public static IEndpointRouteBuilder MapStockBalancesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/inventory").WithTags("StockBalances");

        group.MapGet("/balances", async (
            Guid? productId,
            Guid? warehouseId,
            StockBalancesService service,
            CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetBalancesAsync(productId, warehouseId, cancellationToken)));

        group.MapGet("/stock-items", async (
            Guid? productId,
            Guid? warehouseId,
            Guid? binId,
            StockBalancesService service,
            CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetStockItemsAsync(productId, warehouseId, binId, cancellationToken)));

        // The "stock ledger invariant": summing StockLedgerEntry.QuantityDelta across every
        // Receipt/Adjustment-typed entry for a stock item must equal that stock item's current
        // OnHandQuantity (Reservation/Release entries always carry a zero delta and do not
        // affect on-hand). This endpoint exists specifically so that invariant can be manually
        // verified against a real stock item.
        group.MapGet("/stock-items/{id:guid}/ledger", async Task<Results<Ok<List<StockLedgerEntryResponse>>, NotFound<string>>> (
            Guid id,
            StockBalancesService service,
            CancellationToken cancellationToken) =>
        {
            var ledger = await service.GetLedgerAsync(id, cancellationToken);
            return ledger is null
                ? TypedResults.NotFound($"Stock item '{id}' was not found.")
                : TypedResults.Ok(ledger);
        });

        return app;
    }
}
