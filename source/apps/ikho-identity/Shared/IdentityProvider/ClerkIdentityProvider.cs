using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Ikho.Identity.Shared.IdentityProvider;

/// <summary>
/// The only class in this service that knows Clerk's wire format: verifies Svix-signed
/// webhooks, translates Clerk's payload shape into <see cref="IdentityWebhookEvent"/>, and
/// calls Clerk's Backend API to push role claims into a user's <c>public_metadata</c> (from
/// which a Clerk JWT template projects the <c>ikho_roles</c> session-token claim).
/// </summary>
public sealed class ClerkIdentityProvider(HttpClient httpClient, IOptions<ClerkOptions> options) : IIdentityProvider
{
    private static readonly TimeSpan TimestampTolerance = TimeSpan.FromMinutes(5);

    private readonly ClerkOptions _options = options.Value;

    /// <inheritdoc />
    public async Task<IdentityWebhookEvent> ParseWebhookAsync(HttpRequest request, CancellationToken cancellationToken)
    {
        request.EnableBuffering();
        using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync(cancellationToken);
        request.Body.Position = 0;

        var svixId = request.Headers["svix-id"].ToString();
        var svixTimestamp = request.Headers["svix-timestamp"].ToString();
        var svixSignature = request.Headers["svix-signature"].ToString();

        if (string.IsNullOrEmpty(svixId) || string.IsNullOrEmpty(svixTimestamp) || string.IsNullOrEmpty(svixSignature))
        {
            throw new InvalidWebhookSignatureException();
        }

        if (!long.TryParse(svixTimestamp, out var timestampSeconds))
        {
            throw new InvalidWebhookSignatureException();
        }

        var timestamp = DateTimeOffset.FromUnixTimeSeconds(timestampSeconds);
        if (DateTimeOffset.UtcNow - timestamp > TimestampTolerance || timestamp - DateTimeOffset.UtcNow > TimestampTolerance)
        {
            throw new InvalidWebhookSignatureException();
        }

        if (!IsValidSignature(svixId, svixTimestamp, body, svixSignature))
        {
            throw new InvalidWebhookSignatureException();
        }

        var payload = JsonSerializer.Deserialize<ClerkWebhookPayload>(body)
            ?? throw new InvalidWebhookSignatureException();

        return ToWebhookEvent(svixId, payload);
    }

    /// <summary>
    /// Verifies <paramref name="svixSignatureHeader"/> against the HMAC computed from the
    /// configured webhook signing secret. Internal (rather than private) so unit tests can
    /// exercise this in isolation against known-answer vectors, bypassing the timestamp check in
    /// <see cref="ParseWebhookAsync"/>.
    /// </summary>
    internal bool IsValidSignature(string svixId, string svixTimestamp, string body, string svixSignatureHeader)
    {
        // Fail closed: an empty/unset signing secret must never be treated as a valid key. Without
        // this check, Convert.FromBase64String("") yields a zero-length byte array, and
        // HMACSHA256 accepts a zero-length key — so a misconfigured (blank) secret would let
        // anyone forge a signature, since the "empty key" HMAC is publicly computable.
        if (string.IsNullOrEmpty(_options.WebhookSigningSecret))
        {
            return false;
        }

        var secretBytes = Convert.FromBase64String(_options.WebhookSigningSecret.Replace("whsec_", string.Empty));
        var signedContent = $"{svixId}.{svixTimestamp}.{body}";

        using var hmac = new HMACSHA256(secretBytes);
        var expectedSignature = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(signedContent)));

        foreach (var candidate in svixSignatureHeader.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = candidate.Split(',', 2);
            if (parts.Length == 2 && parts[0] == "v1" &&
                CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(parts[1]), Encoding.UTF8.GetBytes(expectedSignature)))
            {
                return true;
            }
        }

        return false;
    }

    private static IdentityWebhookEvent ToWebhookEvent(string eventId, ClerkWebhookPayload payload) => payload.Type switch
    {
        "user.created" => new IdentityWebhookEvent(eventId, IdentityWebhookEventType.UserCreated,
            payload.Data.Id, payload.Data.PrimaryEmail, payload.Data.FullName, null),
        "user.updated" => new IdentityWebhookEvent(eventId, IdentityWebhookEventType.UserUpdated,
            payload.Data.Id, payload.Data.PrimaryEmail, payload.Data.FullName, null),
        "organizationMembership.created" => new IdentityWebhookEvent(eventId, IdentityWebhookEventType.OrganizationMembershipCreated,
            payload.Data.PublicUserData?.UserId, payload.Data.PublicUserData?.Identifier, null, payload.Data.OrganizationId),
        "organizationMembership.deleted" => new IdentityWebhookEvent(eventId, IdentityWebhookEventType.OrganizationMembershipRemoved,
            payload.Data.PublicUserData?.UserId, null, null, payload.Data.OrganizationId),
        _ => new IdentityWebhookEvent(eventId, IdentityWebhookEventType.Unrecognized, null, null, null, null),
    };

    /// <inheritdoc />
    public async Task PushUserClaimsAsync(string externalUserId, UserClaimsPayload claims, CancellationToken cancellationToken)
    {
        var metadata = new
        {
            public_metadata = new
            {
                ikho_roles = claims.Assignments.Select(a => new { companyId = a.CompanyId, warehouseId = a.WarehouseId, roleName = a.RoleName }),
            },
        };

        using var request = new HttpRequestMessage(HttpMethod.Patch, $"/v1/users/{externalUserId}/metadata")
        {
            Content = JsonContent.Create(metadata),
        };
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _options.SecretKey);

        var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private sealed record ClerkWebhookPayload(
        [property: JsonPropertyName("type")] string Type,
        [property: JsonPropertyName("data")] ClerkWebhookData Data);

    private sealed record ClerkWebhookData(
        [property: JsonPropertyName("id")] string? Id,
        [property: JsonPropertyName("email_addresses")] List<ClerkEmailAddress>? EmailAddresses,
        [property: JsonPropertyName("first_name")] string? FirstName,
        [property: JsonPropertyName("last_name")] string? LastName,
        [property: JsonPropertyName("organization_id")] string? OrganizationId,
        [property: JsonPropertyName("public_user_data")] ClerkPublicUserData? PublicUserData)
    {
        public string? PrimaryEmail => EmailAddresses?.FirstOrDefault()?.EmailAddress;

        public string? FullName => string.IsNullOrWhiteSpace($"{FirstName} {LastName}".Trim()) ? null : $"{FirstName} {LastName}".Trim();
    }

    private sealed record ClerkEmailAddress([property: JsonPropertyName("email_address")] string EmailAddress);

    private sealed record ClerkPublicUserData(
        [property: JsonPropertyName("user_id")] string UserId,
        [property: JsonPropertyName("identifier")] string Identifier);
}
