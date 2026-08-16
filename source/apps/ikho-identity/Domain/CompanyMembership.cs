namespace Ikho.Identity.Domain;

public enum CompanyMembershipStatus
{
    Active,
    Removed,
}

/// <summary>Links a <see cref="User"/> to an iKho <c>Company</c> (owned by Ikho.Warehouse.Organization), mirroring a Clerk organization membership.</summary>
public sealed class CompanyMembership
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    /// <summary>The iKho <c>Company</c> id, resolved from the webhook's Clerk org id.</summary>
    public Guid CompanyId { get; set; }

    /// <summary>The identity provider's organization id (Clerk's <c>org_...</c> id).</summary>
    public string ExternalOrgId { get; set; } = string.Empty;

    public CompanyMembershipStatus Status { get; set; } = CompanyMembershipStatus.Active;

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
