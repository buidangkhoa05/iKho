namespace Ikho.Warehouse.Catalog.Features.Products;

/// <summary>Request body to create a new product.</summary>
public sealed record CreateProductRequest(
    string Sku,
    string Name,
    string Description,
    Guid? CategoryId,
    Guid? BrandId,
    Guid? DefaultUomId,
    bool IsLotControlled,
    bool IsSerialControlled);

/// <summary>Request body to update product details.</summary>
public sealed record UpdateProductRequest(
    string Name,
    string Description,
    Guid? CategoryId,
    Guid? BrandId,
    Guid? DefaultUomId,
    bool IsLotControlled,
    bool IsSerialControlled);

/// <summary>Request body to activate or deactivate a product.</summary>
public sealed record SetProductStatusRequest(bool IsActive);

/// <summary>Result of a product creation attempt.</summary>
public enum CreateProductOutcome
{
    /// <summary>The product was created successfully.</summary>
    Created,

    /// <summary>The request failed local validation (a blank SKU or name).</summary>
    ValidationFailed,

    /// <summary><c>Sku</c> is already in use.</summary>
    SkuAlreadyExists,

    /// <summary>The referenced <c>CategoryId</c> does not exist.</summary>
    CategoryNotFound,

    /// <summary>The referenced <c>BrandId</c> does not exist.</summary>
    BrandNotFound,

    /// <summary>The referenced <c>DefaultUomId</c> does not exist.</summary>
    DefaultUomNotFound,
}

/// <summary>Result of a product update attempt.</summary>
public enum UpdateProductOutcome
{
    /// <summary>The product was updated successfully.</summary>
    Updated,

    /// <summary>The product does not exist.</summary>
    ProductNotFound,

    /// <summary>The request failed local validation (a blank name).</summary>
    ValidationFailed,

    /// <summary>The referenced <c>CategoryId</c> does not exist.</summary>
    CategoryNotFound,

    /// <summary>The referenced <c>BrandId</c> does not exist.</summary>
    BrandNotFound,

    /// <summary>The referenced <c>DefaultUomId</c> does not exist.</summary>
    DefaultUomNotFound,
}

/// <summary>Request body to add a barcode to a product.</summary>
public sealed record AddBarcodeRequest(string Code);

/// <summary>Result of a barcode creation attempt.</summary>
public enum AddBarcodeOutcome
{
    /// <summary>Barcode was created successfully.</summary>
    Created,

    /// <summary>The referenced product does not exist.</summary>
    ProductNotFound,

    /// <summary><c>Code</c> is already in use by another product.</summary>
    CodeAlreadyExists,
}

/// <summary>Response DTO for a barcode.</summary>
public sealed record BarcodeResponse(Guid Id, string Code, Guid ProductId)
{
    /// <summary>Projects a <see cref="Domain.Barcode"/> entity to its response DTO.</summary>
    public static BarcodeResponse FromEntity(Domain.Barcode barcode) =>
        new(barcode.Id, barcode.Code, barcode.ProductId);
}

/// <summary>Response DTO for a product including its barcodes.</summary>
public sealed record ProductResponse(
    Guid Id,
    string Sku,
    string Name,
    string Description,
    Guid? CategoryId,
    Guid? BrandId,
    Guid? DefaultUomId,
    bool IsLotControlled,
    bool IsSerialControlled,
    bool IsActive,
    DateTimeOffset CreatedOnUtc,
    IReadOnlyList<BarcodeResponse> Barcodes)
{
    /// <summary>Projects a <see cref="Domain.Product"/> entity to its response DTO.</summary>
    public static ProductResponse FromEntity(Domain.Product product) =>
        new(product.Id, product.Sku, product.Name, product.Description,
            product.CategoryId, product.BrandId, product.DefaultUomId,
            product.IsLotControlled, product.IsSerialControlled, product.IsActive,
            product.CreatedOnUtc,
            product.Barcodes.Select(BarcodeResponse.FromEntity).ToList());
}
