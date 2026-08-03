using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace Ikho.ApiGateway.Shared.Authentication;

/// <summary>
/// Registers JWT bearer authentication for the gateway.
/// </summary>
/// <remarks>
/// No identity provider has been selected yet. The <c>Jwt:Authority</c> and <c>Jwt:Audience</c>
/// configuration values are placeholders — authentication is wired into the pipeline so that
/// protected routes can be added later without further plumbing, but no routes currently
/// require an authenticated principal.
/// </remarks>
public static class JwtAuthenticationExtensions
{
    /// <summary>
    /// Adds JWT bearer authentication and authorization services, configured from the
    /// <c>Jwt</c> configuration section.
    /// </summary>
    /// <example>
    /// <code>
    /// builder.Services.AddGatewayAuthentication(builder.Configuration);
    /// </code>
    /// </example>
    public static IServiceCollection AddGatewayAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var authority = configuration["Jwt:Authority"];
        var audience = configuration["Jwt:Audience"];

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // Authority/Audience are intentionally left blank until an identity provider
                // (e.g. Entra ID, Auth0) is chosen. Token validation will fail closed if a
                // caller presents a bearer token before these are configured.
                options.Authority = authority;
                options.Audience = audience;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = !string.IsNullOrWhiteSpace(authority),
                    ValidateAudience = !string.IsNullOrWhiteSpace(audience),
                    ValidateLifetime = true,
                };
            });

        services.AddAuthorization();

        return services;
    }
}
