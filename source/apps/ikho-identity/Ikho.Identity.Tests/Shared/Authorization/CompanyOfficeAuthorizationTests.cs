using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Ikho.Identity.Domain;
using Ikho.Identity.Shared.Authorization;
using Ikho.Identity.Shared.IdentityProvider;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Ikho.Identity.Tests.Shared.Authorization;

public class CompanyOfficeAuthorizationTests(IdentityWebApplicationFactory factory) : IClassFixture<IdentityWebApplicationFactory>
{
    private static string IssueTestJwt(IEnumerable<RoleClaim> roleClaims)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(IdentityWebApplicationFactory.TestSigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims: [new System.Security.Claims.Claim("ikho_roles", JsonSerializer.Serialize(roleClaims))],
            expires: DateTime.UtcNow.AddMinutes(5),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [Fact]
    public async Task NoBearerToken_ReturnsUnauthorized()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/identity/role-assignments?companyId={Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task NonOfficeRole_ReturnsForbidden()
    {
        var companyId = Guid.NewGuid();
        var token = IssueTestJwt([new RoleClaim(companyId, null, RoleNames.Operator)]);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync($"/api/identity/role-assignments?companyId={companyId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    /// <summary>
    /// Exercises <see cref="CompanyOfficeAuthorizationHandler"/> directly rather than through
    /// <c>GET /api/identity/role-assignments</c>: that endpoint doesn't exist until Task 7, so any
    /// HTTP request to it - malformed token or not - currently 404s in routing before the request
    /// ever reaches authorization/policy evaluation, which would make an HTTP-level assertion of
    /// "403, not 500" unobservable right now. A direct handler test proves the fix (a malformed,
    /// non-JSON <c>ikho_roles</c> claim value fails the requirement instead of throwing) regardless
    /// of that endpoint's existence.
    /// </summary>
    [Fact]
    public async Task MalformedRolesClaim_FailsRequirement_InsteadOfThrowing()
    {
        var handler = new CompanyOfficeAuthorizationHandler();
        var companyId = Guid.NewGuid();
        var identity = new ClaimsIdentity([new Claim("ikho_roles", "{not-valid-json")], authenticationType: "Test");
        var principal = new ClaimsPrincipal(identity);
        var context = new AuthorizationHandlerContext([new CompanyOfficeRequirement()], principal, companyId);

        var exception = await Record.ExceptionAsync(() => handler.HandleAsync(context));

        Assert.Null(exception);
        Assert.False(context.HasSucceeded);
    }
}
