namespace Ikho.WarehouseCatalog.Features.Brands;

/// <summary>Request body to create a new brand.</summary>
public sealed record CreateBrandRequest(string Code, string Name);

/// <summary>Request body to update an existing brand.</summary>
public sealed record UpdateBrandRequest(string Name, bool IsActive);

/// <summary>Response DTO for a brand.</summary>
public sealed record BrandResponse(Guid Id, string Code, string Name, bool IsActive)
{
    /// <summary>Projects a <see cref="Domain.Brand"/> entity to its response DTO.</summary>
    public static BrandResponse FromEntity(Domain.Brand brand) =>
        new(brand.Id, brand.Code, brand.Name, brand.IsActive);
}
