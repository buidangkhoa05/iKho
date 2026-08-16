namespace Ikho.Identity.Domain;

/// <summary>Grants a <see cref="User"/> a <see cref="Role"/> within one company, optionally scoped to a single warehouse.</summary>
public sealed class RoleAssignment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public Guid CompanyId { get; set; }

    /// <summary><see langword="null"/> means company-wide; otherwise scopes the role to one warehouse.</summary>
    public Guid? WarehouseId { get; set; }

    public Guid RoleId { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
