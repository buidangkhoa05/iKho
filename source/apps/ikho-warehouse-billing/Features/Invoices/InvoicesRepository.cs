using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Billing.Domain;
using Ikho.Warehouse.Billing.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Billing.Features.Invoices;

/// <summary>Data access for the Invoices feature.</summary>
public interface IInvoicesRepository
{
    /// <summary>Fetches an invoice with its lines by id, or <see langword="null"/> if not found.</summary>
    Task<Invoice?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>
    /// Fetches every invoice with its lines, ordered by issuance time descending, optionally
    /// filtered to those issued from a given source reference.
    /// </summary>
    Task<List<Invoice>> GetAllAsync(string? sourceReferenceId, CancellationToken cancellationToken);

    /// <summary>Tracks a new invoice (and its lines, via the navigation collection) for insertion.</summary>
    void Add(Invoice invoice);

    /// <summary>
    /// Tracks a new outbox message for insertion so it commits atomically with the business
    /// write on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(OutboxMessage message);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class InvoicesRepository(BillingDbContext dbContext) : IInvoicesRepository
{
    /// <inheritdoc />
    public Task<Invoice?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Invoices.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<List<Invoice>> GetAllAsync(string? sourceReferenceId, CancellationToken cancellationToken)
    {
        var query = dbContext.Invoices.Include(x => x.Lines).AsQueryable();

        if (!string.IsNullOrWhiteSpace(sourceReferenceId))
        {
            query = query.Where(x => x.SourceReferenceId == sourceReferenceId);
        }

        return query.OrderByDescending(x => x.IssuedOnUtc).ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public void Add(Invoice invoice) => dbContext.Invoices.Add(invoice);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
