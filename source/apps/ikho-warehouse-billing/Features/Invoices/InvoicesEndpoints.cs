using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehouseBilling.Features.Invoices;

/// <summary>Minimal API endpoint mappings for the Invoices feature.</summary>
public static class InvoicesEndpoints
{
    /// <summary>Maps invoice issuance and query endpoints under <c>/api/warehouse/billing/invoices</c>.</summary>
    public static IEndpointRouteBuilder MapInvoicesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/billing/invoices").WithTags("Invoices");

        group.MapPost("/", async Task<Results<Created<InvoiceResponse>, NotFound<string>, BadRequest<string>>> (
            CreateInvoiceRequest request,
            InvoicesService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, invoice, error) = await service.CreateAsync(request, correlationId, cancellationToken);

            return outcome switch
            {
                CreateInvoiceOutcome.ValidationFailed =>
                    TypedResults.BadRequest(error ?? "The invoice request is invalid."),
                CreateInvoiceOutcome.CustomerNotFound =>
                    TypedResults.NotFound(error ?? $"Customer '{request.CustomerId}' was not found or is inactive."),
                CreateInvoiceOutcome.ProductNotFound =>
                    TypedResults.NotFound(error ?? "One or more billed products were not found or are inactive."),
                _ => TypedResults.Created($"/api/warehouse/billing/invoices/{invoice!.Id}", invoice),
            };
        });

        group.MapGet("/{id:guid}", async Task<Results<Ok<InvoiceResponse>, NotFound>> (
            Guid id,
            InvoicesService service,
            CancellationToken cancellationToken) =>
        {
            var invoice = await service.GetByIdAsync(id, cancellationToken);
            return invoice is null ? TypedResults.NotFound() : TypedResults.Ok(invoice);
        });

        group.MapGet("/", async (string? sourceReferenceId, InvoicesService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetAllAsync(sourceReferenceId, cancellationToken)));

        return app;
    }
}
