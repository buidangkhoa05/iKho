using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Catalog.Features.UnitsOfMeasure;

/// <summary>Business logic for creating and updating units of measure.</summary>
public sealed class UnitsOfMeasureService(IUomRepository repository)
{
    /// <summary>Creates a new UOM. Returns <see langword="null"/> if the code is already in use.</summary>
    public async Task<UomResponse?> CreateAsync(
        CreateUomRequest request, CancellationToken cancellationToken)
    {
        if (await repository.CodeExistsAsync(request.Code, cancellationToken))
        {
            return null;
        }

        var uom = new Domain.UnitOfMeasure { Code = request.Code, Name = request.Name };
        repository.Add(uom);

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return null;
        }

        return UomResponse.FromEntity(uom);
    }

    /// <summary>Updates a UOM. Returns <see langword="null"/> if not found.</summary>
    public async Task<UomResponse?> UpdateAsync(
        Guid id, UpdateUomRequest request, CancellationToken cancellationToken)
    {
        var uom = await repository.GetByIdAsync(id, cancellationToken);
        if (uom is null)
        {
            return null;
        }

        uom.Name = request.Name;
        uom.IsActive = request.IsActive;
        await repository.SaveChangesAsync(cancellationToken);

        return UomResponse.FromEntity(uom);
    }

    /// <summary>Returns a single UOM by id, or <see langword="null"/> if not found.</summary>
    public async Task<UomResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var uom = await repository.GetByIdAsync(id, cancellationToken);
        return uom is null ? null : UomResponse.FromEntity(uom);
    }

    /// <summary>Returns all UOMs ordered by code.</summary>
    public async Task<List<UomResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var uoms = await repository.GetAllAsync(cancellationToken);
        return uoms.ConvertAll(UomResponse.FromEntity);
    }
}
