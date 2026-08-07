using System.Net;
using System.Net.Http.Json;

namespace Ikho.Warehouse.Returns.Shared.Clients;

/// <inheritdoc cref="IInventoryApiClient" />
public sealed class InventoryApiClient(HttpClient httpClient) : IInventoryApiClient
{
    /// <inheritdoc />
    public Task<InventoryReceiveResult> ReceiveStockAsync(
        Guid productId, Guid warehouseId, Guid binId, decimal quantity, CancellationToken cancellationToken) =>
        PostReceiveAsync("/api/warehouse/inventory/receipts", productId, warehouseId, binId, quantity, cancellationToken);

    /// <inheritdoc />
    public Task<InventoryReceiveResult> ReceiveQuarantineAsync(
        Guid productId, Guid warehouseId, Guid binId, decimal quantity, CancellationToken cancellationToken) =>
        PostReceiveAsync("/api/warehouse/inventory/receipts/quarantine", productId, warehouseId, binId, quantity, cancellationToken);

    /// <summary>
    /// Shared implementation for both the normal and quarantine receive commands — they take the
    /// same request shape and only differ by target endpoint.
    /// </summary>
    private async Task<InventoryReceiveResult> PostReceiveAsync(
        string requestUri, Guid productId, Guid warehouseId, Guid binId, decimal quantity, CancellationToken cancellationToken)
    {
        // Lot/serial fields are intentionally left null: Returns does not currently thread lot
        // numbers or serial values back through the disposition flow.
        var request = new ReceiveStockRequestShape(productId, warehouseId, binId, quantity, null, null, null);
        using var response = await httpClient.PostAsJsonAsync(requestUri, request, cancellationToken);

        if (response.IsSuccessStatusCode)
        {
            var stockItem = await response.Content.ReadFromJsonAsync<StockItemResponseShape>(cancellationToken);
            return new InventoryReceiveResult(
                InventoryReceiveOutcome.Success,
                stockItem is null
                    ? null
                    : new InventoryStockItemInfo(
                        stockItem.Id, stockItem.ProductId, stockItem.WarehouseId, stockItem.BinId,
                        stockItem.OnHandQuantity, stockItem.QuarantineQuantity),
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
    /// <c>Ikho.Warehouse.Inventory.Features.StockReceipts.ReceiveStockRequest</c>, shared by both
    /// the normal and quarantine receive endpoints.
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
    /// Local mirror of only the fields Returns needs from Inventory's
    /// <c>Ikho.Warehouse.Inventory.Shared.StockItemResponse</c>.
    /// </summary>
    private sealed record StockItemResponseShape(
        Guid Id, Guid ProductId, Guid WarehouseId, Guid BinId, decimal OnHandQuantity, decimal QuarantineQuantity);
}
