using Ikho.Identity.Shared;
using Ikho.Identity.Shared.IdentityProvider;
using Ikho.Identity.Shared.Organization;
using Ikho.Identity.Tests.TestDoubles;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Ikho.Identity.Tests;

/// <summary>
/// Boots the Identity service against an isolated EF Core InMemory database instead of Postgres,
/// so integration tests don't depend on a running database. Each instance gets its own database
/// name (a fresh <see cref="Guid"/>) so parallel test classes don't share state.
/// </summary>
public class IdentityWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = Guid.NewGuid().ToString();

    public FakeIdentityProvider IdentityProvider { get; } = new();

    public FakeOrganizationLookupClient OrganizationLookup { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove both the options singleton AND the options-configuration delegate that
            // Program.cs's AddDbContext(UseNpgsql) registered - EF Core 8+ keeps configuration
            // delegates as a separate service list, so leaving them in place makes the Npgsql
            // and InMemory provider services collide at DbContext creation time.
            services.RemoveAll<DbContextOptions<IdentityDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<IdentityDbContext>>();
            services.AddDbContext<IdentityDbContext>(options => options.UseInMemoryDatabase(_databaseName));

            services.RemoveAll<IIdentityProvider>();
            services.AddSingleton<IIdentityProvider>(IdentityProvider);

            services.RemoveAll<IOrganizationLookupClient>();
            services.AddSingleton<IOrganizationLookupClient>(OrganizationLookup);
        });
    }
}
