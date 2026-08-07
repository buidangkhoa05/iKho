using System.Globalization;
using Ikho.SchemaManagement.Contracts.WarehouseInventory.Events.V1;
using Ikho.SharedLibrary.Events;

namespace Ikho.Warehouse.Reporting.Features.InventoryPosition.Handlers;

/// <summary>
/// Projects the Inventory service's <c>StockShipped</c> event onto the inventory-position read
/// model: shipping consumes both the physical quantity and the reservation that held it, so it
/// decrements both <c>OnHandQuantity</c> and <c>ReservedQuantity</c>.
/// </summary>
public sealed class StockShippedHandler(IInventoryPositionRepository repository) : IIntegrationEventHandler<StockShipped>
{
    /// <inheritdoc />
    public async Task HandleAsync(StockShipped @event, string? correlationId, CancellationToken cancellationToken)
    {
        var productId = Guid.Parse(@event.productId);
        var warehouseId = Guid.Parse(@event.warehouseId);
        var quantity = decimal.Parse(@event.quantity, CultureInfo.InvariantCulture);

        var position = await repository.GetOrCreateAsync(productId, warehouseId, cancellationToken);
        position.OnHandQuantity -= quantity;
        position.ReservedQuantity -= quantity;
        position.UpdatedOnUtc = DateTimeOffset.UtcNow;

        await repository.SaveChangesAsync(cancellationToken);
    }
}
