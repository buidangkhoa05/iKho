namespace Ikho.Identity.Domain;

/// <summary>A user mirrored from the identity provider (Clerk) via webhook.</summary>
public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The identity provider's user id (Clerk's <c>user_...</c> id).</summary>
    public string ExternalUserId { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
