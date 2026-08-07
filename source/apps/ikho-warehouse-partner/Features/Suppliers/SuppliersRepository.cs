using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Partner.Domain;
using Ikho.Warehouse.Partner.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Partner.Features.Suppliers;

/// <summary>Data access for <see cref="Supplier"/> and its <see cref="Address"/>/<see cref="Contact"/> children.</summary>
public interface ISupplierRepository
{
    /// <summary>Finds a supplier with its addresses and contacts by id, or <see langword="null"/> if not found.</summary>
    Task<Supplier?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Finds a supplier with its addresses and contacts by code, or <see langword="null"/> if not found.</summary>
    Task<Supplier?> GetByCodeAsync(string code, CancellationToken cancellationToken);

    /// <summary>Returns all suppliers with their addresses and contacts, ordered by code.</summary>
    Task<List<Supplier>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if a supplier with <paramref name="code"/> already exists.</summary>
    Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken);

    /// <summary>Tracks a new supplier for insertion.</summary>
    void Add(Supplier supplier);

    /// <summary>Tracks a new address for insertion.</summary>
    void Add(Address address);

    /// <summary>Tracks a new contact for insertion.</summary>
    void Add(Contact contact);

    /// <summary>
    /// Tracks a new outbox message for insertion so it commits atomically with the business
    /// write on the next <see cref="SaveChangesAsync"/> call.
    /// </summary>
    void Add(OutboxMessage message);

    /// <summary>Persists tracked changes to the database.</summary>
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc />
public sealed class SupplierRepository(PartnerDbContext dbContext) : ISupplierRepository
{
    /// <inheritdoc />
    public Task<Supplier?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Suppliers.Include(s => s.Addresses).Include(s => s.Contacts)
                           .SingleOrDefaultAsync(s => s.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<Supplier?> GetByCodeAsync(string code, CancellationToken cancellationToken) =>
        dbContext.Suppliers.Include(s => s.Addresses).Include(s => s.Contacts)
                           .SingleOrDefaultAsync(s => s.Code == code, cancellationToken);

    /// <inheritdoc />
    public Task<List<Supplier>> GetAllAsync(CancellationToken cancellationToken) =>
        dbContext.Suppliers.Include(s => s.Addresses).Include(s => s.Contacts)
                           .OrderBy(s => s.Code)
                           .ToListAsync(cancellationToken);

    /// <inheritdoc />
    public Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken) =>
        dbContext.Suppliers.AnyAsync(s => s.Code == code, cancellationToken);

    /// <inheritdoc />
    public void Add(Supplier supplier) => dbContext.Suppliers.Add(supplier);

    /// <inheritdoc />
    public void Add(Address address) => dbContext.Addresses.Add(address);

    /// <inheritdoc />
    public void Add(Contact contact) => dbContext.Contacts.Add(contact);

    /// <inheritdoc />
    public void Add(OutboxMessage message) => dbContext.OutboxMessages.Add(message);

    /// <inheritdoc />
    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
