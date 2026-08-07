using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Catalog.Features.UnitsOfMeasure;

/// <summary>Distinguishes why a UOM creation attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum CreateUomOutcome
{
    /// <summary>The UOM was created successfully.</summary>
    Created,

    /// <summary>The request failed local validation (a blank code or name).</summary>
    ValidationFailed,

    /// <summary><c>Code</c> is already in use.</summary>
    CodeAlreadyExists,
}

/// <summary>Distinguishes why a UOM update attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum UpdateUomOutcome
{
    /// <summary>The UOM was updated successfully.</summary>
    Updated,

    /// <summary>The UOM does not exist.</summary>
    NotFound,

    /// <summary>The request failed local validation (a blank name).</summary>
    ValidationFailed,
}

/// <summary>Business logic for creating and updating units of measure.</summary>
public sealed class UnitsOfMeasureService(IUomRepository repository)
{
    /// <summary>Attempts to create a new UOM. See <see cref="CreateUomOutcome"/> for the possible failure reasons.</summary>
    public async Task<(CreateUomOutcome Outcome, UomResponse? Uom)> CreateAsync(
        CreateUomRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
        {
            return (CreateUomOutcome.ValidationFailed, null);
        }

        if (await repository.CodeExistsAsync(request.Code, cancellationToken))
        {
            return (CreateUomOutcome.CodeAlreadyExists, null);
        }

        var uom = new Domain.UnitOfMeasure { Code = request.Code, Name = request.Name };
        repository.Add(uom);

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return (CreateUomOutcome.CodeAlreadyExists, null);
        }

        return (CreateUomOutcome.Created, UomResponse.FromEntity(uom));
    }

    /// <summary>Attempts to update a UOM. See <see cref="UpdateUomOutcome"/> for the possible failure reasons.</summary>
    public async Task<(UpdateUomOutcome Outcome, UomResponse? Uom)> UpdateAsync(
        Guid id, UpdateUomRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return (UpdateUomOutcome.ValidationFailed, null);
        }

        var uom = await repository.GetByIdAsync(id, cancellationToken);
        if (uom is null)
        {
            return (UpdateUomOutcome.NotFound, null);
        }

        uom.Name = request.Name;
        uom.IsActive = request.IsActive;
        await repository.SaveChangesAsync(cancellationToken);

        return (UpdateUomOutcome.Updated, UomResponse.FromEntity(uom));
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
