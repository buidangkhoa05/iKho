using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseReturns.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Returns.Domain;

namespace Ikho.Warehouse.Returns.Features.ReturnReceipts;

/// <summary>Distinguishes why a return-receipt attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum CreateReturnReceiptOutcome
{
    /// <summary>The receipt was recorded successfully.</summary>
    Received,

    /// <summary>The referenced return order does not exist.</summary>
    ReturnOrderNotFound,

    /// <summary>The return order has already been received against.</summary>
    AlreadyReceived,
}

/// <summary>
/// Business logic for recording the physical arrival of a return order's goods. A return order
/// can only be received once in this slice (see <see cref="CreateReturnReceiptOutcome.AlreadyReceived"/>);
/// advances the order's status to <see cref="ReturnOrderStatus.Received"/> and publishes
/// <c>ReturnReceived</c> via the transactional outbox.
/// </summary>
public sealed class ReturnReceiptsService(IReturnReceiptsRepository repository, IOutboxWriter outbox)
{
    /// <summary>Records a return receipt against a return order, advancing its status to <see cref="ReturnOrderStatus.Received"/>.</summary>
    public async Task<(CreateReturnReceiptOutcome Outcome, ReturnReceiptResponse? Receipt, string? Error)> ReceiveAsync(
        Guid returnOrderId, CreateReturnReceiptRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        var returnOrder = await repository.GetReturnOrderWithLinesAsync(returnOrderId, cancellationToken);
        if (returnOrder is null)
        {
            return (CreateReturnReceiptOutcome.ReturnOrderNotFound, null, $"Return order '{returnOrderId}' was not found.");
        }

        if (returnOrder.Status != ReturnOrderStatus.Created)
        {
            return (CreateReturnReceiptOutcome.AlreadyReceived, null,
                $"Return order '{returnOrderId}' has already been received against.");
        }

        var receipt = new ReturnReceipt
        {
            ReturnOrderId = returnOrder.Id,
            Notes = request.Notes,
        };
        repository.Add(receipt);

        returnOrder.Status = ReturnOrderStatus.Received;

        var @event = new ReturnReceived
        {
            eventId = Guid.NewGuid().ToString(),
            returnReceiptId = receipt.Id.ToString(),
            returnOrderId = returnOrder.Id.ToString(),
            warehouseId = returnOrder.WarehouseId.ToString(),
            receivedOn = receipt.ReceivedOnUtc.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(ReturnReceived), JsonSerializer.Serialize(@event), correlationId));

        await repository.SaveChangesAsync(cancellationToken);

        return (CreateReturnReceiptOutcome.Received, ReturnReceiptResponse.FromEntity(receipt), null);
    }
}
