using Ikho.SharedLibrary.Idempotency;
using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Organization.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Organization.Shared;

/// <summary>
/// EF Core database context for the Organization service. Implements
/// <see cref="IHasOutboxMessages"/> and <see cref="IHasProcessedMessages"/> so
/// <c>Ikho.SharedLibrary</c>'s outbox publisher and idempotency store can operate against this
/// database without depending on this concrete type.
/// </summary>
public sealed class OrganizationDbContext(DbContextOptions<OrganizationDbContext> options)
    : DbContext(options), IHasOutboxMessages, IHasProcessedMessages
{
    /// <summary>
    /// Companies at the top of the location hierarchy.
    /// </summary>
    public DbSet<Company> Companies => Set<Company>();

    /// <summary>
    /// Warehouses owned by a company.
    /// </summary>
    public DbSet<Domain.Warehouse> Warehouses => Set<Domain.Warehouse>();

    /// <summary>
    /// Zones owned by a warehouse.
    /// </summary>
    public DbSet<Zone> Zones => Set<Zone>();

    /// <summary>
    /// Aisles owned by a zone.
    /// </summary>
    public DbSet<Aisle> Aisles => Set<Aisle>();

    /// <summary>
    /// Bins owned by an aisle — the leaf storage location.
    /// </summary>
    public DbSet<Bin> Bins => Set<Bin>();

    /// <summary>
    /// Docks owned by a warehouse.
    /// </summary>
    public DbSet<Dock> Docks => Set<Dock>();

    /// <inheritdoc />
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    /// <inheritdoc />
    public DbSet<ProcessedMessage> ProcessedMessages => Set<ProcessedMessage>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new OutboxEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new ProcessedMessageEntityTypeConfiguration());

        modelBuilder.Entity<Company>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Code).IsRequired().HasMaxLength(32);
            entity.Property(c => c.Name).IsRequired().HasMaxLength(256);
            entity.HasIndex(c => c.Code).IsUnique();
            entity.Property(c => c.ExternalOrgId).HasMaxLength(128);
            entity.HasIndex(c => c.ExternalOrgId).IsUnique().HasFilter("\"ExternalOrgId\" IS NOT NULL");
        });

        modelBuilder.Entity<Domain.Warehouse>(entity =>
        {
            entity.HasKey(w => w.Id);
            entity.Property(w => w.Code).IsRequired().HasMaxLength(32);
            entity.Property(w => w.Name).IsRequired().HasMaxLength(256);
            entity.HasIndex(w => new { w.CompanyId, w.Code }).IsUnique();
        });

        modelBuilder.Entity<Zone>(entity =>
        {
            entity.HasKey(z => z.Id);
            entity.Property(z => z.Code).IsRequired().HasMaxLength(32);
            entity.Property(z => z.Name).IsRequired().HasMaxLength(256);
            entity.HasIndex(z => new { z.WarehouseId, z.Code }).IsUnique();
        });

        modelBuilder.Entity<Aisle>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Code).IsRequired().HasMaxLength(32);
            entity.Property(a => a.Name).IsRequired().HasMaxLength(256);
            entity.HasIndex(a => new { a.ZoneId, a.Code }).IsUnique();
        });

        modelBuilder.Entity<Bin>(entity =>
        {
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Code).IsRequired().HasMaxLength(32);
            entity.HasIndex(b => new { b.AisleId, b.Code }).IsUnique();
        });

        modelBuilder.Entity<Dock>(entity =>
        {
            entity.HasKey(d => d.Id);
            entity.Property(d => d.Code).IsRequired().HasMaxLength(32);
            entity.Property(d => d.Name).IsRequired().HasMaxLength(256);
            entity.HasIndex(d => new { d.WarehouseId, d.Code }).IsUnique();
        });
    }
}
