using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehouseOrganization.Features.Companies;

/// <summary>
/// Minimal API endpoint mappings for the Companies feature.
/// </summary>
public static class CompaniesEndpoints
{
    /// <summary>
    /// Maps company CRUD endpoints under <c>/api/warehouse/organization/companies</c>.
    /// </summary>
    public static IEndpointRouteBuilder MapCompaniesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/organization/companies").WithTags("Companies");

        group.MapPost("/", async Task<Results<Created<CompanyResponse>, Conflict<string>>> (
            CreateCompanyRequest request,
            CompaniesService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var company = await service.CreateAsync(request, correlationId, cancellationToken);

            return company is null
                ? TypedResults.Conflict($"Company code '{request.Code}' is already in use.")
                : TypedResults.Created($"/api/warehouse/organization/companies/{company.Id}", company);
        });

        group.MapPut("/{id:guid}", async Task<Results<Ok<CompanyResponse>, NotFound>> (
            Guid id,
            UpdateCompanyRequest request,
            CompaniesService service,
            CancellationToken cancellationToken) =>
        {
            var company = await service.UpdateAsync(id, request, cancellationToken);
            return company is null ? TypedResults.NotFound() : TypedResults.Ok(company);
        });

        group.MapGet("/{id:guid}", async Task<Results<Ok<CompanyResponse>, NotFound>> (
            Guid id,
            CompaniesService service,
            CancellationToken cancellationToken) =>
        {
            var company = await service.GetByIdAsync(id, cancellationToken);
            return company is null ? TypedResults.NotFound() : TypedResults.Ok(company);
        });

        group.MapGet("/", async (CompaniesService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetAllAsync(cancellationToken)));

        return app;
    }
}
