using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace Ikho.ApiGateway.Shared.RateLimiting;

/// <summary>
/// Registers a fixed-window rate limiter for the gateway, configured from the
/// <c>RateLimiting</c> configuration section.
/// </summary>
public static class RateLimitingExtensions
{
    /// <summary>
    /// The name of the rate limiting policy registered by <see cref="AddGatewayRateLimiting"/>.
    /// </summary>
    public const string PolicyName = "GatewayFixedWindow";

    /// <summary>
    /// Adds a fixed-window rate limiter policy, partitioned per client IP address, with
    /// limits read from the <c>RateLimiting:PermitLimit</c>, <c>RateLimiting:WindowSeconds</c>
    /// and <c>RateLimiting:QueueLimit</c> configuration values.
    /// </summary>
    /// <example>
    /// <code>
    /// builder.Services.AddGatewayRateLimiting(builder.Configuration);
    /// </code>
    /// </example>
    public static IServiceCollection AddGatewayRateLimiting(this IServiceCollection services, IConfiguration configuration)
    {
        var permitLimit = configuration.GetValue("RateLimiting:PermitLimit", 100);
        var windowSeconds = configuration.GetValue("RateLimiting:WindowSeconds", 10);
        var queueLimit = configuration.GetValue("RateLimiting:QueueLimit", 0);

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.AddPolicy(PolicyName, httpContext =>
            {
                var partitionKey = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

                return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = permitLimit,
                    Window = TimeSpan.FromSeconds(windowSeconds),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = queueLimit,
                });
            });
        });

        return services;
    }
}
