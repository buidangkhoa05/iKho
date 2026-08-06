using Ikho.SharedLibrary.Idempotency;
using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseReturns.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseReturns.Shared;

/// <summary>
/// EF Core database context for the Returns service. Implements
/// <see cref="IHasOutboxMessages"/> and <see cref="IHasProcessedMessages"/> so
/// <c>Ikho.SharedLibrary</c>'s outbox publisher and idempotency store can operate against this
/// database without depending on this concrete type.
/// </summary>
public sealed class ReturnsDbContext(DbContextOptions<ReturnsDbContext> options)
    : DbContext(options), IHasOutboxMessages, IHasProcessedMessages
{
    /// <summary>Reverse-logistics orders tracking goods coming back from customers or going back to suppliers.</summary>
    public DbSet<ReturnOrder> ReturnOrders => Set<ReturnOrder>();

    /// <summary>Returned lines belonging to return orders.</summary>
    public DbSet<ReturnOrderLine> ReturnOrderLines => Set<ReturnOrderLine>();

    /// <summary>Records of physical arrival of a return order's goods.</summary>
    public DbSet<ReturnReceipt> ReturnReceipts => Set<ReturnReceipt>();

    /// <summary>Inspection outcomes recorded against return order lines.</summary>
    public DbSet<Inspection> Inspections => Set<Inspection>();

    /// <summary>Disposition outcomes recorded against return order lines.</summary>
    public DbSet<Disposition> Dispositions => Set<Disposition>();

    /// <inheritdoc />
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    /// <inheritdoc />
    public DbSet<ProcessedMessage> ProcessedMessages => Set<ProcessedMessage>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new OutboxEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new ProcessedMessageEntityTypeConfiguration());

        modelBuilder.Entity<ReturnOrder>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Type).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.SourceReferenceType).HasMaxLength(64);
            entity.Property(x => x.SourceReferenceId).HasMaxLength(64);
            entity.HasIndex(x => new { x.SourceReferenceType, x.SourceReferenceId });

            entity.HasMany(x => x.Lines)
                .WithOne()
                .HasForeignKey(x => x.ReturnOrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReturnOrderLine>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Quantity).HasPrecision(18, 4);
            entity.Property(x => x.ReasonCode).IsRequired().HasMaxLength(64);
            entity.HasIndex(x => x.ReturnOrderId);
        });

        modelBuilder.Entity<ReturnReceipt>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Notes).HasMaxLength(1024);

            // One receipt per return order in this slice — see the remarks on ReturnReceipt.
            entity.HasIndex(x => x.ReturnOrderId).IsUnique();
        });

        modelBuilder.Entity<Inspection>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Result).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.Notes).HasMaxLength(1024);

            // One inspection per return order line in this slice — see the remarks on Inspection.
            entity.HasIndex(x => x.ReturnOrderLineId).IsUnique();
        });

        modelBuilder.Entity<Disposition>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Outcome).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.InventoryReferenceId).HasMaxLength(64);

            // One disposition per return order line in this slice — see the remarks on Disposition.
            entity.HasIndex(x => x.ReturnOrderLineId).IsUnique();
        });
    }
}
