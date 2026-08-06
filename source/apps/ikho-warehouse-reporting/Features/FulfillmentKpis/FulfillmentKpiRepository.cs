using Ikho.WarehouseReporting.Domain;
using Ikho.WarehouseReporting.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseReporting.Features.FulfillmentKpis;

/// <summary>Data access for the daily fulfillment-KPI read model, used by both the query endpoints and the projection handlers.</summary>
public interface IFulfillmentKpiRepository
{
    /// <summary>Returns the KPI row for a specific UTC calendar day, or <see langword="null"/> if none exists yet.</summary>
    Task<FulfillmentKpiReadModel?> GetAsync(DateOnly date, CancellationToken cancellationToken);

    /// <summary>Returns KPI rows for every day in the inclusive <paramref name="from"/>/<paramref name="to"/> range, ordered by date.</summary>
    Task<List<FulfillmentKpiReadModel>> GetRangeAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken);

    /// <summary>
    /// Finds the KPI row for a specific UTC calendar day, creating and tracking a new (zeroed)
    /// one if none exists yet. Used by the projection handlers so every fulfillment event can be
    /// applied without a separate existence check.
    /// </summary>
    Task<FulfillmentKpiReadModel> GetOrCreateAsync(DateOnly date, CancellationToken cancellationToken);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class FulfillmentKpiRepository(ReportingDbContext dbContext) : IFulfillmentKpiRepository
{
    /// <inheritdoc />
    public Task<FulfillmentKpiReadModel?> GetAsync(DateOnly date, CancellationToken cancellationToken) =>
        dbContext.FulfillmentKpis.SingleOrDefaultAsync(x => x.Date == date, cancellationToken);

    /// <inheritdoc />
    public Task<List<FulfillmentKpiReadModel>> GetRangeAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken) =>
        dbContext.FulfillmentKpis
            .Where(x => x.Date >= from && x.Date <= to)
            .OrderBy(x => x.Date)
            .ToListAsync(cancellationToken);

    /// <inheritdoc />
    public async Task<FulfillmentKpiReadModel> GetOrCreateAsync(DateOnly date, CancellationToken cancellationToken)
    {
        var model = await GetAsync(date, cancellationToken);
        if (model is not null)
        {
            return model;
        }

        model = new FulfillmentKpiReadModel { Date = date };
        dbContext.FulfillmentKpis.Add(model);
        return model;
    }

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
