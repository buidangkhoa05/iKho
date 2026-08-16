using Ikho.Identity.Features.ClaimsSync;
using Ikho.Identity.Features.RoleAssignments;
using Ikho.Identity.Features.Webhooks;
using Ikho.Identity.Shared;
using Ikho.Identity.Shared.Authorization;
using Ikho.Identity.Shared.IdentityProvider;
using Ikho.Identity.Shared.Organization;
using Ikho.SharedLibrary;
using Ikho.SharedLibrary.ApiDocs;
using Ikho.SharedLibrary.Authentication;
using Ikho.SharedLibrary.Events;
using Ikho.SharedLibrary.Options;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var databaseOptions = builder.Configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>() ?? new DatabaseOptions();
builder.Services.AddDbContext<IdentityDbContext>(options =>
    options.UseNpgsql(databaseOptions.ConnectionString));

builder.Services.AddServiceDefaults<IdentityDbContext>(builder.Configuration);
builder.Services.AddServiceApiDocs();

builder.Services.AddHttpClient<IOrganizationLookupClient, OrganizationLookupClient>(client =>
{
    var baseUrl = builder.Configuration["Services:Organization:BaseUrl"] ?? "http://localhost:5151";
    client.BaseAddress = new Uri(baseUrl);
});

builder.Services.AddScoped<WebhookService>();

builder.Services.Configure<ClerkOptions>(builder.Configuration.GetSection(ClerkOptions.SectionName));
builder.Services.AddHttpClient<IIdentityProvider, ClerkIdentityProvider>(client =>
{
    client.BaseAddress = new Uri("https://api.clerk.com");
});

builder.Services.AddJwtBearerAuthentication(builder.Configuration);
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("CompanyOffice", policy => policy.Requirements.Add(new CompanyOfficeRequirement()));
builder.Services.AddSingleton<IAuthorizationHandler, CompanyOfficeAuthorizationHandler>();

builder.Services.AddScoped<RoleAssignmentService>();

builder.Services.AddKafkaConsumer<IdentityDbContext, UserClaimsSyncRequestedEvent, ClaimsSyncHandler>(
    "identity.UserClaimsSyncRequestedEvent", nameof(UserClaimsSyncRequestedEvent), "Ikho.Identity.ClaimsSync");

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.UseServiceDefaults(); // correlation id -> request logging -> health check endpoints
app.MapServiceApiDocs("/api/identity");
app.MapWebhookEndpoints();
app.MapRoleAssignmentEndpoints();

app.Run();

/// <summary>Entry point class, exposed for <c>WebApplicationFactory&lt;Program&gt;</c> integration tests.</summary>
public partial class Program;
