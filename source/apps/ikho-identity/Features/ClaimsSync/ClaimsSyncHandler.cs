using Ikho.Identity.Shared;
using Ikho.Identity.Shared.IdentityProvider;
using Ikho.SharedLibrary.Events;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Identity.Features.ClaimsSync;

/// <summary>
/// Reacts to <see cref="UserClaimsSyncRequestedEvent"/> by loading the user's current role
/// assignments and pushing them to the identity provider, so its session token claims stay in
/// sync with local role/company-membership changes.
/// </summary>
public sealed class ClaimsSyncHandler(IdentityDbContext db, IIdentityProvider identityProvider) : IIntegrationEventHandler<UserClaimsSyncRequestedEvent>
{
    public async Task HandleAsync(UserClaimsSyncRequestedEvent @event, string? correlationId, CancellationToken cancellationToken)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Id == @event.UserId, cancellationToken);
        if (user is null)
        {
            return;
        }

        var roleAssignments = await db.RoleAssignments
            .Where(a => a.UserId == @event.UserId)
            .ToListAsync(cancellationToken);

        // Resolve role names from the closed, compile-time-known role set rather than joining
        // against Roles - see IdentityDbContext.ResolveRoleName for why.
        var assignments = roleAssignments
            .Select(a => (Assignment: a, RoleName: IdentityDbContext.ResolveRoleName(a.RoleId)))
            .Where(x => x.RoleName is not null)
            .Select(x => new RoleClaim(x.Assignment.CompanyId, x.Assignment.WarehouseId, x.RoleName!))
            .ToList();

        await identityProvider.PushUserClaimsAsync(user.ExternalUserId, new UserClaimsPayload(assignments), cancellationToken);
    }
}
