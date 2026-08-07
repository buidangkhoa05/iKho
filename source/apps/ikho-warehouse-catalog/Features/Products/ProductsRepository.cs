using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Catalog.Domain;
using Ikho.Warehouse.Catalog.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Catalog.Features.Products;

/// <summary>Data access for <see cref="Product"/> and its <see cref="Barcode"/> children.</summary>
/// <remarks>
/// <see cref="CategoryExistsAsync"/>, <see cref="BrandExistsAsync"/>, and
/// <see cref="UomExistsAsync"/> read tables owned by the Categories/Brands/UnitsOfMeasure slices.
/// This is the same intentional, narrow exception to the "slices should not reference other
/// slices" rule used by <c>ikho-warehouse-organization</c>'s <c>IWarehouseRepository</c>: a
/// parent-existence check is a simple, read-only <c>AnyAsync</c> lookup against the shared
/// <see cref="Shared.CatalogDbContext"/>, not a call into another slice's repository/service.
/// </remarks>
public interface IProductRepository
{
    /// <summary>Finds a product with its barcodes by id, or <see langword="null"/> if not found.</summary>
    Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Finds a product with its barcodes by SKU, or <see langword="null"/> if not found.</summary>
    Task<Product?> GetBySkuAsync(string sku, CancellationToken cancellationToken);

    /// <summary>Returns all products with their barcodes, ordered by SKU.</summary>
    Task<List<Product>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if a product with <paramref name="sku"/> already exists.</summary>
    Task<bool> SkuExistsAsync(string sku, CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if a barcode with <paramref name="code"/> already exists.</summary>
    Task<bool> BarcodeExistsAsync(string code, CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if a category with <paramref name="categoryId"/> exists.</summary>
    Task<bool> CategoryExistsAsync(Guid categoryId, CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if a brand with <paramref name="brandId"/> exists.</summary>
    Task<bool> BrandExistsAsync(Guid brandId, CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if a unit of measure with <paramref name="uomId"/> exists.</summary>
    Task<bool> UomExistsAsync(Guid uomId, CancellationToken cancellationToken);

    /// <summary>Tracks a new product for insertion.</summary>
    void Add(Product product);

    /// <summary>Tracks a new barcode for insertion.</summary>
    void Add(Barcode barcode);

    /// <summary>
    /// Tracks a new outbox message for insertion so it commits atomically with the business
    /// write on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(OutboxMessage message);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class ProductRepository(CatalogDbContext dbContext) : IProductRepository
{
    /// <inheritdoc />
    public Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Products.Include(p => p.Barcodes)
                          .SingleOrDefaultAsync(p => p.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<Product?> GetBySkuAsync(string sku, CancellationToken cancellationToken) =>
        dbContext.Products.Include(p => p.Barcodes)
                          .SingleOrDefaultAsync(p => p.Sku == sku, cancellationToken);

    /// <inheritdoc />
    public Task<List<Product>> GetAllAsync(CancellationToken cancellationToken) =>
        dbContext.Products.Include(p => p.Barcodes)
                          .OrderBy(p => p.Sku)
                          .ToListAsync(cancellationToken);

    /// <inheritdoc />
    public Task<bool> SkuExistsAsync(string sku, CancellationToken cancellationToken) =>
        dbContext.Products.AnyAsync(p => p.Sku == sku, cancellationToken);

    /// <inheritdoc />
    public Task<bool> BarcodeExistsAsync(string code, CancellationToken cancellationToken) =>
        dbContext.Barcodes.AnyAsync(b => b.Code == code, cancellationToken);

    /// <inheritdoc />
    public Task<bool> CategoryExistsAsync(Guid categoryId, CancellationToken cancellationToken) =>
        dbContext.Categories.AnyAsync(c => c.Id == categoryId, cancellationToken);

    /// <inheritdoc />
    public Task<bool> BrandExistsAsync(Guid brandId, CancellationToken cancellationToken) =>
        dbContext.Brands.AnyAsync(b => b.Id == brandId, cancellationToken);

    /// <inheritdoc />
    public Task<bool> UomExistsAsync(Guid uomId, CancellationToken cancellationToken) =>
        dbContext.UnitsOfMeasure.AnyAsync(u => u.Id == uomId, cancellationToken);

    /// <inheritdoc />
    public void Add(Product product) => dbContext.Products.Add(product);

    /// <inheritdoc />
    public void Add(Barcode barcode) => dbContext.Barcodes.Add(barcode);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
