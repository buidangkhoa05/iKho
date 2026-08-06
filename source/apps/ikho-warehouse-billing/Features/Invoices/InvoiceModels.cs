namespace Ikho.WarehouseBilling.Features.Invoices;

/// <summary>Request body for a single line on a new invoice.</summary>
public sealed record InvoiceLineRequest(Guid ProductId, decimal Quantity, decimal UnitPrice);

/// <summary>
/// Request body to issue a new invoice. <c>SourceReferenceType</c>/<c>SourceReferenceId</c>
/// record the operational fact this invoice is issued from (e.g. an Outbound shipment id),
/// supplied directly by the caller rather than derived from a consumed event — no Kafka consumer
/// infrastructure exists in this codebase yet.
/// </summary>
public sealed record CreateInvoiceRequest(
    Guid CustomerId,
    Guid WarehouseId,
    string? SourceReferenceType,
    string? SourceReferenceId,
    List<InvoiceLineRequest> Lines);

/// <summary>Response DTO for an invoice line.</summary>
public sealed record InvoiceLineResponse(
    Guid Id, Guid ProductId, string ProductCodeSnapshot, string ProductNameSnapshot, decimal Quantity, decimal UnitPrice, decimal LineTotal)
{
    /// <summary>Projects a <see cref="Domain.InvoiceLine"/> entity to its response DTO.</summary>
    public static InvoiceLineResponse FromEntity(Domain.InvoiceLine line) =>
        new(line.Id, line.ProductId, line.ProductCodeSnapshot, line.ProductNameSnapshot, line.Quantity, line.UnitPrice, line.LineTotal);
}

/// <summary>Response DTO for an invoice, including its lines.</summary>
public sealed record InvoiceResponse(
    Guid Id,
    Guid CustomerId,
    Guid WarehouseId,
    string? SourceReferenceType,
    string? SourceReferenceId,
    string Status,
    DateTimeOffset IssuedOnUtc,
    decimal TotalAmount,
    IReadOnlyList<InvoiceLineResponse> Lines)
{
    /// <summary>Projects a <see cref="Domain.Invoice"/> entity to its response DTO.</summary>
    public static InvoiceResponse FromEntity(Domain.Invoice invoice) =>
        new(invoice.Id, invoice.CustomerId, invoice.WarehouseId, invoice.SourceReferenceType, invoice.SourceReferenceId,
            invoice.Status.ToString(), invoice.IssuedOnUtc, invoice.TotalAmount,
            invoice.Lines.Select(InvoiceLineResponse.FromEntity).ToList());
}
