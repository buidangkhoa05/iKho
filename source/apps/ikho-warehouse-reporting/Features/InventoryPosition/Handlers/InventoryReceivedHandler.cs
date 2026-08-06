using System.Globalization;
using Ikho.SchemaManagement.Contracts.WarehouseInventory.Events.V1;
using Ikho.SharedLibrary.Events;

namespace Ikho.WarehouseReporting.Features.InventoryPosition.Handlers;

/// <summary>
/// Projects the Inventory service's <c>InventoryReceived</c> event onto the inventory-position
/// read model: a receipt adds physical quantity, so it increments <c>OnHandQuantity</c>.
/// </summary>
public sealed class InventoryReceivedHandler(IInventoryPositionRepository repository) : IIntegrationEventHandler<InventoryReceived>
{
    /// <inheritdoc />
    public async Task HandleAsync(InventoryReceived @event, string? correlationId, CancellationToken cancellationToken)
    {
        var productId = Guid.Parse(@event.productId);
        var warehouseId = Guid.Parse(@event.warehouseId);
        var quantity = decimal.Parse(@event.quantity, CultureInfo.InvariantCulture);

        var position = await repository.GetOrCreateAsync(productId, warehouseId, cancellationToken);
        position.OnHandQuantity += quantity;
        position.UpdatedOnUtc = DateTimeOffset.UtcNow;

        await repository.SaveChangesAsync(cancellationToken);
    }
}
