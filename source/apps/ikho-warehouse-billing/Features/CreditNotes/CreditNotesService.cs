using System.Globalization;
using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseBilling.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseBilling.Domain;
using Ikho.WarehouseBilling.Shared.Clients;

namespace Ikho.WarehouseBilling.Features.CreditNotes;

/// <summary>Distinguishes why a credit-note-issuance attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum CreateCreditNoteOutcome
{
    /// <summary>The credit note was issued successfully.</summary>
    Created,

    /// <summary>The request failed local validation (no lines, a non-positive quantity, or a negative unit price).</summary>
    ValidationFailed,

    /// <summary>The referenced customer does not exist in Partner, or is inactive.</summary>
    CustomerNotFound,

    /// <summary>A referenced product does not exist in Catalog, or is inactive.</summary>
    ProductNotFound,
}

/// <summary>
/// Business logic for issuing and querying credit notes. Validates the customer (Partner) and
/// every credited product (Catalog) before issuing the credit note, snapshotting
/// business-readable fields onto its lines, mirroring <c>InvoicesService</c>.
/// </summary>
public sealed class CreditNotesService(
    ICreditNotesRepository repository, IPartnerApiClient partnerClient, ICatalogApiClient catalogClient, IOutboxWriter outbox)
{
    /// <summary>Issues a new credit note after validating its customer and every credited product.</summary>
    public async Task<(CreateCreditNoteOutcome Outcome, CreditNoteResponse? CreditNote, string? Error)> CreateAsync(
        CreateCreditNoteRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (request.Lines.Count == 0)
        {
            return (CreateCreditNoteOutcome.ValidationFailed, null, "At least one line is required.");
        }

        if (request.Lines.Any(line => line.Quantity <= 0))
        {
            return (CreateCreditNoteOutcome.ValidationFailed, null, "Quantity must be greater than zero for every line.");
        }

        if (request.Lines.Any(line => line.UnitPrice < 0))
        {
            return (CreateCreditNoteOutcome.ValidationFailed, null, "Unit price must not be negative for any line.");
        }

        var customer = await partnerClient.GetCustomerAsync(request.CustomerId, cancellationToken);
        if (customer is null || !customer.IsActive)
        {
            return (CreateCreditNoteOutcome.CustomerNotFound, null, $"Customer '{request.CustomerId}' was not found or is inactive.");
        }

        var creditNote = new CreditNote
        {
            CustomerId = customer.Id,
            SourceReferenceType = request.SourceReferenceType,
            SourceReferenceId = request.SourceReferenceId,
        };

        foreach (var line in request.Lines)
        {
            var product = await catalogClient.GetProductAsync(line.ProductId, cancellationToken);
            if (product is null || !product.IsActive)
            {
                return (CreateCreditNoteOutcome.ProductNotFound, null, $"Product '{line.ProductId}' was not found or is inactive.");
            }

            var lineTotal = line.Quantity * line.UnitPrice;
            creditNote.Lines.Add(new CreditNoteLine
            {
                CreditNoteId = creditNote.Id,
                ProductId = product.Id,
                ProductCodeSnapshot = product.Sku,
                ProductNameSnapshot = product.Name,
                Quantity = line.Quantity,
                UnitPrice = line.UnitPrice,
                LineTotal = lineTotal,
            });
        }

        creditNote.TotalAmount = creditNote.Lines.Sum(l => l.LineTotal);

        repository.Add(creditNote);

        var creditNoteIssued = new CreditNoteIssued
        {
            eventId = Guid.NewGuid().ToString(),
            creditNoteId = creditNote.Id.ToString(),
            customerId = creditNote.CustomerId.ToString(),
            sourceReferenceType = creditNote.SourceReferenceType ?? string.Empty,
            sourceReferenceId = creditNote.SourceReferenceId ?? string.Empty,
            totalAmount = creditNote.TotalAmount.ToString(CultureInfo.InvariantCulture),
            status = creditNote.Status.ToString(),
            issuedOn = creditNote.IssuedOnUtc.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(CreditNoteIssued), JsonSerializer.Serialize(creditNoteIssued), correlationId));

        await repository.SaveChangesAsync(cancellationToken);

        return (CreateCreditNoteOutcome.Created, CreditNoteResponse.FromEntity(creditNote), null);
    }

    /// <summary>Returns a single credit note with its lines, or <see langword="null"/> if not found.</summary>
    public async Task<CreditNoteResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var creditNote = await repository.GetByIdAsync(id, cancellationToken);
        return creditNote is null ? null : CreditNoteResponse.FromEntity(creditNote);
    }

    /// <summary>Returns every credit note with its lines, ordered by issuance time descending.</summary>
    public async Task<List<CreditNoteResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var creditNotes = await repository.GetAllAsync(cancellationToken);
        return creditNotes.ConvertAll(CreditNoteResponse.FromEntity);
    }
}
