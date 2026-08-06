using System.Globalization;
using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseOutbound.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseOutbound.Domain;
using Ikho.WarehouseOutbound.Shared;
using Ikho.WarehouseOutbound.Shared.Clients;

namespace Ikho.WarehouseOutbound.Features.Allocations;

/// <summary>Distinguishes why an allocation attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum AllocateSalesOrderOutcome
{
    /// <summary>Every line on the order now has a confirmed allocation.</summary>
    Allocated,

    /// <summary>Inventory reported insufficient stock for one or more lines.</summary>
    InsufficientStock,

    /// <summary>The referenced sales order does not exist.</summary>
    SalesOrderNotFound,
}

/// <summary>
/// Business logic for allocating stock against a sales order's lines by calling Inventory's
/// reservation endpoint once per unallocated line.
/// </summary>
public sealed class AllocationsService(IAllocationsRepository repository, IInventoryApiClient inventoryClient, IOutboxWriter outbox)
{
    /// <summary>
    /// Attempts to reserve stock in Inventory for every line on the order that does not yet have
    /// an allocation. If Inventory reports insufficient stock for any line, the overall order is
    /// not marked <see cref="SalesOrderStatus.Allocated"/> and the endpoint should return a
    /// conflict — but lines that succeeded earlier in this same call are intentionally not rolled
    /// back (no saga/compensation against Inventory in this slice), so a subsequent retry of this
    /// endpoint only needs to (and will only) attempt the lines that are still unallocated.
    /// </summary>
    public async Task<(AllocateSalesOrderOutcome Outcome, SalesOrderResponse? SalesOrder, IReadOnlyList<Guid> FailedProductIds)> AllocateAsync(
        Guid salesOrderId, string? correlationId, CancellationToken cancellationToken)
    {
        var salesOrder = await repository.GetSalesOrderWithLinesAsync(salesOrderId, cancellationToken);
        if (salesOrder is null)
        {
            return (AllocateSalesOrderOutcome.SalesOrderNotFound, null, Array.Empty<Guid>());
        }

        var failedProductIds = new List<Guid>();

        foreach (var line in salesOrder.Lines.Where(line => line.AllocationId is null))
        {
            var (reserveOutcome, reservation) = await inventoryClient.ReserveAsync(
                line.ProductId, salesOrder.WarehouseId, line.Quantity, "SalesOrderLine", line.Id.ToString(), cancellationToken);

            if (reserveOutcome != InventoryReserveOutcome.Created || reservation is null)
            {
                failedProductIds.Add(line.ProductId);
                continue;
            }

            var allocation = new Allocation
            {
                SalesOrderLineId = line.Id,
                ProductId = line.ProductId,
                WarehouseId = salesOrder.WarehouseId,
                Quantity = line.Quantity,
                InventoryReservationId = reservation.Id,
                Status = AllocationStatus.Reserved,
            };
            repository.Add(allocation);
            line.AllocationId = allocation.Id;

            var @event = new AllocationConfirmed
            {
                eventId = Guid.NewGuid().ToString(),
                salesOrderId = salesOrder.Id.ToString(),
                allocationId = allocation.Id.ToString(),
                productId = allocation.ProductId.ToString(),
                warehouseId = allocation.WarehouseId.ToString(),
                quantity = allocation.Quantity.ToString(CultureInfo.InvariantCulture),
                confirmedOn = DateTimeOffset.UtcNow.ToString("O"),
            };
            repository.Add(outbox.Enqueue(nameof(AllocationConfirmed), JsonSerializer.Serialize(@event), correlationId));
        }

        if (failedProductIds.Count > 0)
        {
            // Persist whatever succeeded before the failure — see the doc comment on this method
            // for why partial allocation rows are an acceptable outcome here.
            await repository.SaveChangesAsync(cancellationToken);
            return (AllocateSalesOrderOutcome.InsufficientStock, SalesOrderResponse.FromEntity(salesOrder), failedProductIds);
        }

        if (salesOrder.Lines.All(line => line.AllocationId is not null))
        {
            salesOrder.Status = SalesOrderStatus.Allocated;
        }

        await repository.SaveChangesAsync(cancellationToken);

        return (AllocateSalesOrderOutcome.Allocated, SalesOrderResponse.FromEntity(salesOrder), Array.Empty<Guid>());
    }
}
