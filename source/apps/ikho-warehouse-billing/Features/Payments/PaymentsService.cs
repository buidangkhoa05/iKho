using System.Globalization;
using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseBilling.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Billing.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Billing.Features.Payments;

/// <summary>Distinguishes why a payment-recording attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum RecordPaymentOutcome
{
    /// <summary>The payment was recorded successfully.</summary>
    Recorded,

    /// <summary>The request failed local validation (a non-positive amount, or a blank method).</summary>
    ValidationFailed,

    /// <summary>The referenced invoice does not exist.</summary>
    InvoiceNotFound,

    /// <summary>The referenced invoice has been voided and can no longer accept payments.</summary>
    InvoiceVoid,

    /// <summary>Recording this payment would push cumulative recorded payments over the invoice's total amount.</summary>
    ExceedsTotalAmount,

    /// <summary>Another request concurrently recorded a payment against the same invoice; retry.</summary>
    ConcurrencyConflict,
}

/// <summary>
/// Business logic for recording and querying payments against invoices. Ensures cumulative
/// <see cref="PaymentStatus.Recorded"/> payments on an invoice never exceed its
/// <see cref="Invoice.TotalAmount"/>, and keeps the invoice's <see cref="InvoiceStatus"/> in sync
/// with how much of it has been paid.
/// </summary>
public sealed class PaymentsService(IPaymentsRepository repository, IOutboxWriter outbox)
{
    /// <summary>Records a new payment against an invoice, updating the invoice's status based on cumulative payments.</summary>
    public async Task<(RecordPaymentOutcome Outcome, PaymentResponse? Payment, string? Error)> RecordAsync(
        Guid invoiceId, CreatePaymentRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0)
        {
            return (RecordPaymentOutcome.ValidationFailed, null, "Amount must be greater than zero.");
        }

        if (string.IsNullOrWhiteSpace(request.Method))
        {
            return (RecordPaymentOutcome.ValidationFailed, null, "Method is required.");
        }

        var invoice = await repository.GetInvoiceByIdAsync(invoiceId, cancellationToken);
        if (invoice is null)
        {
            return (RecordPaymentOutcome.InvoiceNotFound, null, $"Invoice '{invoiceId}' was not found.");
        }

        if (invoice.Status == InvoiceStatus.Void)
        {
            return (RecordPaymentOutcome.InvoiceVoid, null, $"Invoice '{invoiceId}' has been voided and cannot accept payments.");
        }

        var recordedSoFar = await repository.GetRecordedAmountAsync(invoiceId, cancellationToken);
        var cumulative = recordedSoFar + request.Amount;

        if (cumulative > invoice.TotalAmount)
        {
            return (RecordPaymentOutcome.ExceedsTotalAmount, null,
                $"Recording {request.Amount} against invoice '{invoiceId}' would bring cumulative payments to {cumulative}, " +
                $"exceeding its total amount of {invoice.TotalAmount}.");
        }

        var payment = new Payment
        {
            InvoiceId = invoice.Id,
            Amount = request.Amount,
            Method = request.Method,
            ReferenceNote = request.ReferenceNote,
        };

        invoice.Status = cumulative == invoice.TotalAmount ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;

        // Status may end up equal to its prior value (e.g. PartiallyPaid -> PartiallyPaid), which
        // would otherwise leave EF's change tracker treating the invoice as unmodified and skip
        // the concurrency check entirely — see MarkForConcurrencyCheck's remarks.
        repository.MarkForConcurrencyCheck(invoice);

        repository.Add(payment);

        var paymentStatusChanged = new PaymentStatusChanged
        {
            eventId = Guid.NewGuid().ToString(),
            paymentId = payment.Id.ToString(),
            invoiceId = invoice.Id.ToString(),
            amount = payment.Amount.ToString(CultureInfo.InvariantCulture),
            paymentStatus = payment.Status.ToString(),
            invoiceStatus = invoice.Status.ToString(),
            paidOn = payment.PaidOnUtc.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(PaymentStatusChanged), JsonSerializer.Serialize(paymentStatusChanged), correlationId));

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return (RecordPaymentOutcome.ConcurrencyConflict, null,
                $"Invoice '{invoiceId}' was concurrently modified by another payment; retry.");
        }

        return (RecordPaymentOutcome.Recorded, PaymentResponse.FromEntity(payment), null);
    }

    /// <summary>Returns every payment recorded against an invoice, ordered by payment time descending.</summary>
    public async Task<List<PaymentResponse>> GetByInvoiceIdAsync(Guid invoiceId, CancellationToken cancellationToken)
    {
        var payments = await repository.GetByInvoiceIdAsync(invoiceId, cancellationToken);
        return payments.ConvertAll(PaymentResponse.FromEntity);
    }
}
