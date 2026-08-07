using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehousePartner.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Partner.Domain;
using Ikho.Warehouse.Partner.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Partner.Features.Suppliers;

/// <summary>Distinguishes why a supplier creation attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum CreateSupplierOutcome
{
    /// <summary>The supplier was created successfully.</summary>
    Created,

    /// <summary>The request failed local validation (a blank code, name, or tax id).</summary>
    ValidationFailed,

    /// <summary><c>Code</c> is already in use.</summary>
    CodeAlreadyExists,
}

/// <summary>Distinguishes why a supplier update attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum UpdateSupplierOutcome
{
    /// <summary>The supplier was updated successfully.</summary>
    Updated,

    /// <summary>The supplier does not exist.</summary>
    NotFound,

    /// <summary>The request failed local validation (a blank name or tax id).</summary>
    ValidationFailed,
}

/// <summary>
/// Business logic for creating, updating, and reading suppliers, and managing their addresses
/// and contacts. Publishes <c>SupplierCreated</c> on creation, <c>SupplierUpdated</c> on detail
/// changes, and <c>PartnerStatusChanged</c> on activation toggles, all via the transactional
/// outbox.
/// </summary>
public sealed class SuppliersService(ISupplierRepository repository, IOutboxWriter outbox)
{
    /// <summary>Attempts to create a new supplier. See <see cref="CreateSupplierOutcome"/> for the possible failure reasons.</summary>
    public async Task<(CreateSupplierOutcome Outcome, SupplierResponse? Supplier)> CreateAsync(
        CreateSupplierRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.TaxId))
        {
            return (CreateSupplierOutcome.ValidationFailed, null);
        }

        if (await repository.CodeExistsAsync(request.Code, cancellationToken))
        {
            return (CreateSupplierOutcome.CodeAlreadyExists, null);
        }

        var supplier = new Supplier
        {
            Code = request.Code,
            Name = request.Name,
            TaxId = request.TaxId,
        };

        repository.Add(supplier);

        var @event = new SupplierCreated
        {
            eventId = Guid.NewGuid().ToString(),
            supplierId = supplier.Id.ToString(),
            code = supplier.Code,
            name = supplier.Name,
            createdOn = supplier.CreatedOnUtc.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(SupplierCreated), JsonSerializer.Serialize(@event), correlationId));

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Unique index on Code caught a concurrent create — treat same as upfront check.
            return (CreateSupplierOutcome.CodeAlreadyExists, null);
        }

        return (CreateSupplierOutcome.Created, SupplierResponse.FromEntity(supplier));
    }

    /// <summary>
    /// Attempts to update an existing supplier's details, publishing <c>SupplierUpdated</c> only
    /// when a field actually changes. See <see cref="UpdateSupplierOutcome"/> for the possible
    /// failure reasons.
    /// </summary>
    public async Task<(UpdateSupplierOutcome Outcome, SupplierResponse? Supplier)> UpdateAsync(
        Guid id, UpdateSupplierRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.TaxId))
        {
            return (UpdateSupplierOutcome.ValidationFailed, null);
        }

        var supplier = await repository.GetByIdAsync(id, cancellationToken);
        if (supplier is null)
        {
            return (UpdateSupplierOutcome.NotFound, null);
        }

        if (supplier.Name != request.Name || supplier.TaxId != request.TaxId)
        {
            supplier.Name = request.Name;
            supplier.TaxId = request.TaxId;

            var @event = new SupplierUpdated
            {
                eventId = Guid.NewGuid().ToString(),
                supplierId = supplier.Id.ToString(),
                code = supplier.Code,
                name = supplier.Name,
                updatedOn = DateTimeOffset.UtcNow.ToString("O"),
            };
            repository.Add(outbox.Enqueue(nameof(SupplierUpdated), JsonSerializer.Serialize(@event), correlationId));

            await repository.SaveChangesAsync(cancellationToken);
        }

        return (UpdateSupplierOutcome.Updated, SupplierResponse.FromEntity(supplier));
    }

    /// <summary>
    /// Activates or deactivates a supplier, publishing <c>PartnerStatusChanged</c> only when the
    /// status actually changes. Returns <see langword="null"/> if not found.
    /// </summary>
    public async Task<SupplierResponse?> SetStatusAsync(
        Guid id, SetSupplierStatusRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        var supplier = await repository.GetByIdAsync(id, cancellationToken);
        if (supplier is null)
        {
            return null;
        }

        if (supplier.IsActive != request.IsActive)
        {
            supplier.IsActive = request.IsActive;

            var @event = new PartnerStatusChanged
            {
                eventId = Guid.NewGuid().ToString(),
                partnerType = "Supplier",
                partnerId = supplier.Id.ToString(),
                isActive = supplier.IsActive,
                changedOn = DateTimeOffset.UtcNow.ToString("O"),
            };
            repository.Add(outbox.Enqueue(nameof(PartnerStatusChanged), JsonSerializer.Serialize(@event), correlationId));

            await repository.SaveChangesAsync(cancellationToken);
        }

        return SupplierResponse.FromEntity(supplier);
    }

    /// <summary>Returns a single supplier with its addresses and contacts, or <see langword="null"/> if not found.</summary>
    public async Task<SupplierResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var supplier = await repository.GetByIdAsync(id, cancellationToken);
        return supplier is null ? null : SupplierResponse.FromEntity(supplier);
    }

    /// <summary>Returns a single supplier looked up by code, or <see langword="null"/> if not found.</summary>
    public async Task<SupplierResponse?> GetByCodeAsync(string code, CancellationToken cancellationToken)
    {
        var supplier = await repository.GetByCodeAsync(code, cancellationToken);
        return supplier is null ? null : SupplierResponse.FromEntity(supplier);
    }

    /// <summary>Returns all suppliers ordered by code.</summary>
    public async Task<List<SupplierResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var suppliers = await repository.GetAllAsync(cancellationToken);
        return suppliers.ConvertAll(SupplierResponse.FromEntity);
    }

    /// <summary>Adds an address to a supplier. Returns <see langword="null"/> if the supplier does not exist.</summary>
    public async Task<AddressResponse?> AddAddressAsync(
        Guid supplierId, AddSupplierAddressRequest request, CancellationToken cancellationToken)
    {
        var supplier = await repository.GetByIdAsync(supplierId, cancellationToken);
        if (supplier is null)
        {
            return null;
        }

        if (request.IsPrimary)
        {
            // Only one address per supplier may be primary — demote any existing one before
            // adding the new primary address.
            foreach (var existing in supplier.Addresses.Where(a => a.IsPrimary))
            {
                existing.IsPrimary = false;
            }
        }

        var address = new Address
        {
            SupplierId = supplierId,
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

    /// <summary>Adds a contact to a supplier. Returns <see langword="null"/> if the supplier does not exist.</summary>
    public async Task<ContactResponse?> AddContactAsync(
        Guid supplierId, AddSupplierContactRequest request, CancellationToken cancellationToken)
    {
        var supplier = await repository.GetByIdAsync(supplierId, cancellationToken);
        if (supplier is null)
        {
            return null;
        }

        if (request.IsPrimary)
        {
            // Only one contact per supplier may be primary — demote any existing one before
            // adding the new primary contact.
            foreach (var existing in supplier.Contacts.Where(c => c.IsPrimary))
            {
                existing.IsPrimary = false;
            }
        }

        var contact = new Contact
        {
            SupplierId = supplierId,
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
