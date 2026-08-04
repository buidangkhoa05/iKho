using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Ikho.SharedLibrary.Middleware;

/// <summary>
/// Ensures every request carries a correlation id, either propagated from an incoming
/// <c>X-Correlation-Id</c> header or newly generated, and reflects it back on the response
/// and in the logging scope so downstream logs can be tied together. Mirrors the gateway's
/// <c>CorrelationIdMiddleware</c> so correlation ids stay consistent end-to-end.
/// </summary>
public sealed class CorrelationIdMiddleware(RequestDelegate next)
{
    /// <summary>
    /// The header name used to propagate the correlation id.
    /// </summary>
    public const string HeaderName = "X-Correlation-Id";

    private readonly RequestDelegate _next = next;

    /// <summary>
    /// Invokes the middleware, attaching the correlation id to the request context, response,
    /// and logging scope.
    /// </summary>
    public async Task InvokeAsync(HttpContext context, ILogger<CorrelationIdMiddleware> logger)
    {
        var correlationId = context.Request.Headers.TryGetValue(HeaderName, out var existing) && !string.IsNullOrWhiteSpace(existing)
            ? existing.ToString()
            : Guid.NewGuid().ToString();

        context.Items[HeaderName] = correlationId;
        context.Response.Headers[HeaderName] = correlationId;

        using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId }))
        {
            await _next(context);
        }
    }
}
