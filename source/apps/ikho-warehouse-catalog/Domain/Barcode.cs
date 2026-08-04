namespace Ikho.WarehouseCatalog.Domain;

/// <summary>
/// A scannable barcode (EAN-13, UPC, QR, etc.) that resolves to a product.
/// Each barcode code is globally unique across all products.
/// </summary>
public sealed class Barcode
{
    /// <summary>Stable identifier.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The barcode string value — globally unique.</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>The product this barcode resolves to.</summary>
    public Guid ProductId { get; set; }
}
