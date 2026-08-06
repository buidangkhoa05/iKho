using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseBilling.Domain;
using Ikho.WarehouseBilling.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseBilling.Features.Payments;

/// <summary>Data access for the Payments feature: invoices (for validation/mutation) and payments.</summary>
public interface IPaymentsRepository
{
    /// <summary>Fetches an invoice by id, tracked for mutation (updating its status), or <see langword="null"/> if not found.</summary>
    Task<Invoice?> GetInvoiceByIdAsync(Guid invoiceId, CancellationToken cancellationToken);

    /// <summary>Sums the amount of every <see cref="PaymentStatus.Recorded"/> payment against an invoice.</summary>
    Task<decimal> GetRecordedAmountAsync(Guid invoiceId, CancellationToken cancellationToken);

    /// <summary>Fetches every payment recorded against an invoice, ordered by payment time descending.</summary>
    Task<List<Payment>> GetByInvoiceIdAsync(Guid invoiceId, CancellationToken cancellationToken);

    /// <summary>Tracks a new payment for insertion.</summary>
    void Add(Payment payment);

    /// <summary>
    /// Tracks a new outbox message for insertion so it commits atomically with the business
    /// write on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(OutboxMessage message);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class PaymentsRepository(BillingDbContext dbContext) : IPaymentsRepository
{
    /// <inheritdoc />
    public Task<Invoice?> GetInvoiceByIdAsync(Guid invoiceId, CancellationToken cancellationToken) =>
        dbContext.Invoices.SingleOrDefaultAsync(x => x.Id == invoiceId, cancellationToken);

    /// <inheritdoc />
    public async Task<decimal> GetRecordedAmountAsync(Guid invoiceId, CancellationToken cancellationToken)
    {
        var sum = await dbContext.Payments
            .Where(x => x.InvoiceId == invoiceId && x.Status == PaymentStatus.Recorded)
            .SumAsync(x => (decimal?)x.Amount, cancellationToken);

        return sum ?? 0m;
    }

    /// <inheritdoc />
    public Task<List<Payment>> GetByInvoiceIdAsync(Guid invoiceId, CancellationToken cancellationToken) =>
        dbContext.Payments.Where(x => x.InvoiceId == invoiceId).OrderByDescending(x => x.PaidOnUtc).ToListAsync(cancellationToken);

    /// <inheritdoc />
    public void Add(Payment payment) => dbContext.Payments.Add(payment);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);
}
