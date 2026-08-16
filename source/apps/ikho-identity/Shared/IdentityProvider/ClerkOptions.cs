namespace Ikho.Identity.Shared.IdentityProvider;

/// <summary>Clerk-specific configuration, bound from the <c>Clerk</c> configuration section.</summary>
public sealed class ClerkOptions
{
    public const string SectionName = "Clerk";

    /// <summary>Clerk Backend API secret key, used to authenticate outbound calls (e.g. pushing user metadata).</summary>
    public string SecretKey { get; set; } = string.Empty;

    /// <summary>The webhook signing secret (Clerk dashboard's <c>whsec_...</c> value) used to verify inbound webhook signatures.</summary>
    public string WebhookSigningSecret { get; set; } = string.Empty;
}
