namespace Ikho.Identity.Features.RoleAssignments;

public sealed record CreateRoleAssignmentRequest(Guid CompanyId, Guid UserId, Guid? WarehouseId, string RoleName);

public sealed record RoleAssignmentResponse(Guid Id, Guid UserId, Guid CompanyId, Guid? WarehouseId, string RoleName, DateTimeOffset CreatedAtUtc);
