using Ikho.Warehouse.Reporting.Domain;
using Ikho.Warehouse.Reporting.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Reporting.Features.OutboundStatus;

/// <summary>Data access for the outbound-status read model, used by both the query endpoints and the projection handlers.</summary>
public interface IOutboundStatusRepository
{
    /// <summary>Returns the status row for a sales order, or <see langword="null"/> if none exists yet.</summary>
    Task<OutboundStatusReadModel?> GetAsync(Guid salesOrderId, CancellationToken cancellationToken);

    /// <summary>Returns every outbound-status row, ordered by sales order id.</summary>
    Task<List<OutboundStatusReadModel>> ListAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Finds the status row for a sales order, creating and tracking a new (zeroed) one if none
    /// exists yet. Used by the projection handlers so every outbound event can be applied
    /// without a separate existence check.
    /// </summary>
    Task<OutboundStatusReadModel> GetOrCreateAsync(Guid salesOrderId, CancellationToken cancellationToken);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class OutboundStatusRepository(ReportingDbContext dbContext) : IOutboundStatusRepository
{
    /// <inheritdoc />
    public Task<OutboundStatusReadModel?> GetAsync(Guid salesOrderId, CancellationToken cancellationToken) =>
        dbContext.OutboundStatuses.SingleOrDefaultAsync(x => x.SalesOrderId == salesOrderId, cancellationToken);

    /// <inheritdoc />
    public Task<List<OutboundStatusReadModel>> ListAsync(CancellationToken cancellationToken) =>
        dbContext.OutboundStatuses.OrderBy(x => x.SalesOrderId).ToListAsync(cancellationToken);

    /// <inheritdoc />
    public async Task<OutboundStatusReadModel> GetOrCreateAsync(Guid salesOrderId, CancellationToken cancellationToken)
    {
        var model = await GetAsync(salesOrderId, cancellationToken);
        if (model is not null)
        {
            return model;
        }

        model = new OutboundStatusReadModel { SalesOrderId = salesOrderId };
        dbContext.OutboundStatuses.Add(model);
        return model;
    }

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
