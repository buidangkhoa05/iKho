using Ikho.SharedLibrary;
using Ikho.WarehousePartner.Features.Customers;
using Ikho.WarehousePartner.Features.Suppliers;
using Ikho.WarehousePartner.Shared;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<PartnerDbContext>(options =>
    options.UseNpgsql(builder.Configuration["Database:ConnectionString"]));

builder.Services.AddServiceDefaults<PartnerDbContext>(builder.Configuration);

builder.Services.AddScoped<ISupplierRepository, SupplierRepository>();
builder.Services.AddScoped<SuppliersService>();
builder.Services.AddScoped<ICustomerRepository, CustomerRepository>();
builder.Services.AddScoped<CustomersService>();

var app = builder.Build();

app.UseServiceDefaults(); // correlation id -> request logging -> health check endpoints

app.MapSuppliersEndpoints();
app.MapCustomersEndpoints();

app.Run();

/// <summary>
/// Entry point class, exposed for <c>WebApplicationFactory&lt;Program&gt;</c> integration tests.
/// </summary>
public partial class Program;
