using Ikho.Warehouse.Partner.Shared;

namespace Ikho.Warehouse.Partner.Features.Customers;

/// <summary>Request body to create a new customer.</summary>
public sealed record CreateCustomerRequest(string Code, string Name, string TaxId);

/// <summary>Request body to update customer details.</summary>
public sealed record UpdateCustomerRequest(string Name, string TaxId);

/// <summary>Request body to activate or deactivate a customer.</summary>
public sealed record SetCustomerStatusRequest(bool IsActive);

/// <summary>Request body to add an address to a customer.</summary>
public sealed record AddCustomerAddressRequest(
    string Line1, string Line2, string City, string State, string PostalCode, string Country, bool IsPrimary);

/// <summary>Request body to add a contact to a customer.</summary>
public sealed record AddCustomerContactRequest(string Name, string Email, string Phone, bool IsPrimary);

/// <summary>Response DTO for a customer including its addresses and contacts.</summary>
public sealed record CustomerResponse(
    Guid Id,
    string Code,
    string Name,
    string TaxId,
    bool IsActive,
    DateTimeOffset CreatedOnUtc,
    IReadOnlyList<AddressResponse> Addresses,
    IReadOnlyList<ContactResponse> Contacts)
{
    /// <summary>Projects a <see cref="Domain.Customer"/> entity to its response DTO.</summary>
    public static CustomerResponse FromEntity(Domain.Customer customer) =>
        new(customer.Id, customer.Code, customer.Name, customer.TaxId, customer.IsActive,
            customer.CreatedOnUtc,
            customer.Addresses.Select(AddressResponse.FromEntity).ToList(),
            customer.Contacts.Select(ContactResponse.FromEntity).ToList());
}
