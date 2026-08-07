using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseReturns.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Returns.Domain;

namespace Ikho.Warehouse.Returns.Features.Inspections;

/// <summary>Distinguishes why an inspection attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum CreateInspectionOutcome
{
    /// <summary>The inspection was recorded successfully.</summary>
    Completed,

    /// <summary>The referenced return order does not exist.</summary>
    ReturnOrderNotFound,

    /// <summary>The referenced return order line does not exist on the return order.</summary>
    ReturnOrderLineNotFound,

    /// <summary>The return order has not been received yet, so its lines cannot be inspected.</summary>
    ReturnOrderNotReceived,

    /// <summary>The line already has an inspection recorded against it.</summary>
    AlreadyInspected,
}

/// <summary>
/// Business logic for recording inspection outcomes against return order lines. Requires the
/// parent order to have already been received (see <see cref="CreateInspectionOutcome.ReturnOrderNotReceived"/>)
/// and each line to be inspected at most once (see <see cref="CreateInspectionOutcome.AlreadyInspected"/>).
/// Advances the order's status to <see cref="ReturnOrderStatus.Inspected"/> once every line has an
/// inspection, and publishes <c>InspectionCompleted</c> via the transactional outbox.
/// </summary>
public sealed class InspectionsService(IInspectionsRepository repository, IOutboxWriter outbox)
{
    /// <summary>Records an inspection outcome for a single return order line.</summary>
    public async Task<(CreateInspectionOutcome Outcome, InspectionResponse? Inspection, string? Error)> InspectAsync(
        Guid returnOrderId, Guid lineId, CreateInspectionRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        var returnOrder = await repository.GetReturnOrderWithLinesAsync(returnOrderId, cancellationToken);
        if (returnOrder is null)
        {
            return (CreateInspectionOutcome.ReturnOrderNotFound, null, $"Return order '{returnOrderId}' was not found.");
        }

        var line = returnOrder.Lines.SingleOrDefault(l => l.Id == lineId);
        if (line is null)
        {
            return (CreateInspectionOutcome.ReturnOrderLineNotFound, null,
                $"Return order line '{lineId}' was not found on return order '{returnOrderId}'.");
        }

        if (returnOrder.Status == ReturnOrderStatus.Created)
        {
            return (CreateInspectionOutcome.ReturnOrderNotReceived, null,
                $"Return order '{returnOrderId}' has not been received yet.");
        }

        if (line.InspectionId is not null)
        {
            return (CreateInspectionOutcome.AlreadyInspected, null,
                $"Return order line '{lineId}' already has an inspection recorded.");
        }

        var inspection = new Inspection
        {
            ReturnOrderLineId = line.Id,
            Result = request.Result,
            Notes = request.Notes,
        };
        repository.Add(inspection);

        line.InspectionId = inspection.Id;

        if (returnOrder.Lines.All(l => l.InspectionId is not null))
        {
            returnOrder.Status = ReturnOrderStatus.Inspected;
        }

        var @event = new InspectionCompleted
        {
            eventId = Guid.NewGuid().ToString(),
            inspectionId = inspection.Id.ToString(),
            returnOrderId = returnOrder.Id.ToString(),
            returnOrderLineId = line.Id.ToString(),
            result = inspection.Result.ToString(),
            inspectedOn = inspection.InspectedOnUtc.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(InspectionCompleted), JsonSerializer.Serialize(@event), correlationId));

        await repository.SaveChangesAsync(cancellationToken);

        return (CreateInspectionOutcome.Completed, InspectionResponse.FromEntity(inspection), null);
    }
}
