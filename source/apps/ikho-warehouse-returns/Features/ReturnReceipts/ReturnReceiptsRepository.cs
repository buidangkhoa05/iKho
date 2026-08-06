using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseReturns.Domain;
using Ikho.WarehouseReturns.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseReturns.Features.ReturnReceipts;

/// <summary>Data access for the ReturnReceipts feature.</summary>
public interface IReturnReceiptsRepository
{
    /// <summary>Fetches a return order with its lines, tracked for mutation (updating status), or <see langword="null"/> if not found.</summary>
    Task<ReturnOrder?> GetReturnOrderWithLinesAsync(Guid returnOrderId, CancellationToken cancellationToken);

    /// <summary>Tracks a new return receipt for insertion.</summary>
    void Add(ReturnReceipt receipt);

    /// <summary>
    /// Tracks a new outbox message for insertion so it commits atomically with the business
    /// write on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(OutboxMessage message);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class ReturnReceiptsRepository(ReturnsDbContext dbContext) : IReturnReceiptsRepository
{
    /// <inheritdoc />
    public Task<ReturnOrder?> GetReturnOrderWithLinesAsync(Guid returnOrderId, CancellationToken cancellationToken) =>
        dbContext.ReturnOrders.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == returnOrderId, cancellationToken);

    /// <inheritdoc />
    public void Add(ReturnReceipt receipt) => dbContext.ReturnReceipts.Add(receipt);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
