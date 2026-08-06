using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseBilling.Domain;
using Ikho.WarehouseBilling.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseBilling.Features.CreditNotes;

/// <summary>Data access for the CreditNotes feature.</summary>
public interface ICreditNotesRepository
{
    /// <summary>Fetches a credit note with its lines by id, or <see langword="null"/> if not found.</summary>
    Task<CreditNote?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Fetches every credit note with its lines, ordered by issuance time descending.</summary>
    Task<List<CreditNote>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>Tracks a new credit note (and its lines, via the navigation collection) for insertion.</summary>
    void Add(CreditNote creditNote);

    /// <summary>
    /// Tracks a new outbox message for insertion so it commits atomically with the business
    /// write on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(OutboxMessage message);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class CreditNotesRepository(BillingDbContext dbContext) : ICreditNotesRepository
{
    /// <inheritdoc />
    public Task<CreditNote?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.CreditNotes.Include(x => x.Lines).SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<List<CreditNote>> GetAllAsync(CancellationToken cancellationToken) =>
        dbContext.CreditNotes.Include(x => x.Lines).OrderByDescending(x => x.IssuedOnUtc).ToListAsync(cancellationToken);

    /// <inheritdoc />
    public void Add(CreditNote creditNote) => dbContext.CreditNotes.Add(creditNote);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
