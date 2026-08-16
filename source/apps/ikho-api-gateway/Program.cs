using Ikho.SharedLibrary.Authentication;
using Ikho.ApiGateway.Shared.Cors;
using Ikho.ApiGateway.Shared.Middleware;
using Ikho.ApiGateway.Shared.RateLimiting;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

builder.Services.AddGatewayCors(builder.Configuration);
builder.Services.AddJwtBearerAuthentication(builder.Configuration);
builder.Services.AddGatewayRateLimiting(builder.Configuration);

var app = builder.Build();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseGatewayCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// Centralized docs: each warehouse service maps its own OpenAPI document and Scalar UI under
// its own /api/warehouse/{capability} prefix (see Ikho.SharedLibrary.ApiDocs.ApiDocsExtensions),
// so these URLs are proxied here exactly like any other request - no gateway route changes
// needed. This page just aggregates them into one dropdown-driven Scalar UI.
app.MapScalarApiReference("/docs", options =>
{
    options
        .AddDocument("organization", "Organization", "/api/warehouse/organization/openapi/v1.json")
        .AddDocument("catalog", "Catalog", "/api/warehouse/catalog/openapi/v1.json")
        .AddDocument("partner", "Partner", "/api/warehouse/partner/openapi/v1.json")
        .AddDocument("inventory", "Inventory", "/api/warehouse/inventory/openapi/v1.json")
        .AddDocument("inbound", "Inbound", "/api/warehouse/inbound/openapi/v1.json")
        .AddDocument("outbound", "Outbound", "/api/warehouse/outbound/openapi/v1.json")
        .AddDocument("returns", "Returns", "/api/warehouse/returns/openapi/v1.json")
        .AddDocument("billing", "Billing", "/api/warehouse/billing/openapi/v1.json")
        .AddDocument("reporting", "Reporting", "/api/warehouse/reporting/openapi/v1.json");
});

app.MapReverseProxy().RequireRateLimiting(RateLimitingExtensions.PolicyName);

app.Run();
