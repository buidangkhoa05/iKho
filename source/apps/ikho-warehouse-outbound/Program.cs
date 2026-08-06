using Ikho.SharedLibrary;
using Ikho.WarehouseOutbound.Features.Allocations;
using Ikho.WarehouseOutbound.Features.SalesOrders;
using Ikho.WarehouseOutbound.Features.Shipments;
using Ikho.WarehouseOutbound.Shared;
using Ikho.WarehouseOutbound.Shared.Clients;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<OutboundDbContext>(options =>
    options.UseNpgsql(builder.Configuration["Database:ConnectionString"]));

builder.Services.AddServiceDefaults<OutboundDbContext>(builder.Configuration);

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

app.MapSalesOrdersEndpoints();
app.MapAllocationsEndpoints();
app.MapShipmentsEndpoints();

app.Run();

/// <summary>
/// Entry point class, exposed for <c>WebApplicationFactory&lt;Program&gt;</c> integration tests.
/// </summary>
public partial class Program;
