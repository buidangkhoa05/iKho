namespace Ikho.Warehouse.Catalog.Domain;

/// <summary>
/// Unit of measure (UOM) used for stock quantities (e.g. <c>EA</c>, <c>KG</c>, <c>CTN</c>).
/// </summary>
public sealed class UnitOfMeasure
{
    /// <summary>Stable identifier.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Short, unique code (e.g. <c>EA</c>).</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Display name (e.g. <c>Each</c>).</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Whether this UOM is available for new product assignments.</summary>
    public bool IsActive { get; set; } = true;
}
