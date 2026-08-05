using Ikho.SharedLibrary.Outbox;
using Ikho.WarehousePartner.Domain;
using Ikho.WarehousePartner.Shared;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehousePartner.Features.Customers;

/// <summary>Data access for <see cref="Customer"/> and its <see cref="Address"/>/<see cref="Contact"/> children.</summary>
public interface ICustomerRepository
{
    /// <summary>Finds a customer with its addresses and contacts by id, or <see langword="null"/> if not found.</summary>
    Task<Customer?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Finds a customer with its addresses and contacts by code, or <see langword="null"/> if not found.</summary>
    Task<Customer?> GetByCodeAsync(string code, CancellationToken cancellationToken);

    /// <summary>Returns all customers with their addresses and contacts, ordered by code.</summary>
    Task<List<Customer>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if a customer with <paramref name="code"/> already exists.</summary>
    Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken);

    /// <summary>Tracks a new customer for insertion.</summary>
    void Add(Customer customer);

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
public sealed class CustomerRepository(PartnerDbContext dbContext) : ICustomerRepository
{
    /// <inheritdoc />
    public Task<Customer?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Customers.Include(c => c.Addresses).Include(c => c.Contacts)
                           .SingleOrDefaultAsync(c => c.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<Customer?> GetByCodeAsync(string code, CancellationToken cancellationToken) =>
        dbContext.Customers.Include(c => c.Addresses).Include(c => c.Contacts)
                           .SingleOrDefaultAsync(c => c.Code == code, cancellationToken);

    /// <inheritdoc />
    public Task<List<Customer>> GetAllAsync(CancellationToken cancellationToken) =>
        dbContext.Customers.Include(c => c.Addresses).Include(c => c.Contacts)
                           .OrderBy(c => c.Code)
                           .ToListAsync(cancellationToken);

    /// <inheritdoc />
    public Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken) =>
        dbContext.Customers.AnyAsync(c => c.Code == code, cancellationToken);

    /// <inheritdoc />
    public void Add(Customer customer) => dbContext.Customers.Add(customer);

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
