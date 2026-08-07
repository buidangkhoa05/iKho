using System.Globalization;
using Ikho.SchemaManagement.Contracts.WarehouseInventory.Events.V1;
using Ikho.SharedLibrary.Events;

namespace Ikho.Warehouse.Reporting.Features.InventoryPosition.Handlers;

/// <summary>
/// Projects the Inventory service's <c>StockQuarantined</c> event onto the inventory-position
/// read model: quarantining moves quantity into a held-pending-disposition bucket, so it
/// increments <c>QuarantineQuantity</c>.
/// </summary>
public sealed class StockQuarantinedHandler(IInventoryPositionRepository repository) : IIntegrationEventHandler<StockQuarantined>
{
    /// <inheritdoc />
    public async Task HandleAsync(StockQuarantined @event, string? correlationId, CancellationToken cancellationToken)
    {
        var productId = Guid.Parse(@event.productId);
        var warehouseId = Guid.Parse(@event.warehouseId);
        var quantity = decimal.Parse(@event.quantity, CultureInfo.InvariantCulture);

        var position = await repository.GetOrCreateAsync(productId, warehouseId, cancellationToken);
        position.QuarantineQuantity += quantity;
        position.UpdatedOnUtc = DateTimeOffset.UtcNow;

        await repository.SaveChangesAsync(cancellationToken);
    }
}
