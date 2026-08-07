namespace Ikho.Warehouse.Reporting.Features.InboundStatus;

/// <summary>Response DTO for an <see cref="Domain.InboundStatusReadModel"/>.</summary>
public sealed record InboundStatusResponse(
    Guid PurchaseOrderId,
    Guid? WarehouseId,
    int ReceiptsCompletedCount,
    int PutawayTasksCompletedCount,
    DateTimeOffset? LastReceiptOnUtc,
    DateTimeOffset UpdatedOnUtc)
{
    /// <summary>Projects a <see cref="Domain.InboundStatusReadModel"/> entity to its response DTO.</summary>
    public static InboundStatusResponse FromEntity(Domain.InboundStatusReadModel model) =>
        new(model.PurchaseOrderId, model.WarehouseId, model.ReceiptsCompletedCount, model.PutawayTasksCompletedCount,
            model.LastReceiptOnUtc, model.UpdatedOnUtc);
}
