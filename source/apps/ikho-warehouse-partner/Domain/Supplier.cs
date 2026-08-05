namespace Ikho.WarehousePartner.Domain;

/// <summary>
/// The supplier aggregate — a vendor that ships goods to the warehouse. Operational services
/// (Inbound, Billing) reference suppliers by <see cref="Id"/> only; they never own or mutate
/// supplier master data.
/// </summary>
public sealed class Supplier
{
    /// <summary>Stable identifier referenced by downstream services.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Short, globally unique business code (e.g. <c>SUP-001</c>).</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Display name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Optional tax identification number.</summary>
    public string TaxId { get; set; } = string.Empty;

    /// <summary>Inactive suppliers reject new inbound activity but retain historical data.</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>When this supplier was created, in UTC.</summary>
    public DateTimeOffset CreatedOnUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Addresses associated with this supplier.</summary>
    public ICollection<Address> Addresses { get; set; } = [];

    /// <summary>Contacts associated with this supplier.</summary>
    public ICollection<Contact> Contacts { get; set; } = [];
}
