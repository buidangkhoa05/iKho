using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace Ikho.SharedLibrary.Authentication;

/// <summary>
/// Registers provider-agnostic JWT bearer authentication from the <c>Jwt</c> configuration
/// section. Shared by every service that needs to validate a caller's JWT directly (the
/// gateway, and any service enforcing its own <c>[Authorize]</c> policies), so there is one
/// place that knows how to validate a token regardless of which identity provider issued it.
/// </summary>
public static class JwtBearerAuthenticationExtensions
{
    /// <summary>
    /// Adds JWT bearer authentication and authorization services, configured from
    /// <c>Jwt:Authority</c>/<c>Jwt:Audience</c>. Both may be blank (token validation fails
    /// closed) if no identity provider is configured yet for this environment.
    /// </summary>
    public static IServiceCollection AddJwtBearerAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var authority = configuration["Jwt:Authority"];
        var audience = configuration["Jwt:Audience"];

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
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
