using System.Net;
using System.Net.Http.Json;

namespace Ikho.Warehouse.Inbound.Shared.Clients;

/// <inheritdoc cref="IInventoryApiClient" />
public sealed class InventoryApiClient(HttpClient httpClient) : IInventoryApiClient
{
    /// <inheritdoc />
    public async Task<InventoryReceiveResult> ReceiveStockAsync(
        Guid productId,
        Guid warehouseId,
        Guid binId,
        decimal quantity,
        string? lotNumber,
        DateTimeOffset? expirationDateUtc,
        List<string>? serialNumbers,
        CancellationToken cancellationToken)
    {
        var request = new ReceiveStockRequestShape(productId, warehouseId, binId, quantity, lotNumber, expirationDateUtc, serialNumbers);
        using var response = await httpClient.PostAsJsonAsync("/api/warehouse/inventory/receipts", request, cancellationToken);

        if (response.IsSuccessStatusCode)
        {
            var stockItem = await response.Content.ReadFromJsonAsync<StockItemResponseShape>(cancellationToken);
            return new InventoryReceiveResult(
                InventoryReceiveOutcome.Success,
                stockItem is null
                    ? null
                    : new InventoryStockItemInfo(stockItem.Id, stockItem.ProductId, stockItem.WarehouseId, stockItem.BinId, stockItem.OnHandQuantity),
                null);
        }

        var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
        var outcome = response.StatusCode switch
        {
            HttpStatusCode.BadRequest => InventoryReceiveOutcome.BadRequest,
            HttpStatusCode.NotFound => InventoryReceiveOutcome.NotFound,
            HttpStatusCode.Conflict => InventoryReceiveOutcome.Conflict,
            _ => InventoryReceiveOutcome.UnexpectedError,
        };

        return new InventoryReceiveResult(
            outcome, null, string.IsNullOrWhiteSpace(errorBody) ? $"Inventory service returned {(int)response.StatusCode}." : errorBody);
    }

    /// <summary>
    /// Local mirror of Inventory's
    /// <c>Ikho.Warehouse.Inventory.Features.StockReceipts.ReceiveStockRequest</c>.
    /// </summary>
    private sealed record ReceiveStockRequestShape(
        Guid ProductId,
        Guid WarehouseId,
        Guid BinId,
        decimal Quantity,
        string? LotNumber,
        DateTimeOffset? ExpirationDateUtc,
        List<string>? SerialNumbers);

    /// <summary>
    /// Local mirror of only the fields Inbound needs from Inventory's
    /// <c>Ikho.Warehouse.Inventory.Shared.StockItemResponse</c>.
    /// </summary>
    private sealed record StockItemResponseShape(Guid Id, Guid ProductId, Guid WarehouseId, Guid BinId, decimal OnHandQuantity);
}
