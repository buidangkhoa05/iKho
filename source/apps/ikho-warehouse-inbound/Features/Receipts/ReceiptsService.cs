using System.Globalization;
using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseInbound.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Inbound.Domain;
using Ikho.Warehouse.Inbound.Shared.Clients;

namespace Ikho.Warehouse.Inbound.Features.Receipts;

/// <summary>Distinguishes why a receipt-completion attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum CompleteReceiptOutcome
{
    /// <summary>The receipt was recorded and its stock handed off to Inventory.</summary>
    Completed,

    /// <summary>The request failed local validation (no lines, or a non-positive quantity).</summary>
    ValidationFailed,

    /// <summary>The referenced purchase order does not exist.</summary>
    PurchaseOrderNotFound,

    /// <summary>The referenced purchase order is cancelled and can no longer be received against.</summary>
    PurchaseOrderCancelled,

    /// <summary>A referenced purchase order line does not exist on the purchase order.</summary>
    PurchaseOrderLineNotFound,

    /// <summary>Receiving the requested quantity would exceed the purchase order line's ordered quantity.</summary>
    ExceedsOrderedQuantity,

    /// <summary>Inventory rejected the receive-stock command as invalid (e.g. a lot/serial tracking rule violation).</summary>
    InventoryBadRequest,

    /// <summary>Inventory reported the product or bin does not exist.</summary>
    InventoryNotFound,

    /// <summary>Inventory reported a state conflict (e.g. the bin is not currently usable).</summary>
    InventoryConflict,

    /// <summary>Inventory returned an unexpected error.</summary>
    InventoryUnexpectedError,
}

/// <summary>
/// Business logic for completing receipts against a purchase order. For each line, verifies the
/// line exists and would not be over-received, hands the quantity off to Inventory's
/// receive-stock command, and — only once every line succeeds — records the
/// <see cref="Receipt"/>/<see cref="ReceiptLine"/> rows, creates an already-completed
/// <see cref="PutawayTask"/> per line (see the remarks on <see cref="PutawayTask"/> for why
/// putaway is folded into this flow), advances the purchase order's status, and publishes
/// <c>ReceiptCompleted</c> and one <c>PutawayTaskCompleted</c> per line via the transactional
/// outbox.
/// </summary>
/// <remarks>
/// This slice does not implement saga-style compensation: if a later line's call to Inventory
/// fails, quantities already handed off to Inventory for earlier lines in the same request are
/// not rolled back (Inventory has already committed that stock), even though nothing is
/// persisted on the Inbound side for this request. Operators must reconcile such partial
/// failures manually — acceptable for this slice's scope, called out here rather than silently
/// assumed away.
/// </remarks>
public sealed class ReceiptsService(IReceiptsRepository repository, IInventoryApiClient inventoryClient, IOutboxWriter outbox)
{
    /// <summary>Completes a receipt against a purchase order, receiving each line's quantity into Inventory.</summary>
    public async Task<(CompleteReceiptOutcome Outcome, ReceiptResponse? Receipt, string? Error)> CompleteAsync(
        CreateReceiptRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (request.Lines.Count == 0)
        {
            return (CompleteReceiptOutcome.ValidationFailed, null, "At least one line is required.");
        }

        if (request.Lines.Any(line => line.Quantity <= 0))
        {
            return (CompleteReceiptOutcome.ValidationFailed, null, "Quantity must be greater than zero for every line.");
        }

        var purchaseOrder = await repository.GetPurchaseOrderWithLinesAsync(request.PurchaseOrderId, cancellationToken);
        if (purchaseOrder is null)
        {
            return (CompleteReceiptOutcome.PurchaseOrderNotFound, null, $"Purchase order '{request.PurchaseOrderId}' was not found.");
        }

        if (purchaseOrder.Status == PurchaseOrderStatus.Cancelled)
        {
            return (CompleteReceiptOutcome.PurchaseOrderCancelled, null,
                $"Purchase order '{request.PurchaseOrderId}' is cancelled and cannot be received against.");
        }

        var receipt = new Receipt
        {
            PurchaseOrderId = purchaseOrder.Id,
            WarehouseId = purchaseOrder.WarehouseId,
        };
        var putawayTasks = new List<PutawayTask>();

        foreach (var lineRequest in request.Lines)
        {
            var purchaseOrderLine = purchaseOrder.Lines.SingleOrDefault(l => l.Id == lineRequest.PurchaseOrderLineId);
            if (purchaseOrderLine is null)
            {
                return (CompleteReceiptOutcome.PurchaseOrderLineNotFound, null,
                    $"Purchase order line '{lineRequest.PurchaseOrderLineId}' was not found on purchase order '{purchaseOrder.Id}'.");
            }

            if (purchaseOrderLine.ReceivedQuantity + lineRequest.Quantity > purchaseOrderLine.OrderedQuantity)
            {
                return (CompleteReceiptOutcome.ExceedsOrderedQuantity, null,
                    $"Receiving {lineRequest.Quantity} against line '{purchaseOrderLine.Id}' would exceed its ordered quantity of " +
                    $"{purchaseOrderLine.OrderedQuantity} (already received {purchaseOrderLine.ReceivedQuantity}).");
            }

            var inventoryResult = await inventoryClient.ReceiveStockAsync(
                purchaseOrderLine.ProductId, purchaseOrder.WarehouseId, lineRequest.BinId, lineRequest.Quantity,
                lineRequest.LotNumber, lineRequest.ExpirationDateUtc, lineRequest.SerialNumbers, cancellationToken);

            if (inventoryResult.Outcome != InventoryReceiveOutcome.Success)
            {
                var error = inventoryResult.Error ?? "Inventory rejected the receipt.";
                return inventoryResult.Outcome switch
                {
                    InventoryReceiveOutcome.BadRequest => (CompleteReceiptOutcome.InventoryBadRequest, null, error),
                    InventoryReceiveOutcome.NotFound => (CompleteReceiptOutcome.InventoryNotFound, null, error),
                    InventoryReceiveOutcome.Conflict => (CompleteReceiptOutcome.InventoryConflict, null, error),
                    _ => (CompleteReceiptOutcome.InventoryUnexpectedError, null, error),
                };
            }

            purchaseOrderLine.ReceivedQuantity += lineRequest.Quantity;

            var receiptLine = new ReceiptLine
            {
                ReceiptId = receipt.Id,
                PurchaseOrderLineId = purchaseOrderLine.Id,
                ProductId = purchaseOrderLine.ProductId,
                BinId = lineRequest.BinId,
                Quantity = lineRequest.Quantity,
                LotNumber = lineRequest.LotNumber,
                ExpirationDateUtc = lineRequest.ExpirationDateUtc,
                SerialNumbersCsv = lineRequest.SerialNumbers is { Count: > 0 } ? string.Join(',', lineRequest.SerialNumbers) : null,
            };
            receipt.Lines.Add(receiptLine);

            putawayTasks.Add(new PutawayTask
            {
                ReceiptLineId = receiptLine.Id,
                ProductId = receiptLine.ProductId,
                BinId = receiptLine.BinId,
                Quantity = receiptLine.Quantity,
            });
        }

        purchaseOrder.Status = purchaseOrder.Lines.All(l => l.ReceivedQuantity == l.OrderedQuantity)
            ? PurchaseOrderStatus.Received
            : PurchaseOrderStatus.PartiallyReceived;

        repository.Add(receipt);
        foreach (var putawayTask in putawayTasks)
        {
            repository.Add(putawayTask);
        }

        var receiptCompleted = new ReceiptCompleted
        {
            eventId = Guid.NewGuid().ToString(),
            receiptId = receipt.Id.ToString(),
            purchaseOrderId = purchaseOrder.Id.ToString(),
            warehouseId = purchaseOrder.WarehouseId.ToString(),
            receivedOn = DateTimeOffset.UtcNow.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(ReceiptCompleted), JsonSerializer.Serialize(receiptCompleted), correlationId));

        foreach (var putawayTask in putawayTasks)
        {
            var putawayTaskCompleted = new PutawayTaskCompleted
            {
                eventId = Guid.NewGuid().ToString(),
                putawayTaskId = putawayTask.Id.ToString(),
                productId = putawayTask.ProductId.ToString(),
                binId = putawayTask.BinId.ToString(),
                quantity = putawayTask.Quantity.ToString(CultureInfo.InvariantCulture),
                completedOn = putawayTask.CompletedOnUtc.ToString("O"),
            };
            repository.Add(outbox.Enqueue(nameof(PutawayTaskCompleted), JsonSerializer.Serialize(putawayTaskCompleted), correlationId));
        }

        await repository.SaveChangesAsync(cancellationToken);

        return (CompleteReceiptOutcome.Completed, ReceiptResponse.FromEntity(receipt), null);
    }

    /// <summary>Returns a single receipt with its lines, or <see langword="null"/> if not found.</summary>
    public async Task<ReceiptResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var receipt = await repository.GetByIdAsync(id, cancellationToken);
        return receipt is null ? null : ReceiptResponse.FromEntity(receipt);
    }

    /// <summary>Returns every receipt with its lines, ordered by creation time descending.</summary>
    public async Task<List<ReceiptResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var receipts = await repository.GetAllAsync(cancellationToken);
        return receipts.ConvertAll(ReceiptResponse.FromEntity);
    }
}
