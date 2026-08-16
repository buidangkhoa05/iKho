using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Ikho.Identity.Domain;
using Ikho.Identity.Shared.Authorization;
using Ikho.Identity.Shared.IdentityProvider;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using Xunit;

namespace Ikho.Identity.Tests.Shared;

/// <summary>
/// Proves the `ikho_roles` claim round-trips through the REAL production path: the exact JSON
/// <see cref="ClerkIdentityProvider.PushUserClaimsAsync"/> sends to Clerk on the wire, fed
/// straight into the exact deserialize call <see cref="CompanyOfficeAuthorizationHandler"/> uses.
/// This intentionally does not hand-roll a second serialize/deserialize pair in the test itself -
/// that would let the two production call sites drift apart again while the test kept passing.
/// </summary>
public class ClaimRoundTripTests
{
    /// <summary>
    /// Captures the outgoing request body instead of hitting the network, and answers 200 OK. The
    /// body is read out eagerly here (rather than handed back as the still-attached
    /// <see cref="HttpContent"/>) because <see cref="ClerkIdentityProvider.PushUserClaimsAsync"/>
    /// disposes its <see cref="HttpRequestMessage"/> - and therefore its content - as soon as it
    /// returns.
    /// </summary>
    private sealed class CapturingHandler : HttpMessageHandler
    {
        public string? LastRequestBody { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequestBody = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK);
        }
    }

    [Fact]
    public async Task IkhoRolesClaim_AsPushedByClerkIdentityProvider_IsAcceptedByCompanyOfficeAuthorizationHandler()
    {
        var officeCompanyId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var payload = new UserClaimsPayload(
        [
            new RoleClaim(officeCompanyId, warehouseId, RoleNames.Office),
            new RoleClaim(Guid.NewGuid(), null, RoleNames.Operator),
        ]);

        // Act (production serialize side): call the real ClerkIdentityProvider.PushUserClaimsAsync
        // and capture the exact JSON body it sends to Clerk's Backend API.
        var capturingHandler = new CapturingHandler();
        using var httpClient = new HttpClient(capturingHandler) { BaseAddress = new Uri("https://api.clerk.test") };
        var provider = new ClerkIdentityProvider(
            httpClient,
            Options.Create(new ClerkOptions { WebhookSigningSecret = "whsec_test", SecretKey = "sk_test" }));

        await provider.PushUserClaimsAsync("user_roundtrip_test", payload, CancellationToken.None);

        using var document = JsonDocument.Parse(capturingHandler.LastRequestBody!);
        var ikhoRolesJson = document.RootElement.GetProperty("public_metadata").GetProperty("ikho_roles").GetRawText();

        // Act (production deserialize side): feed that exact JSON, as a single ikho_roles claim
        // value (the shape produced above is a JSON array string), into the real authorization
        // handler and confirm it recognizes the Office grant for the target company.
        var authorizationHandler = new CompanyOfficeAuthorizationHandler();
        var identity = new ClaimsIdentity([new Claim("ikho_roles", ikhoRolesJson)], authenticationType: "Test");
        var principal = new ClaimsPrincipal(identity);
        var context = new AuthorizationHandlerContext([new CompanyOfficeRequirement()], principal, officeCompanyId);

        await authorizationHandler.HandleAsync(context);

        Assert.True(context.HasSucceeded);
    }

    [Fact]
    public async Task IkhoRolesClaim_AsPushedByClerkIdentityProvider_DoesNotGrantUnrelatedCompany()
    {
        var payload = new UserClaimsPayload([new RoleClaim(Guid.NewGuid(), null, RoleNames.Office)]);

        var capturingHandler = new CapturingHandler();
        using var httpClient = new HttpClient(capturingHandler) { BaseAddress = new Uri("https://api.clerk.test") };
        var provider = new ClerkIdentityProvider(
            httpClient,
            Options.Create(new ClerkOptions { WebhookSigningSecret = "whsec_test", SecretKey = "sk_test" }));

        await provider.PushUserClaimsAsync("user_roundtrip_test", payload, CancellationToken.None);

        using var document = JsonDocument.Parse(capturingHandler.LastRequestBody!);
        var ikhoRolesJson = document.RootElement.GetProperty("public_metadata").GetProperty("ikho_roles").GetRawText();

        var authorizationHandler = new CompanyOfficeAuthorizationHandler();
        var identity = new ClaimsIdentity([new Claim("ikho_roles", ikhoRolesJson)], authenticationType: "Test");
        var principal = new ClaimsPrincipal(identity);
        var context = new AuthorizationHandlerContext([new CompanyOfficeRequirement()], principal, Guid.NewGuid());

        await authorizationHandler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
    }
}
