namespace Ikho.Identity.Features.ClaimsSync;

/// <summary>Published via the outbox whenever a user's roles/company memberships change, so their identity-provider session claims can be resynced.</summary>
public sealed record UserClaimsSyncRequestedEvent(Guid UserId);
