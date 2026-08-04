namespace Ikho.WarehouseCatalog.Domain;

/// <summary>
/// Product classification category. Products belong to at most one category.
/// </summary>
public sealed class Category
{
    /// <summary>Stable identifier.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Short, unique business code (e.g. <c>ELEC</c>).</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Display name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Whether this category is available for new product assignments.</summary>
    public bool IsActive { get; set; } = true;
}
