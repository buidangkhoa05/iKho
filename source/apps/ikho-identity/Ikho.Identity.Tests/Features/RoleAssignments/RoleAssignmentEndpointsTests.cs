using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Ikho.Identity.Domain;
using Ikho.Identity.Features.RoleAssignments;
using Ikho.Identity.Shared;
using Ikho.Identity.Shared.IdentityProvider;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Ikho.Identity.Tests.Features.RoleAssignments;

public class RoleAssignmentEndpointsTests(IdentityWebApplicationFactory factory) : IClassFixture<IdentityWebApplicationFactory>
{
    private static string IssueOfficeJwt(Guid companyId)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(IdentityWebApplicationFactory.TestSigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var roleClaims = new[] { new RoleClaim(companyId, null, RoleNames.Office) };
        var token = new JwtSecurityToken(
            claims: [new Claim("ikho_roles", JsonSerializer.Serialize(roleClaims))],
            expires: DateTime.UtcNow.AddMinutes(5),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [Fact]
    public async Task CreateRoleAssignment_ByOfficeUser_UpgradesTargetUserToOffice()
    {
        var companyId = Guid.NewGuid();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var targetUser = new Ikho.Identity.Domain.User { ExternalUserId = "user_target", Email = "target@example.com", DisplayName = "Target" };
        db.Users.Add(targetUser);
        db.CompanyMemberships.Add(new Ikho.Identity.Domain.CompanyMembership
        {
            UserId = targetUser.Id,
            CompanyId = companyId,
            ExternalOrgId = "org_target",
            Status = Ikho.Identity.Domain.CompanyMembershipStatus.Active,
        });
        await db.SaveChangesAsync();

        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", IssueOfficeJwt(companyId));

        var response = await client.PostAsJsonAsync("/api/identity/role-assignments", new CreateRoleAssignmentRequest(
            companyId, targetUser.Id, null, RoleNames.Office));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using var verifyScope = factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var assignment = await verifyDb.RoleAssignments.SingleAsync(a => a.UserId == targetUser.Id && a.CompanyId == companyId);
        Assert.Equal(IdentityDbContext.OfficeRoleId, assignment.RoleId);
    }

    [Fact]
    public async Task CreateRoleAssignment_TargetUserHasNoActiveCompanyMembership_ReturnsNotFound()
    {
        var companyId = Guid.NewGuid();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var targetUser = new Ikho.Identity.Domain.User { ExternalUserId = "user_no_membership", Email = "nomember@example.com", DisplayName = "No Membership" };
        db.Users.Add(targetUser);
        await db.SaveChangesAsync();

        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", IssueOfficeJwt(companyId));

        var response = await client.PostAsJsonAsync("/api/identity/role-assignments", new CreateRoleAssignmentRequest(
            companyId, targetUser.Id, null, RoleNames.Office));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        using var verifyScope = factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        Assert.False(await verifyDb.RoleAssignments.AnyAsync(a => a.UserId == targetUser.Id && a.CompanyId == companyId));
    }

    [Fact]
    public async Task CreateRoleAssignment_TargetUserHasRemovedCompanyMembership_ReturnsNotFound()
    {
        var companyId = Guid.NewGuid();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var targetUser = new Ikho.Identity.Domain.User { ExternalUserId = "user_removed_membership", Email = "removed@example.com", DisplayName = "Removed" };
        db.Users.Add(targetUser);
        db.CompanyMemberships.Add(new Ikho.Identity.Domain.CompanyMembership
        {
            UserId = targetUser.Id,
            CompanyId = companyId,
            ExternalOrgId = "org_removed",
            Status = Ikho.Identity.Domain.CompanyMembershipStatus.Removed,
        });
        await db.SaveChangesAsync();

        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", IssueOfficeJwt(companyId));

        var response = await client.PostAsJsonAsync("/api/identity/role-assignments", new CreateRoleAssignmentRequest(
            companyId, targetUser.Id, null, RoleNames.Office));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
