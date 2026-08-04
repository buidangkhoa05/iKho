namespace Ikho.WarehouseCatalog.Domain;

/// <summary>
/// The product aggregate — the central entity of the Catalog service. Operational services
/// (Inventory, Inbound, Outbound) reference products by <see cref="Id"/> only; they never own
/// or mutate product master data.
/// </summary>
public sealed class Product
{
    /// <summary>Stable identifier referenced by downstream services.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Globally unique stock-keeping unit code.</summary>
    public string Sku { get; set; } = string.Empty;

    /// <summary>Display name shown in UIs and documents.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Optional free-text product description.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Optional FK into <see cref="Category"/>.</summary>
    public Guid? CategoryId { get; set; }

    /// <summary>Optional FK into <see cref="Brand"/>.</summary>
    public Guid? BrandId { get; set; }

    /// <summary>Optional default unit of measure FK into <see cref="UnitOfMeasure"/>.</summary>
    public Guid? DefaultUomId { get; set; }

    /// <summary>When <see langword="true"/>, inventory movements require a lot number.</summary>
    public bool IsLotControlled { get; set; }

    /// <summary>When <see langword="true"/>, inventory movements require a serial number.</summary>
    public bool IsSerialControlled { get; set; }

    /// <summary>Inactive products reject new inventory movements but retain historical data.</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>When this product was created, in UTC.</summary>
    public DateTimeOffset CreatedOnUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Barcodes that resolve to this product.</summary>
    public ICollection<Barcode> Barcodes { get; set; } = [];
}
