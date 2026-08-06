using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseReturns.Domain;
using Ikho.WarehouseReturns.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseReturns.Features.Inspections;

/// <summary>Data access for the Inspections feature.</summary>
public interface IInspectionsRepository
{
    /// <summary>Fetches a return order with its lines, tracked for mutation (updating status), or <see langword="null"/> if not found.</summary>
    Task<ReturnOrder?> GetReturnOrderWithLinesAsync(Guid returnOrderId, CancellationToken cancellationToken);

    /// <summary>Tracks a new inspection for insertion.</summary>
    void Add(Inspection inspection);

    /// <summary>
    /// Tracks a new outbox message for insertion so it commits atomically with the business
    /// write on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(OutboxMessage message);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class InspectionsRepository(ReturnsDbContext dbContext) : IInspectionsRepository
{
    /// <inheritdoc />
    public Task<ReturnOrder?> GetReturnOrderWithLinesAsync(Guid returnOrderId, CancellationToken cancellationToken) =>
        dbContext.ReturnOrders.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == returnOrderId, cancellationToken);

    /// <inheritdoc />
    public void Add(Inspection inspection) => dbContext.Inspections.Add(inspection);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
