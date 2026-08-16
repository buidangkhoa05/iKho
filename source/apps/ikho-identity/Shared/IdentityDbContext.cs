using Ikho.Identity.Domain;
using Ikho.SharedLibrary.Idempotency;
using Ikho.SharedLibrary.Outbox;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Identity.Shared;

/// <summary>
/// EF Core database context for the Identity service. Implements <see cref="IHasOutboxMessages"/>
/// and <see cref="IHasProcessedMessages"/> so Ikho.SharedLibrary's outbox publisher and
/// idempotency store can operate against this database without depending on this concrete type.
/// </summary>
public sealed class IdentityDbContext(DbContextOptions<IdentityDbContext> options)
    : DbContext(options), IHasOutboxMessages, IHasProcessedMessages
{
    /// <summary>Seeded id for the <see cref="RoleNames.Office"/> role.</summary>
    public static readonly Guid OfficeRoleId = Guid.Parse("00000000-0000-0000-0000-000000000001");

    /// <summary>Seeded id for the <see cref="RoleNames.Operator"/> role.</summary>
    public static readonly Guid OperatorRoleId = Guid.Parse("00000000-0000-0000-0000-000000000002");

    public DbSet<User> Users => Set<User>();

    public DbSet<CompanyMembership> CompanyMemberships => Set<CompanyMembership>();

    public DbSet<Role> Roles => Set<Role>();

    public DbSet<RoleAssignment> RoleAssignments => Set<RoleAssignment>();

    /// <summary>
    /// Resolves a role id to its <see cref="RoleNames"/> value via equality checks against
    /// <see cref="OfficeRoleId"/>/<see cref="OperatorRoleId"/>, instead of joining against
    /// <see cref="Roles"/>. This repo has no EF Core migrations tooling, so the <c>Roles</c>
    /// table's <c>HasData</c> seed below never materializes against a real (unmigrated) Postgres
    /// database - an inner join against it would silently return zero rows there. The role set is
    /// a closed, compile-time-known two-value set, so consumers that need a role's name from its
    /// id (<see cref="Ikho.Identity.Features.ClaimsSync.ClaimsSyncHandler"/>,
    /// <see cref="Ikho.Identity.Features.RoleAssignments.RoleAssignmentService.GetByCompanyAsync"/>)
    /// should resolve it here instead.
    /// </summary>
    public static string? ResolveRoleName(Guid roleId) => roleId switch
    {
        _ when roleId == OfficeRoleId => RoleNames.Office,
        _ when roleId == OperatorRoleId => RoleNames.Operator,
        _ => null,
    };

    /// <inheritdoc />
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    /// <inheritdoc />
    public DbSet<ProcessedMessage> ProcessedMessages => Set<ProcessedMessage>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new OutboxEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new ProcessedMessageEntityTypeConfiguration());

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.ExternalUserId).IsRequired().HasMaxLength(128);
            entity.Property(u => u.Email).IsRequired().HasMaxLength(256);
            entity.Property(u => u.DisplayName).IsRequired().HasMaxLength(256);
            entity.HasIndex(u => u.ExternalUserId).IsUnique();
        });

        modelBuilder.Entity<CompanyMembership>(entity =>
        {
            entity.HasKey(m => m.Id);
            entity.Property(m => m.ExternalOrgId).IsRequired().HasMaxLength(128);
            entity.HasIndex(m => new { m.UserId, m.CompanyId }).IsUnique();
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Name).IsRequired().HasMaxLength(64);
            entity.HasIndex(r => r.Name).IsUnique();
            entity.HasData(
                new Role { Id = OfficeRoleId, Name = RoleNames.Office },
                new Role { Id = OperatorRoleId, Name = RoleNames.Operator });
        });

        modelBuilder.Entity<RoleAssignment>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.HasIndex(a => new { a.UserId, a.CompanyId, a.WarehouseId, a.RoleId }).IsUnique();
        });
    }
}
