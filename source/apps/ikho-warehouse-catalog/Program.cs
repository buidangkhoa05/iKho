using Ikho.SharedLibrary;
using Ikho.SharedLibrary.ApiDocs;
using Ikho.SharedLibrary.Options;
using Ikho.Warehouse.Catalog.Features.Brands;
using Ikho.Warehouse.Catalog.Features.Categories;
using Ikho.Warehouse.Catalog.Features.Products;
using Ikho.Warehouse.Catalog.Features.UnitsOfMeasure;
using Ikho.Warehouse.Catalog.Shared;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var databaseOptions = builder.Configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>() ?? new DatabaseOptions();
builder.Services.AddDbContext<CatalogDbContext>(options =>
    options.UseNpgsql(databaseOptions.ConnectionString));

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
