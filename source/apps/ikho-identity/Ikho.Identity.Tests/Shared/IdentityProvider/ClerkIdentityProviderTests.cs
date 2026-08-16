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

    [Fact]
    public void IsValidSignature_SvixKnownAnswerVector_ReturnsTrue()
    {
        // Independently-known-correct vector published by Svix itself (not derived from this
        // test file's own signing helper), so this catches a regression in the signed-content
        // format (e.g. field order) that a self-referential test could miss. The timestamp is
        // from 2021, so this goes through IsValidSignature directly rather than
        // ParseWebhookAsync, to bypass the (unrelated) freshness check.
        var provider = new ClerkIdentityProvider(
            new HttpClient(),
            Options.Create(new ClerkOptions { WebhookSigningSecret = WebhookSecret, SecretKey = "sk_test" }));

        var isValid = provider.IsValidSignature(
            "msg_p5jXN8AQM9LWM0D4loKWxJek",
            "1614265330",
            """{"test": 2432232314}""",
            "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=");

        Assert.True(isValid);
    }

    [Fact]
    public async Task ParseWebhookAsync_EmptyWebhookSigningSecret_RejectsEvenAForgedEmptyKeySignature()
    {
        var body = """{"type":"user.created","data":{"id":"user_123"}}""";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        const string svixId = "msg_1";

        // Simulate an attacker exploiting a misconfigured (blank) signing secret: they can
        // compute a signature using a zero-length HMAC key themselves, since that key is
        // publicly derivable from an empty WebhookSigningSecret. The service must still reject
        // it rather than accepting it as "valid" because it happens to match.
        var signedContent = $"{svixId}.{timestamp}.{body}";
        using var hmac = new HMACSHA256(Array.Empty<byte>());
        var forgedSignature = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(signedContent)));

        var context = new DefaultHttpContext();
        context.Request.Headers["svix-id"] = svixId;
        context.Request.Headers["svix-timestamp"] = timestamp;
        context.Request.Headers["svix-signature"] = $"v1,{forgedSignature}";
        context.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));

        var provider = new ClerkIdentityProvider(
            new HttpClient(),
            Options.Create(new ClerkOptions { WebhookSigningSecret = string.Empty, SecretKey = "sk_test" }));

        await Assert.ThrowsAsync<InvalidWebhookSignatureException>(
            () => provider.ParseWebhookAsync(context.Request, CancellationToken.None));
    }
}
