using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Ikho.Identity.Domain;
using Ikho.Identity.Shared.IdentityProvider;
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
}
