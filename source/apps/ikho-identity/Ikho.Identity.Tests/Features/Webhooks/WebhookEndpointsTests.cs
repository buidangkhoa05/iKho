using System.Net;
using System.Net.Http.Json;
using Ikho.Identity.Shared;
using Ikho.Identity.Shared.IdentityProvider;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Ikho.Identity.Tests.Features.Webhooks;

public class WebhookEndpointsTests(IdentityWebApplicationFactory factory) : IClassFixture<IdentityWebApplicationFactory>
{
    [Fact]
    public async Task OrganizationMembershipCreated_LinksMembershipAndDefaultsOperatorRole()
    {
        var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var companyId = Guid.NewGuid();
        factory.OrganizationLookup.CompaniesByExternalOrgId["org_test"] = companyId;

        var client = factory.CreateClient();
        var webhookEvent = new IdentityWebhookEvent(
            EventId: Guid.NewGuid().ToString(),
            Type: IdentityWebhookEventType.OrganizationMembershipCreated,
            ExternalUserId: "user_test",
            Email: "test@example.com",
            DisplayName: "Test User",
            ExternalOrgId: "org_test");

        var response = await client.PostAsJsonAsync("/api/identity/webhooks/clerk", webhookEvent);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var membership = await db.CompanyMemberships.SingleAsync(m => m.CompanyId == companyId);
        Assert.Equal("org_test", membership.ExternalOrgId);

        var roleAssignment = await db.RoleAssignments.SingleAsync(a => a.CompanyId == companyId);
        Assert.Equal(IdentityDbContext.OperatorRoleId, roleAssignment.RoleId);

        var outboxMessage = await db.OutboxMessages.SingleAsync();
        Assert.Equal(nameof(Ikho.Identity.Features.ClaimsSync.UserClaimsSyncRequestedEvent), outboxMessage.Type);
    }
}
