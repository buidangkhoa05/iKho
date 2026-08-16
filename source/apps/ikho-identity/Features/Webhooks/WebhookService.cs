using System.Text.Json;
using Ikho.Identity.Domain;
using Ikho.Identity.Features.ClaimsSync;
using Ikho.Identity.Shared;
using Ikho.Identity.Shared.IdentityProvider;
using Ikho.Identity.Shared.Organization;
using Ikho.SharedLibrary.Idempotency;
using Ikho.SharedLibrary.Outbox;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Ikho.Identity.Features.Webhooks;

/// <summary>Applies a canonical <see cref="IdentityWebhookEvent"/> to the local user/membership mirror.</summary>
public sealed class WebhookService(
    IdentityDbContext db,
    IIdempotencyStore idempotencyStore,
    IOutboxWriter outbox,
    IOrganizationLookupClient organizationLookup,
    ILogger<WebhookService> logger)
{
    private const string ConsumerName = "Ikho.Identity.Webhooks";

    public async Task ApplyAsync(IdentityWebhookEvent webhookEvent, string? correlationId, CancellationToken cancellationToken)
    {
        if (await idempotencyStore.HasBeenProcessedAsync(ConsumerName, webhookEvent.EventId, cancellationToken))
        {
            return;
        }

        switch (webhookEvent.Type)
        {
            case IdentityWebhookEventType.UserCreated:
            case IdentityWebhookEventType.UserUpdated:
                await UpsertUserAsync(webhookEvent, cancellationToken);
                break;

            case IdentityWebhookEventType.OrganizationMembershipCreated:
                await UpsertMembershipAsync(webhookEvent, correlationId, cancellationToken);
                break;

            case IdentityWebhookEventType.OrganizationMembershipRemoved:
                await RemoveMembershipAsync(webhookEvent, cancellationToken);
                break;

            case IdentityWebhookEventType.Unrecognized:
                logger.LogWarning("Ignoring unrecognized identity webhook event {EventId}.", webhookEvent.EventId);
                break;
        }

        await db.SaveChangesAsync(cancellationToken);
        await idempotencyStore.MarkProcessedAsync(ConsumerName, webhookEvent.EventId, cancellationToken);
    }

    private async Task<User> UpsertUserAsync(IdentityWebhookEvent webhookEvent, CancellationToken cancellationToken)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.ExternalUserId == webhookEvent.ExternalUserId, cancellationToken);
        if (user is null)
        {
            user = new User
            {
                ExternalUserId = webhookEvent.ExternalUserId!,
                Email = webhookEvent.Email ?? string.Empty,
                DisplayName = webhookEvent.DisplayName ?? string.Empty,
            };
            db.Users.Add(user);
        }
        else
        {
            user.Email = webhookEvent.Email ?? user.Email;
            user.DisplayName = webhookEvent.DisplayName ?? user.DisplayName;
        }

        return user;
    }

    private async Task UpsertMembershipAsync(IdentityWebhookEvent webhookEvent, string? correlationId, CancellationToken cancellationToken)
    {
        var companyId = await organizationLookup.GetCompanyIdByExternalOrgIdAsync(webhookEvent.ExternalOrgId!, cancellationToken);
        if (companyId is null)
        {
            logger.LogWarning(
                "No Company is linked to external org {ExternalOrgId}; skipping membership sync for event {EventId}.",
                webhookEvent.ExternalOrgId, webhookEvent.EventId);
            return;
        }

        var user = await UpsertUserAsync(webhookEvent, cancellationToken);

        var membership = await db.CompanyMemberships
            .SingleOrDefaultAsync(m => m.UserId == user.Id && m.CompanyId == companyId, cancellationToken);
        if (membership is null)
        {
            membership = new CompanyMembership
            {
                UserId = user.Id,
                CompanyId = companyId.Value,
                ExternalOrgId = webhookEvent.ExternalOrgId!,
            };
            db.CompanyMemberships.Add(membership);
        }
        else
        {
            membership.Status = CompanyMembershipStatus.Active;
        }

        var hasRole = await db.RoleAssignments
            .AnyAsync(a => a.UserId == user.Id && a.CompanyId == companyId, cancellationToken);
        if (!hasRole)
        {
            db.RoleAssignments.Add(new RoleAssignment
            {
                UserId = user.Id,
                CompanyId = companyId.Value,
                WarehouseId = null,
                RoleId = IdentityDbContext.OperatorRoleId,
            });
        }

        EnqueueClaimsSync(user.Id, correlationId);
    }

    private async Task RemoveMembershipAsync(IdentityWebhookEvent webhookEvent, CancellationToken cancellationToken)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.ExternalUserId == webhookEvent.ExternalUserId, cancellationToken);
        if (user is null)
        {
            return;
        }

        var membership = await db.CompanyMemberships
            .SingleOrDefaultAsync(m => m.UserId == user.Id && m.ExternalOrgId == webhookEvent.ExternalOrgId, cancellationToken);
        if (membership is null)
        {
            return;
        }

        membership.Status = CompanyMembershipStatus.Removed;

        var assignments = await db.RoleAssignments
            .Where(a => a.UserId == user.Id && a.CompanyId == membership.CompanyId)
            .ToListAsync(cancellationToken);
        db.RoleAssignments.RemoveRange(assignments);

        EnqueueClaimsSync(user.Id, correlationId: null);
    }

    private void EnqueueClaimsSync(Guid userId, string? correlationId)
    {
        var payload = JsonSerializer.Serialize(new UserClaimsSyncRequestedEvent(userId));
        db.OutboxMessages.Add(outbox.Enqueue(nameof(UserClaimsSyncRequestedEvent), payload, correlationId));
    }
}
