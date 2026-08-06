using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Scalar.AspNetCore;

namespace Ikho.SharedLibrary.ApiDocs;

/// <summary>
/// Wires OpenAPI generation and a Scalar UI for a warehouse service, consistent with this
/// platform's convention of mapping every endpoint under a full <c>/api/warehouse/{capability}</c>
/// prefix (see e.g. <c>StockReceiptsEndpoints.MapStockReceiptsEndpoints</c>). The generated OpenAPI
/// document and the Scalar UI are mapped under that same prefix rather than the library defaults
/// (<c>/openapi/v1.json</c>, <c>/scalar</c>), so both remain reachable through the API gateway's
/// existing per-service YARP route with no gateway route changes — YARP forwards the full incoming
/// path verbatim, so a downstream endpoint only becomes reachable through the gateway if it already
/// lives under that service's routed prefix.
/// </summary>
public static class ApiDocsExtensions
{
    /// <summary>Registers OpenAPI document generation for this service.</summary>
    public static IServiceCollection AddServiceApiDocs(this IServiceCollection services) =>
        services.AddOpenApi();

    /// <summary>
    /// Maps the OpenAPI document at <c>{routePrefix}/openapi/v1.json</c> and a Scalar UI at
    /// <c>{routePrefix}/scalar</c>. <paramref name="routePrefix"/> must match the prefix this
    /// service's own endpoints are mapped under (e.g. <c>/api/warehouse/inventory</c>).
    /// </summary>
    public static WebApplication MapServiceApiDocs(this WebApplication app, string routePrefix)
    {
        var prefix = routePrefix.TrimEnd('/');
        var openApiRoutePattern = $"{prefix}/openapi/{{documentName}}.json";

        app.MapOpenApi(openApiRoutePattern);
        app.MapScalarApiReference($"{prefix}/scalar", options => options.WithOpenApiRoutePattern(openApiRoutePattern));

        return app;
    }
}
