using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehousePartner.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.WarehousePartner.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehousePartner.Features.Customers;

/// <summary>
/// Business logic for creating, updating, and reading customers, and managing their addresses
/// and contacts. Publishes <c>CustomerCreated</c> on creation, <c>CustomerUpdated</c> on detail
/// changes, and <c>PartnerStatusChanged</c> on activation toggles, all via the transactional
/// outbox.
/// </summary>
public sealed class CustomersService(ICustomerRepository repository, IOutboxWriter outbox)
{
    /// <summary>Creates a new customer. Returns <see langword="null"/> if the code is already in use.</summary>
    public async Task<CustomerResponse?> CreateAsync(
        CreateCustomerRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (await repository.CodeExistsAsync(request.Code, cancellationToken))
        {
            return null;
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
        outbox.Enqueue(nameof(CustomerCreated), JsonSerializer.Serialize(@event), correlationId);

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Unique index on Code caught a concurrent create — treat same as upfront check.
            return null;
        }

        return CustomerResponse.FromEntity(customer);
    }

    /// <summary>
    /// Updates an existing customer's details, publishing <c>CustomerUpdated</c> only when a
    /// field actually changes. Returns <see langword="null"/> if not found.
    /// </summary>
    public async Task<CustomerResponse?> UpdateAsync(
        Guid id, UpdateCustomerRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        var customer = await repository.GetByIdAsync(id, cancellationToken);
        if (customer is null)
        {
            return null;
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
            outbox.Enqueue(nameof(CustomerUpdated), JsonSerializer.Serialize(@event), correlationId);

            await repository.SaveChangesAsync(cancellationToken);
        }

        return CustomerResponse.FromEntity(customer);
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
            outbox.Enqueue(nameof(PartnerStatusChanged), JsonSerializer.Serialize(@event), correlationId);

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
