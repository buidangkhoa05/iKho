namespace Ikho.Warehouse.Partner.Domain;

/// <summary>
/// A postal address belonging to exactly one <see cref="Supplier"/> or <see cref="Customer"/>
/// (never both). Reusable across both partner aggregates so Inbound, Outbound, and Billing can
/// rely on a single address shape regardless of which partner type it belongs to.
/// </summary>
public sealed class Address
{
    /// <summary>Stable identifier.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Owning supplier, when this address belongs to a supplier.</summary>
    public Guid? SupplierId { get; set; }

    /// <summary>Owning customer, when this address belongs to a customer.</summary>
    public Guid? CustomerId { get; set; }

    /// <summary>First address line.</summary>
    public string Line1 { get; set; } = string.Empty;

    /// <summary>Optional second address line.</summary>
    public string Line2 { get; set; } = string.Empty;

    /// <summary>City.</summary>
    public string City { get; set; } = string.Empty;

    /// <summary>State or province.</summary>
    public string State { get; set; } = string.Empty;

    /// <summary>Postal or ZIP code.</summary>
    public string PostalCode { get; set; } = string.Empty;

    /// <summary>ISO country code or name.</summary>
    public string Country { get; set; } = string.Empty;

    /// <summary>Whether this is the owning partner's primary address.</summary>
    public bool IsPrimary { get; set; }
}
