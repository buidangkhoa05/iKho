using Ikho.SharedLibrary.Idempotency;
using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseBilling.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ikho.WarehouseBilling.Shared;

/// <summary>
/// EF Core database context for the Billing service. Implements
/// <see cref="IHasOutboxMessages"/> and <see cref="IHasProcessedMessages"/> so
/// <c>Ikho.SharedLibrary</c>'s outbox publisher and idempotency store can operate against this
/// database without depending on this concrete type.
/// </summary>
public sealed class BillingDbContext(DbContextOptions<BillingDbContext> options)
    : DbContext(options), IHasOutboxMessages, IHasProcessedMessages
{
    /// <summary>Invoices issued to customers.</summary>
    public DbSet<Invoice> Invoices => Set<Invoice>();

    /// <summary>Billed lines belonging to invoices.</summary>
    public DbSet<InvoiceLine> InvoiceLines => Set<InvoiceLine>();

    /// <summary>Credit notes issued to customers.</summary>
    public DbSet<CreditNote> CreditNotes => Set<CreditNote>();

    /// <summary>Credited lines belonging to credit notes.</summary>
    public DbSet<CreditNoteLine> CreditNoteLines => Set<CreditNoteLine>();

    /// <summary>Payments recorded against invoices.</summary>
    public DbSet<Payment> Payments => Set<Payment>();

    /// <inheritdoc />
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    /// <inheritdoc />
    public DbSet<ProcessedMessage> ProcessedMessages => Set<ProcessedMessage>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new OutboxEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new ProcessedMessageEntityTypeConfiguration());

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.SourceReferenceType).HasMaxLength(64);
            entity.Property(x => x.SourceReferenceId).HasMaxLength(64);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.TotalAmount).HasPrecision(18, 4);
            entity.HasIndex(x => x.CustomerId);
            entity.HasIndex(x => x.SourceReferenceId);

            entity.HasMany(x => x.Lines)
                .WithOne()
                .HasForeignKey(x => x.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<InvoiceLine>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ProductCodeSnapshot).IsRequired().HasMaxLength(64);
            entity.Property(x => x.ProductNameSnapshot).IsRequired().HasMaxLength(256);
            entity.Property(x => x.Quantity).HasPrecision(18, 4);
            entity.Property(x => x.UnitPrice).HasPrecision(18, 4);
            entity.Property(x => x.LineTotal).HasPrecision(18, 4);
            entity.HasIndex(x => x.InvoiceId);
        });

        modelBuilder.Entity<CreditNote>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.SourceReferenceType).HasMaxLength(64);
            entity.Property(x => x.SourceReferenceId).HasMaxLength(64);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.TotalAmount).HasPrecision(18, 4);
            entity.HasIndex(x => x.CustomerId);
            entity.HasIndex(x => x.SourceReferenceId);

            entity.HasMany(x => x.Lines)
                .WithOne()
                .HasForeignKey(x => x.CreditNoteId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CreditNoteLine>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ProductCodeSnapshot).IsRequired().HasMaxLength(64);
            entity.Property(x => x.ProductNameSnapshot).IsRequired().HasMaxLength(256);
            entity.Property(x => x.Quantity).HasPrecision(18, 4);
            entity.Property(x => x.UnitPrice).HasPrecision(18, 4);
            entity.Property(x => x.LineTotal).HasPrecision(18, 4);
            entity.HasIndex(x => x.CreditNoteId);
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Amount).HasPrecision(18, 4);
            entity.Property(x => x.Method).IsRequired().HasMaxLength(64);
            entity.Property(x => x.ReferenceNote).HasMaxLength(256);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            entity.HasIndex(x => x.InvoiceId);
        });
    }
}
