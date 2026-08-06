using Ikho.SharedLibrary;
using Ikho.SharedLibrary.ApiDocs;
using Ikho.WarehouseInventory.Features.StockAdjustments;
using Ikho.WarehouseInventory.Features.StockBalances;
using Ikho.WarehouseInventory.Features.StockReceipts;
using Ikho.WarehouseInventory.Features.StockReservations;
using Ikho.WarehouseInventory.Shared;
using Ikho.WarehouseInventory.Shared.Clients;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<InventoryDbContext>(options =>
    options.UseNpgsql(builder.Configuration["Database:ConnectionString"]));

builder.Services.AddServiceDefaults<InventoryDbContext>(builder.Configuration);
builder.Services.AddServiceApiDocs();

builder.Services.AddHttpClient<ICatalogApiClient, CatalogApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["Services:Catalog"]!));
builder.Services.AddHttpClient<IOrganizationApiClient, OrganizationApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["Services:Organization"]!));

builder.Services.AddScoped<IStockReceiptsRepository, StockReceiptsRepository>();
builder.Services.AddScoped<StockReceiptsService>();
builder.Services.AddScoped<IStockAdjustmentsRepository, StockAdjustmentsRepository>();
builder.Services.AddScoped<StockAdjustmentsService>();
builder.Services.AddScoped<IStockReservationsRepository, StockReservationsRepository>();
builder.Services.AddScoped<StockReservationsService>();
builder.Services.AddScoped<IStockBalancesRepository, StockBalancesRepository>();
builder.Services.AddScoped<StockBalancesService>();

var app = builder.Build();

app.UseServiceDefaults(); // correlation id -> request logging -> health check endpoints
app.MapServiceApiDocs("/api/warehouse/inventory");

app.MapStockReceiptsEndpoints();
app.MapStockAdjustmentsEndpoints();
app.MapStockReservationsEndpoints();
app.MapStockBalancesEndpoints();

app.Run();

/// <summary>
/// Entry point class, exposed for <c>WebApplicationFactory&lt;Program&gt;</c> integration tests.
/// </summary>
public partial class Program;
