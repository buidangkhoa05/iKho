using Ikho.WarehouseReporting.Domain;
using Ikho.WarehouseReporting.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseReporting.Features.InventoryPosition;

/// <summary>Data access for the inventory-position read model, used by both the query endpoints and the projection handlers.</summary>
public interface IInventoryPositionRepository
{
    /// <summary>Returns the position row for a product/warehouse pair, or <see langword="null"/> if none exists yet.</summary>
    Task<InventoryPositionReadModel?> GetAsync(Guid productId, Guid warehouseId, CancellationToken cancellationToken);

    /// <summary>Returns position rows optionally filtered by product and/or warehouse.</summary>
    Task<List<InventoryPositionReadModel>> ListAsync(Guid? productId, Guid? warehouseId, CancellationToken cancellationToken);

    /// <summary>
    /// Finds the position row for a product/warehouse pair, creating and tracking a new
    /// (zeroed) one if none exists yet. Used by the projection handlers so every inventory event
    /// can be applied without a separate existence check.
    /// </summary>
    Task<InventoryPositionReadModel> GetOrCreateAsync(Guid productId, Guid warehouseId, CancellationToken cancellationToken);

    /// <summary>Tracks a new position row for insertion.</summary>
    void Add(InventoryPositionReadModel model);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class InventoryPositionRepository(ReportingDbContext dbContext) : IInventoryPositionRepository
{
    /// <inheritdoc />
    public Task<InventoryPositionReadModel?> GetAsync(Guid productId, Guid warehouseId, CancellationToken cancellationToken) =>
        dbContext.InventoryPositions.SingleOrDefaultAsync(x => x.ProductId == productId && x.WarehouseId == warehouseId, cancellationToken);

    /// <inheritdoc />
    public async Task<List<InventoryPositionReadModel>> ListAsync(Guid? productId, Guid? warehouseId, CancellationToken cancellationToken)
    {
        var query = dbContext.InventoryPositions.AsQueryable();

        if (productId is not null)
        {
            query = query.Where(x => x.ProductId == productId);
        }

        if (warehouseId is not null)
        {
            query = query.Where(x => x.WarehouseId == warehouseId);
        }

        return await query.OrderBy(x => x.ProductId).ThenBy(x => x.WarehouseId).ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<InventoryPositionReadModel> GetOrCreateAsync(Guid productId, Guid warehouseId, CancellationToken cancellationToken)
    {
        var model = await GetAsync(productId, warehouseId, cancellationToken);
        if (model is not null)
        {
            return model;
        }

        model = new InventoryPositionReadModel { ProductId = productId, WarehouseId = warehouseId };
        Add(model);
        return model;
    }

    /// <inheritdoc />
    public void Add(InventoryPositionReadModel model) => dbContext.InventoryPositions.Add(model);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
