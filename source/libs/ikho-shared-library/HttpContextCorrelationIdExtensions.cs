using Ikho.SharedLibrary.Middleware;
using Microsoft.AspNetCore.Http;

namespace Ikho.SharedLibrary;

/// <summary>
/// Convenience accessor for the correlation id established by <see cref="CorrelationIdMiddleware"/>.
/// Prefer this over re-reading the <c>X-Correlation-Id</c> request header directly, since the
/// middleware generates and stores a new id in <see cref="HttpContext.Items"/> when the header
/// was absent from the incoming request -- reading the header again would miss that generated id.
/// </summary>
public static class HttpContextCorrelationIdExtensions
{
    /// <summary>
    /// Returns the correlation id for the current request, as established by
    /// <see cref="CorrelationIdMiddleware"/>, or <see langword="null"/> if the middleware has
    /// not run (e.g. it was not registered via <c>UseServiceDefaults</c>).
    /// </summary>
    public static string? GetCorrelationId(this HttpContext httpContext) =>
        httpContext.Items[CorrelationIdMiddleware.HeaderName] as string;
}
