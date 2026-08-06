using Ikho.SharedLibrary;
using Ikho.SharedLibrary.ApiDocs;
using Ikho.WarehouseInbound.Features.PurchaseOrders;
using Ikho.WarehouseInbound.Features.Receipts;
using Ikho.WarehouseInbound.Shared;
using Ikho.WarehouseInbound.Shared.Clients;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<InboundDbContext>(options =>
    options.UseNpgsql(builder.Configuration["Database:ConnectionString"]));

builder.Services.AddServiceDefaults<InboundDbContext>(builder.Configuration);
builder.Services.AddServiceApiDocs();

builder.Services.AddHttpClient<ICatalogApiClient, CatalogApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["Services:Catalog"]!));
builder.Services.AddHttpClient<IPartnerApiClient, PartnerApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["Services:Partner"]!));
builder.Services.AddHttpClient<IOrganizationApiClient, OrganizationApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["Services:Organization"]!));
builder.Services.AddHttpClient<IInventoryApiClient, InventoryApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["Services:Inventory"]!));

builder.Services.AddScoped<IPurchaseOrdersRepository, PurchaseOrdersRepository>();
builder.Services.AddScoped<PurchaseOrdersService>();
builder.Services.AddScoped<IReceiptsRepository, ReceiptsRepository>();
builder.Services.AddScoped<ReceiptsService>();

var app = builder.Build();

app.UseServiceDefaults(); // correlation id -> request logging -> health check endpoints
app.MapServiceApiDocs("/api/warehouse/inbound");

app.MapPurchaseOrdersEndpoints();
app.MapReceiptsEndpoints();

app.Run();

/// <summary>
/// Entry point class, exposed for <c>WebApplicationFactory&lt;Program&gt;</c> integration tests.
/// </summary>
public partial class Program;
