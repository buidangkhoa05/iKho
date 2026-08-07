using Ikho.SharedLibrary;
using Ikho.SharedLibrary.ApiDocs;
using Ikho.Warehouse.Returns.Features.Dispositions;
using Ikho.Warehouse.Returns.Features.Inspections;
using Ikho.Warehouse.Returns.Features.ReturnOrders;
using Ikho.Warehouse.Returns.Features.ReturnReceipts;
using Ikho.Warehouse.Returns.Shared;
using Ikho.Warehouse.Returns.Shared.Clients;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ReturnsDbContext>(options =>
    options.UseNpgsql(builder.Configuration["Database:ConnectionString"]));

builder.Services.AddServiceDefaults<ReturnsDbContext>(builder.Configuration);
builder.Services.AddServiceApiDocs();

builder.Services.AddHttpClient<ICatalogApiClient, CatalogApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["Services:Catalog"]!));
builder.Services.AddHttpClient<IOrganizationApiClient, OrganizationApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["Services:Organization"]!));
builder.Services.AddHttpClient<IPartnerApiClient, PartnerApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["Services:Partner"]!));
builder.Services.AddHttpClient<IInventoryApiClient, InventoryApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["Services:Inventory"]!));

builder.Services.AddScoped<IReturnOrdersRepository, ReturnOrdersRepository>();
builder.Services.AddScoped<ReturnOrdersService>();
builder.Services.AddScoped<IReturnReceiptsRepository, ReturnReceiptsRepository>();
builder.Services.AddScoped<ReturnReceiptsService>();
builder.Services.AddScoped<IInspectionsRepository, InspectionsRepository>();
builder.Services.AddScoped<InspectionsService>();
builder.Services.AddScoped<IDispositionsRepository, DispositionsRepository>();
builder.Services.AddScoped<DispositionsService>();

var app = builder.Build();

app.UseServiceDefaults(); // correlation id -> request logging -> health check endpoints
app.MapServiceApiDocs("/api/warehouse/returns");

app.MapReturnOrdersEndpoints();
app.MapReturnReceiptsEndpoints();
app.MapInspectionsEndpoints();
app.MapDispositionsEndpoints();

app.Run();

/// <summary>
/// Entry point class, exposed for <c>WebApplicationFactory&lt;Program&gt;</c> integration tests.
/// </summary>
public partial class Program;
