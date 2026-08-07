using Ikho.SharedLibrary;
using Ikho.SharedLibrary.ApiDocs;
using Ikho.SharedLibrary.Options;
using Ikho.Warehouse.Billing.Features.CreditNotes;
using Ikho.Warehouse.Billing.Features.Invoices;
using Ikho.Warehouse.Billing.Features.Payments;
using Ikho.Warehouse.Billing.Shared;
using Ikho.Warehouse.Billing.Shared.Clients;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var databaseOptions = builder.Configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>() ?? new DatabaseOptions();
builder.Services.AddDbContext<BillingDbContext>(options =>
    options.UseNpgsql(databaseOptions.ConnectionString));

builder.Services.AddServiceDefaults<BillingDbContext>(builder.Configuration);
builder.Services.AddServiceApiDocs();

builder.Services.AddHttpClient<ICatalogApiClient, CatalogApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["Services:Catalog"]!));
builder.Services.AddHttpClient<IPartnerApiClient, PartnerApiClient>(client =>
    client.BaseAddress = new Uri(builder.Configuration["Services:Partner"]!));

builder.Services.AddScoped<IInvoicesRepository, InvoicesRepository>();
builder.Services.AddScoped<InvoicesService>();
builder.Services.AddScoped<ICreditNotesRepository, CreditNotesRepository>();
builder.Services.AddScoped<CreditNotesService>();
builder.Services.AddScoped<IPaymentsRepository, PaymentsRepository>();
builder.Services.AddScoped<PaymentsService>();

var app = builder.Build();

app.UseServiceDefaults(); // correlation id -> request logging -> health check endpoints
app.MapServiceApiDocs("/api/warehouse/billing");

app.MapInvoicesEndpoints();
app.MapCreditNotesEndpoints();
app.MapPaymentsEndpoints();

app.Run();

/// <summary>
/// Entry point class, exposed for <c>WebApplicationFactory&lt;Program&gt;</c> integration tests.
/// </summary>
public partial class Program;
