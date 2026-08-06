using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehouseBilling.Features.CreditNotes;

/// <summary>Minimal API endpoint mappings for the CreditNotes feature.</summary>
public static class CreditNotesEndpoints
{
    /// <summary>Maps credit-note issuance and query endpoints under <c>/api/warehouse/billing/credit-notes</c>.</summary>
    public static IEndpointRouteBuilder MapCreditNotesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/billing/credit-notes").WithTags("CreditNotes");

        group.MapPost("/", async Task<Results<Created<CreditNoteResponse>, NotFound<string>, BadRequest<string>>> (
            CreateCreditNoteRequest request,
            CreditNotesService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, creditNote, error) = await service.CreateAsync(request, correlationId, cancellationToken);

            return outcome switch
            {
                CreateCreditNoteOutcome.ValidationFailed =>
                    TypedResults.BadRequest(error ?? "The credit note request is invalid."),
                CreateCreditNoteOutcome.CustomerNotFound =>
                    TypedResults.NotFound(error ?? $"Customer '{request.CustomerId}' was not found or is inactive."),
                CreateCreditNoteOutcome.ProductNotFound =>
                    TypedResults.NotFound(error ?? "One or more credited products were not found or are inactive."),
                _ => TypedResults.Created($"/api/warehouse/billing/credit-notes/{creditNote!.Id}", creditNote),
            };
        });

        group.MapGet("/{id:guid}", async Task<Results<Ok<CreditNoteResponse>, NotFound>> (
            Guid id,
            CreditNotesService service,
            CancellationToken cancellationToken) =>
        {
            var creditNote = await service.GetByIdAsync(id, cancellationToken);
            return creditNote is null ? TypedResults.NotFound() : TypedResults.Ok(creditNote);
        });

        group.MapGet("/", async (CreditNotesService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetAllAsync(cancellationToken)));

        return app;
    }
}
