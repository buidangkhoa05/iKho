namespace Ikho.WarehouseCatalog.Features.UnitsOfMeasure;

/// <summary>Request body to create a new unit of measure.</summary>
public sealed record CreateUomRequest(string Code, string Name);

/// <summary>Request body to update an existing unit of measure.</summary>
public sealed record UpdateUomRequest(string Name, bool IsActive);

/// <summary>Response DTO for a unit of measure.</summary>
public sealed record UomResponse(Guid Id, string Code, string Name, bool IsActive)
{
    /// <summary>Projects a <see cref="Domain.UnitOfMeasure"/> entity to its response DTO.</summary>
    public static UomResponse FromEntity(Domain.UnitOfMeasure uom) =>
        new(uom.Id, uom.Code, uom.Name, uom.IsActive);
}
