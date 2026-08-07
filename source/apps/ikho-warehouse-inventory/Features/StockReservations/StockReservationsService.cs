using System.Globalization;
using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseInventory.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Inventory.Domain;
using Ikho.Warehouse.Inventory.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Inventory.Features.StockReservations;

/// <summary>Distinguishes why a reservation attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum ReserveStockOutcome
{
    /// <summary>The reservation was created successfully.</summary>
    Created,

    /// <summary>No single stock item has enough available quantity to satisfy the request.</summary>
    InsufficientStock,

    /// <summary>The request itself is invalid (e.g. non-positive quantity).</summary>
    ValidationFailed,

    /// <summary>Another request concurrently mutated the same stock item/balance; retry.</summary>
    ConcurrencyConflict,
}

/// <summary>Distinguishes why a release attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum ReleaseStockOutcome
{
    /// <summary>The reservation was released successfully.</summary>
    Released,

    /// <summary>The referenced reservation does not exist.</summary>
    NotFound,

    /// <summary>The reservation exists but is not currently <see cref="ReservationStatus.Active"/>.</summary>
    NotActive,

    /// <summary>Another request concurrently mutated the same stock item/balance; retry.</summary>
    ConcurrencyConflict,
}

/// <summary>Distinguishes why a fulfill attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum FulfillStockOutcome
{
    /// <summary>The reservation was fulfilled successfully.</summary>
    Fulfilled,

    /// <summary>The referenced reservation does not exist.</summary>
    NotFound,

    /// <summary>The reservation exists but is not currently <see cref="ReservationStatus.Active"/>.</summary>
    NotActive,

    /// <summary>Another request concurrently mutated the same stock item/balance; retry.</summary>
    ConcurrencyConflict,
}

/// <summary>
/// Business logic for reserving and releasing stock on behalf of outbound execution.
/// Reservation auto-selects a single stock item with enough available quantity
/// (FIFO/FEFO-lite, oldest first) rather than splitting across multiple stock items, which is
/// explicitly out of scope for this slice. Both flows publish their corresponding event
/// (<c>StockReserved</c>/<c>StockReleased</c>) via the transactional outbox.
/// </summary>
public sealed class StockReservationsService(IStockReservationsRepository repository, IOutboxWriter outbox)
{
    /// <summary>Reserves stock for a product/warehouse, auto-selecting a single stock item with enough available quantity.</summary>
    public async Task<(ReserveStockOutcome Outcome, StockReservationResponse? Reservation)> ReserveAsync(
        ReserveStockRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (request.Quantity <= 0)
        {
            return (ReserveStockOutcome.ValidationFailed, null);
        }

        var stockItem = await repository.FindAvailableStockItemAsync(
            request.ProductId, request.WarehouseId, request.Quantity, cancellationToken);
        if (stockItem is null)
        {
            // No single stock item has enough available quantity — splitting a reservation
            // across multiple stock items is explicitly out of scope for this slice.
            return (ReserveStockOutcome.InsufficientStock, null);
        }

        stockItem.ReservedQuantity += request.Quantity;
        stockItem.UpdatedOnUtc = DateTimeOffset.UtcNow;

        var balance = await repository.GetStockBalanceAsync(request.ProductId, request.WarehouseId, cancellationToken);
        if (balance is null)
        {
            balance = new StockBalance { ProductId = request.ProductId, WarehouseId = request.WarehouseId };
            repository.Add(balance);
        }

        balance.ReservedQuantity += request.Quantity;
        balance.UpdatedOnUtc = DateTimeOffset.UtcNow;

        var reservation = new StockReservation
        {
            StockItemId = stockItem.Id,
            ProductId = request.ProductId,
            WarehouseId = request.WarehouseId,
            Quantity = request.Quantity,
            Status = ReservationStatus.Active,
            ReferenceType = request.ReferenceType,
            ReferenceId = request.ReferenceId,
        };
        repository.Add(reservation);

        // A reservation moves quantity from available into the reserved bucket only — on-hand
        // quantity is untouched, so this ledger entry records a zero on-hand delta purely for
        // audit/history purposes (see StockLedgerEntry.QuantityDelta docs).
        repository.Add(new StockLedgerEntry
        {
            StockItemId = stockItem.Id,
            ProductId = stockItem.ProductId,
            WarehouseId = stockItem.WarehouseId,
            BinId = stockItem.BinId,
            LotId = stockItem.LotId,
            SerialNumberId = stockItem.SerialNumberId,
            MovementType = StockMovementType.Reservation,
            QuantityDelta = 0m,
            ReferenceType = request.ReferenceType ?? "StockReservation",
            ReferenceId = request.ReferenceId ?? reservation.Id.ToString(),
            CorrelationId = correlationId,
        });

        var @event = new StockReserved
        {
            eventId = Guid.NewGuid().ToString(),
            reservationId = reservation.Id.ToString(),
            productId = reservation.ProductId.ToString(),
            warehouseId = reservation.WarehouseId.ToString(),
            stockItemId = stockItem.Id.ToString(),
            quantity = request.Quantity.ToString(CultureInfo.InvariantCulture),
            reservedOn = DateTimeOffset.UtcNow.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(StockReserved), JsonSerializer.Serialize(@event), correlationId));

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return (ReserveStockOutcome.ConcurrencyConflict, null);
        }

        return (ReserveStockOutcome.Created, StockReservationResponse.FromEntity(reservation));
    }

    /// <summary>Releases an active reservation back to available stock.</summary>
    public async Task<(ReleaseStockOutcome Outcome, StockReservationResponse? Reservation)> ReleaseAsync(
        Guid reservationId, string? correlationId, CancellationToken cancellationToken)
    {
        var reservation = await repository.GetReservationAsync(reservationId, cancellationToken);
        if (reservation is null)
        {
            return (ReleaseStockOutcome.NotFound, null);
        }

        if (reservation.Status != ReservationStatus.Active)
        {
            return (ReleaseStockOutcome.NotActive, null);
        }

        var stockItem = await repository.GetStockItemAsync(reservation.StockItemId, cancellationToken);
        if (stockItem is not null)
        {
            stockItem.ReservedQuantity -= reservation.Quantity;
            stockItem.UpdatedOnUtc = DateTimeOffset.UtcNow;
        }

        var balance = await repository.GetStockBalanceAsync(reservation.ProductId, reservation.WarehouseId, cancellationToken);
        if (balance is not null)
        {
            balance.ReservedQuantity -= reservation.Quantity;
            balance.UpdatedOnUtc = DateTimeOffset.UtcNow;
        }

        reservation.Status = ReservationStatus.Released;
        reservation.ReleasedOnUtc = DateTimeOffset.UtcNow;

        // Symmetric with reservation: releasing does not change on-hand quantity, only moves the
        // held amount back from reserved into available, so this ledger entry also carries a
        // zero delta.
        repository.Add(new StockLedgerEntry
        {
            StockItemId = reservation.StockItemId,
            ProductId = reservation.ProductId,
            WarehouseId = reservation.WarehouseId,
            BinId = stockItem?.BinId ?? Guid.Empty,
            LotId = stockItem?.LotId,
            SerialNumberId = stockItem?.SerialNumberId,
            MovementType = StockMovementType.Release,
            QuantityDelta = 0m,
            ReferenceType = reservation.ReferenceType ?? "StockReservation",
            ReferenceId = reservation.ReferenceId ?? reservation.Id.ToString(),
            CorrelationId = correlationId,
        });

        var @event = new StockReleased
        {
            eventId = Guid.NewGuid().ToString(),
            reservationId = reservation.Id.ToString(),
            productId = reservation.ProductId.ToString(),
            warehouseId = reservation.WarehouseId.ToString(),
            stockItemId = reservation.StockItemId.ToString(),
            quantity = reservation.Quantity.ToString(CultureInfo.InvariantCulture),
            releasedOn = DateTimeOffset.UtcNow.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(StockReleased), JsonSerializer.Serialize(@event), correlationId));

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return (ReleaseStockOutcome.ConcurrencyConflict, null);
        }

        return (ReleaseStockOutcome.Released, StockReservationResponse.FromEntity(reservation));
    }

    /// <summary>
    /// Converts an active reservation into an actual stock decrement on behalf of outbound
    /// shipment execution. Unlike <see cref="ReleaseAsync"/> (which only moves quantity back from
    /// reserved into available), fulfilling a reservation removes the quantity from on-hand
    /// entirely, since the stock has physically left the warehouse.
    /// </summary>
    public async Task<(FulfillStockOutcome Outcome, StockReservationResponse? Reservation)> FulfillAsync(
        Guid reservationId, string? correlationId, CancellationToken cancellationToken)
    {
        var reservation = await repository.GetReservationAsync(reservationId, cancellationToken);
        if (reservation is null)
        {
            return (FulfillStockOutcome.NotFound, null);
        }

        if (reservation.Status != ReservationStatus.Active)
        {
            return (FulfillStockOutcome.NotActive, null);
        }

        var stockItem = await repository.GetStockItemAsync(reservation.StockItemId, cancellationToken);
        if (stockItem is null)
        {
            // A fulfill only ever follows a valid, active reservation, which itself requires the
            // stock item it points at to exist — if it is gone by the time we get here, something
            // else in the system corrupted the ledger.
            throw new InvalidOperationException(
                $"Stock item '{reservation.StockItemId}' referenced by reservation '{reservation.Id}' no longer exists.");
        }

        if (stockItem.OnHandQuantity - reservation.Quantity < 0m || stockItem.ReservedQuantity - reservation.Quantity < 0m)
        {
            // This should never actually happen — a fulfill only follows a valid reservation,
            // which already guaranteed enough on-hand/reserved quantity existed. If it does,
            // that indicates a ledger bug elsewhere rather than a legitimate business conflict.
            throw new InvalidOperationException(
                $"Fulfilling reservation '{reservation.Id}' would drive stock item '{stockItem.Id}' negative.");
        }

        stockItem.OnHandQuantity -= reservation.Quantity;
        stockItem.ReservedQuantity -= reservation.Quantity;
        stockItem.UpdatedOnUtc = DateTimeOffset.UtcNow;

        var balance = await repository.GetStockBalanceAsync(reservation.ProductId, reservation.WarehouseId, cancellationToken);
        if (balance is not null)
        {
            if (balance.OnHandQuantity - reservation.Quantity < 0m || balance.ReservedQuantity - reservation.Quantity < 0m)
            {
                throw new InvalidOperationException(
                    $"Fulfilling reservation '{reservation.Id}' would drive the stock balance for product '{reservation.ProductId}' " +
                    $"in warehouse '{reservation.WarehouseId}' negative.");
            }

            balance.OnHandQuantity -= reservation.Quantity;
            balance.ReservedQuantity -= reservation.Quantity;
            balance.UpdatedOnUtc = DateTimeOffset.UtcNow;
        }

        reservation.Status = ReservationStatus.Fulfilled;

        repository.Add(new StockLedgerEntry
        {
            StockItemId = stockItem.Id,
            ProductId = stockItem.ProductId,
            WarehouseId = stockItem.WarehouseId,
            BinId = stockItem.BinId,
            LotId = stockItem.LotId,
            SerialNumberId = stockItem.SerialNumberId,
            MovementType = StockMovementType.Shipment,
            QuantityDelta = -reservation.Quantity,
            ReferenceType = "StockReservation",
            ReferenceId = reservation.Id.ToString(),
            CorrelationId = correlationId,
        });

        var @event = new StockShipped
        {
            eventId = Guid.NewGuid().ToString(),
            reservationId = reservation.Id.ToString(),
            productId = reservation.ProductId.ToString(),
            warehouseId = reservation.WarehouseId.ToString(),
            stockItemId = stockItem.Id.ToString(),
            quantity = reservation.Quantity.ToString(CultureInfo.InvariantCulture),
            shippedOn = DateTimeOffset.UtcNow.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(StockShipped), JsonSerializer.Serialize(@event), correlationId));

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return (FulfillStockOutcome.ConcurrencyConflict, null);
        }

        return (FulfillStockOutcome.Fulfilled, StockReservationResponse.FromEntity(reservation));
    }
}
