namespace Ikho.Warehouse.Reporting.Features.InventoryPosition;

/// <summary>
/// Read-only query logic over the inventory-position read model. This feature's endpoints never
/// mutate state and never call other services - see the event handlers in this folder for how
/// the read model is kept up to date.
/// </summary>
public sealed class InventoryPositionService(IInventoryPositionRepository repository)
{
    /// <summary>Returns the position for a product/warehouse pair, or <see langword="null"/> if none exists yet.</summary>
    public async Task<InventoryPositionResponse?> GetAsync(Guid productId, Guid warehouseId, CancellationToken cancellationToken)
    {
        var model = await repository.GetAsync(productId, warehouseId, cancellationToken);
        return model is null ? null : InventoryPositionResponse.FromEntity(model);
    }

    /// <summary>Returns positions optionally filtered by product and/or warehouse.</summary>
    public async Task<List<InventoryPositionResponse>> ListAsync(Guid? productId, Guid? warehouseId, CancellationToken cancellationToken)
    {
        var models = await repository.ListAsync(productId, warehouseId, cancellationToken);
        return models.ConvertAll(InventoryPositionResponse.FromEntity);
    }
}
