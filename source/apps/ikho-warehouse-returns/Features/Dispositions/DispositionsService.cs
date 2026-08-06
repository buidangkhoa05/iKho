using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseReturns.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseReturns.Domain;
using Ikho.WarehouseReturns.Shared.Clients;

namespace Ikho.WarehouseReturns.Features.Dispositions;

/// <summary>Distinguishes why a disposition attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum CreateDispositionOutcome
{
    /// <summary>The disposition was recorded successfully.</summary>
    Completed,

    /// <summary>The request failed local validation (a missing BinId for Restock/Quarantine).</summary>
    ValidationFailed,

    /// <summary>The referenced return order does not exist.</summary>
    ReturnOrderNotFound,

    /// <summary>The referenced return order line does not exist on the return order.</summary>
    ReturnOrderLineNotFound,

    /// <summary>The line has not been inspected yet, so it cannot be dispositioned.</summary>
    LineNotInspected,

    /// <summary>The line already has a disposition recorded against it.</summary>
    AlreadyDispositioned,

    /// <summary>Inventory rejected the receive/quarantine command as invalid.</summary>
    InventoryBadRequest,

    /// <summary>Inventory reported the product or bin does not exist.</summary>
    InventoryNotFound,

    /// <summary>Inventory reported a conflict while receiving/quarantining stock.</summary>
    InventoryConflict,

    /// <summary>Inventory returned an unexpected error.</summary>
    InventoryUnexpectedError,
}

/// <summary>
/// Business logic for recording disposition outcomes against return order lines. Requires the
/// line to already have an <see cref="Inspection"/> recorded (see
/// <see cref="CreateDispositionOutcome.LineNotInspected"/>) and each line to be dispositioned at
/// most once (see <see cref="CreateDispositionOutcome.AlreadyDispositioned"/>). Only
/// <see cref="DispositionOutcome.Restock"/> and <see cref="DispositionOutcome.Quarantine"/> call
/// into the Inventory service — <see cref="DispositionOutcome.Scrap"/> and
/// <see cref="DispositionOutcome.VendorReturn"/> never call Inventory, since the goods never
/// (re-)enter Inventory-tracked stock. Advances the order's status to
/// <see cref="ReturnOrderStatus.Dispositioned"/> once every line has a disposition, and publishes
/// <c>DispositionCompleted</c> via the transactional outbox regardless of outcome.
/// </summary>
public sealed class DispositionsService(IDispositionsRepository repository, IInventoryApiClient inventoryClient, IOutboxWriter outbox)
{
    /// <summary>Records a disposition outcome for a single return order line, calling Inventory when the outcome requires it.</summary>
    public async Task<(CreateDispositionOutcome Outcome, DispositionResponse? Disposition, string? Error)> DispositionAsync(
        Guid returnOrderId, Guid lineId, CreateDispositionRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        var requiresBin = request.Outcome is DispositionOutcome.Restock or DispositionOutcome.Quarantine;
        if (requiresBin && request.BinId is null)
        {
            return (CreateDispositionOutcome.ValidationFailed, null,
                $"BinId is required for a '{request.Outcome}' disposition.");
        }

        var returnOrder = await repository.GetReturnOrderWithLinesAsync(returnOrderId, cancellationToken);
        if (returnOrder is null)
        {
            return (CreateDispositionOutcome.ReturnOrderNotFound, null, $"Return order '{returnOrderId}' was not found.");
        }

        var line = returnOrder.Lines.SingleOrDefault(l => l.Id == lineId);
        if (line is null)
        {
            return (CreateDispositionOutcome.ReturnOrderLineNotFound, null,
                $"Return order line '{lineId}' was not found on return order '{returnOrderId}'.");
        }

        if (line.InspectionId is null)
        {
            return (CreateDispositionOutcome.LineNotInspected, null,
                $"Return order line '{lineId}' has not been inspected yet.");
        }

        if (line.DispositionId is not null)
        {
            return (CreateDispositionOutcome.AlreadyDispositioned, null,
                $"Return order line '{lineId}' already has a disposition recorded.");
        }

        string? inventoryReferenceId = null;

        if (requiresBin)
        {
            var inventoryResult = request.Outcome == DispositionOutcome.Restock
                ? await inventoryClient.ReceiveStockAsync(line.ProductId, returnOrder.WarehouseId, request.BinId!.Value, line.Quantity, cancellationToken)
                : await inventoryClient.ReceiveQuarantineAsync(line.ProductId, returnOrder.WarehouseId, request.BinId!.Value, line.Quantity, cancellationToken);

            if (inventoryResult.Outcome != InventoryReceiveOutcome.Success)
            {
                var error = inventoryResult.Error ?? "Inventory rejected the disposition.";
                return inventoryResult.Outcome switch
                {
                    InventoryReceiveOutcome.BadRequest => (CreateDispositionOutcome.InventoryBadRequest, null, error),
                    InventoryReceiveOutcome.NotFound => (CreateDispositionOutcome.InventoryNotFound, null, error),
                    InventoryReceiveOutcome.Conflict => (CreateDispositionOutcome.InventoryConflict, null, error),
                    _ => (CreateDispositionOutcome.InventoryUnexpectedError, null, error),
                };
            }

            inventoryReferenceId = inventoryResult.StockItem?.Id.ToString();
        }

        var disposition = new Disposition
        {
            ReturnOrderLineId = line.Id,
            Outcome = request.Outcome,
            BinId = requiresBin ? request.BinId : null,
            InventoryReferenceId = inventoryReferenceId,
        };
        repository.Add(disposition);

        line.DispositionId = disposition.Id;

        if (returnOrder.Lines.All(l => l.DispositionId is not null))
        {
            returnOrder.Status = ReturnOrderStatus.Dispositioned;
        }

        var @event = new DispositionCompleted
        {
            eventId = Guid.NewGuid().ToString(),
            dispositionId = disposition.Id.ToString(),
            returnOrderId = returnOrder.Id.ToString(),
            returnOrderLineId = line.Id.ToString(),
            outcome = disposition.Outcome.ToString(),
            inventoryReferenceId = disposition.InventoryReferenceId ?? string.Empty,
            executedOn = disposition.ExecutedOnUtc.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(DispositionCompleted), JsonSerializer.Serialize(@event), correlationId));

        await repository.SaveChangesAsync(cancellationToken);

        return (CreateDispositionOutcome.Completed, DispositionResponse.FromEntity(disposition), null);
    }
}
