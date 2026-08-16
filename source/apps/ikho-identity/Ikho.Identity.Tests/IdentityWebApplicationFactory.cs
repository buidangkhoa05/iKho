using Ikho.Identity.Shared;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
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

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<IdentityDbContext>>();
            services.AddDbContext<IdentityDbContext>(options => options.UseInMemoryDatabase(_databaseName));
        });
    }
}
