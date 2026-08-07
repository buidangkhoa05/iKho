namespace Ikho.Warehouse.Billing.Features.Payments;

/// <summary>Request body to record a payment against an invoice.</summary>
public sealed record CreatePaymentRequest(decimal Amount, string Method, string? ReferenceNote);

/// <summary>Response DTO for a payment.</summary>
public sealed record PaymentResponse(
    Guid Id, Guid InvoiceId, decimal Amount, DateTimeOffset PaidOnUtc, string Method, string? ReferenceNote, string Status)
{
    /// <summary>Projects a <see cref="Domain.Payment"/> entity to its response DTO.</summary>
    public static PaymentResponse FromEntity(Domain.Payment payment) =>
        new(payment.Id, payment.InvoiceId, payment.Amount, payment.PaidOnUtc, payment.Method, payment.ReferenceNote, payment.Status.ToString());
}
