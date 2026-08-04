using Ikho.SharedLibrary.Idempotency;
using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseCatalog.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseCatalog.Shared;

/// <summary>
/// EF Core database context for the Catalog service. Implements
/// <see cref="IHasOutboxMessages"/> and <see cref="IHasProcessedMessages"/> so
/// <c>Ikho.SharedLibrary</c>'s outbox publisher and idempotency store can operate against this
/// database without depending on this concrete type.
/// </summary>
public sealed class CatalogDbContext(DbContextOptions<CatalogDbContext> options)
    : DbContext(options), IHasOutboxMessages, IHasProcessedMessages
{
    /// <summary>Products — the central catalog aggregate.</summary>
    public DbSet<Product> Products => Set<Product>();

    /// <summary>Product classification categories.</summary>
    public DbSet<Category> Categories => Set<Category>();

    /// <summary>Product brands.</summary>
    public DbSet<Brand> Brands => Set<Brand>();

    /// <summary>Units of measure for stock quantities.</summary>
    public DbSet<UnitOfMeasure> UnitsOfMeasure => Set<UnitOfMeasure>();

    /// <summary>Scannable barcodes that resolve to a product.</summary>
    public DbSet<Barcode> Barcodes => Set<Barcode>();

    /// <inheritdoc />
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    /// <inheritdoc />
    public DbSet<ProcessedMessage> ProcessedMessages => Set<ProcessedMessage>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new OutboxEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new ProcessedMessageEntityTypeConfiguration());

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => p.Sku).IsUnique();
            entity.HasMany(p => p.Barcodes)
                  .WithOne()
                  .HasForeignKey(b => b.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.HasIndex(c => c.Code).IsUnique();
        });

        modelBuilder.Entity<Brand>(entity =>
        {
            entity.HasKey(b => b.Id);
            entity.HasIndex(b => b.Code).IsUnique();
        });

        modelBuilder.Entity<UnitOfMeasure>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Code).IsUnique();
        });

        modelBuilder.Entity<Barcode>(entity =>
        {
            entity.HasKey(b => b.Id);
            entity.HasIndex(b => b.Code).IsUnique();
        });
    }
}
