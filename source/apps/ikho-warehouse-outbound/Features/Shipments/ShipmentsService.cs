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
/// <remarks>
/// This slice does not implement saga-style compensation against Inventory: if a later
/// allocation's fulfill call fails, allocations already fulfilled earlier in the same request are
/// not rolled back (Inventory has already decremented that stock and consumed the reservation).
/// Instead, whatever succeeded before the failure is persisted here as a partial shipment
/// (mirroring <c>AllocationsService.AllocateAsync</c>'s forward-recovery pattern) — the sales
/// order is left in <see cref="SalesOrderStatus.Allocated"/> rather than advanced to
/// <see cref="SalesOrderStatus.Shipped"/>, and only the allocations actually fulfilled are moved
/// to <see cref="AllocationStatus.Fulfilled"/>, so a retry only re-attempts allocations still
/// <see cref="AllocationStatus.Reserved"/>. Persisting nothing on partial failure (the previous
/// behavior) would leave Inventory believing stock shipped that Outbound has no record of, and a
/// naive retry would re-attempt fulfilling an already-consumed reservation and get permanently
/// stuck.
/// </remarks>
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

        string? failureError = null;

        foreach (var allocation in allocations.Where(a => a.Status == AllocationStatus.Reserved))
        {
            var (fulfillOutcome, reservation) = await inventoryClient.FulfillReservationAsync(allocation.InventoryReservationId, cancellationToken);
            if (fulfillOutcome != InventoryFulfillOutcome.Fulfilled || reservation is null)
            {
                failureError = $"Failed to fulfill reservation '{allocation.InventoryReservationId}' for allocation '{allocation.Id}' (outcome: {fulfillOutcome}).";
                break;
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

        // Nothing reached Inventory (the very first allocation failed) — nothing to persist.
        if (failureError is not null && shipment.Lines.Count == 0)
        {
            return (DispatchSalesOrderOutcome.InventoryFulfillFailed, null, failureError);
        }

        repository.Add(shipment);

        // Only advance the order to Shipped once every reserved allocation has actually been
        // fulfilled — a partial dispatch leaves it Allocated so a retry picks up where this
        // request left off (see the type's remarks).
        if (failureError is null)
        {
            salesOrder.Status = SalesOrderStatus.Shipped;
        }

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

        if (failureError is not null)
        {
            return (DispatchSalesOrderOutcome.InventoryFulfillFailed, ShipmentResponse.FromEntity(shipment),
                $"{failureError} {shipment.Lines.Count} allocation(s) were fulfilled and persisted before this failure; " +
                "retry to continue with the remaining reserved allocations.");
        }

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
