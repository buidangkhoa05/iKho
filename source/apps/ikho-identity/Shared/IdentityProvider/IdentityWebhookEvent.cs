namespace Ikho.Identity.Shared.IdentityProvider;

public enum IdentityWebhookEventType
{
    UserCreated,
    UserUpdated,
    OrganizationMembershipCreated,
    OrganizationMembershipRemoved,
    Unrecognized,
}

/// <summary>
/// Canonical shape every identity-provider webhook is translated into before reaching business
/// logic, so feature slices never depend on a provider's raw payload format.
/// </summary>
public sealed record IdentityWebhookEvent(
    string EventId,
    IdentityWebhookEventType Type,
    string? ExternalUserId,
    string? Email,
    string? DisplayName,
    string? ExternalOrgId);
