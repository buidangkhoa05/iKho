using System.Globalization;
using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseInventory.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Inventory.Domain;
using Ikho.Warehouse.Inventory.Shared;

namespace Ikho.Warehouse.Inventory.Features.StockAdjustments;

/// <summary>Distinguishes why an adjustment attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum AdjustStockOutcome
{
    /// <summary>The adjustment was recorded successfully.</summary>
    Created,

    /// <summary>The referenced stock item does not exist.</summary>
    StockItemNotFound,

    /// <summary>Applying the adjustment would drive on-hand quantity negative.</summary>
    WouldGoNegative,
}

/// <summary>
/// Business logic for manually correcting a stock item's on-hand quantity. Updates the
/// <see cref="StockItem"/> and <see cref="StockBalance"/> rows transactionally, writes an
/// <see cref="InventoryAdjustment"/> audit record plus a corresponding
/// <see cref="StockLedgerEntry"/>, and publishes <c>StockAdjusted</c> via the transactional
/// outbox.
/// </summary>
public sealed class StockAdjustmentsService(IStockAdjustmentsRepository repository, IOutboxWriter outbox)
{
    /// <summary>Applies a signed quantity delta to a stock item's on-hand quantity.</summary>
    public async Task<(AdjustStockOutcome Outcome, StockItemResponse? StockItem)> AdjustAsync(
        AdjustStockRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        var stockItem = await repository.GetStockItemAsync(request.StockItemId, cancellationToken);
        if (stockItem is null)
        {
            return (AdjustStockOutcome.StockItemNotFound, null);
        }

        var newOnHandQuantity = stockItem.OnHandQuantity + request.QuantityDelta;
        if (newOnHandQuantity < 0)
        {
            return (AdjustStockOutcome.WouldGoNegative, null);
        }

        stockItem.OnHandQuantity = newOnHandQuantity;
        stockItem.UpdatedOnUtc = DateTimeOffset.UtcNow;

        var balance = await repository.GetStockBalanceAsync(stockItem.ProductId, stockItem.WarehouseId, cancellationToken);
        if (balance is null)
        {
            balance = new StockBalance { ProductId = stockItem.ProductId, WarehouseId = stockItem.WarehouseId };
            repository.Add(balance);
        }

        balance.OnHandQuantity += request.QuantityDelta;
        balance.UpdatedOnUtc = DateTimeOffset.UtcNow;

        var adjustment = new InventoryAdjustment
        {
            StockItemId = stockItem.Id,
            ProductId = stockItem.ProductId,
            WarehouseId = stockItem.WarehouseId,
            QuantityDelta = request.QuantityDelta,
            ReasonCode = request.ReasonCode,
            Notes = request.Notes,
            CorrelationId = correlationId,
        };
        repository.Add(adjustment);

        repository.Add(new StockLedgerEntry
        {
            StockItemId = stockItem.Id,
            ProductId = stockItem.ProductId,
            WarehouseId = stockItem.WarehouseId,
            BinId = stockItem.BinId,
            LotId = stockItem.LotId,
            SerialNumberId = stockItem.SerialNumberId,
            MovementType = StockMovementType.Adjustment,
            QuantityDelta = request.QuantityDelta,
            ReasonCode = request.ReasonCode,
            ReferenceType = "InventoryAdjustment",
            ReferenceId = adjustment.Id.ToString(),
            CorrelationId = correlationId,
        });

        var @event = new StockAdjusted
        {
            eventId = Guid.NewGuid().ToString(),
            stockItemId = stockItem.Id.ToString(),
            productId = stockItem.ProductId.ToString(),
            warehouseId = stockItem.WarehouseId.ToString(),
            quantityDelta = request.QuantityDelta.ToString(CultureInfo.InvariantCulture),
            reasonCode = request.ReasonCode,
            adjustedOn = DateTimeOffset.UtcNow.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(StockAdjusted), JsonSerializer.Serialize(@event), correlationId));

        await repository.SaveChangesAsync(cancellationToken);

        return (AdjustStockOutcome.Created, StockItemResponse.FromEntity(stockItem));
    }
}
