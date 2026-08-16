using System.Text.Json;

namespace Ikho.Identity.Shared.IdentityProvider;

/// <summary>One role grant, scoped to a company and optionally a single warehouse within it.</summary>
public sealed record RoleClaim(Guid CompanyId, Guid? WarehouseId, string RoleName);

/// <summary>The full set of role claims to push into a user's identity-provider session token.</summary>
public sealed record UserClaimsPayload(IReadOnlyList<RoleClaim> Assignments)
{
    /// <summary>
    /// The single JSON serialization contract for <see cref="RoleClaim"/> on the wire. Used by
    /// <see cref="ClerkIdentityProvider"/> to serialize the outbound <c>ikho_roles</c> array into
    /// Clerk's <c>public_metadata</c>, and by <c>CompanyOfficeAuthorizationHandler</c> to
    /// deserialize that same array back out of the <c>ikho_roles</c> JWT claim. Both sides MUST
    /// share this one options instance (camelCase property names) rather than each defining their
    /// own - that's what let <c>{"companyId":...}</c> (produced) vs. an expected
    /// <c>{"CompanyId":...}</c> (parsed with default, case-sensitive options) silently drift apart
    /// and never match.
    /// </summary>
    public static readonly JsonSerializerOptions ClaimJsonOptions = new(JsonSerializerDefaults.Web);
}
