using System.Text.Json;
using Ikho.Identity.Shared.IdentityProvider;
using Microsoft.AspNetCore.Http;

namespace Ikho.Identity.Tests.TestDoubles;

/// <summary>
/// Test double for <see cref="IIdentityProvider"/>. Skips real signature verification — parses
/// the request body directly as an <see cref="IdentityWebhookEvent"/> — and records every
/// <see cref="PushUserClaimsAsync"/> call for assertions.
/// </summary>
public sealed class FakeIdentityProvider : IIdentityProvider
{
    // Matches the Web defaults HttpClient's PostAsJsonAsync uses to serialize the request body
    // (camelCase, case-insensitive), so the test-simulated webhook round-trips correctly.
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    public List<(string ExternalUserId, UserClaimsPayload Claims)> PushedClaims { get; } = [];

    public async Task<IdentityWebhookEvent> ParseWebhookAsync(HttpRequest request, CancellationToken cancellationToken)
    {
        var webhookEvent = await JsonSerializer.DeserializeAsync<IdentityWebhookEvent>(request.Body, SerializerOptions, cancellationToken);
        return webhookEvent ?? throw new InvalidWebhookSignatureException();
    }

    public Task PushUserClaimsAsync(string externalUserId, UserClaimsPayload claims, CancellationToken cancellationToken)
    {
        PushedClaims.Add((externalUserId, claims));
        return Task.CompletedTask;
    }
}
