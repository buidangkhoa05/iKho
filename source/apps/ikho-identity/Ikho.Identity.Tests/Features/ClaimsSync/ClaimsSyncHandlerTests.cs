using Ikho.Identity.Domain;
using Ikho.Identity.Features.ClaimsSync;
using Ikho.Identity.Shared;
using Ikho.Identity.Tests.TestDoubles;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Ikho.Identity.Tests.Features.ClaimsSync;

public class ClaimsSyncHandlerTests
{
    private static IdentityDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<IdentityDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new IdentityDbContext(options);
    }

    [Fact]
    public async Task HandleAsync_PushesCurrentRoleAssignmentsToProvider()
    {
        await using var db = CreateDbContext();
        var user = new Ikho.Identity.Domain.User { ExternalUserId = "user_sync_test", Email = "sync@example.com", DisplayName = "Sync Test" };
        db.Users.Add(user);
        var companyId = Guid.NewGuid();
        db.RoleAssignments.Add(new RoleAssignment { UserId = user.Id, CompanyId = companyId, WarehouseId = null, RoleId = IdentityDbContext.OfficeRoleId });
        await db.SaveChangesAsync();

        var fakeProvider = new FakeIdentityProvider();
        var handler = new ClaimsSyncHandler(db, fakeProvider);

        await handler.HandleAsync(new UserClaimsSyncRequestedEvent(user.Id), correlationId: null, CancellationToken.None);

        var pushed = Assert.Single(fakeProvider.PushedClaims);
        Assert.Equal("user_sync_test", pushed.ExternalUserId);
        var assignment = Assert.Single(pushed.Claims.Assignments);
        Assert.Equal(companyId, assignment.CompanyId);
        Assert.Equal(RoleNames.Office, assignment.RoleName);
    }
}
