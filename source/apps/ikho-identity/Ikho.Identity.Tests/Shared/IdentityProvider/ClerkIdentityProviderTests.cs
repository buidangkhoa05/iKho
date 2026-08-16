using System.Security.Cryptography;
using System.Text;
using Ikho.Identity.Shared.IdentityProvider;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Xunit;

namespace Ikho.Identity.Tests.Shared.IdentityProvider;

public class ClerkIdentityProviderTests
{
    private const string WebhookSecret = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"; // Svix's own documented test secret

    private static HttpContext BuildSignedRequest(string body, string svixId, string timestamp, bool corruptSignature = false)
    {
        var secretBytes = Convert.FromBase64String(WebhookSecret.Replace("whsec_", string.Empty));
        var signedContent = $"{svixId}.{timestamp}.{body}";
        using var hmac = new HMACSHA256(secretBytes);
        var signature = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(signedContent)));
        if (corruptSignature)
        {
            signature = Convert.ToBase64String(Encoding.UTF8.GetBytes("not-the-real-signature"));
        }

        var context = new DefaultHttpContext();
        context.Request.Headers["svix-id"] = svixId;
        context.Request.Headers["svix-timestamp"] = timestamp;
        context.Request.Headers["svix-signature"] = $"v1,{signature}";
        context.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        return context;
    }

    private static ClerkIdentityProvider CreateProvider() =>
        new(new HttpClient(), Options.Create(new ClerkOptions { WebhookSigningSecret = WebhookSecret, SecretKey = "sk_test" }));

    [Fact]
    public async Task ParseWebhookAsync_ValidSignature_ReturnsParsedEvent()
    {
        var body = """{"type":"user.created","data":{"id":"user_123","email_addresses":[{"email_address":"test@example.com"}],"first_name":"Test","last_name":"User"}}""";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var context = BuildSignedRequest(body, "msg_1", timestamp);

        var result = await CreateProvider().ParseWebhookAsync(context.Request, CancellationToken.None);

        Assert.Equal(IdentityWebhookEventType.UserCreated, result.Type);
        Assert.Equal("user_123", result.ExternalUserId);
        Assert.Equal("test@example.com", result.Email);
        Assert.Equal("Test User", result.DisplayName);
    }

    [Fact]
    public async Task ParseWebhookAsync_InvalidSignature_ThrowsInvalidWebhookSignatureException()
    {
        var body = """{"type":"user.created","data":{"id":"user_123"}}""";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var context = BuildSignedRequest(body, "msg_1", timestamp, corruptSignature: true);

        await Assert.ThrowsAsync<InvalidWebhookSignatureException>(
            () => CreateProvider().ParseWebhookAsync(context.Request, CancellationToken.None));
    }

    [Fact]
    public async Task ParseWebhookAsync_StaleTimestamp_ThrowsInvalidWebhookSignatureException()
    {
        var body = """{"type":"user.created","data":{"id":"user_123"}}""";
        var staleTimestamp = DateTimeOffset.UtcNow.AddMinutes(-10).ToUnixTimeSeconds().ToString();
        var context = BuildSignedRequest(body, "msg_1", staleTimestamp);

        await Assert.ThrowsAsync<InvalidWebhookSignatureException>(
            () => CreateProvider().ParseWebhookAsync(context.Request, CancellationToken.None));
    }
}
