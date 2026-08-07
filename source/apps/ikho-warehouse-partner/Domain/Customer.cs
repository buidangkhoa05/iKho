namespace Ikho.Warehouse.Partner.Domain;

/// <summary>
/// The customer aggregate — a party that receives goods from the warehouse. Operational services
/// (Outbound, Billing) reference customers by <see cref="Id"/> only; they never own or mutate
/// customer master data.
/// </summary>
public sealed class Customer
{
    /// <summary>Stable identifier referenced by downstream services.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Short, globally unique business code (e.g. <c>CUS-001</c>).</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Display name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Optional tax identification number.</summary>
    public string TaxId { get; set; } = string.Empty;

    /// <summary>Inactive customers reject new outbound activity but retain historical data.</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>When this customer was created, in UTC.</summary>
    public DateTimeOffset CreatedOnUtc { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Addresses associated with this customer.</summary>
    public ICollection<Address> Addresses { get; set; } = [];

    /// <summary>Contacts associated with this customer.</summary>
    public ICollection<Contact> Contacts { get; set; } = [];
}
