using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Identity.Features.RoleAssignments;

public static class RoleAssignmentEndpoints
{
    public static IEndpointRouteBuilder MapRoleAssignmentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/identity/role-assignments").WithTags("RoleAssignments").RequireAuthorization();

        group.MapPost("/", async Task<Results<Created<RoleAssignmentResponse>, ForbidHttpResult, BadRequest<string>, NotFound<string>>> (
            CreateRoleAssignmentRequest request,
            HttpContext httpContext,
            IAuthorizationService authorizationService,
            RoleAssignmentService service,
            CancellationToken cancellationToken) =>
        {
            var authResult = await authorizationService.AuthorizeAsync(httpContext.User, request.CompanyId, "CompanyOffice");
            if (!authResult.Succeeded)
            {
                return TypedResults.Forbid();
            }

            var (outcome, assignment) = await service.CreateAsync(request, httpContext.GetCorrelationId(), cancellationToken);

            return outcome switch
            {
                CreateRoleAssignmentOutcome.ValidationFailed => TypedResults.BadRequest("RoleName must be 'Office' or 'Operator'."),
                CreateRoleAssignmentOutcome.UserNotFound => TypedResults.NotFound("User not found."),
                CreateRoleAssignmentOutcome.WarehouseNotFound => TypedResults.NotFound("Warehouse not found for this company."),
                _ => TypedResults.Created($"/api/identity/role-assignments/{assignment!.Id}", assignment),
            };
        });

        group.MapGet("/", async Task<Results<Ok<IReadOnlyList<RoleAssignmentResponse>>, ForbidHttpResult>> (
            Guid companyId,
            HttpContext httpContext,
            IAuthorizationService authorizationService,
            RoleAssignmentService service,
            CancellationToken cancellationToken) =>
        {
            var authResult = await authorizationService.AuthorizeAsync(httpContext.User, companyId, "CompanyOffice");
            if (!authResult.Succeeded)
            {
                return TypedResults.Forbid();
            }

            return TypedResults.Ok(await service.GetByCompanyAsync(companyId, cancellationToken));
        });

        return app;
    }
}
