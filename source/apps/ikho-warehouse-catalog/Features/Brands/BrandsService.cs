using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseCatalog.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Catalog.Features.Brands;

/// <summary>Distinguishes why a brand creation attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum CreateBrandOutcome
{
    /// <summary>The brand was created successfully.</summary>
    Created,

    /// <summary>The request failed local validation (a blank code or name).</summary>
    ValidationFailed,

    /// <summary><c>Code</c> is already in use.</summary>
    CodeAlreadyExists,
}

/// <summary>Distinguishes why a brand update attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum UpdateBrandOutcome
{
    /// <summary>The brand was updated successfully.</summary>
    Updated,

    /// <summary>The brand does not exist.</summary>
    NotFound,

    /// <summary>The request failed local validation (a blank name).</summary>
    ValidationFailed,
}

/// <summary>
/// Business logic for creating and updating brands. Publishes <c>BrandCreated</c> on creation
/// and <c>BrandUpdated</c> when name or active status changes, via the transactional outbox.
/// </summary>
public sealed class BrandsService(IBrandRepository repository, IOutboxWriter outbox)
{
    /// <summary>Attempts to create a new brand. See <see cref="CreateBrandOutcome"/> for the possible failure reasons.</summary>
    public async Task<(CreateBrandOutcome Outcome, BrandResponse? Brand)> CreateAsync(
        CreateBrandRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
        {
            return (CreateBrandOutcome.ValidationFailed, null);
        }

        if (await repository.CodeExistsAsync(request.Code, cancellationToken))
        {
            return (CreateBrandOutcome.CodeAlreadyExists, null);
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
            return (CreateBrandOutcome.CodeAlreadyExists, null);
        }

        return (CreateBrandOutcome.Created, BrandResponse.FromEntity(brand));
    }

    /// <summary>
    /// Attempts to update a brand, publishing <c>BrandUpdated</c> only when a field actually
    /// changes. See <see cref="UpdateBrandOutcome"/> for the possible failure reasons.
    /// </summary>
    public async Task<(UpdateBrandOutcome Outcome, BrandResponse? Brand)> UpdateAsync(
        Guid id, UpdateBrandRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return (UpdateBrandOutcome.ValidationFailed, null);
        }

        var brand = await repository.GetByIdAsync(id, cancellationToken);
        if (brand is null)
        {
            return (UpdateBrandOutcome.NotFound, null);
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

        return (UpdateBrandOutcome.Updated, BrandResponse.FromEntity(brand));
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
