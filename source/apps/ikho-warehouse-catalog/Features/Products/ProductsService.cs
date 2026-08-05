using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseCatalog.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseCatalog.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseCatalog.Features.Products;

/// <summary>
/// Business logic for creating, updating, and reading products, and managing their barcodes.
/// Publishes <c>ProductCreated</c> on creation, <c>ProductUpdated</c> on detail changes,
/// <c>ProductTrackingPolicyChanged</c> on lot/serial policy changes, and
/// <c>ProductStatusChanged</c> on activation toggles, all via the transactional outbox.
/// </summary>
public sealed class ProductsService(IProductRepository repository, IOutboxWriter outbox)
{
    /// <summary>
    /// Creates a new product. Returns <see langword="null"/> if the SKU is already in use.
    /// </summary>
    public async Task<ProductResponse?> CreateAsync(
        CreateProductRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (await repository.SkuExistsAsync(request.Sku, cancellationToken))
        {
            return null;
        }

        var product = new Product
        {
            Sku = request.Sku,
            Name = request.Name,
            Description = request.Description,
            CategoryId = request.CategoryId,
            BrandId = request.BrandId,
            DefaultUomId = request.DefaultUomId,
            IsLotControlled = request.IsLotControlled,
            IsSerialControlled = request.IsSerialControlled,
        };

        repository.Add(product);

        var @event = new ProductCreated
        {
            eventId = Guid.NewGuid().ToString(),
            productId = product.Id.ToString(),
            sku = product.Sku,
            name = product.Name,
            categoryId = product.CategoryId?.ToString() ?? string.Empty,
            brandId = product.BrandId?.ToString() ?? string.Empty,
            isLotControlled = product.IsLotControlled,
            isSerialControlled = product.IsSerialControlled,
            createdOn = product.CreatedOnUtc.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(ProductCreated), JsonSerializer.Serialize(@event), correlationId));

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Unique index on Sku caught a concurrent create — treat same as upfront check.
            return null;
        }

        return ProductResponse.FromEntity(product);
    }

    /// <summary>
    /// Updates an existing product's details, publishing <c>ProductUpdated</c> when descriptive
    /// fields change and <c>ProductTrackingPolicyChanged</c> when lot/serial tracking flags
    /// change. Returns <see langword="null"/> if not found.
    /// </summary>
    public async Task<ProductResponse?> UpdateAsync(
        Guid id, UpdateProductRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        var product = await repository.GetByIdAsync(id, cancellationToken);
        if (product is null)
        {
            return null;
        }

        var detailsChanged = product.Name != request.Name
            || product.Description != request.Description
            || product.CategoryId != request.CategoryId
            || product.BrandId != request.BrandId
            || product.DefaultUomId != request.DefaultUomId;

        var trackingPolicyChanged = product.IsLotControlled != request.IsLotControlled
            || product.IsSerialControlled != request.IsSerialControlled;

        product.Name = request.Name;
        product.Description = request.Description;
        product.CategoryId = request.CategoryId;
        product.BrandId = request.BrandId;
        product.DefaultUomId = request.DefaultUomId;
        product.IsLotControlled = request.IsLotControlled;
        product.IsSerialControlled = request.IsSerialControlled;

        if (detailsChanged)
        {
            var @event = new ProductUpdated
            {
                eventId = Guid.NewGuid().ToString(),
                productId = product.Id.ToString(),
                sku = product.Sku,
                name = product.Name,
                categoryId = product.CategoryId?.ToString() ?? string.Empty,
                brandId = product.BrandId?.ToString() ?? string.Empty,
                updatedOn = DateTimeOffset.UtcNow.ToString("O"),
            };
            repository.Add(outbox.Enqueue(nameof(ProductUpdated), JsonSerializer.Serialize(@event), correlationId));
        }

        if (trackingPolicyChanged)
        {
            var @event = new ProductTrackingPolicyChanged
            {
                eventId = Guid.NewGuid().ToString(),
                productId = product.Id.ToString(),
                sku = product.Sku,
                isLotControlled = product.IsLotControlled,
                isSerialControlled = product.IsSerialControlled,
                changedOn = DateTimeOffset.UtcNow.ToString("O"),
            };
            repository.Add(outbox.Enqueue(nameof(ProductTrackingPolicyChanged), JsonSerializer.Serialize(@event), correlationId));
        }

        if (detailsChanged || trackingPolicyChanged)
        {
            await repository.SaveChangesAsync(cancellationToken);
        }

        return ProductResponse.FromEntity(product);
    }

    /// <summary>
    /// Activates or deactivates a product, publishing <c>ProductStatusChanged</c> only when
    /// the status actually changes. Returns <see langword="null"/> if not found.
    /// </summary>
    public async Task<ProductResponse?> SetStatusAsync(
        Guid id, SetProductStatusRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        var product = await repository.GetByIdAsync(id, cancellationToken);
        if (product is null)
        {
            return null;
        }

        if (product.IsActive != request.IsActive)
        {
            product.IsActive = request.IsActive;

            var @event = new ProductStatusChanged
            {
                eventId = Guid.NewGuid().ToString(),
                productId = product.Id.ToString(),
                sku = product.Sku,
                isActive = product.IsActive,
                changedOn = DateTimeOffset.UtcNow.ToString("O"),
            };
            repository.Add(outbox.Enqueue(nameof(ProductStatusChanged), JsonSerializer.Serialize(@event), correlationId));

            await repository.SaveChangesAsync(cancellationToken);
        }

        return ProductResponse.FromEntity(product);
    }

    /// <summary>
    /// Returns a single product with its barcodes, or <see langword="null"/> if not found.
    /// </summary>
    public async Task<ProductResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var product = await repository.GetByIdAsync(id, cancellationToken);
        return product is null ? null : ProductResponse.FromEntity(product);
    }

    /// <summary>
    /// Returns a single product looked up by SKU, or <see langword="null"/> if not found.
    /// </summary>
    public async Task<ProductResponse?> GetBySkuAsync(string sku, CancellationToken cancellationToken)
    {
        var product = await repository.GetBySkuAsync(sku, cancellationToken);
        return product is null ? null : ProductResponse.FromEntity(product);
    }

    /// <summary>Returns all products ordered by SKU.</summary>
    public async Task<List<ProductResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var products = await repository.GetAllAsync(cancellationToken);
        return products.ConvertAll(ProductResponse.FromEntity);
    }

    /// <summary>
    /// Adds a barcode to a product. Returns <see cref="AddBarcodeOutcome.ProductNotFound"/> if
    /// the product does not exist, or <see cref="AddBarcodeOutcome.CodeAlreadyExists"/> if the
    /// barcode code is already registered globally.
    /// </summary>
    public async Task<(AddBarcodeOutcome Outcome, BarcodeResponse? Barcode)> AddBarcodeAsync(
        Guid productId, AddBarcodeRequest request, CancellationToken cancellationToken)
    {
        var product = await repository.GetByIdAsync(productId, cancellationToken);
        if (product is null)
        {
            return (AddBarcodeOutcome.ProductNotFound, null);
        }

        if (await repository.BarcodeExistsAsync(request.Code, cancellationToken))
        {
            return (AddBarcodeOutcome.CodeAlreadyExists, null);
        }

        var barcode = new Barcode { Code = request.Code, ProductId = productId };
        repository.Add(barcode);

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Unique index on barcode Code caught a concurrent add.
            return (AddBarcodeOutcome.CodeAlreadyExists, null);
        }

        return (AddBarcodeOutcome.Created, BarcodeResponse.FromEntity(barcode));
    }
}
