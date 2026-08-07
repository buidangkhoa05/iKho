using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Outbound.Domain;
using Ikho.Warehouse.Outbound.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Outbound.Features.Allocations;

/// <summary>Data access for the allocate-sales-order-lines flow.</summary>
public interface IAllocationsRepository
{
    /// <summary>Finds a sales order (with its lines) by id, or <see langword="null"/> if it does not exist.</summary>
    Task<SalesOrder?> GetSalesOrderWithLinesAsync(Guid salesOrderId, CancellationToken cancellationToken);

    /// <summary>Tracks a new allocation for insertion.</summary>
    void Add(Allocation allocation);

    /// <summary>
    /// Tracks a new outbox message for insertion so it commits atomically with the business
    /// write on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(OutboxMessage message);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class AllocationsRepository(OutboundDbContext dbContext) : IAllocationsRepository
{
    /// <inheritdoc />
    public Task<SalesOrder?> GetSalesOrderWithLinesAsync(Guid salesOrderId, CancellationToken cancellationToken) =>
        dbContext.SalesOrders.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == salesOrderId, cancellationToken);

    /// <inheritdoc />
    public void Add(Allocation allocation) => dbContext.Allocations.Add(allocation);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
