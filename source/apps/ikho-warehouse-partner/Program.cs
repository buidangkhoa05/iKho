using Ikho.SharedLibrary;
using Ikho.SharedLibrary.ApiDocs;
using Ikho.SharedLibrary.Options;
using Ikho.Warehouse.Partner.Features.Customers;
using Ikho.Warehouse.Partner.Features.Suppliers;
using Ikho.Warehouse.Partner.Shared;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var databaseOptions = builder.Configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>() ?? new DatabaseOptions();
builder.Services.AddDbContext<PartnerDbContext>(options =>
    options.UseNpgsql(databaseOptions.ConnectionString));

builder.Services.AddServiceDefaults<PartnerDbContext>(builder.Configuration);
builder.Services.AddServiceApiDocs();

builder.Services.AddScoped<ISupplierRepository, SupplierRepository>();
builder.Services.AddScoped<SuppliersService>();
builder.Services.AddScoped<ICustomerRepository, CustomerRepository>();
builder.Services.AddScoped<CustomersService>();

var app = builder.Build();

app.UseServiceDefaults(); // correlation id -> request logging -> health check endpoints
app.MapServiceApiDocs("/api/warehouse/partner");

app.MapSuppliersEndpoints();
app.MapCustomersEndpoints();

app.Run();

/// <summary>
/// Entry point class, exposed for <c>WebApplicationFactory&lt;Program&gt;</c> integration tests.
/// </summary>
public partial class Program;
