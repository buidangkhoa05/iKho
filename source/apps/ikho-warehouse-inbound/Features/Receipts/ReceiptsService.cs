using System.Globalization;
using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseInbound.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Inbound.Domain;
using Ikho.Warehouse.Inbound.Shared.Clients;
using Microsoft.EntityFrameworkCore;

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

    /// <summary>Another request concurrently received against the same purchase order line; retry.</summary>
    ConcurrencyConflict,
}

/// <summary>
/// Business logic for completing receipts against a purchase order. For each line, verifies the
/// line exists and would not be over-received, hands the quantity off to Inventory's
/// receive-stock command, and records the <see cref="Receipt"/>/<see cref="ReceiptLine"/> rows and
/// an already-completed <see cref="PutawayTask"/> per line (see the remarks on
/// <see cref="PutawayTask"/> for why putaway is folded into this flow), advancing the purchase
/// order's status and publishing <c>ReceiptCompleted</c> plus one <c>PutawayTaskCompleted</c> per
/// successfully-received line via the transactional outbox.
/// </summary>
/// <remarks>
/// This slice does not implement saga-style compensation against Inventory: if a later line's
/// call fails, quantities already handed off to Inventory for earlier lines in the same request
/// are not rolled back (Inventory has already committed that stock). Instead, lines that
/// succeeded before the failure ARE persisted here as a partial receipt (mirroring
/// <c>AllocationsService.AllocateAsync</c>'s forward-recovery pattern) — critically, this means a
/// client retrying with the same full line list will only re-attempt the lines still missing a
/// <see cref="ReceiptLine"/>, since <see cref="PurchaseOrderLine.ReceivedQuantity"/> already
/// reflects the successful ones. Persisting nothing on partial failure (the previous behavior)
/// would let a naive retry resubmit already-received lines to Inventory a second time, silently
/// double-counting physical stock — worse than a partial receipt.
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

        CompleteReceiptOutcome? failureOutcome = null;
        string? failureError = null;

        foreach (var lineRequest in request.Lines)
        {
            var purchaseOrderLine = purchaseOrder.Lines.SingleOrDefault(l => l.Id == lineRequest.PurchaseOrderLineId);
            if (purchaseOrderLine is null)
            {
                failureOutcome = CompleteReceiptOutcome.PurchaseOrderLineNotFound;
                failureError = $"Purchase order line '{lineRequest.PurchaseOrderLineId}' was not found on purchase order '{purchaseOrder.Id}'.";
                break;
            }

            if (purchaseOrderLine.ReceivedQuantity + lineRequest.Quantity > purchaseOrderLine.OrderedQuantity)
            {
                failureOutcome = CompleteReceiptOutcome.ExceedsOrderedQuantity;
                failureError = $"Receiving {lineRequest.Quantity} against line '{purchaseOrderLine.Id}' would exceed its ordered quantity of " +
                    $"{purchaseOrderLine.OrderedQuantity} (already received {purchaseOrderLine.ReceivedQuantity}).";
                break;
            }

            var inventoryResult = await inventoryClient.ReceiveStockAsync(
                purchaseOrderLine.ProductId, purchaseOrder.WarehouseId, lineRequest.BinId, lineRequest.Quantity,
                lineRequest.LotNumber, lineRequest.ExpirationDateUtc, lineRequest.SerialNumbers, cancellationToken);

            if (inventoryResult.Outcome != InventoryReceiveOutcome.Success)
            {
                failureError = inventoryResult.Error ?? "Inventory rejected the receipt.";
                failureOutcome = inventoryResult.Outcome switch
                {
                    InventoryReceiveOutcome.BadRequest => CompleteReceiptOutcome.InventoryBadRequest,
                    InventoryReceiveOutcome.NotFound => CompleteReceiptOutcome.InventoryNotFound,
                    InventoryReceiveOutcome.Conflict => CompleteReceiptOutcome.InventoryConflict,
                    _ => CompleteReceiptOutcome.InventoryUnexpectedError,
                };
                break;
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

        // Nothing from this request reached Inventory (the very first line failed local
        // validation) — nothing to persist, so bail out without touching the database.
        if (failureOutcome is not null && receipt.Lines.Count == 0)
        {
            return (failureOutcome.Value, null, failureError);
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

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return (CompleteReceiptOutcome.ConcurrencyConflict, null,
                "One or more purchase order lines were concurrently modified; retry the receipt.");
        }

        // Some lines succeeded but a later one failed — report the partial receipt alongside the
        // failure that stopped it, so the caller knows exactly which lines still need retrying
        // (any request line without a matching ReceiptLine here).
        if (failureOutcome is not null)
        {
            return (failureOutcome.Value, ReceiptResponse.FromEntity(receipt),
                $"{failureError} {receipt.Lines.Count} of {request.Lines.Count} lines were received and persisted before this failure; " +
                "retry with only the remaining lines.");
        }

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
