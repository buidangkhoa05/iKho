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
        var claimValue = context.User.FindFirst("ikho_roles")?.Value;
        if (!string.IsNullOrEmpty(claimValue))
        {
            var assignments = JsonSerializer.Deserialize<List<RoleClaim>>(claimValue) ?? [];
            if (assignments.Any(a => a.CompanyId == companyId && a.RoleName == RoleNames.Office))
            {
                context.Succeed(requirement);
            }
        }

        return Task.CompletedTask;
    }
}
