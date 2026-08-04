namespace Ikho.WarehouseCatalog.Domain;

/// <summary>
/// Product brand or manufacturer. Products belong to at most one brand.
/// </summary>
public sealed class Brand
{
    /// <summary>Stable identifier.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Short, unique business code (e.g. <c>SONY</c>).</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Display name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Whether this brand is available for new product assignments.</summary>
    public bool IsActive { get; set; } = true;
}
