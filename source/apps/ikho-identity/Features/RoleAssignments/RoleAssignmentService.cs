using System.Text.Json;
using Ikho.Identity.Domain;
using Ikho.Identity.Features.ClaimsSync;
using Ikho.Identity.Shared;
using Ikho.Identity.Shared.Organization;
using Ikho.SharedLibrary.Outbox;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Identity.Features.RoleAssignments;

public enum CreateRoleAssignmentOutcome
{
    Created,
    ValidationFailed,
    UserNotFound,
    WarehouseNotFound,
}

public sealed class RoleAssignmentService(IdentityDbContext db, IOrganizationLookupClient organizationLookup, IOutboxWriter outbox)
{
    public async Task<(CreateRoleAssignmentOutcome Outcome, RoleAssignmentResponse? Assignment)> CreateAsync(
        CreateRoleAssignmentRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        var roleId = request.RoleName switch
        {
            RoleNames.Office => IdentityDbContext.OfficeRoleId,
            RoleNames.Operator => IdentityDbContext.OperatorRoleId,
            _ => (Guid?)null,
        };
        if (roleId is null)
        {
            return (CreateRoleAssignmentOutcome.ValidationFailed, null);
        }

        var userExists = await db.Users.AnyAsync(u => u.Id == request.UserId, cancellationToken);
        if (!userExists)
        {
            return (CreateRoleAssignmentOutcome.UserNotFound, null);
        }

        if (request.WarehouseId is { } warehouseId &&
            !await organizationLookup.WarehouseExistsAsync(request.CompanyId, warehouseId, cancellationToken))
        {
            return (CreateRoleAssignmentOutcome.WarehouseNotFound, null);
        }

        var existing = await db.RoleAssignments.SingleOrDefaultAsync(a =>
            a.UserId == request.UserId && a.CompanyId == request.CompanyId && a.WarehouseId == request.WarehouseId, cancellationToken);
        if (existing is not null)
        {
            existing.RoleId = roleId.Value;
        }
        else
        {
            existing = new RoleAssignment
            {
                UserId = request.UserId,
                CompanyId = request.CompanyId,
                WarehouseId = request.WarehouseId,
                RoleId = roleId.Value,
            };
            db.RoleAssignments.Add(existing);
        }

        var payload = JsonSerializer.Serialize(new UserClaimsSyncRequestedEvent(request.UserId));
        db.OutboxMessages.Add(outbox.Enqueue(nameof(UserClaimsSyncRequestedEvent), payload, correlationId));

        await db.SaveChangesAsync(cancellationToken);

        return (CreateRoleAssignmentOutcome.Created, new RoleAssignmentResponse(
            existing.Id, existing.UserId, existing.CompanyId, existing.WarehouseId, request.RoleName, existing.CreatedAtUtc));
    }

    public async Task<IReadOnlyList<RoleAssignmentResponse>> GetByCompanyAsync(Guid companyId, CancellationToken cancellationToken)
    {
        var assignments = await db.RoleAssignments
            .Where(a => a.CompanyId == companyId)
            .Join(db.Roles, a => a.RoleId, r => r.Id, (a, r) => new RoleAssignmentResponse(a.Id, a.UserId, a.CompanyId, a.WarehouseId, r.Name, a.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return assignments;
    }
}
