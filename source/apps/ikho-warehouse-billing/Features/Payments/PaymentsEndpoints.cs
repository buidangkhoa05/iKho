using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Warehouse.Billing.Features.Payments;

/// <summary>Minimal API endpoint mappings for the Payments feature.</summary>
public static class PaymentsEndpoints
{
    /// <summary>Maps payment recording and query endpoints under <c>/api/warehouse/billing/invoices/{id}/payments</c>.</summary>
    public static IEndpointRouteBuilder MapPaymentsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/billing/invoices/{id:guid}/payments").WithTags("Payments");

        group.MapPost("/", async Task<Results<Created<PaymentResponse>, NotFound<string>, Conflict<string>, BadRequest<string>>> (
            Guid id,
            CreatePaymentRequest request,
            PaymentsService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, payment, error) = await service.RecordAsync(id, request, correlationId, cancellationToken);

            return outcome switch
            {
                RecordPaymentOutcome.ValidationFailed =>
                    TypedResults.BadRequest(error ?? "The payment request is invalid."),
                RecordPaymentOutcome.InvoiceNotFound =>
                    TypedResults.NotFound(error ?? $"Invoice '{id}' was not found."),
                RecordPaymentOutcome.InvoiceVoid =>
                    TypedResults.Conflict(error ?? $"Invoice '{id}' has been voided and cannot accept payments."),
                RecordPaymentOutcome.ExceedsTotalAmount =>
                    TypedResults.Conflict(error ?? "Recording this payment would exceed the invoice's total amount."),
                _ => TypedResults.Created($"/api/warehouse/billing/invoices/{id}/payments/{payment!.Id}", payment),
            };
        });

        group.MapGet("/", async (Guid id, PaymentsService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetByInvoiceIdAsync(id, cancellationToken)));

        return app;
    }
}
