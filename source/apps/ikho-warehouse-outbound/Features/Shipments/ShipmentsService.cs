using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseOutbound.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Outbound.Domain;
using Ikho.Warehouse.Outbound.Shared;
using Ikho.Warehouse.Outbound.Shared.Clients;

namespace Ikho.Warehouse.Outbound.Features.Shipments;

/// <summary>Distinguishes why a dispatch attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum DispatchSalesOrderOutcome
{
    /// <summary>The shipment was dispatched successfully.</summary>
    Dispatched,

    /// <summary>The referenced sales order does not exist.</summary>
    SalesOrderNotFound,

    /// <summary>The sales order exists but is not currently <see cref="SalesOrderStatus.Allocated"/>.</summary>
    NotAllocated,

    /// <summary>Inventory failed to fulfill one of this order's reservations.</summary>
    InventoryFulfillFailed,
}

/// <summary>
/// Business logic for dispatching a shipment: converts every <see cref="AllocationStatus.Reserved"/>
/// allocation on an <see cref="SalesOrderStatus.Allocated"/> sales order into an actual stock
/// decrement by calling Inventory's fulfill endpoint, then records the shipment and marks the
/// order shipped.
/// </summary>
public sealed class ShipmentsService(IShipmentsRepository repository, IInventoryApiClient inventoryClient, IOutboxWriter outbox)
{
    /// <summary>Dispatches a shipment for every reserved allocation on the given sales order.</summary>
    public async Task<(DispatchSalesOrderOutcome Outcome, ShipmentResponse? Shipment, string? Error)> DispatchAsync(
        Guid salesOrderId, string? correlationId, CancellationToken cancellationToken)
    {
        var salesOrder = await repository.GetSalesOrderWithLinesAsync(salesOrderId, cancellationToken);
        if (salesOrder is null)
        {
            return (DispatchSalesOrderOutcome.SalesOrderNotFound, null, $"Sales order '{salesOrderId}' was not found.");
        }

        if (salesOrder.Status != SalesOrderStatus.Allocated)
        {
            return (DispatchSalesOrderOutcome.NotAllocated, null, $"Sales order '{salesOrderId}' is not in the Allocated status.");
        }

        var lineIds = salesOrder.Lines.Select(line => line.Id).ToList();
        var allocations = await repository.GetAllocationsForLinesAsync(lineIds, cancellationToken);

        var shipment = new Shipment
        {
            SalesOrderId = salesOrder.Id,
            WarehouseId = salesOrder.WarehouseId,
            Status = ShipmentStatus.Dispatched,
        };

        foreach (var allocation in allocations.Where(a => a.Status == AllocationStatus.Reserved))
        {
            var (fulfillOutcome, reservation) = await inventoryClient.FulfillReservationAsync(allocation.InventoryReservationId, cancellationToken);
            if (fulfillOutcome != InventoryFulfillOutcome.Fulfilled || reservation is null)
            {
                // Nothing has been saved yet at this point (no SaveChangesAsync call above), so
                // returning here leaves the database untouched even though an earlier iteration
                // of this loop may have already fulfilled a different allocation in Inventory
                // itself (no saga/compensation against Inventory in this slice). A client can
                // safely retry the dispatch once the underlying Inventory issue is resolved.
                return (DispatchSalesOrderOutcome.InventoryFulfillFailed, null,
                    $"Failed to fulfill reservation '{allocation.InventoryReservationId}' for allocation '{allocation.Id}' (outcome: {fulfillOutcome}).");
            }

            allocation.Status = AllocationStatus.Fulfilled;

            shipment.Lines.Add(new ShipmentLine
            {
                ShipmentId = shipment.Id,
                AllocationId = allocation.Id,
                ProductId = allocation.ProductId,
                Quantity = allocation.Quantity,
            });
        }

        repository.Add(shipment);
        salesOrder.Status = SalesOrderStatus.Shipped;

        var @event = new ShipmentDispatched
        {
            eventId = Guid.NewGuid().ToString(),
            shipmentId = shipment.Id.ToString(),
            salesOrderId = salesOrder.Id.ToString(),
            warehouseId = shipment.WarehouseId.ToString(),
            dispatchedOn = DateTimeOffset.UtcNow.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(ShipmentDispatched), JsonSerializer.Serialize(@event), correlationId));

        await repository.SaveChangesAsync(cancellationToken);

        return (DispatchSalesOrderOutcome.Dispatched, ShipmentResponse.FromEntity(shipment), null);
    }

    /// <summary>Fetches a shipment by id, or <see langword="null"/> if it does not exist.</summary>
    public async Task<ShipmentResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var shipment = await repository.GetByIdAsync(id, cancellationToken);
        return shipment is null ? null : ShipmentResponse.FromEntity(shipment);
    }

    /// <summary>Returns every shipment, newest first.</summary>
    public async Task<IReadOnlyList<ShipmentResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var shipments = await repository.GetAllAsync(cancellationToken);
        return shipments.Select(ShipmentResponse.FromEntity).ToList();
    }
}
