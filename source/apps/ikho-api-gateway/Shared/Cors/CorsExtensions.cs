namespace Ikho.ApiGateway.Shared.Cors;

/// <summary>
/// Registers a configuration-driven CORS policy for the gateway, allowing the list
/// of permitted origins to differ per environment (e.g. local Angular dev server vs. production).
/// </summary>
public static class CorsExtensions
{
    /// <summary>
    /// The name of the CORS policy registered by <see cref="AddGatewayCors"/>.
    /// </summary>
    public const string PolicyName = "GatewayCors";

    /// <summary>
    /// Adds a CORS policy whose allowed origins are read from the <c>Cors:AllowedOrigins</c>
    /// configuration section.
    /// </summary>
    /// <example>
    /// <code>
    /// builder.Services.AddGatewayCors(builder.Configuration);
    /// </code>
    /// </example>
    public static IServiceCollection AddGatewayCors(this IServiceCollection services, IConfiguration configuration)
    {
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

        services.AddCors(options =>
        {
            options.AddPolicy(PolicyName, policy =>
            {
                if (allowedOrigins.Length > 0)
                {
                    policy.WithOrigins(allowedOrigins)
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials();
                }
                else
                {
                    // No origins configured (e.g. production placeholder not yet filled in):
                    // deny all cross-origin requests rather than silently allowing everything.
                    policy.WithOrigins([]);
                }
            });
        });

        return services;
    }

    /// <summary>
    /// Applies the gateway's CORS policy to the request pipeline.
    /// </summary>
    public static WebApplication UseGatewayCors(this WebApplication app)
    {
        app.UseCors(PolicyName);

        return app;
    }
}
