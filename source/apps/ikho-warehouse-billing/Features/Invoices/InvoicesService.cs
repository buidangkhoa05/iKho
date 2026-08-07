using System.Globalization;
using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseBilling.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Billing.Domain;
using Ikho.Warehouse.Billing.Shared.Clients;

namespace Ikho.Warehouse.Billing.Features.Invoices;

/// <summary>Distinguishes why an invoice-issuance attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum CreateInvoiceOutcome
{
    /// <summary>The invoice was issued successfully.</summary>
    Created,

    /// <summary>The request failed local validation (no lines, a non-positive quantity, or a negative unit price).</summary>
    ValidationFailed,

    /// <summary>The referenced customer does not exist in Partner, or is inactive.</summary>
    CustomerNotFound,

    /// <summary>A referenced product does not exist in Catalog, or is inactive.</summary>
    ProductNotFound,
}

/// <summary>
/// Business logic for issuing and querying invoices. Validates the customer (Partner) and every
/// billed product (Catalog) before issuing the invoice, snapshotting business-readable fields
/// onto its lines per the "ID plus snapshot" reference pattern
/// (<c>docs/architecture/warehouse-db-relationships.md</c>). <c>WarehouseId</c> is stored as an
/// opaque reference only — it is not validated against Organization, per the "no cross-database
/// joins" goal for Billing.
/// </summary>
public sealed class InvoicesService(IInvoicesRepository repository, IPartnerApiClient partnerClient, ICatalogApiClient catalogClient, IOutboxWriter outbox)
{
    /// <summary>Issues a new invoice after validating its customer and every billed product.</summary>
    public async Task<(CreateInvoiceOutcome Outcome, InvoiceResponse? Invoice, string? Error)> CreateAsync(
        CreateInvoiceRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (request.Lines.Count == 0)
        {
            return (CreateInvoiceOutcome.ValidationFailed, null, "At least one line is required.");
        }

        if (request.Lines.Any(line => line.Quantity <= 0))
        {
            return (CreateInvoiceOutcome.ValidationFailed, null, "Quantity must be greater than zero for every line.");
        }

        if (request.Lines.Any(line => line.UnitPrice < 0))
        {
            return (CreateInvoiceOutcome.ValidationFailed, null, "Unit price must not be negative for any line.");
        }

        var customer = await partnerClient.GetCustomerAsync(request.CustomerId, cancellationToken);
        if (customer is null || !customer.IsActive)
        {
            return (CreateInvoiceOutcome.CustomerNotFound, null, $"Customer '{request.CustomerId}' was not found or is inactive.");
        }

        var invoice = new Invoice
        {
            CustomerId = customer.Id,
            WarehouseId = request.WarehouseId,
            SourceReferenceType = request.SourceReferenceType,
            SourceReferenceId = request.SourceReferenceId,
        };

        foreach (var line in request.Lines)
        {
            var product = await catalogClient.GetProductAsync(line.ProductId, cancellationToken);
            if (product is null || !product.IsActive)
            {
                return (CreateInvoiceOutcome.ProductNotFound, null, $"Product '{line.ProductId}' was not found or is inactive.");
            }

            var lineTotal = line.Quantity * line.UnitPrice;
            invoice.Lines.Add(new InvoiceLine
            {
                InvoiceId = invoice.Id,
                ProductId = product.Id,
                ProductCodeSnapshot = product.Sku,
                ProductNameSnapshot = product.Name,
                Quantity = line.Quantity,
                UnitPrice = line.UnitPrice,
                LineTotal = lineTotal,
            });
        }

        invoice.TotalAmount = invoice.Lines.Sum(l => l.LineTotal);

        repository.Add(invoice);

        var invoiceIssued = new InvoiceIssued
        {
            eventId = Guid.NewGuid().ToString(),
            invoiceId = invoice.Id.ToString(),
            customerId = invoice.CustomerId.ToString(),
            warehouseId = invoice.WarehouseId.ToString(),
            sourceReferenceType = invoice.SourceReferenceType ?? string.Empty,
            sourceReferenceId = invoice.SourceReferenceId ?? string.Empty,
            totalAmount = invoice.TotalAmount.ToString(CultureInfo.InvariantCulture),
            status = invoice.Status.ToString(),
            issuedOn = invoice.IssuedOnUtc.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(InvoiceIssued), JsonSerializer.Serialize(invoiceIssued), correlationId));

        await repository.SaveChangesAsync(cancellationToken);

        return (CreateInvoiceOutcome.Created, InvoiceResponse.FromEntity(invoice), null);
    }

    /// <summary>Returns a single invoice with its lines, or <see langword="null"/> if not found.</summary>
    public async Task<InvoiceResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var invoice = await repository.GetByIdAsync(id, cancellationToken);
        return invoice is null ? null : InvoiceResponse.FromEntity(invoice);
    }

    /// <summary>Returns every invoice with its lines, ordered by issuance time descending, optionally filtered by source reference id.</summary>
    public async Task<List<InvoiceResponse>> GetAllAsync(string? sourceReferenceId, CancellationToken cancellationToken)
    {
        var invoices = await repository.GetAllAsync(sourceReferenceId, cancellationToken);
        return invoices.ConvertAll(InvoiceResponse.FromEntity);
    }
}
