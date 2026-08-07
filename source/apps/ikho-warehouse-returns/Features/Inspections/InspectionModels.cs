using Ikho.Warehouse.Returns.Domain;

namespace Ikho.Warehouse.Returns.Features.Inspections;

/// <summary>Request body to record an inspection outcome for a return order line.</summary>
public sealed record CreateInspectionRequest(InspectionResult Result, string? Notes);

/// <summary>Response DTO for an inspection.</summary>
public sealed record InspectionResponse(Guid Id, Guid ReturnOrderLineId, string Result, string? Notes, DateTimeOffset InspectedOnUtc)
{
    /// <summary>Projects a <see cref="Domain.Inspection"/> entity to its response DTO.</summary>
    public static InspectionResponse FromEntity(Domain.Inspection inspection) =>
        new(inspection.Id, inspection.ReturnOrderLineId, inspection.Result.ToString(), inspection.Notes, inspection.InspectedOnUtc);
}
