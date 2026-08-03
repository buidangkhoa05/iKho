using Ikho.ApiGateway.Shared.Authentication;
using Ikho.ApiGateway.Shared.Cors;
using Ikho.ApiGateway.Shared.Middleware;
using Ikho.ApiGateway.Shared.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

builder.Services.AddGatewayCors(builder.Configuration);
builder.Services.AddGatewayAuthentication(builder.Configuration);
builder.Services.AddGatewayRateLimiting(builder.Configuration);

var app = builder.Build();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseGatewayCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapReverseProxy().RequireRateLimiting(RateLimitingExtensions.PolicyName);

app.Run();
