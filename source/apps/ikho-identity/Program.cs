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
