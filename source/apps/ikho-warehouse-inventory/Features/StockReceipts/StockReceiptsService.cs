using System.Globalization;
using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseInventory.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseInventory.Domain;
using Ikho.WarehouseInventory.Shared;
using Ikho.WarehouseInventory.Shared.Clients;

namespace Ikho.WarehouseInventory.Features.StockReceipts;

/// <summary>Distinguishes why a receipt attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum ReceiveStockOutcome
{
    /// <summary>The receipt was recorded successfully.</summary>
    Created,

    /// <summary>The referenced product does not exist in Catalog, or is inactive.</summary>
    ProductNotFound,

    /// <summary>The referenced bin does not exist in Organization.</summary>
    BinNotFound,

    /// <summary>The referenced bin exists but is not currently usable (e.g. inactive).</summary>
    BinInvalid,

    /// <summary>The request violated a lot/serial tracking rule (missing lot number, wrong serial count, duplicate serials).</summary>
    ValidationFailed,
}

/// <summary>
/// Business logic for receiving stock into a bin. Validates the product and bin against the
/// Catalog and Organization services (the platform's first synchronous service-to-service
/// calls), enforces lot/serial tracking policy, maintains the <see cref="StockItem"/> and
/// <see cref="StockBalance"/> rows transactionally, appends a <see cref="StockLedgerEntry"/>, and
/// publishes <c>InventoryReceived</c> via the transactional outbox.
/// </summary>
public sealed class StockReceiptsService(
    IStockReceiptsRepository repository,
    ICatalogApiClient catalogClient,
    IOrganizationApiClient organizationClient,
    IOutboxWriter outbox)
{
    /// <summary>Receives stock into a bin, applying lot/serial tracking rules derived from the product's Catalog record.</summary>
    public async Task<(ReceiveStockOutcome Outcome, StockItemResponse? StockItem, string? Error)> ReceiveAsync(
        ReceiveStockRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (request.Quantity <= 0)
        {
            return (ReceiveStockOutcome.ValidationFailed, null, "Quantity must be greater than zero.");
        }

        var product = await catalogClient.GetProductAsync(request.ProductId, cancellationToken);
        if (product is null || !product.IsActive)
        {
            return (ReceiveStockOutcome.ProductNotFound, null, $"Product '{request.ProductId}' was not found or is inactive.");
        }

        var binValidation = await organizationClient.ValidateBinAsync(request.BinId, cancellationToken);
        if (!binValidation.IsValid)
        {
            return binValidation.BinDoesNotExist
                ? (ReceiveStockOutcome.BinNotFound, null, binValidation.Reason)
                : (ReceiveStockOutcome.BinInvalid, null, binValidation.Reason);
        }

        if (product.IsLotControlled && string.IsNullOrWhiteSpace(request.LotNumber))
        {
            return (ReceiveStockOutcome.ValidationFailed, null, "Product is lot-controlled; LotNumber is required.");
        }

        if (product.IsSerialControlled)
        {
            if (request.SerialNumbers is null || request.SerialNumbers.Count == 0)
            {
                return (ReceiveStockOutcome.ValidationFailed, null, "Product is serial-controlled; SerialNumbers is required.");
            }

            if (request.SerialNumbers.Count != request.Quantity)
            {
                return (ReceiveStockOutcome.ValidationFailed, null, "SerialNumbers count must equal Quantity.");
            }

            if (request.SerialNumbers.Distinct(StringComparer.OrdinalIgnoreCase).Count() != request.SerialNumbers.Count)
            {
                return (ReceiveStockOutcome.ValidationFailed, null, "SerialNumbers must not contain duplicates.");
            }
        }

        Guid? lotId = null;
        if (product.IsLotControlled)
        {
            var lot = await repository.GetLotAsync(request.ProductId, request.LotNumber!, cancellationToken);
            if (lot is null)
            {
                lot = new Lot
                {
                    ProductId = request.ProductId,
                    LotNumber = request.LotNumber!,
                    ExpirationDateUtc = request.ExpirationDateUtc,
                };
                repository.Add(lot);
            }

            lotId = lot.Id;
        }

        var affectedStockItem = product.IsSerialControlled
            ? await ReceiveSerializedUnitsAsync(request, lotId, correlationId, cancellationToken)
            : await ReceiveUntrackedOrLotQuantityAsync(request, lotId, correlationId, cancellationToken);

        await UpsertBalanceAsync(request.ProductId, request.WarehouseId, request.Quantity, cancellationToken);

        var @event = new InventoryReceived
        {
            eventId = Guid.NewGuid().ToString(),
            productId = request.ProductId.ToString(),
            warehouseId = request.WarehouseId.ToString(),
            binId = request.BinId.ToString(),
            quantity = request.Quantity.ToString(CultureInfo.InvariantCulture),
            lotNumber = request.LotNumber ?? string.Empty,
            receivedOn = DateTimeOffset.UtcNow.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(InventoryReceived), JsonSerializer.Serialize(@event), correlationId));

        await repository.SaveChangesAsync(cancellationToken);

        return (ReceiveStockOutcome.Created, StockItemResponse.FromEntity(affectedStockItem), null);
    }

    /// <summary>
    /// Handles receipt of a serial-controlled product: each serial value is a distinct physical
    /// unit, so it maps to its own stock item (with <see cref="StockItem.OnHandQuantity"/>
    /// incremented by exactly 1) rather than one stock item holding the full quantity.
    /// </summary>
    /// <returns>
    /// The last stock item touched. When receiving more than one serialized unit in a single
    /// call, the response only reflects that last unit — the full set of affected stock items is
    /// queryable via <c>GET /api/warehouse/inventory/stock-items</c>. This is a deliberate
    /// simplification for this slice rather than returning a list from a "receive one thing"
    /// endpoint.
    /// </returns>
    private async Task<StockItem> ReceiveSerializedUnitsAsync(
        ReceiveStockRequest request, Guid? lotId, string? correlationId, CancellationToken cancellationToken)
    {
        StockItem lastAffected = null!;

        foreach (var serialValue in request.SerialNumbers!)
        {
            var serial = await repository.GetSerialNumberAsync(request.ProductId, serialValue, cancellationToken);
            if (serial is null)
            {
                serial = new SerialNumber
                {
                    ProductId = request.ProductId,
                    SerialValue = serialValue,
                    Status = SerialNumberStatus.InStock,
                };
                repository.Add(serial);
            }
            else
            {
                serial.Status = SerialNumberStatus.InStock;
            }

            var stockItem = await repository.GetStockItemAsync(
                request.ProductId, request.WarehouseId, request.BinId, lotId, serial.Id, cancellationToken);
            if (stockItem is null)
            {
                stockItem = new StockItem
                {
                    ProductId = request.ProductId,
                    WarehouseId = request.WarehouseId,
                    BinId = request.BinId,
                    LotId = lotId,
                    SerialNumberId = serial.Id,
                };
                repository.Add(stockItem);
            }

            stockItem.OnHandQuantity += 1;
            stockItem.UpdatedOnUtc = DateTimeOffset.UtcNow;

            repository.Add(new StockLedgerEntry
            {
                StockItemId = stockItem.Id,
                ProductId = request.ProductId,
                WarehouseId = request.WarehouseId,
                BinId = request.BinId,
                LotId = lotId,
                SerialNumberId = serial.Id,
                MovementType = StockMovementType.Receipt,
                QuantityDelta = 1m,
                ReferenceType = "StockReceipt",
                CorrelationId = correlationId,
            });

            lastAffected = stockItem;
        }

        return lastAffected;
    }

    /// <summary>
    /// Handles receipt of an untracked or lot-controlled (but not serial-controlled) product: the
    /// full quantity is applied to a single matching stock item.
    /// </summary>
    private async Task<StockItem> ReceiveUntrackedOrLotQuantityAsync(
        ReceiveStockRequest request, Guid? lotId, string? correlationId, CancellationToken cancellationToken)
    {
        var stockItem = await repository.GetStockItemAsync(
            request.ProductId, request.WarehouseId, request.BinId, lotId, null, cancellationToken);
        if (stockItem is null)
        {
            stockItem = new StockItem
            {
                ProductId = request.ProductId,
                WarehouseId = request.WarehouseId,
                BinId = request.BinId,
                LotId = lotId,
            };
            repository.Add(stockItem);
        }

        stockItem.OnHandQuantity += request.Quantity;
        stockItem.UpdatedOnUtc = DateTimeOffset.UtcNow;

        repository.Add(new StockLedgerEntry
        {
            StockItemId = stockItem.Id,
            ProductId = request.ProductId,
            WarehouseId = request.WarehouseId,
            BinId = request.BinId,
            LotId = lotId,
            MovementType = StockMovementType.Receipt,
            QuantityDelta = request.Quantity,
            ReferenceType = "StockReceipt",
            CorrelationId = correlationId,
        });

        return stockItem;
    }

    /// <summary>Finds or creates the stock balance rollup for a product/warehouse pair and increments its on-hand quantity.</summary>
    private async Task UpsertBalanceAsync(Guid productId, Guid warehouseId, decimal quantityDelta, CancellationToken cancellationToken)
    {
        var balance = await repository.GetStockBalanceAsync(productId, warehouseId, cancellationToken);
        if (balance is null)
        {
            balance = new StockBalance { ProductId = productId, WarehouseId = warehouseId };
            repository.Add(balance);
        }

        balance.OnHandQuantity += quantityDelta;
        balance.UpdatedOnUtc = DateTimeOffset.UtcNow;
    }
}
