using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehousePartner.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Partner.Domain;
using Ikho.Warehouse.Partner.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Partner.Features.Customers;

/// <summary>Distinguishes why a customer creation attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum CreateCustomerOutcome
{
    /// <summary>The customer was created successfully.</summary>
    Created,

    /// <summary>The request failed local validation (a blank code, name, or tax id).</summary>
    ValidationFailed,

    /// <summary><c>Code</c> is already in use.</summary>
    CodeAlreadyExists,
}

/// <summary>Distinguishes why a customer update attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum UpdateCustomerOutcome
{
    /// <summary>The customer was updated successfully.</summary>
    Updated,

    /// <summary>The customer does not exist.</summary>
    NotFound,

    /// <summary>The request failed local validation (a blank name or tax id).</summary>
    ValidationFailed,
}

/// <summary>
/// Business logic for creating, updating, and reading customers, and managing their addresses
/// and contacts. Publishes <c>CustomerCreated</c> on creation, <c>CustomerUpdated</c> on detail
/// changes, and <c>PartnerStatusChanged</c> on activation toggles, all via the transactional
/// outbox.
/// </summary>
public sealed class CustomersService(ICustomerRepository repository, IOutboxWriter outbox)
{
    /// <summary>Attempts to create a new customer. See <see cref="CreateCustomerOutcome"/> for the possible failure reasons.</summary>
    public async Task<(CreateCustomerOutcome Outcome, CustomerResponse? Customer)> CreateAsync(
        CreateCustomerRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.TaxId))
        {
            return (CreateCustomerOutcome.ValidationFailed, null);
        }

        if (await repository.CodeExistsAsync(request.Code, cancellationToken))
        {
            return (CreateCustomerOutcome.CodeAlreadyExists, null);
        }

        var customer = new Customer
        {
            Code = request.Code,
            Name = request.Name,
            TaxId = request.TaxId,
        };

        repository.Add(customer);

        var @event = new CustomerCreated
        {
            eventId = Guid.NewGuid().ToString(),
            customerId = customer.Id.ToString(),
            code = customer.Code,
            name = customer.Name,
            createdOn = customer.CreatedOnUtc.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(CustomerCreated), JsonSerializer.Serialize(@event), correlationId));

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Unique index on Code caught a concurrent create — treat same as upfront check.
            return (CreateCustomerOutcome.CodeAlreadyExists, null);
        }

        return (CreateCustomerOutcome.Created, CustomerResponse.FromEntity(customer));
    }

    /// <summary>
    /// Attempts to update an existing customer's details, publishing <c>CustomerUpdated</c> only
    /// when a field actually changes. See <see cref="UpdateCustomerOutcome"/> for the possible
    /// failure reasons.
    /// </summary>
    public async Task<(UpdateCustomerOutcome Outcome, CustomerResponse? Customer)> UpdateAsync(
        Guid id, UpdateCustomerRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.TaxId))
        {
            return (UpdateCustomerOutcome.ValidationFailed, null);
        }

        var customer = await repository.GetByIdAsync(id, cancellationToken);
        if (customer is null)
        {
            return (UpdateCustomerOutcome.NotFound, null);
        }

        if (customer.Name != request.Name || customer.TaxId != request.TaxId)
        {
            customer.Name = request.Name;
            customer.TaxId = request.TaxId;

            var @event = new CustomerUpdated
            {
                eventId = Guid.NewGuid().ToString(),
                customerId = customer.Id.ToString(),
                code = customer.Code,
                name = customer.Name,
                updatedOn = DateTimeOffset.UtcNow.ToString("O"),
            };
            repository.Add(outbox.Enqueue(nameof(CustomerUpdated), JsonSerializer.Serialize(@event), correlationId));

            await repository.SaveChangesAsync(cancellationToken);
        }

        return (UpdateCustomerOutcome.Updated, CustomerResponse.FromEntity(customer));
    }

    /// <summary>
    /// Activates or deactivates a customer, publishing <c>PartnerStatusChanged</c> only when the
    /// status actually changes. Returns <see langword="null"/> if not found.
    /// </summary>
    public async Task<CustomerResponse?> SetStatusAsync(
        Guid id, SetCustomerStatusRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        var customer = await repository.GetByIdAsync(id, cancellationToken);
        if (customer is null)
        {
            return null;
        }

        if (customer.IsActive != request.IsActive)
        {
            customer.IsActive = request.IsActive;

            var @event = new PartnerStatusChanged
            {
                eventId = Guid.NewGuid().ToString(),
                partnerType = "Customer",
                partnerId = customer.Id.ToString(),
                isActive = customer.IsActive,
                changedOn = DateTimeOffset.UtcNow.ToString("O"),
            };
            repository.Add(outbox.Enqueue(nameof(PartnerStatusChanged), JsonSerializer.Serialize(@event), correlationId));

            await repository.SaveChangesAsync(cancellationToken);
        }

        return CustomerResponse.FromEntity(customer);
    }

    /// <summary>Returns a single customer with its addresses and contacts, or <see langword="null"/> if not found.</summary>
    public async Task<CustomerResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var customer = await repository.GetByIdAsync(id, cancellationToken);
        return customer is null ? null : CustomerResponse.FromEntity(customer);
    }

    /// <summary>Returns a single customer looked up by code, or <see langword="null"/> if not found.</summary>
    public async Task<CustomerResponse?> GetByCodeAsync(string code, CancellationToken cancellationToken)
    {
        var customer = await repository.GetByCodeAsync(code, cancellationToken);
        return customer is null ? null : CustomerResponse.FromEntity(customer);
    }

    /// <summary>Returns all customers ordered by code.</summary>
    public async Task<List<CustomerResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var customers = await repository.GetAllAsync(cancellationToken);
        return customers.ConvertAll(CustomerResponse.FromEntity);
    }

    /// <summary>Adds an address to a customer. Returns <see langword="null"/> if the customer does not exist.</summary>
    public async Task<AddressResponse?> AddAddressAsync(
        Guid customerId, AddCustomerAddressRequest request, CancellationToken cancellationToken)
    {
        var customer = await repository.GetByIdAsync(customerId, cancellationToken);
        if (customer is null)
        {
            return null;
        }

        if (request.IsPrimary)
        {
            // Only one address per customer may be primary — demote any existing one before
            // adding the new primary address.
            foreach (var existing in customer.Addresses.Where(a => a.IsPrimary))
            {
                existing.IsPrimary = false;
            }
        }

        var address = new Address
        {
            CustomerId = customerId,
            Line1 = request.Line1,
            Line2 = request.Line2,
            City = request.City,
            State = request.State,
            PostalCode = request.PostalCode,
            Country = request.Country,
            IsPrimary = request.IsPrimary,
        };
        repository.Add(address);
        await repository.SaveChangesAsync(cancellationToken);

        return AddressResponse.FromEntity(address);
    }

    /// <summary>Adds a contact to a customer. Returns <see langword="null"/> if the customer does not exist.</summary>
    public async Task<ContactResponse?> AddContactAsync(
        Guid customerId, AddCustomerContactRequest request, CancellationToken cancellationToken)
    {
        var customer = await repository.GetByIdAsync(customerId, cancellationToken);
        if (customer is null)
        {
            return null;
        }

        if (request.IsPrimary)
        {
            // Only one contact per customer may be primary — demote any existing one before
            // adding the new primary contact.
            foreach (var existing in customer.Contacts.Where(c => c.IsPrimary))
            {
                existing.IsPrimary = false;
            }
        }

        var contact = new Contact
        {
            CustomerId = customerId,
            Name = request.Name,
            Email = request.Email,
            Phone = request.Phone,
            IsPrimary = request.IsPrimary,
        };
        repository.Add(contact);
        await repository.SaveChangesAsync(cancellationToken);

        return ContactResponse.FromEntity(contact);
    }
}
