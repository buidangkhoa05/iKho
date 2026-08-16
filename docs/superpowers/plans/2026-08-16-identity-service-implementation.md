# Ikho.Identity Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `Ikho.Identity` — a real backend service owning iKho-specific roles and company membership — with Clerk wired in as the first identity provider behind a swappable `IIdentityProvider` abstraction, plus the gateway/shared-library changes needed to validate Clerk-issued JWTs.

**Architecture:** `Ikho.Identity` joins `source/apps/` following the standard warehouse-service template (Vertical Slice Architecture, `Ikho.SharedLibrary` bootstrap, Postgres, outbox/Kafka). Clerk webhooks flow in through a `Features/Webhooks` slice that mirrors users/company-memberships locally; role changes flow out to Clerk via the transactional outbox + a Kafka consumer that calls `IIdentityProvider.PushUserClaimsAsync`. All Clerk-specific code lives behind `IIdentityProvider`; the gateway and `Ikho.Identity` share one provider-agnostic JWT bearer extension moved into `ikho-shared-library`.

**Tech Stack:** .NET 10 Minimal API, EF Core 10 + Npgsql, Confluent.Kafka (via existing shared-library outbox/consumer infra), xUnit + `Microsoft.AspNetCore.Mvc.Testing` + EF Core InMemory (this repo's first .NET test project — none exist yet despite CLAUDE.md's stated xUnit convention).

## Global Constraints

- Service name/namespace: `Ikho.Identity`, directory `source/apps/ikho-identity`, port `5160` (http), matching the sequential port allocation after Reporting's `5159`.
- Route prefix: `/api/identity/*`, following the `/api/warehouse/{capability}/*` convention used by every other service.
- Clerk Organizations map 1:1 to iKho `Company` (owned by `Ikho.Warehouse.Organization`). Tenancy roles are iKho-owned: only `Office` and `Operator` exist — no fine-grained permission table (per design spec non-goals).
- No EF Core migrations tooling exists anywhere in this repo yet (confirmed: no `Migrations/` folder, no `EntityFrameworkCore.Design` package, no `EnsureCreated`/`Migrate` call in any service). This plan does not introduce migrations tooling either — it follows the same (currently unaddressed) convention as every other warehouse service: `DbContext` + `Npgsql.EntityFrameworkCore.PostgreSQL`, nothing more.
- Every other `Ikho.Warehouse*` service continues to trust gateway-level authentication unchanged. Only `Ikho.Identity` registers its own JWT bearer authentication, because its role-assignment endpoint needs per-request `[Authorize]` checks.
- Custom role/company claims are carried in a single JWT claim named `ikho_roles`, holding a JSON array of `{ companyId, warehouseId, roleName }` objects (serializes `RoleClaim` records). This is the concrete shape referenced by every task below.
- No frontend changes in this plan — `ikho-ui`'s Clerk integration is a separate follow-up plan.

---

## Task 1: Move JWT bearer authentication into `ikho-shared-library`

**Files:**
- Create: `source/libs/ikho-shared-library/Authentication/JwtBearerAuthenticationExtensions.cs`
- Modify: `source/apps/ikho-api-gateway/Program.cs:1,13`
- Delete: `source/apps/ikho-api-gateway/Shared/Authentication/JwtAuthenticationExtensions.cs`
- Modify: `docs/architecture/api-gateway.md:107,142` (path references)

**Interfaces:**
- Produces: `Ikho.SharedLibrary.Authentication.JwtBearerAuthenticationExtensions.AddJwtBearerAuthentication(this IServiceCollection, IConfiguration)` — reads `Jwt:Authority`/`Jwt:Audience`, registers JWT bearer auth + `AddAuthorization()`. Used by the gateway (this task) and by `Ikho.Identity` (Task 6).

This is a pure move — the gateway's existing extension is already provider-agnostic (just `Jwt:Authority`/`Jwt:Audience` config), so there's no new logic, just a new home so `Ikho.Identity` can reuse it instead of duplicating it.

- [ ] **Step 1: Create the shared extension**

```csharp
// source/libs/ikho-shared-library/Authentication/JwtBearerAuthenticationExtensions.cs
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace Ikho.SharedLibrary.Authentication;

/// <summary>
/// Registers provider-agnostic JWT bearer authentication from the <c>Jwt</c> configuration
/// section. Shared by every service that needs to validate a caller's JWT directly (the
/// gateway, and any service enforcing its own <c>[Authorize]</c> policies), so there is one
/// place that knows how to validate a token regardless of which identity provider issued it.
/// </summary>
public static class JwtBearerAuthenticationExtensions
{
    /// <summary>
    /// Adds JWT bearer authentication and authorization services, configured from
    /// <c>Jwt:Authority</c>/<c>Jwt:Audience</c>. Both may be blank (token validation fails
    /// closed) if no identity provider is configured yet for this environment.
    /// </summary>
    public static IServiceCollection AddJwtBearerAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var authority = configuration["Jwt:Authority"];
        var audience = configuration["Jwt:Audience"];

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = authority;
                options.Audience = audience;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = !string.IsNullOrWhiteSpace(authority),
                    ValidateAudience = !string.IsNullOrWhiteSpace(audience),
                    ValidateLifetime = true,
                };
            });

        services.AddAuthorization();

        return services;
    }
}
```

- [ ] **Step 2: Remove the gateway's local copy and update its `Program.cs`**

```bash
git rm source/apps/ikho-api-gateway/Shared/Authentication/JwtAuthenticationExtensions.cs
```

In `source/apps/ikho-api-gateway/Program.cs`, replace:

```csharp
using Ikho.ApiGateway.Shared.Authentication;
```

with:

```csharp
using Ikho.SharedLibrary.Authentication;
```

and replace:

```csharp
builder.Services.AddGatewayAuthentication(builder.Configuration);
```

with:

```csharp
builder.Services.AddJwtBearerAuthentication(builder.Configuration);
```

- [ ] **Step 3: Update the doc references**

In `docs/architecture/api-gateway.md`, replace the line under **Authentication (`Jwt` section)**:

```
- See [Shared/Authentication/JwtAuthenticationExtensions.cs](../../source/apps/ikho-api-gateway/Shared/Authentication/JwtAuthenticationExtensions.cs).
```

with:

```
- See [Ikho.SharedLibrary/Authentication/JwtBearerAuthenticationExtensions.cs](../../source/libs/ikho-shared-library/Authentication/JwtBearerAuthenticationExtensions.cs) — shared with `Ikho.Identity`, which also registers its own JWT bearer auth for `[Authorize]`-protected endpoints.
```

and in the **Project structure** listing, replace:

```
    Authentication/JwtAuthenticationExtensions.cs
```

with:

```
    (JWT bearer auth now lives in Ikho.SharedLibrary/Authentication/JwtBearerAuthenticationExtensions.cs)
```

- [ ] **Step 4: Build to verify the move compiles**

Run: `cd source && dotnet build apps/ikho-api-gateway/Ikho.ApiGateway.csproj`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add source/libs/ikho-shared-library/Authentication/JwtBearerAuthenticationExtensions.cs source/apps/ikho-api-gateway/Program.cs docs/architecture/api-gateway.md
git rm source/apps/ikho-api-gateway/Shared/Authentication/JwtAuthenticationExtensions.cs
git commit -m "refactor(shared-library): move JWT bearer auth extension out of the gateway so Ikho.Identity can reuse it"
```

---

## Task 2: Scaffold `Ikho.Identity` — project, data model, test harness

**Files:**
- Create: `source/apps/ikho-identity/Ikho.Identity.csproj`
- Create: `source/apps/ikho-identity/Program.cs`
- Create: `source/apps/ikho-identity/appsettings.json`
- Create: `source/apps/ikho-identity/appsettings.Development.json`
- Create: `source/apps/ikho-identity/Properties/launchSettings.json`
- Create: `source/apps/ikho-identity/project.json`
- Create: `source/apps/ikho-identity/Domain/User.cs`
- Create: `source/apps/ikho-identity/Domain/CompanyMembership.cs`
- Create: `source/apps/ikho-identity/Domain/Role.cs`
- Create: `source/apps/ikho-identity/Domain/RoleAssignment.cs`
- Create: `source/apps/ikho-identity/Shared/IdentityDbContext.cs`
- Create: `source/apps/ikho-identity/Ikho.Identity.Tests/Ikho.Identity.Tests.csproj`
- Create: `source/apps/ikho-identity/Ikho.Identity.Tests/IdentityWebApplicationFactory.cs`
- Create: `source/apps/ikho-identity/Ikho.Identity.Tests/HealthCheckTests.cs`

**Interfaces:**
- Produces: `IdentityDbContext` with `DbSet<User> Users`, `DbSet<CompanyMembership> CompanyMemberships`, `DbSet<Role> Roles`, `DbSet<RoleAssignment> RoleAssignments`, `DbSet<OutboxMessage> OutboxMessages`, `DbSet<ProcessedMessage> ProcessedMessages`; static `IdentityDbContext.OfficeRoleId`/`OperatorRoleId` (seeded `Guid`s). `IdentityWebApplicationFactory` (test project) for every later task's integration tests.

No `.NET` test project exists anywhere in this repo yet — this task introduces the first one, using EF Core's InMemory provider so tests don't need a real Postgres instance.

- [ ] **Step 1: Create the domain entities**

```csharp
// source/apps/ikho-identity/Domain/User.cs
namespace Ikho.Identity.Domain;

/// <summary>A user mirrored from the identity provider (Clerk) via webhook.</summary>
public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The identity provider's user id (Clerk's <c>user_...</c> id).</summary>
    public string ExternalUserId { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
```

```csharp
// source/apps/ikho-identity/Domain/CompanyMembership.cs
namespace Ikho.Identity.Domain;

public enum CompanyMembershipStatus
{
    Active,
    Removed,
}

/// <summary>Links a <see cref="User"/> to an iKho <c>Company</c> (owned by Ikho.Warehouse.Organization), mirroring a Clerk organization membership.</summary>
public sealed class CompanyMembership
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    /// <summary>The iKho <c>Company</c> id, resolved from the webhook's Clerk org id.</summary>
    public Guid CompanyId { get; set; }

    /// <summary>The identity provider's organization id (Clerk's <c>org_...</c> id).</summary>
    public string ExternalOrgId { get; set; } = string.Empty;

    public CompanyMembershipStatus Status { get; set; } = CompanyMembershipStatus.Active;

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
```

```csharp
// source/apps/ikho-identity/Domain/Role.cs
namespace Ikho.Identity.Domain;

/// <summary>An iKho-defined role, independent of the identity provider's own role feature.</summary>
public sealed class Role
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Stable, unique role name (see <see cref="RoleNames"/>).</summary>
    public string Name { get; set; } = string.Empty;
}

/// <summary>Well-known seeded role names.</summary>
public static class RoleNames
{
    public const string Office = "Office";
    public const string Operator = "Operator";
}
```

```csharp
// source/apps/ikho-identity/Domain/RoleAssignment.cs
namespace Ikho.Identity.Domain;

/// <summary>Grants a <see cref="User"/> a <see cref="Role"/> within one company, optionally scoped to a single warehouse.</summary>
public sealed class RoleAssignment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public Guid CompanyId { get; set; }

    /// <summary><see langword="null"/> means company-wide; otherwise scopes the role to one warehouse.</summary>
    public Guid? WarehouseId { get; set; }

    public Guid RoleId { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
```

- [ ] **Step 2: Create the `DbContext`**

```csharp
// source/apps/ikho-identity/Shared/IdentityDbContext.cs
using Ikho.Identity.Domain;
using Ikho.SharedLibrary.Idempotency;
using Ikho.SharedLibrary.Outbox;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Identity.Shared;

/// <summary>
/// EF Core database context for the Identity service. Implements <see cref="IHasOutboxMessages"/>
/// and <see cref="IHasProcessedMessages"/> so Ikho.SharedLibrary's outbox publisher and
/// idempotency store can operate against this database without depending on this concrete type.
/// </summary>
public sealed class IdentityDbContext(DbContextOptions<IdentityDbContext> options)
    : DbContext(options), IHasOutboxMessages, IHasProcessedMessages
{
    /// <summary>Seeded id for the <see cref="RoleNames.Office"/> role.</summary>
    public static readonly Guid OfficeRoleId = Guid.Parse("00000000-0000-0000-0000-000000000001");

    /// <summary>Seeded id for the <see cref="RoleNames.Operator"/> role.</summary>
    public static readonly Guid OperatorRoleId = Guid.Parse("00000000-0000-0000-0000-000000000002");

    public DbSet<User> Users => Set<User>();

    public DbSet<CompanyMembership> CompanyMemberships => Set<CompanyMembership>();

    public DbSet<Role> Roles => Set<Role>();

    public DbSet<RoleAssignment> RoleAssignments => Set<RoleAssignment>();

    /// <inheritdoc />
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    /// <inheritdoc />
    public DbSet<ProcessedMessage> ProcessedMessages => Set<ProcessedMessage>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new OutboxEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new ProcessedMessageEntityTypeConfiguration());

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.ExternalUserId).IsRequired().HasMaxLength(128);
            entity.Property(u => u.Email).IsRequired().HasMaxLength(256);
            entity.Property(u => u.DisplayName).IsRequired().HasMaxLength(256);
            entity.HasIndex(u => u.ExternalUserId).IsUnique();
        });

        modelBuilder.Entity<CompanyMembership>(entity =>
        {
            entity.HasKey(m => m.Id);
            entity.Property(m => m.ExternalOrgId).IsRequired().HasMaxLength(128);
            entity.HasIndex(m => new { m.UserId, m.CompanyId }).IsUnique();
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Name).IsRequired().HasMaxLength(64);
            entity.HasIndex(r => r.Name).IsUnique();
            entity.HasData(
                new Role { Id = OfficeRoleId, Name = RoleNames.Office },
                new Role { Id = OperatorRoleId, Name = RoleNames.Operator });
        });

        modelBuilder.Entity<RoleAssignment>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.HasIndex(a => new { a.UserId, a.CompanyId, a.WarehouseId, a.RoleId }).IsUnique();
        });
    }
}
```

- [ ] **Step 3: Create the project file**

```xml
<!-- source/apps/ikho-identity/Ikho.Identity.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\libs\ikho-shared-library\Ikho.SharedLibrary.csproj" />
  </ItemGroup>

</Project>
```

- [ ] **Step 4: Create `Program.cs`**

```csharp
// source/apps/ikho-identity/Program.cs
using Ikho.Identity.Shared;
using Ikho.SharedLibrary;
using Ikho.SharedLibrary.ApiDocs;
using Ikho.SharedLibrary.Options;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var databaseOptions = builder.Configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>() ?? new DatabaseOptions();
builder.Services.AddDbContext<IdentityDbContext>(options =>
    options.UseNpgsql(databaseOptions.ConnectionString));

builder.Services.AddServiceDefaults<IdentityDbContext>(builder.Configuration);
builder.Services.AddServiceApiDocs();

var app = builder.Build();

app.UseServiceDefaults(); // correlation id -> request logging -> health check endpoints
app.MapServiceApiDocs("/api/identity");

app.Run();

/// <summary>Entry point class, exposed for <c>WebApplicationFactory&lt;Program&gt;</c> integration tests.</summary>
public partial class Program;
```

- [ ] **Step 5: Create config files**

```json
// source/apps/ikho-identity/appsettings.json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "Database": {
    "ConnectionString": "Host=localhost;Port=5432;Database=ikho_identity;Username=ikho;Password=ikho"
  },
  "MessageBroker": {
    "BootstrapServers": "localhost:9092",
    "ClientId": "ikho-identity",
    "TopicPrefix": "identity"
  },
  "Jwt": {
    "// NOTE": "Placeholder values until Clerk's JWKS issuer/audience are configured.",
    "Authority": "",
    "Audience": ""
  },
  "Clerk": {
    "// NOTE": "Placeholder values until a Clerk instance is provisioned.",
    "SecretKey": "",
    "WebhookSigningSecret": ""
  },
  "Services": {
    "Organization": {
      "BaseUrl": "http://localhost:5151"
    }
  }
}
```

```json
// source/apps/ikho-identity/appsettings.Development.json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft.AspNetCore": "Information"
    }
  }
}
```

```json
// source/apps/ikho-identity/Properties/launchSettings.json
{
  "$schema": "https://json.schemastore.org/launchsettings.json",
  "profiles": {
    "http": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": false,
      "applicationUrl": "http://localhost:5160",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

```json
// source/apps/ikho-identity/project.json
{
  "name": "Ikho.Identity",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "targets": {
    "docker-build": {
      "executor": "nx:run-commands",
      "options": {
        "cwd": "{workspaceRoot}",
        "command": "docker build -f docker/dotnet.Dockerfile --build-arg PROJECT_PATH=apps/ikho-identity/Ikho.Identity.csproj --build-arg ASSEMBLY_NAME=Ikho.Identity -t ikho/identity:local ."
      },
      "metadata": {
        "description": "Build the Docker image for this service",
        "technologies": ["docker"]
      }
    }
  }
}
```

- [ ] **Step 6: Build to verify the service compiles**

Run: `cd source && dotnet build apps/ikho-identity/Ikho.Identity.csproj`
Expected: Build succeeds with no errors.

- [ ] **Step 7: Create the test project**

```xml
<!-- source/apps/ikho-identity/Ikho.Identity.Tests/Ikho.Identity.Tests.csproj -->
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.12.0" />
    <PackageReference Include="xunit" Version="2.9.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.8.2" />
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="10.0.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.InMemory" Version="10.0.4" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\Ikho.Identity.csproj" />
  </ItemGroup>

</Project>
```

- [ ] **Step 8: Create the shared `WebApplicationFactory`**

```csharp
// source/apps/ikho-identity/Ikho.Identity.Tests/IdentityWebApplicationFactory.cs
using Ikho.Identity.Shared;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

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
```

- [ ] **Step 9: Write the first test (health check) and run it**

```csharp
// source/apps/ikho-identity/Ikho.Identity.Tests/HealthCheckTests.cs
using System.Net;
using Xunit;

namespace Ikho.Identity.Tests;

public class HealthCheckTests(IdentityWebApplicationFactory factory) : IClassFixture<IdentityWebApplicationFactory>
{
    [Fact]
    public async Task LivenessEndpoint_ReturnsOk()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/health/live");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
```

Run: `cd source && dotnet test apps/ikho-identity/Ikho.Identity.Tests/Ikho.Identity.Tests.csproj`
Expected: PASS (1 test).

- [ ] **Step 10: Commit**

```bash
git add source/apps/ikho-identity
git commit -m "feat(ikho-identity): scaffold Ikho.Identity service, data model, and test harness"
```

---

## Task 3: `Company` ↔ Clerk-organization lookup

**Files:**
- Modify: `source/apps/ikho-warehouse-organization/Domain/Company.cs`
- Modify: `source/apps/ikho-warehouse-organization/Shared/OrganizationDbContext.cs`
- Modify: `source/apps/ikho-warehouse-organization/Features/Companies/CompanyModels.cs`
- Modify: `source/apps/ikho-warehouse-organization/Features/Companies/CompaniesRepository.cs`
- Modify: `source/apps/ikho-warehouse-organization/Features/Companies/CompaniesService.cs`
- Modify: `source/apps/ikho-warehouse-organization/Features/Companies/CompaniesEndpoints.cs`
- Create: `source/apps/ikho-identity/Shared/Organization/IOrganizationLookupClient.cs`
- Create: `source/apps/ikho-identity/Shared/Organization/OrganizationLookupClient.cs`
- Create: `source/apps/ikho-identity/Ikho.Identity.Tests/TestDoubles/FakeOrganizationLookupClient.cs`

**Interfaces:**
- Produces: `IOrganizationLookupClient.GetCompanyIdByExternalOrgIdAsync(string externalOrgId, CancellationToken) : Task<Guid?>` and `IOrganizationLookupClient.WarehouseExistsAsync(Guid companyId, Guid warehouseId, CancellationToken) : Task<bool>`. Consumed by webhook ingestion (Task 4) and role assignment (Task 8).
- Consumes: `Ikho.Identity.Shared.Organization` namespace only depends on `System.Net.Http.Json` and standard config binding — no new shared-library types.

Organization owns `Company` and is the only service allowed to write it — this task adds the Clerk org id as a field on `Company` (Organization's own schema, additive) plus a lookup endpoint, rather than duplicating the mapping inside Identity.

- [ ] **Step 1: Add `ExternalOrgId` to the `Company` domain entity**

In `source/apps/ikho-warehouse-organization/Domain/Company.cs`, add after the `Name` property:

```csharp
    /// <summary>
    /// The linked identity provider's organization id (Clerk's <c>org_...</c> id), or
    /// <see langword="null"/> if this company has not been linked to an identity-provider
    /// organization yet. Set once via <c>PUT .../companies/{id}</c>.
    /// </summary>
    public string? ExternalOrgId { get; set; }
```

- [ ] **Step 2: Map the new column and add a unique index**

In `source/apps/ikho-warehouse-organization/Shared/OrganizationDbContext.cs`, inside the `Company` entity configuration block, add after the existing `Code` unique index line:

```csharp
            entity.Property(c => c.ExternalOrgId).HasMaxLength(128);
            entity.HasIndex(c => c.ExternalOrgId).IsUnique().HasFilter("\"ExternalOrgId\" IS NOT NULL");
```

- [ ] **Step 3: Extend the request/response DTOs**

In `source/apps/ikho-warehouse-organization/Features/Companies/CompanyModels.cs`, replace the `UpdateCompanyRequest` and `CompanyResponse` records:

```csharp
/// <summary>
/// Request body to update an existing <see cref="Domain.Company"/>.
/// </summary>
public sealed record UpdateCompanyRequest(string Name, bool IsActive, string? ExternalOrgId);

/// <summary>
/// Response shape returned for company reads and writes.
/// </summary>
public sealed record CompanyResponse(Guid Id, string Code, string Name, bool IsActive, string? ExternalOrgId, DateTimeOffset CreatedOnUtc)
{
    /// <summary>
    /// Projects a <see cref="Domain.Company"/> entity to its response DTO.
    /// </summary>
    public static CompanyResponse FromEntity(Domain.Company company) =>
        new(company.Id, company.Code, company.Name, company.IsActive, company.ExternalOrgId, company.CreatedOnUtc);
}
```

- [ ] **Step 4: Add the repository lookup method**

In `source/apps/ikho-warehouse-organization/Features/Companies/CompaniesRepository.cs`, add to the `ICompanyRepository` interface (after `GetByIdAsync`):

```csharp
    /// <summary>
    /// Finds a company by its linked identity-provider organization id, or <see langword="null"/>
    /// if no company is linked to it.
    /// </summary>
    Task<Company?> GetByExternalOrgIdAsync(string externalOrgId, CancellationToken cancellationToken);
```

and to `CompanyRepository` (after the existing `GetByIdAsync` implementation):

```csharp
    /// <inheritdoc />
    public Task<Company?> GetByExternalOrgIdAsync(string externalOrgId, CancellationToken cancellationToken) =>
        dbContext.Companies.SingleOrDefaultAsync(c => c.ExternalOrgId == externalOrgId, cancellationToken);
```

Also update `UpdateAsync` in `CompaniesService.cs` to persist the new field — replace:

```csharp
        company.Name = request.Name;
        company.IsActive = request.IsActive;
```

with:

```csharp
        company.Name = request.Name;
        company.IsActive = request.IsActive;
        company.ExternalOrgId = request.ExternalOrgId;
```

- [ ] **Step 5: Add the lookup endpoint**

In `source/apps/ikho-warehouse-organization/Features/Companies/CompaniesEndpoints.cs`, add after the existing `GET /{id:guid}` mapping:

```csharp
        group.MapGet("/by-external-org/{externalOrgId}", async Task<Results<Ok<CompanyResponse>, NotFound>> (
            string externalOrgId,
            ICompanyRepository repository,
            CancellationToken cancellationToken) =>
        {
            var company = await repository.GetByExternalOrgIdAsync(externalOrgId, cancellationToken);
            return company is null ? TypedResults.NotFound() : TypedResults.Ok(CompanyResponse.FromEntity(company));
        });
```

- [ ] **Step 6: Build Organization to verify it still compiles**

Run: `cd source && dotnet build apps/ikho-warehouse-organization/Ikho.Warehouse.Organization.csproj`
Expected: Build succeeds with no errors.

- [ ] **Step 7: Add `Ikho.Identity`'s lookup client interface + real implementation**

```csharp
// source/apps/ikho-identity/Shared/Organization/IOrganizationLookupClient.cs
namespace Ikho.Identity.Shared.Organization;

/// <summary>
/// Resolves company/warehouse facts owned by <c>Ikho.Warehouse.Organization</c>. Identity never
/// stores its own copy of company or warehouse data — it always asks Organization, per the
/// architecture's no-cross-database-FK rule.
/// </summary>
public interface IOrganizationLookupClient
{
    /// <summary>Returns the iKho company id linked to <paramref name="externalOrgId"/>, or <see langword="null"/> if no company is linked to it yet.</summary>
    Task<Guid?> GetCompanyIdByExternalOrgIdAsync(string externalOrgId, CancellationToken cancellationToken);

    /// <summary>Returns <see langword="true"/> if <paramref name="warehouseId"/> exists and belongs to <paramref name="companyId"/>.</summary>
    Task<bool> WarehouseExistsAsync(Guid companyId, Guid warehouseId, CancellationToken cancellationToken);
}
```

```csharp
// source/apps/ikho-identity/Shared/Organization/OrganizationLookupClient.cs
using System.Net;
using System.Net.Http.Json;

namespace Ikho.Identity.Shared.Organization;

/// <inheritdoc cref="IOrganizationLookupClient" />
public sealed class OrganizationLookupClient(HttpClient httpClient) : IOrganizationLookupClient
{
    private sealed record CompanyLookupResponse(Guid Id);

    private sealed record WarehouseLookupResponse(Guid Id, Guid CompanyId);

    /// <inheritdoc />
    public async Task<Guid?> GetCompanyIdByExternalOrgIdAsync(string externalOrgId, CancellationToken cancellationToken)
    {
        var response = await httpClient.GetAsync($"/api/warehouse/organization/companies/by-external-org/{Uri.EscapeDataString(externalOrgId)}", cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();
        var company = await response.Content.ReadFromJsonAsync<CompanyLookupResponse>(cancellationToken: cancellationToken);
        return company?.Id;
    }

    /// <inheritdoc />
    public async Task<bool> WarehouseExistsAsync(Guid companyId, Guid warehouseId, CancellationToken cancellationToken)
    {
        var response = await httpClient.GetAsync($"/api/warehouse/organization/warehouses/{warehouseId}", cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }

        response.EnsureSuccessStatusCode();
        var warehouse = await response.Content.ReadFromJsonAsync<WarehouseLookupResponse>(cancellationToken: cancellationToken);
        return warehouse is not null && warehouse.CompanyId == companyId;
    }
}
```

- [ ] **Step 8: Register the typed client in `Program.cs`**

In `source/apps/ikho-identity/Program.cs`, add before `var app = builder.Build();`:

```csharp
builder.Services.AddHttpClient<IOrganizationLookupClient, OrganizationLookupClient>(client =>
{
    var baseUrl = builder.Configuration["Services:Organization:BaseUrl"] ?? "http://localhost:5151";
    client.BaseAddress = new Uri(baseUrl);
});
```

and add `using Ikho.Identity.Shared.Organization;` to the top of the file.

- [ ] **Step 9: Add the fake test double**

```csharp
// source/apps/ikho-identity/Ikho.Identity.Tests/TestDoubles/FakeOrganizationLookupClient.cs
using Ikho.Identity.Shared.Organization;

namespace Ikho.Identity.Tests.TestDoubles;

/// <summary>Test double for <see cref="IOrganizationLookupClient"/> with in-memory, test-controlled data.</summary>
public sealed class FakeOrganizationLookupClient : IOrganizationLookupClient
{
    public Dictionary<string, Guid> CompaniesByExternalOrgId { get; } = [];

    public HashSet<(Guid CompanyId, Guid WarehouseId)> Warehouses { get; } = [];

    public Task<Guid?> GetCompanyIdByExternalOrgIdAsync(string externalOrgId, CancellationToken cancellationToken) =>
        Task.FromResult(CompaniesByExternalOrgId.TryGetValue(externalOrgId, out var companyId) ? companyId : null);

    public Task<bool> WarehouseExistsAsync(Guid companyId, Guid warehouseId, CancellationToken cancellationToken) =>
        Task.FromResult(Warehouses.Contains((companyId, warehouseId)));
}
```

- [ ] **Step 10: Build both services to verify everything compiles**

Run: `cd source && dotnet build apps/ikho-warehouse-organization/Ikho.Warehouse.Organization.csproj && dotnet build apps/ikho-identity/Ikho.Identity.csproj`
Expected: Both builds succeed with no errors.

- [ ] **Step 11: Commit**

```bash
git add source/apps/ikho-warehouse-organization source/apps/ikho-identity
git commit -m "feat: link Company to its Clerk organization id and add Ikho.Identity's Organization lookup client"
```

---

## Task 4: `IIdentityProvider` abstraction + Clerk webhook ingestion

**Files:**
- Create: `source/apps/ikho-identity/Shared/IdentityProvider/IIdentityProvider.cs`
- Create: `source/apps/ikho-identity/Shared/IdentityProvider/IdentityWebhookEvent.cs`
- Create: `source/apps/ikho-identity/Shared/IdentityProvider/UserClaimsPayload.cs`
- Create: `source/apps/ikho-identity/Features/ClaimsSync/UserClaimsSyncRequestedEvent.cs`
- Create: `source/apps/ikho-identity/Features/Webhooks/WebhookEndpoints.cs`
- Create: `source/apps/ikho-identity/Features/Webhooks/WebhookService.cs`
- Create: `source/apps/ikho-identity/Ikho.Identity.Tests/TestDoubles/FakeIdentityProvider.cs`
- Create: `source/apps/ikho-identity/Ikho.Identity.Tests/Features/Webhooks/WebhookEndpointsTests.cs`
- Modify: `source/apps/ikho-identity/Program.cs`

**Interfaces:**
- Produces: `IIdentityProvider` interface (`ParseWebhookAsync`, `PushUserClaimsAsync`), `IdentityWebhookEvent` record, `IdentityWebhookEventType` enum, `RoleClaim`/`UserClaimsPayload` records, `InvalidWebhookSignatureException`. `RoleClaim(Guid CompanyId, Guid? WarehouseId, string RoleName)` is the exact shape serialized into the `ikho_roles` JWT claim (Task 7) and consumed by the claims-sync handler (Task 9).
- Consumes: `IOrganizationLookupClient.GetCompanyIdByExternalOrgIdAsync` (Task 3), `IdentityDbContext.OperatorRoleId` (Task 2), `IOutboxWriter`/`IIdempotencyStore` (existing shared-library).

- [ ] **Step 1: Define the provider abstraction and canonical models**

```csharp
// source/apps/ikho-identity/Shared/IdentityProvider/IdentityWebhookEvent.cs
namespace Ikho.Identity.Shared.IdentityProvider;

public enum IdentityWebhookEventType
{
    UserCreated,
    UserUpdated,
    OrganizationMembershipCreated,
    OrganizationMembershipRemoved,
    Unrecognized,
}

/// <summary>
/// Canonical shape every identity-provider webhook is translated into before reaching business
/// logic, so feature slices never depend on a provider's raw payload format.
/// </summary>
public sealed record IdentityWebhookEvent(
    string EventId,
    IdentityWebhookEventType Type,
    string? ExternalUserId,
    string? Email,
    string? DisplayName,
    string? ExternalOrgId);
```

```csharp
// source/apps/ikho-identity/Shared/IdentityProvider/UserClaimsPayload.cs
namespace Ikho.Identity.Shared.IdentityProvider;

/// <summary>One role grant, scoped to a company and optionally a single warehouse within it.</summary>
public sealed record RoleClaim(Guid CompanyId, Guid? WarehouseId, string RoleName);

/// <summary>The full set of role claims to push into a user's identity-provider session token.</summary>
public sealed record UserClaimsPayload(IReadOnlyList<RoleClaim> Assignments);
```

```csharp
// source/apps/ikho-identity/Shared/IdentityProvider/IIdentityProvider.cs
using Microsoft.AspNetCore.Http;

namespace Ikho.Identity.Shared.IdentityProvider;

/// <summary>Thrown when an inbound webhook fails signature verification.</summary>
public sealed class InvalidWebhookSignatureException : Exception;

/// <summary>
/// Isolates every identity-provider-specific detail (webhook verification/parsing, pushing role
/// claims) behind one interface, so swapping providers means writing a new implementation of
/// this interface, not touching feature slices, the DB schema, or the frontend.
/// </summary>
public interface IIdentityProvider
{
    /// <summary>Verifies and parses an inbound webhook request into a canonical event. Throws <see cref="InvalidWebhookSignatureException"/> if verification fails.</summary>
    Task<IdentityWebhookEvent> ParseWebhookAsync(HttpRequest request, CancellationToken cancellationToken);

    /// <summary>Pushes <paramref name="claims"/> into the session token claims for the user identified by <paramref name="externalUserId"/>.</summary>
    Task PushUserClaimsAsync(string externalUserId, UserClaimsPayload claims, CancellationToken cancellationToken);
}
```

```csharp
// source/apps/ikho-identity/Features/ClaimsSync/UserClaimsSyncRequestedEvent.cs
namespace Ikho.Identity.Features.ClaimsSync;

/// <summary>Published via the outbox whenever a user's roles/company memberships change, so their identity-provider session claims can be resynced.</summary>
public sealed record UserClaimsSyncRequestedEvent(Guid UserId);
```

- [ ] **Step 2: Write the webhook ingestion service**

```csharp
// source/apps/ikho-identity/Features/Webhooks/WebhookService.cs
using System.Text.Json;
using Ikho.Identity.Domain;
using Ikho.Identity.Features.ClaimsSync;
using Ikho.Identity.Shared;
using Ikho.Identity.Shared.IdentityProvider;
using Ikho.Identity.Shared.Organization;
using Ikho.SharedLibrary.Idempotency;
using Ikho.SharedLibrary.Outbox;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Ikho.Identity.Features.Webhooks;

/// <summary>Applies a canonical <see cref="IdentityWebhookEvent"/> to the local user/membership mirror.</summary>
public sealed class WebhookService(
    IdentityDbContext db,
    IIdempotencyStore idempotencyStore,
    IOutboxWriter outbox,
    IOrganizationLookupClient organizationLookup,
    ILogger<WebhookService> logger)
{
    private const string ConsumerName = "Ikho.Identity.Webhooks";

    public async Task ApplyAsync(IdentityWebhookEvent webhookEvent, string? correlationId, CancellationToken cancellationToken)
    {
        if (await idempotencyStore.HasBeenProcessedAsync(ConsumerName, webhookEvent.EventId, cancellationToken))
        {
            return;
        }

        switch (webhookEvent.Type)
        {
            case IdentityWebhookEventType.UserCreated:
            case IdentityWebhookEventType.UserUpdated:
                await UpsertUserAsync(webhookEvent, cancellationToken);
                break;

            case IdentityWebhookEventType.OrganizationMembershipCreated:
                await UpsertMembershipAsync(webhookEvent, correlationId, cancellationToken);
                break;

            case IdentityWebhookEventType.OrganizationMembershipRemoved:
                await RemoveMembershipAsync(webhookEvent, cancellationToken);
                break;

            case IdentityWebhookEventType.Unrecognized:
                logger.LogWarning("Ignoring unrecognized identity webhook event {EventId}.", webhookEvent.EventId);
                break;
        }

        await db.SaveChangesAsync(cancellationToken);
        await idempotencyStore.MarkProcessedAsync(ConsumerName, webhookEvent.EventId, cancellationToken);
    }

    private async Task<User> UpsertUserAsync(IdentityWebhookEvent webhookEvent, CancellationToken cancellationToken)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.ExternalUserId == webhookEvent.ExternalUserId, cancellationToken);
        if (user is null)
        {
            user = new User
            {
                ExternalUserId = webhookEvent.ExternalUserId!,
                Email = webhookEvent.Email ?? string.Empty,
                DisplayName = webhookEvent.DisplayName ?? string.Empty,
            };
            db.Users.Add(user);
        }
        else
        {
            user.Email = webhookEvent.Email ?? user.Email;
            user.DisplayName = webhookEvent.DisplayName ?? user.DisplayName;
        }

        return user;
    }

    private async Task UpsertMembershipAsync(IdentityWebhookEvent webhookEvent, string? correlationId, CancellationToken cancellationToken)
    {
        var companyId = await organizationLookup.GetCompanyIdByExternalOrgIdAsync(webhookEvent.ExternalOrgId!, cancellationToken);
        if (companyId is null)
        {
            logger.LogWarning(
                "No Company is linked to external org {ExternalOrgId}; skipping membership sync for event {EventId}.",
                webhookEvent.ExternalOrgId, webhookEvent.EventId);
            return;
        }

        var user = await UpsertUserAsync(webhookEvent, cancellationToken);

        var membership = await db.CompanyMemberships
            .SingleOrDefaultAsync(m => m.UserId == user.Id && m.CompanyId == companyId, cancellationToken);
        if (membership is null)
        {
            membership = new CompanyMembership
            {
                UserId = user.Id,
                CompanyId = companyId.Value,
                ExternalOrgId = webhookEvent.ExternalOrgId!,
            };
            db.CompanyMemberships.Add(membership);
        }
        else
        {
            membership.Status = CompanyMembershipStatus.Active;
        }

        var hasRole = await db.RoleAssignments
            .AnyAsync(a => a.UserId == user.Id && a.CompanyId == companyId, cancellationToken);
        if (!hasRole)
        {
            db.RoleAssignments.Add(new RoleAssignment
            {
                UserId = user.Id,
                CompanyId = companyId.Value,
                WarehouseId = null,
                RoleId = IdentityDbContext.OperatorRoleId,
            });
        }

        EnqueueClaimsSync(user.Id, correlationId);
    }

    private async Task RemoveMembershipAsync(IdentityWebhookEvent webhookEvent, CancellationToken cancellationToken)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.ExternalUserId == webhookEvent.ExternalUserId, cancellationToken);
        if (user is null)
        {
            return;
        }

        var membership = await db.CompanyMemberships
            .SingleOrDefaultAsync(m => m.UserId == user.Id && m.ExternalOrgId == webhookEvent.ExternalOrgId, cancellationToken);
        if (membership is null)
        {
            return;
        }

        membership.Status = CompanyMembershipStatus.Removed;

        var assignments = await db.RoleAssignments
            .Where(a => a.UserId == user.Id && a.CompanyId == membership.CompanyId)
            .ToListAsync(cancellationToken);
        db.RoleAssignments.RemoveRange(assignments);

        EnqueueClaimsSync(user.Id, correlationId: null);
    }

    private void EnqueueClaimsSync(Guid userId, string? correlationId)
    {
        var payload = JsonSerializer.Serialize(new UserClaimsSyncRequestedEvent(userId));
        db.OutboxMessages.Add(outbox.Enqueue(nameof(UserClaimsSyncRequestedEvent), payload, correlationId));
    }
}
```

- [ ] **Step 3: Write the webhook endpoint**

```csharp
// source/apps/ikho-identity/Features/Webhooks/WebhookEndpoints.cs
using Ikho.Identity.Shared.IdentityProvider;
using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Identity.Features.Webhooks;

public static class WebhookEndpoints
{
    public static IEndpointRouteBuilder MapWebhookEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/identity/webhooks").WithTags("Webhooks");

        group.MapPost("/clerk", async Task<Results<Ok, BadRequest<string>>> (
            HttpContext httpContext,
            IIdentityProvider identityProvider,
            WebhookService service,
            CancellationToken cancellationToken) =>
        {
            IdentityWebhookEvent webhookEvent;
            try
            {
                webhookEvent = await identityProvider.ParseWebhookAsync(httpContext.Request, cancellationToken);
            }
            catch (InvalidWebhookSignatureException)
            {
                return TypedResults.BadRequest("Invalid webhook signature.");
            }

            await service.ApplyAsync(webhookEvent, httpContext.GetCorrelationId(), cancellationToken);

            return TypedResults.Ok();
        });

        return app;
    }
}
```

- [ ] **Step 4: Register the webhook feature and `WebhookService` in `Program.cs`**

In `source/apps/ikho-identity/Program.cs`, add `using Ikho.Identity.Features.Webhooks;` and, before `var app = builder.Build();`:

```csharp
builder.Services.AddScoped<WebhookService>();
```

and after `app.MapServiceApiDocs("/api/identity");`:

```csharp
app.MapWebhookEndpoints();
```

- [ ] **Step 5: Add the fake identity provider test double**

```csharp
// source/apps/ikho-identity/Ikho.Identity.Tests/TestDoubles/FakeIdentityProvider.cs
using System.Text.Json;
using Ikho.Identity.Shared.IdentityProvider;
using Microsoft.AspNetCore.Http;

namespace Ikho.Identity.Tests.TestDoubles;

/// <summary>
/// Test double for <see cref="IIdentityProvider"/>. Skips real signature verification — parses
/// the request body directly as an <see cref="IdentityWebhookEvent"/> — and records every
/// <see cref="PushUserClaimsAsync"/> call for assertions.
/// </summary>
public sealed class FakeIdentityProvider : IIdentityProvider
{
    public List<(string ExternalUserId, UserClaimsPayload Claims)> PushedClaims { get; } = [];

    public async Task<IdentityWebhookEvent> ParseWebhookAsync(HttpRequest request, CancellationToken cancellationToken)
    {
        var webhookEvent = await JsonSerializer.DeserializeAsync<IdentityWebhookEvent>(request.Body, cancellationToken: cancellationToken);
        return webhookEvent ?? throw new InvalidWebhookSignatureException();
    }

    public Task PushUserClaimsAsync(string externalUserId, UserClaimsPayload claims, CancellationToken cancellationToken)
    {
        PushedClaims.Add((externalUserId, claims));
        return Task.CompletedTask;
    }
}
```

- [ ] **Step 6: Register the fake provider for tests**

In `source/apps/ikho-identity/Ikho.Identity.Tests/IdentityWebApplicationFactory.cs`, add `using Ikho.Identity.Shared.IdentityProvider;`, `using Ikho.Identity.Tests.TestDoubles;`, and a public property plus registration:

```csharp
    public FakeIdentityProvider IdentityProvider { get; } = new();
```

inside the class, and inside `ConfigureWebHost`'s `ConfigureServices` block, after the `AddDbContext` call:

```csharp
            services.RemoveAll<IIdentityProvider>();
            services.AddSingleton<IIdentityProvider>(IdentityProvider);
```

- [ ] **Step 7: Write the failing test**

```csharp
// source/apps/ikho-identity/Ikho.Identity.Tests/Features/Webhooks/WebhookEndpointsTests.cs
using System.Net;
using System.Net.Http.Json;
using Ikho.Identity.Shared;
using Ikho.Identity.Shared.IdentityProvider;
using Ikho.Identity.Tests.TestDoubles;
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
        var lookup = (FakeOrganizationLookupClient)scope.ServiceProvider.GetRequiredService<Ikho.Identity.Shared.Organization.IOrganizationLookupClient>();
        var companyId = Guid.NewGuid();
        lookup.CompaniesByExternalOrgId["org_test"] = companyId;

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
```

`FakeOrganizationLookupClient` must be registered by `IdentityWebApplicationFactory` for this test to compile against it — add the same `RemoveAll`/`AddSingleton` pattern used for `IIdentityProvider` in Step 6, registering a `FakeOrganizationLookupClient` singleton exposed as a public `OrganizationLookup` property on the factory, then update this test to use `factory.OrganizationLookup` instead of resolving it from DI. Apply that adjustment to Step 6 and this test together before running.

- [ ] **Step 8: Run test to verify it passes**

Run: `cd source && dotnet test apps/ikho-identity/Ikho.Identity.Tests/Ikho.Identity.Tests.csproj`
Expected: PASS (3 tests total: health check + this one, plus any prior).

- [ ] **Step 9: Commit**

```bash
git add source/apps/ikho-identity
git commit -m "feat(ikho-identity): add IIdentityProvider abstraction and Clerk webhook ingestion"
```

---

## Task 5: `ClerkIdentityProvider` — real signature verification and claims push

**Files:**
- Create: `source/apps/ikho-identity/Shared/IdentityProvider/ClerkOptions.cs`
- Create: `source/apps/ikho-identity/Shared/IdentityProvider/ClerkIdentityProvider.cs`
- Create: `source/apps/ikho-identity/Ikho.Identity.Tests/Shared/IdentityProvider/ClerkIdentityProviderTests.cs`
- Modify: `source/apps/ikho-identity/Program.cs`

**Interfaces:**
- Produces: `ClerkIdentityProvider : IIdentityProvider` — the only class in this service that imports Clerk-specific wire formats. Registered as the production `IIdentityProvider` (tests keep using `FakeIdentityProvider` from Task 4).
- Consumes: `IIdentityProvider`, `IdentityWebhookEvent`, `UserClaimsPayload` (Task 4).

Clerk webhooks are signed using the Svix scheme: headers `svix-id`, `svix-timestamp`, `svix-signature`; the signed content is `{svix-id}.{svix-timestamp}.{body}`; the secret (`whsec_...`) is base64-decoded after stripping the `whsec_` prefix; the signature is `HMACSHA256(secret, signedContent)`, base64-encoded, compared against one of the space-separated `v1,<sig>` values in `svix-signature`.

- [ ] **Step 1: Add Clerk configuration options**

```csharp
// source/apps/ikho-identity/Shared/IdentityProvider/ClerkOptions.cs
namespace Ikho.Identity.Shared.IdentityProvider;

/// <summary>Clerk-specific configuration, bound from the <c>Clerk</c> configuration section.</summary>
public sealed class ClerkOptions
{
    public const string SectionName = "Clerk";

    /// <summary>Clerk Backend API secret key, used to authenticate outbound calls (e.g. pushing user metadata).</summary>
    public string SecretKey { get; set; } = string.Empty;

    /// <summary>The webhook signing secret (Clerk dashboard's <c>whsec_...</c> value) used to verify inbound webhook signatures.</summary>
    public string WebhookSigningSecret { get; set; } = string.Empty;
}
```

- [ ] **Step 2: Implement `ClerkIdentityProvider`**

```csharp
// source/apps/ikho-identity/Shared/IdentityProvider/ClerkIdentityProvider.cs
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Ikho.Identity.Shared.IdentityProvider;

/// <summary>
/// The only class in this service that knows Clerk's wire format: verifies Svix-signed
/// webhooks, translates Clerk's payload shape into <see cref="IdentityWebhookEvent"/>, and
/// calls Clerk's Backend API to push role claims into a user's <c>public_metadata</c> (from
/// which a Clerk JWT template projects the <c>ikho_roles</c> session-token claim).
/// </summary>
public sealed class ClerkIdentityProvider(HttpClient httpClient, IOptions<ClerkOptions> options) : IIdentityProvider
{
    private static readonly TimeSpan TimestampTolerance = TimeSpan.FromMinutes(5);

    private readonly ClerkOptions _options = options.Value;

    /// <inheritdoc />
    public async Task<IdentityWebhookEvent> ParseWebhookAsync(HttpRequest request, CancellationToken cancellationToken)
    {
        request.EnableBuffering();
        using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync(cancellationToken);
        request.Body.Position = 0;

        var svixId = request.Headers["svix-id"].ToString();
        var svixTimestamp = request.Headers["svix-timestamp"].ToString();
        var svixSignature = request.Headers["svix-signature"].ToString();

        if (string.IsNullOrEmpty(svixId) || string.IsNullOrEmpty(svixTimestamp) || string.IsNullOrEmpty(svixSignature))
        {
            throw new InvalidWebhookSignatureException();
        }

        if (!long.TryParse(svixTimestamp, out var timestampSeconds))
        {
            throw new InvalidWebhookSignatureException();
        }

        var timestamp = DateTimeOffset.FromUnixTimeSeconds(timestampSeconds);
        if (DateTimeOffset.UtcNow - timestamp > TimestampTolerance || timestamp - DateTimeOffset.UtcNow > TimestampTolerance)
        {
            throw new InvalidWebhookSignatureException();
        }

        if (!IsValidSignature(svixId, svixTimestamp, body, svixSignature))
        {
            throw new InvalidWebhookSignatureException();
        }

        var payload = JsonSerializer.Deserialize<ClerkWebhookPayload>(body)
            ?? throw new InvalidWebhookSignatureException();

        return ToWebhookEvent(svixId, payload);
    }

    private bool IsValidSignature(string svixId, string svixTimestamp, string body, string svixSignatureHeader)
    {
        var secretBytes = Convert.FromBase64String(_options.WebhookSigningSecret.Replace("whsec_", string.Empty));
        var signedContent = $"{svixId}.{svixTimestamp}.{body}";

        using var hmac = new HMACSHA256(secretBytes);
        var expectedSignature = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(signedContent)));

        foreach (var candidate in svixSignatureHeader.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = candidate.Split(',', 2);
            if (parts.Length == 2 && parts[0] == "v1" &&
                CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(parts[1]), Encoding.UTF8.GetBytes(expectedSignature)))
            {
                return true;
            }
        }

        return false;
    }

    private static IdentityWebhookEvent ToWebhookEvent(string eventId, ClerkWebhookPayload payload) => payload.Type switch
    {
        "user.created" => new IdentityWebhookEvent(eventId, IdentityWebhookEventType.UserCreated,
            payload.Data.Id, payload.Data.PrimaryEmail, payload.Data.FullName, null),
        "user.updated" => new IdentityWebhookEvent(eventId, IdentityWebhookEventType.UserUpdated,
            payload.Data.Id, payload.Data.PrimaryEmail, payload.Data.FullName, null),
        "organizationMembership.created" => new IdentityWebhookEvent(eventId, IdentityWebhookEventType.OrganizationMembershipCreated,
            payload.Data.PublicUserData?.UserId, payload.Data.PublicUserData?.Identifier, null, payload.Data.OrganizationId),
        "organizationMembership.deleted" => new IdentityWebhookEvent(eventId, IdentityWebhookEventType.OrganizationMembershipRemoved,
            payload.Data.PublicUserData?.UserId, null, null, payload.Data.OrganizationId),
        _ => new IdentityWebhookEvent(eventId, IdentityWebhookEventType.Unrecognized, null, null, null, null),
    };

    /// <inheritdoc />
    public async Task PushUserClaimsAsync(string externalUserId, UserClaimsPayload claims, CancellationToken cancellationToken)
    {
        var metadata = new
        {
            public_metadata = new
            {
                ikho_roles = claims.Assignments.Select(a => new { companyId = a.CompanyId, warehouseId = a.WarehouseId, roleName = a.RoleName }),
            },
        };

        using var request = new HttpRequestMessage(HttpMethod.Patch, $"/v1/users/{externalUserId}/metadata")
        {
            Content = JsonContent.Create(metadata),
        };
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _options.SecretKey);

        var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private sealed record ClerkWebhookPayload(
        [property: JsonPropertyName("type")] string Type,
        [property: JsonPropertyName("data")] ClerkWebhookData Data);

    private sealed record ClerkWebhookData(
        [property: JsonPropertyName("id")] string? Id,
        [property: JsonPropertyName("email_addresses")] List<ClerkEmailAddress>? EmailAddresses,
        [property: JsonPropertyName("first_name")] string? FirstName,
        [property: JsonPropertyName("last_name")] string? LastName,
        [property: JsonPropertyName("organization_id")] string? OrganizationId,
        [property: JsonPropertyName("public_user_data")] ClerkPublicUserData? PublicUserData)
    {
        public string? PrimaryEmail => EmailAddresses?.FirstOrDefault()?.EmailAddress;

        public string? FullName => string.IsNullOrWhiteSpace($"{FirstName} {LastName}".Trim()) ? null : $"{FirstName} {LastName}".Trim();
    }

    private sealed record ClerkEmailAddress([property: JsonPropertyName("email_address")] string EmailAddress);

    private sealed record ClerkPublicUserData(
        [property: JsonPropertyName("user_id")] string UserId,
        [property: JsonPropertyName("identifier")] string Identifier);
}
```

- [ ] **Step 3: Register `ClerkIdentityProvider` as the production `IIdentityProvider`**

In `source/apps/ikho-identity/Program.cs`, add `using Ikho.Identity.Shared.IdentityProvider;` and, before `var app = builder.Build();`:

```csharp
builder.Services.Configure<Ikho.SharedLibrary.Options.MessageBrokerOptions>(builder.Configuration.GetSection(Ikho.SharedLibrary.Options.MessageBrokerOptions.SectionName));
builder.Services.Configure<ClerkOptions>(builder.Configuration.GetSection(ClerkOptions.SectionName));
builder.Services.AddHttpClient<IIdentityProvider, ClerkIdentityProvider>(client =>
{
    client.BaseAddress = new Uri("https://api.clerk.com");
});
```

(The `MessageBrokerOptions.Configure` line here is redundant with `AddServiceDefaults` and should be omitted — remove it; `AddServiceDefaults<IdentityDbContext>` already binds it.)

- [ ] **Step 4: Write signature-verification unit tests with real HMAC vectors**

```csharp
// source/apps/ikho-identity/Ikho.Identity.Tests/Shared/IdentityProvider/ClerkIdentityProviderTests.cs
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd source && dotnet test apps/ikho-identity/Ikho.Identity.Tests/Ikho.Identity.Tests.csproj`
Expected: PASS (all tests including the 3 new ones).

- [ ] **Step 6: Commit**

```bash
git add source/apps/ikho-identity
git commit -m "feat(ikho-identity): add ClerkIdentityProvider with Svix signature verification and claims push"
```

---

## Task 6: JWT authentication + `CompanyOffice` authorization policy

**Files:**
- Create: `source/apps/ikho-identity/Shared/Authorization/CompanyOfficeAuthorizationHandler.cs`
- Create: `source/apps/ikho-identity/Ikho.Identity.Tests/Shared/Authorization/CompanyOfficeAuthorizationTests.cs`
- Modify: `source/apps/ikho-identity/Program.cs`
- Modify: `source/apps/ikho-identity/appsettings.Development.json`
- Modify: `source/apps/ikho-identity/Ikho.Identity.Tests/IdentityWebApplicationFactory.cs`
- Modify: `source/apps/ikho-identity/Ikho.Identity.Tests/Ikho.Identity.Tests.csproj`

**Interfaces:**
- Produces: `"CompanyOffice"` authorization policy — call `IAuthorizationService.AuthorizeAsync(ClaimsPrincipal user, Guid companyId, "CompanyOffice")` from any endpoint that needs to check "does this user hold the `Office` role for this company." Consumed by role assignment (Task 8).
- Consumes: `AddJwtBearerAuthentication` (Task 1), `RoleClaim`/`RoleNames.Office` (Tasks 2, 4).

The `ikho_roles` JWT claim (a JSON array of `RoleClaim`, per Global Constraints) is what Clerk's JWT template projects from the `public_metadata` this service pushes (Task 5). This task adds the ASP.NET Core side that reads it.

- [ ] **Step 1: Write the authorization requirement and handler**

```csharp
// source/apps/ikho-identity/Shared/Authorization/CompanyOfficeAuthorizationHandler.cs
using System.Text.Json;
using Ikho.Identity.Domain;
using Ikho.Identity.Shared.IdentityProvider;
using Microsoft.AspNetCore.Authorization;

namespace Ikho.Identity.Shared.Authorization;

/// <summary>Requirement for the <c>CompanyOffice</c> policy — the resource passed to <c>AuthorizeAsync</c> is the target <see cref="Guid"/> company id.</summary>
public sealed class CompanyOfficeRequirement : IAuthorizationRequirement;

/// <summary>
/// Succeeds if the current user's <c>ikho_roles</c> JWT claim contains an <see cref="RoleNames.Office"/>
/// assignment for the target company (the <see cref="Guid"/> resource passed to <c>AuthorizeAsync</c>).
/// </summary>
public sealed class CompanyOfficeAuthorizationHandler : AuthorizationHandler<CompanyOfficeRequirement, Guid>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, CompanyOfficeRequirement requirement, Guid companyId)
    {
        var claimValue = context.User.FindFirst("ikho_roles")?.Value;
        if (!string.IsNullOrEmpty(claimValue))
        {
            var assignments = JsonSerializer.Deserialize<List<RoleClaim>>(claimValue) ?? [];
            if (assignments.Any(a => a.CompanyId == companyId && a.RoleName == RoleNames.Office))
            {
                context.Succeed(requirement);
            }
        }

        return Task.CompletedTask;
    }
}
```

- [ ] **Step 2: Wire authentication and the policy into `Program.cs`**

Add `using Ikho.SharedLibrary.Authentication;`, `using Ikho.Identity.Shared.Authorization;`, and `using Microsoft.AspNetCore.Authorization;` to the top of `source/apps/ikho-identity/Program.cs`.

Before `var app = builder.Build();`, add:

```csharp
builder.Services.AddJwtBearerAuthentication(builder.Configuration);
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("CompanyOffice", policy => policy.Requirements.Add(new CompanyOfficeRequirement()));
builder.Services.AddSingleton<IAuthorizationHandler, CompanyOfficeAuthorizationHandler>();
```

After `var app = builder.Build();` and before `app.UseServiceDefaults();`, add:

```csharp
app.UseAuthentication();
app.UseAuthorization();
```

- [ ] **Step 3: Add a symmetric test-signing key so tests can issue their own JWTs**

In `source/apps/ikho-identity/appsettings.Development.json`, no change needed — tests override auth options directly rather than through config. In `source/apps/ikho-identity/Ikho.Identity.Tests/Ikho.Identity.Tests.csproj`, add inside the existing `<ItemGroup>` with the other `PackageReference`s:

```xml
    <PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="8.2.1" />
```

In `IdentityWebApplicationFactory.cs`, add `using Microsoft.AspNetCore.Authentication.JwtBearer;`, `using Microsoft.Extensions.Options;`, and `using Microsoft.IdentityModel.Tokens;`, then add a public constant and helper:

```csharp
    public const string TestSigningKey = "test-signing-key-at-least-256-bits-long-for-hmac-sha256!!";
```

and inside `ConfigureWebHost`'s `ConfigureServices` block, after the `IIdentityProvider`/lookup-client overrides, add:

```csharp
            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                options.Authority = null;
                options.RequireHttpsMetadata = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    IssuerSigningKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(TestSigningKey)),
                };
            });
```

- [ ] **Step 4: Write a test-JWT helper and the authorization test**

```csharp
// source/apps/ikho-identity/Ikho.Identity.Tests/Shared/Authorization/CompanyOfficeAuthorizationTests.cs
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
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
```

This test references `GET /api/identity/role-assignments`, which does not exist until Task 8 — leave this test file in place but skip running it until Task 8 wires the endpoint (Task 8's steps re-run the full suite, which will then include this file passing).

- [ ] **Step 5: Build to verify everything compiles**

Run: `cd source && dotnet build apps/ikho-identity/Ikho.Identity.csproj && dotnet build apps/ikho-identity/Ikho.Identity.Tests/Ikho.Identity.Tests.csproj`
Expected: Both succeed. The two new tests will fail with 404 (endpoint doesn't exist yet) rather than passing — that's expected until Task 8; do not fix that in this task.

- [ ] **Step 6: Commit**

```bash
git add source/apps/ikho-identity
git commit -m "feat(ikho-identity): wire JWT bearer auth and add the CompanyOffice authorization policy"
```

---

## Task 7: Role assignment feature

**Files:**
- Create: `source/apps/ikho-identity/Features/RoleAssignments/RoleAssignmentModels.cs`
- Create: `source/apps/ikho-identity/Features/RoleAssignments/RoleAssignmentService.cs`
- Create: `source/apps/ikho-identity/Features/RoleAssignments/RoleAssignmentEndpoints.cs`
- Create: `source/apps/ikho-identity/Ikho.Identity.Tests/Features/RoleAssignments/RoleAssignmentEndpointsTests.cs`
- Modify: `source/apps/ikho-identity/Program.cs`

**Interfaces:**
- Produces: `POST /api/identity/role-assignments` and `GET /api/identity/role-assignments?companyId=`, both gated by the `CompanyOffice` policy (Task 6) against `request.CompanyId`/the query `companyId`.
- Consumes: `IOrganizationLookupClient.WarehouseExistsAsync` (Task 3), `IOutboxWriter` + `UserClaimsSyncRequestedEvent` (Task 4), `IdentityDbContext.OfficeRoleId`/`OperatorRoleId` (Task 2).

- [ ] **Step 1: Define the request/response models**

```csharp
// source/apps/ikho-identity/Features/RoleAssignments/RoleAssignmentModels.cs
namespace Ikho.Identity.Features.RoleAssignments;

public sealed record CreateRoleAssignmentRequest(Guid CompanyId, Guid UserId, Guid? WarehouseId, string RoleName);

public sealed record RoleAssignmentResponse(Guid Id, Guid UserId, Guid CompanyId, Guid? WarehouseId, string RoleName, DateTimeOffset CreatedAtUtc);
```

- [ ] **Step 2: Write the service**

```csharp
// source/apps/ikho-identity/Features/RoleAssignments/RoleAssignmentService.cs
using System.Text.Json;
using Ikho.Identity.Domain;
using Ikho.Identity.Features.ClaimsSync;
using Ikho.Identity.Shared;
using Ikho.Identity.Shared.Organization;
using Ikho.SharedLibrary.Outbox;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Identity.Features.RoleAssignments;

public enum CreateRoleAssignmentOutcome
{
    Created,
    ValidationFailed,
    UserNotFound,
    WarehouseNotFound,
}

public sealed class RoleAssignmentService(IdentityDbContext db, IOrganizationLookupClient organizationLookup, IOutboxWriter outbox)
{
    public async Task<(CreateRoleAssignmentOutcome Outcome, RoleAssignmentResponse? Assignment)> CreateAsync(
        CreateRoleAssignmentRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        var roleId = request.RoleName switch
        {
            RoleNames.Office => IdentityDbContext.OfficeRoleId,
            RoleNames.Operator => IdentityDbContext.OperatorRoleId,
            _ => (Guid?)null,
        };
        if (roleId is null)
        {
            return (CreateRoleAssignmentOutcome.ValidationFailed, null);
        }

        var userExists = await db.Users.AnyAsync(u => u.Id == request.UserId, cancellationToken);
        if (!userExists)
        {
            return (CreateRoleAssignmentOutcome.UserNotFound, null);
        }

        if (request.WarehouseId is { } warehouseId &&
            !await organizationLookup.WarehouseExistsAsync(request.CompanyId, warehouseId, cancellationToken))
        {
            return (CreateRoleAssignmentOutcome.WarehouseNotFound, null);
        }

        var existing = await db.RoleAssignments.SingleOrDefaultAsync(a =>
            a.UserId == request.UserId && a.CompanyId == request.CompanyId && a.WarehouseId == request.WarehouseId, cancellationToken);
        if (existing is not null)
        {
            existing.RoleId = roleId.Value;
        }
        else
        {
            existing = new RoleAssignment
            {
                UserId = request.UserId,
                CompanyId = request.CompanyId,
                WarehouseId = request.WarehouseId,
                RoleId = roleId.Value,
            };
            db.RoleAssignments.Add(existing);
        }

        var payload = JsonSerializer.Serialize(new UserClaimsSyncRequestedEvent(request.UserId));
        db.OutboxMessages.Add(outbox.Enqueue(nameof(UserClaimsSyncRequestedEvent), payload, correlationId));

        await db.SaveChangesAsync(cancellationToken);

        return (CreateRoleAssignmentOutcome.Created, new RoleAssignmentResponse(
            existing.Id, existing.UserId, existing.CompanyId, existing.WarehouseId, request.RoleName, existing.CreatedAtUtc));
    }

    public async Task<IReadOnlyList<RoleAssignmentResponse>> GetByCompanyAsync(Guid companyId, CancellationToken cancellationToken)
    {
        var assignments = await db.RoleAssignments
            .Where(a => a.CompanyId == companyId)
            .Join(db.Roles, a => a.RoleId, r => r.Id, (a, r) => new RoleAssignmentResponse(a.Id, a.UserId, a.CompanyId, a.WarehouseId, r.Name, a.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return assignments;
    }
}
```

- [ ] **Step 3: Write the endpoints, gated by `CompanyOffice`**

```csharp
// source/apps/ikho-identity/Features/RoleAssignments/RoleAssignmentEndpoints.cs
using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Identity.Features.RoleAssignments;

public static class RoleAssignmentEndpoints
{
    public static IEndpointRouteBuilder MapRoleAssignmentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/identity/role-assignments").WithTags("RoleAssignments").RequireAuthorization();

        group.MapPost("/", async Task<Results<Created<RoleAssignmentResponse>, ForbidHttpResult, BadRequest<string>, NotFound<string>>> (
            CreateRoleAssignmentRequest request,
            HttpContext httpContext,
            IAuthorizationService authorizationService,
            RoleAssignmentService service,
            CancellationToken cancellationToken) =>
        {
            var authResult = await authorizationService.AuthorizeAsync(httpContext.User, request.CompanyId, "CompanyOffice");
            if (!authResult.Succeeded)
            {
                return TypedResults.Forbid();
            }

            var (outcome, assignment) = await service.CreateAsync(request, httpContext.GetCorrelationId(), cancellationToken);

            return outcome switch
            {
                CreateRoleAssignmentOutcome.ValidationFailed => TypedResults.BadRequest("RoleName must be 'Office' or 'Operator'."),
                CreateRoleAssignmentOutcome.UserNotFound => TypedResults.NotFound("User not found."),
                CreateRoleAssignmentOutcome.WarehouseNotFound => TypedResults.NotFound("Warehouse not found for this company."),
                _ => TypedResults.Created($"/api/identity/role-assignments/{assignment!.Id}", assignment),
            };
        });

        group.MapGet("/", async Task<Results<Ok<IReadOnlyList<RoleAssignmentResponse>>, ForbidHttpResult>> (
            Guid companyId,
            HttpContext httpContext,
            IAuthorizationService authorizationService,
            RoleAssignmentService service,
            CancellationToken cancellationToken) =>
        {
            var authResult = await authorizationService.AuthorizeAsync(httpContext.User, companyId, "CompanyOffice");
            if (!authResult.Succeeded)
            {
                return TypedResults.Forbid();
            }

            return TypedResults.Ok(await service.GetByCompanyAsync(companyId, cancellationToken));
        });

        return app;
    }
}
```

- [ ] **Step 4: Register the service and endpoints in `Program.cs`**

Add `using Ikho.Identity.Features.RoleAssignments;` to the top of `source/apps/ikho-identity/Program.cs`. Before `var app = builder.Build();`:

```csharp
builder.Services.AddScoped<RoleAssignmentService>();
```

After `app.MapWebhookEndpoints();`:

```csharp
app.MapRoleAssignmentEndpoints();
```

- [ ] **Step 5: Write the endpoint test**

```csharp
// source/apps/ikho-identity/Ikho.Identity.Tests/Features/RoleAssignments/RoleAssignmentEndpointsTests.cs
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
}
```

- [ ] **Step 6: Run the full test suite**

Run: `cd source && dotnet test apps/ikho-identity/Ikho.Identity.Tests/Ikho.Identity.Tests.csproj`
Expected: PASS for all tests, including the two `CompanyOfficeAuthorizationTests` left pending from Task 6 (the endpoint now exists).

- [ ] **Step 7: Commit**

```bash
git add source/apps/ikho-identity
git commit -m "feat(ikho-identity): add role assignment feature gated by the CompanyOffice policy"
```

---

## Task 8: `ClaimsSyncConsumer` — push role changes back to Clerk

**Files:**
- Create: `source/apps/ikho-identity/Features/ClaimsSync/ClaimsSyncHandler.cs`
- Create: `source/apps/ikho-identity/Ikho.Identity.Tests/Features/ClaimsSync/ClaimsSyncHandlerTests.cs`
- Modify: `source/apps/ikho-identity/Program.cs`
- Modify: `source/apps/ikho-identity/appsettings.json` (confirm `TopicPrefix` already `identity` — set in Task 2, no change needed)

**Interfaces:**
- Produces: `ClaimsSyncHandler : IIntegrationEventHandler<UserClaimsSyncRequestedEvent>` — resolves a user's current `RoleAssignment`s and calls `IIdentityProvider.PushUserClaimsAsync`.
- Consumes: `IIntegrationEventHandler<TEvent>`/`AddKafkaConsumer` (existing shared-library, Task 4's `UserClaimsSyncRequestedEvent`, Task 4's `RoleClaim`/`UserClaimsPayload`, Task 2's `IdentityDbContext`).

- [ ] **Step 1: Write the handler**

```csharp
// source/apps/ikho-identity/Features/ClaimsSync/ClaimsSyncHandler.cs
using Ikho.Identity.Shared;
using Ikho.Identity.Shared.IdentityProvider;
using Ikho.SharedLibrary.Events;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Identity.Features.ClaimsSync;

/// <summary>
/// Reacts to <see cref="UserClaimsSyncRequestedEvent"/> by loading the user's current role
/// assignments and pushing them to the identity provider, so its session token claims stay in
/// sync with local role/company-membership changes.
/// </summary>
public sealed class ClaimsSyncHandler(IdentityDbContext db, IIdentityProvider identityProvider) : IIntegrationEventHandler<UserClaimsSyncRequestedEvent>
{
    public async Task HandleAsync(UserClaimsSyncRequestedEvent @event, string? correlationId, CancellationToken cancellationToken)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Id == @event.UserId, cancellationToken);
        if (user is null)
        {
            return;
        }

        var assignments = await db.RoleAssignments
            .Where(a => a.UserId == @event.UserId)
            .Join(db.Roles, a => a.RoleId, r => r.Id, (a, r) => new RoleClaim(a.CompanyId, a.WarehouseId, r.Name))
            .ToListAsync(cancellationToken);

        await identityProvider.PushUserClaimsAsync(user.ExternalUserId, new UserClaimsPayload(assignments), cancellationToken);
    }
}
```

- [ ] **Step 2: Register the Kafka consumer in `Program.cs`**

Add `using Ikho.Identity.Features.ClaimsSync;` and `using Ikho.SharedLibrary.Events;` to the top of `source/apps/ikho-identity/Program.cs`. Before `var app = builder.Build();`:

```csharp
builder.Services.AddKafkaConsumer<IdentityDbContext, UserClaimsSyncRequestedEvent, ClaimsSyncHandler>(
    "identity.UserClaimsSyncRequestedEvent", nameof(UserClaimsSyncRequestedEvent), "Ikho.Identity.ClaimsSync");
```

(Topic name follows `KafkaEventPublisher`'s `{TopicPrefix}.{eventType}` convention — `TopicPrefix` is `identity`, set in Task 2's `appsettings.json`.)

- [ ] **Step 3: Write the handler test (direct invocation, no real Kafka)**

```csharp
// source/apps/ikho-identity/Ikho.Identity.Tests/Features/ClaimsSync/ClaimsSyncHandlerTests.cs
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
        db.Roles.Add(new Role { Id = IdentityDbContext.OfficeRoleId, Name = RoleNames.Office });
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
```

- [ ] **Step 4: Run the full test suite**

Run: `cd source && dotnet test apps/ikho-identity/Ikho.Identity.Tests/Ikho.Identity.Tests.csproj`
Expected: PASS for all tests.

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-identity
git commit -m "feat(ikho-identity): add ClaimsSyncConsumer pushing role changes back to Clerk"
```

---

## Task 9: Gateway routing, infra, and architecture docs

**Files:**
- Modify: `source/apps/ikho-api-gateway/appsettings.json`
- Modify: `source/apps/ikho-api-gateway/Program.cs`
- Modify: `source/docker-compose.yml`
- Modify: `source/docker/postgres/init-databases.sql`
- Modify: `docs/architecture/api-gateway.md`
- Modify: `docs/architecture/README.md`
- Modify: `docs/plans/warehouse-microservices-rollout-plan.md`

This task wires `Ikho.Identity` into the same infrastructure every other warehouse service already uses — no new patterns, just the standard additions.

- [ ] **Step 1: Add the gateway route/cluster**

In `source/apps/ikho-api-gateway/appsettings.json`, add a new route inside `"Routes"` (after `"warehouse-reporting-route"`):

```json
      "identity-route": {
        "ClusterId": "identity-cluster",
        "Order": 1,
        "Match": {
          "Path": "/api/identity/{**catch-all}"
        }
      }
```

and a new cluster inside `"Clusters"` (after `"warehouse-reporting-cluster"`):

```json
      "identity-cluster": {
        "Destinations": { "destination1": { "Address": "http://localhost:5160" } }
      }
```

- [ ] **Step 2: Add Identity to the gateway's aggregated Scalar docs**

In `source/apps/ikho-api-gateway/Program.cs`, add after `.AddDocument("reporting", ...)`:

```csharp
        .AddDocument("identity", "Identity", "/api/identity/openapi/v1.json")
```

- [ ] **Step 3: Add the Postgres database and docker-compose service block**

In `source/docker/postgres/init-databases.sql`, add after the `ikho_warehouse_reporting` line:

```sql
CREATE DATABASE ikho_identity OWNER ikho;
```

In `source/docker-compose.yml`, add a new service block after `warehouse-reporting` (before the gateway's own block), matching the existing shape exactly:

```yaml
  identity:
    build:
      context: .
      dockerfile: docker/dotnet.Dockerfile
      args:
        PROJECT_PATH: apps/ikho-identity/Ikho.Identity.csproj
        ASSEMBLY_NAME: Ikho.Identity
    container_name: ikho-identity
    environment:
      Database__ConnectionString: Host=postgres;Port=5432;Database=ikho_identity;Username=ikho;Password=ikho
      MessageBroker__BootstrapServers: kafka:29092
    ports:
      - "5160:8080"
    depends_on:
      postgres:
        condition: service_healthy
      kafka:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
```

- [ ] **Step 4: Build the gateway to verify the config/docs changes compile**

Run: `cd source && dotnet build apps/ikho-api-gateway/Ikho.ApiGateway.csproj`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Update architecture docs**

In `docs/architecture/api-gateway.md`, add a row to the warehouse-services port table (or the nearest equivalent list — insert after the Reporting entry) noting `Ikho.Identity` at port `5160`, routed at `/api/identity/*`, and update the **Open questions** §1 (Identity provider) to note Clerk is now wired in as the first provider via `Ikho.Identity`'s `IIdentityProvider` abstraction, with `Jwt:Authority`/`Jwt:Audience` still pending real Clerk instance values.

In `docs/architecture/README.md`, add `Ikho.Identity` to the Container Diagram (`Container(identitysvc, "Ikho.Identity", ".NET 10 Minimal API", "Roles, company membership, and Clerk-backed authentication")`) with a `Rel(gateway, identitysvc, "/api/identity/*", "HTTP/JSON")` line and a table row (`5160`), following the same pattern as the nine warehouse services.

In `docs/plans/warehouse-microservices-rollout-plan.md`, update the `Identity / Access` row's **Execution Priority** column from `Existing / separate concern` to `Implemented (Clerk-backed, see docs/superpowers/specs/2026-08-16-identity-service-design.md)`.

- [ ] **Step 6: Commit**

```bash
git add source/apps/ikho-api-gateway source/docker-compose.yml source/docker/postgres/init-databases.sql docs/architecture docs/plans/warehouse-microservices-rollout-plan.md
git commit -m "feat: route /api/identity through the gateway and register Ikho.Identity in local infra"
```

---

## Self-Review Notes

- **Spec coverage:** Provider abstraction (Task 4/5), Clerk-org-to-Company mapping gap resolved (Task 3), webhook sync (Task 4), claims push via outbox/Kafka (Task 4, 8), gateway/shared-library JWT unification (Task 1, 6), role assignment + `CompanyOffice` authorization (Task 6, 7), infra/docs (Task 9) — all design-spec sections have a task. Frontend (`ikho-ui`) is explicitly deferred to a follow-up plan, as called out in Global Constraints.
- **Type consistency verified:** `RoleClaim(CompanyId, WarehouseId, RoleName)` is defined once in Task 4 and reused identically by `ClerkIdentityProvider.PushUserClaimsAsync` (Task 5), `CompanyOfficeAuthorizationHandler` (Task 6), and `ClaimsSyncHandler` (Task 8). `IdentityDbContext.OfficeRoleId`/`OperatorRoleId` (Task 2) are reused verbatim in Task 4's default-role logic and Task 7's role lookup. `UserClaimsSyncRequestedEvent(Guid UserId)` (Task 4) is produced by both Task 4's webhook flow and Task 7's role-assignment flow, and consumed by Task 8's handler with the same shape throughout.
- **No placeholders:** every step has real, complete code; the two known "not-yet-real" values (`Clerk:SecretKey`, `Clerk:WebhookSigningSecret`, `Jwt:Authority`/`Jwt:Audience`) are explicitly documented as environment-provisioning placeholders in Task 2's `appsettings.json`, consistent with how this repo already handles the gateway's pre-existing `Jwt` placeholders — not a plan gap.
