using Ikho.Warehouse.Returns.Domain;

namespace Ikho.Warehouse.Returns.Features.Dispositions;

/// <summary>
/// Request body to record a disposition outcome for a return order line.
/// <see cref="BinId"/> is required when <see cref="Outcome"/> is <see cref="DispositionOutcome.Restock"/>
/// or <see cref="DispositionOutcome.Quarantine"/>, and ignored otherwise.
/// </summary>
public sealed record CreateDispositionRequest(DispositionOutcome Outcome, Guid? BinId);

/// <summary>Response DTO for a disposition.</summary>
public sealed record DispositionResponse(
    Guid Id, Guid ReturnOrderLineId, string Outcome, Guid? BinId, string? InventoryReferenceId, DateTimeOffset ExecutedOnUtc)
{
    /// <summary>Projects a <see cref="Domain.Disposition"/> entity to its response DTO.</summary>
    public static DispositionResponse FromEntity(Domain.Disposition disposition) =>
        new(disposition.Id, disposition.ReturnOrderLineId, disposition.Outcome.ToString(), disposition.BinId,
            disposition.InventoryReferenceId, disposition.ExecutedOnUtc);
}
