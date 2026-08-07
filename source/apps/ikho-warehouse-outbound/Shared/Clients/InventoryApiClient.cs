using System.Net;
using System.Net.Http.Json;

namespace Ikho.Warehouse.Outbound.Shared.Clients;

/// <inheritdoc cref="IInventoryApiClient" />
public sealed class InventoryApiClient(HttpClient httpClient) : IInventoryApiClient
{
    /// <inheritdoc />
    public async Task<(InventoryReserveOutcome Outcome, InventoryReservationInfo? Reservation)> ReserveAsync(
        Guid productId, Guid warehouseId, decimal quantity, string? referenceType, string? referenceId, CancellationToken cancellationToken)
    {
        var request = new ReserveStockRequestShape(productId, warehouseId, quantity, referenceType, referenceId);
        using var response = await httpClient.PostAsJsonAsync("/api/warehouse/inventory/reservations", request, cancellationToken);

        if (response.StatusCode == HttpStatusCode.Conflict)
        {
            return (InventoryReserveOutcome.InsufficientStock, null);
        }

        if (!response.IsSuccessStatusCode)
        {
            return (InventoryReserveOutcome.Error, null);
        }

        var reservation = await response.Content.ReadFromJsonAsync<StockReservationResponseShape>(cancellationToken);
        return reservation is null
            ? (InventoryReserveOutcome.Error, null)
            : (InventoryReserveOutcome.Created, reservation.ToInfo());
    }

    /// <inheritdoc />
    public async Task<(InventoryFulfillOutcome Outcome, InventoryReservationInfo? Reservation)> FulfillReservationAsync(
        Guid reservationId, CancellationToken cancellationToken)
    {
        using var response = await httpClient.PostAsync(
            $"/api/warehouse/inventory/reservations/{reservationId}/fulfill", content: null, cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return (InventoryFulfillOutcome.NotFound, null);
        }

        if (response.StatusCode == HttpStatusCode.Conflict)
        {
            return (InventoryFulfillOutcome.NotActive, null);
        }

        if (!response.IsSuccessStatusCode)
        {
            return (InventoryFulfillOutcome.Error, null);
        }

        var reservation = await response.Content.ReadFromJsonAsync<StockReservationResponseShape>(cancellationToken);
        return reservation is null
            ? (InventoryFulfillOutcome.Error, null)
            : (InventoryFulfillOutcome.Fulfilled, reservation.ToInfo());
    }

    /// <summary>Local mirror of the request body for Inventory's <c>ReserveStockRequest</c>.</summary>
    private sealed record ReserveStockRequestShape(Guid ProductId, Guid WarehouseId, decimal Quantity, string? ReferenceType, string? ReferenceId);

    /// <summary>
    /// Local mirror of Inventory's <c>Ikho.Warehouse.Inventory.Shared.StockReservationResponse</c>.
    /// </summary>
    private sealed record StockReservationResponseShape(
        Guid Id,
        Guid StockItemId,
        Guid ProductId,
        Guid WarehouseId,
        decimal Quantity,
        string Status,
        string? ReferenceType,
        string? ReferenceId,
        DateTimeOffset CreatedOnUtc,
        DateTimeOffset? ReleasedOnUtc)
    {
        public InventoryReservationInfo ToInfo() =>
            new(Id, StockItemId, ProductId, WarehouseId, Quantity, Status, ReferenceType, ReferenceId, CreatedOnUtc, ReleasedOnUtc);
    }
}
