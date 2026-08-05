using Ikho.SharedLibrary.Idempotency;
using Ikho.SharedLibrary.Outbox;
using Ikho.WarehousePartner.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehousePartner.Shared;

/// <summary>
/// EF Core database context for the Partner service. Implements
/// <see cref="IHasOutboxMessages"/> and <see cref="IHasProcessedMessages"/> so
/// <c>Ikho.SharedLibrary</c>'s outbox publisher and idempotency store can operate against this
/// database without depending on this concrete type.
/// </summary>
public sealed class PartnerDbContext(DbContextOptions<PartnerDbContext> options)
    : DbContext(options), IHasOutboxMessages, IHasProcessedMessages
{
    /// <summary>Suppliers — vendors that ship goods to the warehouse.</summary>
    public DbSet<Supplier> Suppliers => Set<Supplier>();

    /// <summary>Customers — parties that receive goods from the warehouse.</summary>
    public DbSet<Customer> Customers => Set<Customer>();

    /// <summary>Addresses belonging to a supplier or customer.</summary>
    public DbSet<Address> Addresses => Set<Address>();

    /// <summary>Contacts belonging to a supplier or customer.</summary>
    public DbSet<Contact> Contacts => Set<Contact>();

    /// <inheritdoc />
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    /// <inheritdoc />
    public DbSet<ProcessedMessage> ProcessedMessages => Set<ProcessedMessage>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new OutboxEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new ProcessedMessageEntityTypeConfiguration());

        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Code).IsRequired().HasMaxLength(32);
            entity.Property(s => s.Name).IsRequired().HasMaxLength(256);
            entity.HasIndex(s => s.Code).IsUnique();
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Code).IsRequired().HasMaxLength(32);
            entity.Property(c => c.Name).IsRequired().HasMaxLength(256);
            entity.HasIndex(c => c.Code).IsUnique();
        });

        modelBuilder.Entity<Address>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.HasOne<Supplier>()
                  .WithMany(s => s.Addresses)
                  .HasForeignKey(a => a.SupplierId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Customer>()
                  .WithMany(c => c.Addresses)
                  .HasForeignKey(a => a.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Contact>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.HasOne<Supplier>()
                  .WithMany(s => s.Contacts)
                  .HasForeignKey(c => c.SupplierId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Customer>()
                  .WithMany(c => c.Contacts)
                  .HasForeignKey(c => c.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
