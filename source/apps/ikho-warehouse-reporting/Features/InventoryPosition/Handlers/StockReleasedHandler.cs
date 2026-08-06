using System.Globalization;
using Ikho.SchemaManagement.Contracts.WarehouseInventory.Events.V1;
using Ikho.SharedLibrary.Events;

namespace Ikho.WarehouseReporting.Features.InventoryPosition.Handlers;

/// <summary>
/// Projects the Inventory service's <c>StockReleased</c> event onto the inventory-position read
/// model: releasing a reservation frees the held quantity back to available, so it decrements
/// <c>ReservedQuantity</c> without changing <c>OnHandQuantity</c>.
/// </summary>
public sealed class StockReleasedHandler(IInventoryPositionRepository repository) : IIntegrationEventHandler<StockReleased>
{
    /// <inheritdoc />
    public async Task HandleAsync(StockReleased @event, string? correlationId, CancellationToken cancellationToken)
    {
        var productId = Guid.Parse(@event.productId);
        var warehouseId = Guid.Parse(@event.warehouseId);
        var quantity = decimal.Parse(@event.quantity, CultureInfo.InvariantCulture);

        var position = await repository.GetOrCreateAsync(productId, warehouseId, cancellationToken);
        position.ReservedQuantity -= quantity;
        position.UpdatedOnUtc = DateTimeOffset.UtcNow;

        await repository.SaveChangesAsync(cancellationToken);
    }
}
