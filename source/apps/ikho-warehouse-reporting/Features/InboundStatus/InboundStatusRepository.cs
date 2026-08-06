using Ikho.WarehouseReporting.Domain;
using Ikho.WarehouseReporting.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseReporting.Features.InboundStatus;

/// <summary>Data access for the inbound-status read model, used by both the query endpoints and the projection handlers.</summary>
public interface IInboundStatusRepository
{
    /// <summary>Returns the status row for a purchase order, or <see langword="null"/> if none exists yet.</summary>
    Task<InboundStatusReadModel?> GetAsync(Guid purchaseOrderId, CancellationToken cancellationToken);

    /// <summary>Returns every inbound-status row, ordered by purchase order id.</summary>
    Task<List<InboundStatusReadModel>> ListAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Finds the status row for a purchase order, creating and tracking a new (zeroed) one if
    /// none exists yet. Used by the projection handlers so every inbound event can be applied
    /// without a separate existence check.
    /// </summary>
    Task<InboundStatusReadModel> GetOrCreateAsync(Guid purchaseOrderId, CancellationToken cancellationToken);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class InboundStatusRepository(ReportingDbContext dbContext) : IInboundStatusRepository
{
    /// <inheritdoc />
    public Task<InboundStatusReadModel?> GetAsync(Guid purchaseOrderId, CancellationToken cancellationToken) =>
        dbContext.InboundStatuses.SingleOrDefaultAsync(x => x.PurchaseOrderId == purchaseOrderId, cancellationToken);

    /// <inheritdoc />
    public Task<List<InboundStatusReadModel>> ListAsync(CancellationToken cancellationToken) =>
        dbContext.InboundStatuses.OrderBy(x => x.PurchaseOrderId).ToListAsync(cancellationToken);

    /// <inheritdoc />
    public async Task<InboundStatusReadModel> GetOrCreateAsync(Guid purchaseOrderId, CancellationToken cancellationToken)
    {
        var model = await GetAsync(purchaseOrderId, cancellationToken);
        if (model is not null)
        {
            return model;
        }

        model = new InboundStatusReadModel { PurchaseOrderId = purchaseOrderId };
        dbContext.InboundStatuses.Add(model);
        return model;
    }

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
