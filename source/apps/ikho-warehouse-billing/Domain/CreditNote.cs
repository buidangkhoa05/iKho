namespace Ikho.Warehouse.Billing.Domain;

/// <summary>Lifecycle status of a <see cref="CreditNote"/>.</summary>
public enum CreditNoteStatus
{
    /// <summary>The credit note has been issued to the customer.</summary>
    Issued,

    /// <summary>The credit note was voided and no longer represents a valid credit.</summary>
    Void,
}

/// <summary>
/// A financial document crediting a customer (e.g. for a return or a billing correction).
/// <see cref="SourceReferenceType"/>/<see cref="SourceReferenceId"/> record the operational fact
/// (e.g. a Returns disposition) this credit note was issued from, supplied directly by the caller
/// rather than derived from a consumed event, mirroring <see cref="Invoice"/>.
/// </summary>
public sealed class CreditNote
{
    /// <summary>Stable identifier for this credit note.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK into the Partner service's Customer aggregate (referenced by id only).</summary>
    public Guid CustomerId { get; set; }

    /// <summary>The kind of operational fact this credit note was issued from (e.g. <c>"ReturnDisposition"</c>), or <see langword="null"/> if issued ad hoc.</summary>
    public string? SourceReferenceType { get; set; }

    /// <summary>The identifier of the operational fact this credit note was issued from, or <see langword="null"/> if issued ad hoc.</summary>
    public string? SourceReferenceId { get; set; }

    /// <summary>Current lifecycle status of this credit note.</summary>
    public CreditNoteStatus Status { get; set; } = CreditNoteStatus.Issued;

    /// <summary>When this credit note was issued, in UTC.</summary>
    public DateTimeOffset IssuedOnUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Total credited amount, computed as the sum of <see cref="CreditNoteLine.LineTotal"/> across <see cref="Lines"/> at creation time.</summary>
    public decimal TotalAmount { get; set; }

    /// <summary>The credited lines making up this credit note.</summary>
    public ICollection<CreditNoteLine> Lines { get; set; } = new List<CreditNoteLine>();
}
