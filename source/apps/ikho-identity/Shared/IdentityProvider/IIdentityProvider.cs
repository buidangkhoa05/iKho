using Microsoft.AspNetCore.Http;

namespace Ikho.Identity.Shared.IdentityProvider;

/// <summary>Thrown when an inbound webhook fails signature verification.</summary>
public sealed class InvalidWebhookSignatureException : Exception;

/// <summary>
/// Isolates every identity-provider-specific detail (webhook verification/parsing, pushing role
/// claims) behind one interface, so swapping providers means writing a new implementation of
/// this interface, not touching feature slices, the DB schema, or the frontend.
/// </summary>
public interface IIdentityProvider
{
    /// <summary>Verifies and parses an inbound webhook request into a canonical event. Throws <see cref="InvalidWebhookSignatureException"/> if verification fails.</summary>
    Task<IdentityWebhookEvent> ParseWebhookAsync(HttpRequest request, CancellationToken cancellationToken);

    /// <summary>Pushes <paramref name="claims"/> into the session token claims for the user identified by <paramref name="externalUserId"/>.</summary>
    Task PushUserClaimsAsync(string externalUserId, UserClaimsPayload claims, CancellationToken cancellationToken);
}
