using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseCatalog.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseCatalog.Features.Brands;

/// <summary>
/// Business logic for creating and updating brands. Publishes <c>BrandCreated</c> on creation
/// and <c>BrandUpdated</c> when name or active status changes, via the transactional outbox.
/// </summary>
public sealed class BrandsService(IBrandRepository repository, IOutboxWriter outbox)
{
    /// <summary>Creates a new brand. Returns <see langword="null"/> if the code is already in use.</summary>
    public async Task<BrandResponse?> CreateAsync(
        CreateBrandRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (await repository.CodeExistsAsync(request.Code, cancellationToken))
        {
            return null;
        }

        var brand = new Domain.Brand { Code = request.Code, Name = request.Name };
        repository.Add(brand);

        var @event = new BrandCreated
        {
            eventId = Guid.NewGuid().ToString(),
            brandId = brand.Id.ToString(),
            code = brand.Code,
            name = brand.Name,
            createdOn = DateTimeOffset.UtcNow.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(BrandCreated), JsonSerializer.Serialize(@event), correlationId));

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return null;
        }

        return BrandResponse.FromEntity(brand);
    }

    /// <summary>
    /// Updates a brand, publishing <c>BrandUpdated</c> only when a field actually changes.
    /// Returns <see langword="null"/> if not found.
    /// </summary>
    public async Task<BrandResponse?> UpdateAsync(
        Guid id, UpdateBrandRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        var brand = await repository.GetByIdAsync(id, cancellationToken);
        if (brand is null)
        {
            return null;
        }

        if (brand.Name != request.Name || brand.IsActive != request.IsActive)
        {
            brand.Name = request.Name;
            brand.IsActive = request.IsActive;

            var @event = new BrandUpdated
            {
                eventId = Guid.NewGuid().ToString(),
                brandId = brand.Id.ToString(),
                code = brand.Code,
                name = brand.Name,
                isActive = brand.IsActive,
                updatedOn = DateTimeOffset.UtcNow.ToString("O"),
            };
            repository.Add(outbox.Enqueue(nameof(BrandUpdated), JsonSerializer.Serialize(@event), correlationId));

            await repository.SaveChangesAsync(cancellationToken);
        }

        return BrandResponse.FromEntity(brand);
    }

    /// <summary>Returns a single brand by id, or <see langword="null"/> if not found.</summary>
    public async Task<BrandResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var brand = await repository.GetByIdAsync(id, cancellationToken);
        return brand is null ? null : BrandResponse.FromEntity(brand);
    }

    /// <summary>Returns all brands ordered by code.</summary>
    public async Task<List<BrandResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var brands = await repository.GetAllAsync(cancellationToken);
        return brands.ConvertAll(BrandResponse.FromEntity);
    }
}
