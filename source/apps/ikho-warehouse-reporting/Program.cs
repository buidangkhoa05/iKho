using Ikho.SchemaManagement.Contracts.WarehouseInbound.Events.V1;
using Ikho.SchemaManagement.Contracts.WarehouseInventory.Events.V1;
using Ikho.SchemaManagement.Contracts.WarehouseOutbound.Events.V1;
using Ikho.SharedLibrary;
using Ikho.SharedLibrary.ApiDocs;
using Ikho.SharedLibrary.Events;
using Ikho.SharedLibrary.Options;
using Ikho.Warehouse.Reporting.Features.FulfillmentKpis;
using Ikho.Warehouse.Reporting.Features.InboundStatus;
using Ikho.Warehouse.Reporting.Features.InboundStatus.Handlers;
using Ikho.Warehouse.Reporting.Features.InventoryPosition;
using Ikho.Warehouse.Reporting.Features.InventoryPosition.Handlers;
using Ikho.Warehouse.Reporting.Features.OutboundStatus;
using Ikho.Warehouse.Reporting.Features.OutboundStatus.Handlers;
using Ikho.Warehouse.Reporting.Shared;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var databaseOptions = builder.Configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>() ?? new DatabaseOptions();
builder.Services.AddDbContext<ReportingDbContext>(options =>
    options.UseNpgsql(databaseOptions.ConnectionString));

// Wires health checks, the (unused-by-this-service) outbox publisher, and the idempotency
// store the Kafka consumers below rely on. Reporting never enqueues outbox messages - see
// the remarks on ReportingDbContext.
builder.Services.AddServiceDefaults<ReportingDbContext>(builder.Configuration);
builder.Services.AddServiceApiDocs();

builder.Services.AddScoped<IInventoryPositionRepository, InventoryPositionRepository>();
builder.Services.AddScoped<InventoryPositionService>();
builder.Services.AddScoped<IInboundStatusRepository, InboundStatusRepository>();
builder.Services.AddScoped<InboundStatusService>();
builder.Services.AddScoped<IOutboundStatusRepository, OutboundStatusRepository>();
builder.Services.AddScoped<OutboundStatusService>();
builder.Services.AddScoped<IFulfillmentKpiRepository, FulfillmentKpiRepository>();
builder.Services.AddScoped<FulfillmentKpiService>();

// Reporting is the platform's first real Kafka consumer: it builds denormalized read models by
// subscribing to the other warehouse services' already-published topics, rather than calling
// them synchronously. Each topic name below is <source service's MessageBroker:TopicPrefix>.
// <EventType>, matching what that service's own appsettings.json configures on the publish
// side (Inventory: warehouse.inventory, Inbound: warehouse.inbound, Outbound: warehouse.outbound).
builder.Services.AddKafkaConsumer<ReportingDbContext, InventoryReceived, InventoryReceivedHandler>(
    "warehouse.inventory.InventoryReceived", nameof(InventoryReceived), "WarehouseReporting.InventoryReceived");
builder.Services.AddKafkaConsumer<ReportingDbContext, StockReserved, StockReservedHandler>(
    "warehouse.inventory.StockReserved", nameof(StockReserved), "WarehouseReporting.StockReserved");
builder.Services.AddKafkaConsumer<ReportingDbContext, StockReleased, StockReleasedHandler>(
    "warehouse.inventory.StockReleased", nameof(StockReleased), "WarehouseReporting.StockReleased");
builder.Services.AddKafkaConsumer<ReportingDbContext, StockShipped, StockShippedHandler>(
    "warehouse.inventory.StockShipped", nameof(StockShipped), "WarehouseReporting.StockShipped");
builder.Services.AddKafkaConsumer<ReportingDbContext, StockAdjusted, StockAdjustedHandler>(
    "warehouse.inventory.StockAdjusted", nameof(StockAdjusted), "WarehouseReporting.StockAdjusted");
builder.Services.AddKafkaConsumer<ReportingDbContext, StockQuarantined, StockQuarantinedHandler>(
    "warehouse.inventory.StockQuarantined", nameof(StockQuarantined), "WarehouseReporting.StockQuarantined");

builder.Services.AddKafkaConsumer<ReportingDbContext, ReceiptCompleted, ReceiptCompletedHandler>(
    "warehouse.inbound.ReceiptCompleted", nameof(ReceiptCompleted), "WarehouseReporting.ReceiptCompleted");
builder.Services.AddKafkaConsumer<ReportingDbContext, PutawayTaskCompleted, PutawayTaskCompletedHandler>(
    "warehouse.inbound.PutawayTaskCompleted", nameof(PutawayTaskCompleted), "WarehouseReporting.PutawayTaskCompleted");

builder.Services.AddKafkaConsumer<ReportingDbContext, AllocationConfirmed, AllocationConfirmedHandler>(
    "warehouse.outbound.AllocationConfirmed", nameof(AllocationConfirmed), "WarehouseReporting.AllocationConfirmed");
builder.Services.AddKafkaConsumer<ReportingDbContext, ShipmentDispatched, ShipmentDispatchedHandler>(
    "warehouse.outbound.ShipmentDispatched", nameof(ShipmentDispatched), "WarehouseReporting.ShipmentDispatched");

var app = builder.Build();

app.UseServiceDefaults(); // correlation id -> request logging -> health check endpoints
app.MapServiceApiDocs("/api/warehouse/reporting");

app.MapInventoryPositionEndpoints();
app.MapInboundStatusEndpoints();
app.MapOutboundStatusEndpoints();
app.MapFulfillmentKpiEndpoints();

app.Run();

/// <summary>
/// Entry point class, exposed for <c>WebApplicationFactory&lt;Program&gt;</c> integration tests.
/// </summary>
public partial class Program;
