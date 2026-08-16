using System.Security.Claims;
using System.Text.Json;
using Ikho.Identity.Domain;
using Ikho.Identity.Shared.IdentityProvider;
using Microsoft.AspNetCore.Authorization;

namespace Ikho.Identity.Shared.Authorization;

/// <summary>Requirement for the <c>CompanyOffice</c> policy — the resource passed to <c>AuthorizeAsync</c> is the target <see cref="Guid"/> company id.</summary>
public sealed class CompanyOfficeRequirement : IAuthorizationRequirement;

/// <summary>
/// Succeeds if the current user's <c>ikho_roles</c> JWT claim contains an <see cref="RoleNames.Office"/>
/// assignment for the target company (the <see cref="Guid"/> resource passed to <c>AuthorizeAsync</c>).
/// </summary>
public sealed class CompanyOfficeAuthorizationHandler : AuthorizationHandler<CompanyOfficeRequirement, Guid>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, CompanyOfficeRequirement requirement, Guid companyId)
    {
        var claimValues = context.User.FindAll("ikho_roles").Select(c => c.Value).ToList();
        var assignments = ParseRoleClaims(claimValues);

        if (assignments.Any(a => a.CompanyId == companyId && a.RoleName == RoleNames.Office))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }

    /// <summary>
    /// Handles both encodings the JWT stack might produce for the JSON-array-valued
    /// <c>ikho_roles</c> claim: a single claim whose value is the full JSON array (e.g. what this
    /// service's own tests write directly), or N separate same-named claims each holding one JSON
    /// object - the more likely real-world outcome, since .NET's JWT handlers are known to split a
    /// genuinely array-valued JSON claim into multiple same-named <see cref="Claim"/>s.
    /// </summary>
    private static List<RoleClaim> ParseRoleClaims(IReadOnlyList<string> claimValues)
    {
        if (claimValues.Count == 1)
        {
            try
            {
                var parsedArray = JsonSerializer.Deserialize<List<RoleClaim>>(claimValues[0], UserClaimsPayload.ClaimJsonOptions);
                if (parsedArray is not null)
                {
                    return parsedArray;
                }
            }
            catch (JsonException)
            {
                // Not a single JSON array - fall through and try the per-claim-object path below.
            }
        }

        var assignments = new List<RoleClaim>();
        foreach (var claimValue in claimValues)
        {
            try
            {
                var assignment = JsonSerializer.Deserialize<RoleClaim>(claimValue, UserClaimsPayload.ClaimJsonOptions);
                if (assignment is not null)
                {
                    assignments.Add(assignment);
                }
            }
            catch (JsonException)
            {
                // Malformed ikho_roles claim value (corrupted token, JWT-template regression,
                // etc.) - skip it and fail closed the same way as a missing claim, rather than
                // surfacing a raw 500.
            }
        }

        return assignments;
    }
}
