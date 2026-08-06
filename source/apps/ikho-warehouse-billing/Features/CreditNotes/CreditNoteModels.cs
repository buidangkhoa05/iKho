namespace Ikho.WarehouseBilling.Features.CreditNotes;

/// <summary>Request body for a single line on a new credit note.</summary>
public sealed record CreditNoteLineRequest(Guid ProductId, decimal Quantity, decimal UnitPrice);

/// <summary>
/// Request body to issue a new credit note. <c>SourceReferenceType</c>/<c>SourceReferenceId</c>
/// record the operational fact this credit note is issued from (e.g. a Returns disposition id),
/// supplied directly by the caller rather than derived from a consumed event — no Kafka consumer
/// infrastructure exists in this codebase yet.
/// </summary>
public sealed record CreateCreditNoteRequest(
    Guid CustomerId,
    string? SourceReferenceType,
    string? SourceReferenceId,
    List<CreditNoteLineRequest> Lines);

/// <summary>Response DTO for a credit note line.</summary>
public sealed record CreditNoteLineResponse(
    Guid Id, Guid ProductId, string ProductCodeSnapshot, string ProductNameSnapshot, decimal Quantity, decimal UnitPrice, decimal LineTotal)
{
    /// <summary>Projects a <see cref="Domain.CreditNoteLine"/> entity to its response DTO.</summary>
    public static CreditNoteLineResponse FromEntity(Domain.CreditNoteLine line) =>
        new(line.Id, line.ProductId, line.ProductCodeSnapshot, line.ProductNameSnapshot, line.Quantity, line.UnitPrice, line.LineTotal);
}

/// <summary>Response DTO for a credit note, including its lines.</summary>
public sealed record CreditNoteResponse(
    Guid Id,
    Guid CustomerId,
    string? SourceReferenceType,
    string? SourceReferenceId,
    string Status,
    DateTimeOffset IssuedOnUtc,
    decimal TotalAmount,
    IReadOnlyList<CreditNoteLineResponse> Lines)
{
    /// <summary>Projects a <see cref="Domain.CreditNote"/> entity to its response DTO.</summary>
    public static CreditNoteResponse FromEntity(Domain.CreditNote creditNote) =>
        new(creditNote.Id, creditNote.CustomerId, creditNote.SourceReferenceType, creditNote.SourceReferenceId,
            creditNote.Status.ToString(), creditNote.IssuedOnUtc, creditNote.TotalAmount,
            creditNote.Lines.Select(CreditNoteLineResponse.FromEntity).ToList());
}
