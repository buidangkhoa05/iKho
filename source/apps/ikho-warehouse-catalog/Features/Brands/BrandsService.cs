using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseCatalog.Features.Brands;

/// <summary>Business logic for creating and updating brands.</summary>
public sealed class BrandsService(IBrandRepository repository)
{
    /// <summary>Creates a new brand. Returns <see langword="null"/> if the code is already in use.</summary>
    public async Task<BrandResponse?> CreateAsync(
        CreateBrandRequest request, CancellationToken cancellationToken)
    {
        if (await repository.CodeExistsAsync(request.Code, cancellationToken))
        {
            return null;
        }

        var brand = new Domain.Brand { Code = request.Code, Name = request.Name };
        repository.Add(brand);

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

    /// <summary>Updates a brand. Returns <see langword="null"/> if not found.</summary>
    public async Task<BrandResponse?> UpdateAsync(
        Guid id, UpdateBrandRequest request, CancellationToken cancellationToken)
    {
        var brand = await repository.GetByIdAsync(id, cancellationToken);
        if (brand is null)
        {
            return null;
        }

        brand.Name = request.Name;
        brand.IsActive = request.IsActive;
        await repository.SaveChangesAsync(cancellationToken);

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
