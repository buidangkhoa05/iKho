using Ikho.Identity.Shared.IdentityProvider;
using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Identity.Features.Webhooks;

public static class WebhookEndpoints
{
    public static IEndpointRouteBuilder MapWebhookEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/identity/webhooks").WithTags("Webhooks");

        group.MapPost("/clerk", async Task<Results<Ok, BadRequest<string>>> (
            HttpContext httpContext,
            IIdentityProvider identityProvider,
            WebhookService service,
            CancellationToken cancellationToken) =>
        {
            IdentityWebhookEvent webhookEvent;
            try
            {
                webhookEvent = await identityProvider.ParseWebhookAsync(httpContext.Request, cancellationToken);
            }
            catch (InvalidWebhookSignatureException)
            {
                return TypedResults.BadRequest("Invalid webhook signature.");
            }

            await service.ApplyAsync(webhookEvent, httpContext.GetCorrelationId(), cancellationToken);

            return TypedResults.Ok();
        });

        return app;
    }
}
