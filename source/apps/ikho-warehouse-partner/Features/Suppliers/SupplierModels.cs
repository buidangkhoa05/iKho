namespace Ikho.Warehouse.Partner.Features.Suppliers;

/// <summary>Request body to create a new supplier.</summary>
public sealed record CreateSupplierRequest(string Code, string Name, string TaxId);

/// <summary>Request body to update supplier details.</summary>
public sealed record UpdateSupplierRequest(string Name, string TaxId);

/// <summary>Request body to activate or deactivate a supplier.</summary>
public sealed record SetSupplierStatusRequest(bool IsActive);

/// <summary>Request body to add an address to a supplier.</summary>
public sealed record AddSupplierAddressRequest(
    string Line1, string Line2, string City, string State, string PostalCode, string Country, bool IsPrimary);

/// <summary>Request body to add a contact to a supplier.</summary>
public sealed record AddSupplierContactRequest(string Name, string Email, string Phone, bool IsPrimary);

/// <summary>Response DTO for a supplier address.</summary>
public sealed record AddressResponse(
    Guid Id, string Line1, string Line2, string City, string State, string PostalCode, string Country, bool IsPrimary)
{
    /// <summary>Projects a <see cref="Domain.Address"/> entity to its response DTO.</summary>
    public static AddressResponse FromEntity(Domain.Address address) =>
        new(address.Id, address.Line1, address.Line2, address.City, address.State,
            address.PostalCode, address.Country, address.IsPrimary);
}

/// <summary>Response DTO for a supplier contact.</summary>
public sealed record ContactResponse(Guid Id, string Name, string Email, string Phone, bool IsPrimary)
{
    /// <summary>Projects a <see cref="Domain.Contact"/> entity to its response DTO.</summary>
    public static ContactResponse FromEntity(Domain.Contact contact) =>
        new(contact.Id, contact.Name, contact.Email, contact.Phone, contact.IsPrimary);
}

/// <summary>Response DTO for a supplier including its addresses and contacts.</summary>
public sealed record SupplierResponse(
    Guid Id,
    string Code,
    string Name,
    string TaxId,
    bool IsActive,
    DateTimeOffset CreatedOnUtc,
    IReadOnlyList<AddressResponse> Addresses,
    IReadOnlyList<ContactResponse> Contacts)
{
    /// <summary>Projects a <see cref="Domain.Supplier"/> entity to its response DTO.</summary>
    public static SupplierResponse FromEntity(Domain.Supplier supplier) =>
        new(supplier.Id, supplier.Code, supplier.Name, supplier.TaxId, supplier.IsActive,
            supplier.CreatedOnUtc,
            supplier.Addresses.Select(AddressResponse.FromEntity).ToList(),
            supplier.Contacts.Select(ContactResponse.FromEntity).ToList());
}
