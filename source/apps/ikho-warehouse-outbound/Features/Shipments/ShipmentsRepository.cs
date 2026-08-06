using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseOutbound.Domain;
using Ikho.WarehouseOutbound.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseOutbound.Features.Shipments;

/// <summary>Data access for the dispatch-shipment flow.</summary>
public interface IShipmentsRepository
{
    /// <summary>Finds a sales order (with its lines) by id, or <see langword="null"/> if it does not exist.</summary>
    Task<SalesOrder?> GetSalesOrderWithLinesAsync(Guid salesOrderId, CancellationToken cancellationToken);

    /// <summary>Finds every allocation for the given sales order lines.</summary>
    Task<List<Allocation>> GetAllocationsForLinesAsync(IReadOnlyCollection<Guid> salesOrderLineIds, CancellationToken cancellationToken);

    /// <summary>Finds a shipment (with its lines) by id, or <see langword="null"/> if it does not exist.</summary>
    Task<Shipment?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Returns every shipment (with its lines), newest first.</summary>
    Task<List<Shipment>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>Tracks a new shipment (and its lines, via the navigation collection) for insertion.</summary>
    void Add(Shipment shipment);

    /// <summary>
    /// Tracks a new outbox message for insertion so it commits atomically with the business
    /// write on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(OutboxMessage message);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class ShipmentsRepository(OutboundDbContext dbContext) : IShipmentsRepository
{
    /// <inheritdoc />
    public Task<SalesOrder?> GetSalesOrderWithLinesAsync(Guid salesOrderId, CancellationToken cancellationToken) =>
        dbContext.SalesOrders.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == salesOrderId, cancellationToken);

    /// <inheritdoc />
    public Task<List<Allocation>> GetAllocationsForLinesAsync(IReadOnlyCollection<Guid> salesOrderLineIds, CancellationToken cancellationToken) =>
        dbContext.Allocations.Where(a => salesOrderLineIds.Contains(a.SalesOrderLineId)).ToListAsync(cancellationToken);

    /// <inheritdoc />
    public Task<Shipment?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Shipments.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<List<Shipment>> GetAllAsync(CancellationToken cancellationToken) =>
        dbContext.Shipments.Include(x => x.Lines).OrderByDescending(x => x.DispatchedOnUtc).ToListAsync(cancellationToken);

    /// <inheritdoc />
    public void Add(Shipment shipment) => dbContext.Shipments.Add(shipment);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
