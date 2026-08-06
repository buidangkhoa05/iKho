namespace Ikho.WarehouseBilling.Domain;

/// <summary>Lifecycle status of a <see cref="Payment"/>.</summary>
public enum PaymentStatus
{
    /// <summary>The payment was recorded against its invoice.</summary>
    Recorded,

    /// <summary>The payment was reversed (e.g. a bounced payment or a correction) and no longer counts toward the invoice's paid amount.</summary>
    Reversed,
}

/// <summary>
/// A payment recorded against an <see cref="Invoice"/>. Cumulative <see cref="Recorded"/> payments
/// on an invoice can never exceed its <see cref="Invoice.TotalAmount"/> (enforced by the Payments
/// service).
/// </summary>
public sealed class Payment
{
    /// <summary>Stable identifier for this payment.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK to the <see cref="Invoice"/> this payment was recorded against.</summary>
    public Guid InvoiceId { get; set; }

    /// <summary>Amount paid.</summary>
    public decimal Amount { get; set; }

    /// <summary>When this payment was recorded, in UTC.</summary>
    public DateTimeOffset PaidOnUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Free-text payment method (e.g. <c>"BankTransfer"</c>, <c>"Cash"</c>).</summary>
    public string Method { get; set; } = string.Empty;

    /// <summary>Optional free-text reference note (e.g. a bank transaction id).</summary>
    public string? ReferenceNote { get; set; }

    /// <summary>Current status of this payment.</summary>
    public PaymentStatus Status { get; set; } = PaymentStatus.Recorded;
}
