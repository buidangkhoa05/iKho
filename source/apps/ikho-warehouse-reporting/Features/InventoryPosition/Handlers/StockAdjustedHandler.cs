using System.Globalization;
using Ikho.SchemaManagement.Contracts.WarehouseInventory.Events.V1;
using Ikho.SharedLibrary.Events;

namespace Ikho.Warehouse.Reporting.Features.InventoryPosition.Handlers;

/// <summary>
/// Projects the Inventory service's <c>StockAdjusted</c> event onto the inventory-position read
/// model: applies the event's signed <c>quantityDelta</c> directly to <c>OnHandQuantity</c>.
/// </summary>
public sealed class StockAdjustedHandler(IInventoryPositionRepository repository) : IIntegrationEventHandler<StockAdjusted>
{
    /// <inheritdoc />
    public async Task HandleAsync(StockAdjusted @event, string? correlationId, CancellationToken cancellationToken)
    {
        var productId = Guid.Parse(@event.productId);
        var warehouseId = Guid.Parse(@event.warehouseId);
        var quantityDelta = decimal.Parse(@event.quantityDelta, CultureInfo.InvariantCulture);

        var position = await repository.GetOrCreateAsync(productId, warehouseId, cancellationToken);
        position.OnHandQuantity += quantityDelta;
        position.UpdatedOnUtc = DateTimeOffset.UtcNow;

        await repository.SaveChangesAsync(cancellationToken);
    }
}
