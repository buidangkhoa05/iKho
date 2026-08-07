using Ikho.SharedLibrary;
using Ikho.SharedLibrary.ApiDocs;
using Ikho.Warehouse.Outbound.Features.Allocations;
using Ikho.Warehouse.Outbound.Features.SalesOrders;
using Ikho.Warehouse.Outbound.Features.Shipments;
using Ikho.Warehouse.Outbound.Shared;
using Ikho.Warehouse.Outbound.Shared.Clients;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<OutboundDbContext>(options =>
    options.UseNpgsql(builder.Configuration["Database:ConnectionString"]));

builder.Services.AddServiceDefaults<OutboundDbContext>(builder.Configuration);
builder.Services.AddServiceApiDocs();

builder.Services.AddHttpClient<ICatalogApiClient, CatalogApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["Services:Catalog"]!));
builder.Services.AddHttpClient<IPartnerApiClient, PartnerApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["Services:Partner"]!));
builder.Services.AddHttpClient<IOrganizationApiClient, OrganizationApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["Services:Organization"]!));
builder.Services.AddHttpClient<IInventoryApiClient, InventoryApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["Services:Inventory"]!));

builder.Services.AddScoped<ISalesOrdersRepository, SalesOrdersRepository>();
builder.Services.AddScoped<SalesOrdersService>();
builder.Services.AddScoped<IAllocationsRepository, AllocationsRepository>();
builder.Services.AddScoped<AllocationsService>();
builder.Services.AddScoped<IShipmentsRepository, ShipmentsRepository>();
builder.Services.AddScoped<ShipmentsService>();

var app = builder.Build();

app.UseServiceDefaults(); // correlation id -> request logging -> health check endpoints
app.MapServiceApiDocs("/api/warehouse/outbound");

app.MapSalesOrdersEndpoints();
app.MapAllocationsEndpoints();
app.MapShipmentsEndpoints();

app.Run();

/// <summary>
/// Entry point class, exposed for <c>WebApplicationFactory&lt;Program&gt;</c> integration tests.
/// </summary>
public partial class Program;
