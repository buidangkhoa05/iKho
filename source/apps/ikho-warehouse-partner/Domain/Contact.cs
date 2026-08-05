namespace Ikho.WarehousePartner.Domain;

/// <summary>
/// A contact person belonging to exactly one <see cref="Supplier"/> or <see cref="Customer"/>
/// (never both). Reusable across both partner aggregates so Inbound, Outbound, and Billing can
/// rely on a single contact shape regardless of which partner type it belongs to.
/// </summary>
public sealed class Contact
{
    /// <summary>Stable identifier.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Owning supplier, when this contact belongs to a supplier.</summary>
    public Guid? SupplierId { get; set; }

    /// <summary>Owning customer, when this contact belongs to a customer.</summary>
    public Guid? CustomerId { get; set; }

    /// <summary>Full name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Email address.</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>Phone number.</summary>
    public string Phone { get; set; } = string.Empty;

    /// <summary>Whether this is the owning partner's primary contact.</summary>
    public bool IsPrimary { get; set; }
}
