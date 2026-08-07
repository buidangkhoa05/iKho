namespace Ikho.Warehouse.Partner.Shared;

/// <summary>
/// Response DTO for a partner address. Shared by the Suppliers and Customers features since
/// <see cref="Domain.Address"/> is itself a shared domain entity referenced by nullable FK from
/// either <see cref="Domain.Supplier"/> or <see cref="Domain.Customer"/> (never both) — see the
/// remarks on <see cref="Domain.Address"/>.
/// </summary>
public sealed record AddressResponse(
    Guid Id, string Line1, string Line2, string City, string State, string PostalCode, string Country, bool IsPrimary)
{
    /// <summary>Projects a <see cref="Domain.Address"/> entity to its response DTO.</summary>
    public static AddressResponse FromEntity(Domain.Address address) =>
        new(address.Id, address.Line1, address.Line2, address.City, address.State,
            address.PostalCode, address.Country, address.IsPrimary);
}

/// <summary>
/// Response DTO for a partner contact. Shared by the Suppliers and Customers features since
/// <see cref="Domain.Contact"/> is itself a shared domain entity referenced by nullable FK from
/// either <see cref="Domain.Supplier"/> or <see cref="Domain.Customer"/> (never both) — see the
/// remarks on <see cref="Domain.Contact"/>.
/// </summary>
public sealed record ContactResponse(Guid Id, string Name, string Email, string Phone, bool IsPrimary)
{
    /// <summary>Projects a <see cref="Domain.Contact"/> entity to its response DTO.</summary>
    public static ContactResponse FromEntity(Domain.Contact contact) =>
        new(contact.Id, contact.Name, contact.Email, contact.Phone, contact.IsPrimary);
}
