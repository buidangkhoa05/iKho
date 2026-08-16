namespace Ikho.Identity.Shared.IdentityProvider;

/// <summary>One role grant, scoped to a company and optionally a single warehouse within it.</summary>
public sealed record RoleClaim(Guid CompanyId, Guid? WarehouseId, string RoleName);

/// <summary>The full set of role claims to push into a user's identity-provider session token.</summary>
public sealed record UserClaimsPayload(IReadOnlyList<RoleClaim> Assignments);
