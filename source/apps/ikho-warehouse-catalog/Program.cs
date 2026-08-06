using Ikho.SharedLibrary;
using Ikho.SharedLibrary.ApiDocs;
using Ikho.WarehouseCatalog.Features.Brands;
using Ikho.WarehouseCatalog.Features.Categories;
using Ikho.WarehouseCatalog.Features.Products;
using Ikho.WarehouseCatalog.Features.UnitsOfMeasure;
using Ikho.WarehouseCatalog.Shared;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<CatalogDbContext>(options =>
    options.UseNpgsql(builder.Configuration["Database:ConnectionString"]));

builder.Services.AddServiceDefaults<CatalogDbContext>(builder.Configuration);
builder.Services.AddServiceApiDocs();

builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<ProductsService>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<CategoriesService>();
builder.Services.AddScoped<IBrandRepository, BrandRepository>();
builder.Services.AddScoped<BrandsService>();
builder.Services.AddScoped<IUomRepository, UomRepository>();
builder.Services.AddScoped<UnitsOfMeasureService>();

var app = builder.Build();

app.UseServiceDefaults(); // correlation id -> request logging -> health check endpoints
app.MapServiceApiDocs("/api/warehouse/catalog");

app.MapProductsEndpoints();
app.MapCategoriesEndpoints();
app.MapBrandsEndpoints();
app.MapUnitsOfMeasureEndpoints();

app.Run();

/// <summary>
/// Entry point class, exposed for <c>WebApplicationFactory&lt;Program&gt;</c> integration tests.
/// </summary>
public partial class Program;
