using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseCatalog.Domain;
using Ikho.WarehouseCatalog.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseCatalog.Features.Products;

/// <summary>Data access for <see cref="Product"/> and its <see cref="Barcode"/> children.</summary>
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
    public void Add(Product product) => dbContext.Products.Add(product);

    /// <inheritdoc />
    public void Add(Barcode barcode) => dbContext.Barcodes.Add(barcode);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
