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

        var assignments = await db.RoleAssignments
            .Where(a => a.UserId == @event.UserId)
            .Join(db.Roles, a => a.RoleId, r => r.Id, (a, r) => new RoleClaim(a.CompanyId, a.WarehouseId, r.Name))
            .ToListAsync(cancellationToken);

        await identityProvider.PushUserClaimsAsync(user.ExternalUserId, new UserClaimsPayload(assignments), cancellationToken);
    }
}
