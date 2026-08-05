using Ikho.SharedLibrary;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.WarehousePartner.Features.Suppliers;

/// <summary>
/// Minimal API endpoint mappings for the Suppliers feature, including address and contact
/// management.
/// </summary>
public static class SuppliersEndpoints
{
    /// <summary>
    /// Maps supplier CRUD, status-change, address, and contact endpoints under
    /// <c>/api/warehouse/partner/suppliers</c>.
    /// </summary>
    public static IEndpointRouteBuilder MapSuppliersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/partner/suppliers").WithTags("Suppliers");

        group.MapPost("/", async Task<Results<Created<SupplierResponse>, Conflict<string>>> (
            CreateSupplierRequest request,
            SuppliersService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var supplier = await service.CreateAsync(request, correlationId, cancellationToken);

            return supplier is null
                ? TypedResults.Conflict($"Supplier code '{request.Code}' is already in use.")
                : TypedResults.Created($"/api/warehouse/partner/suppliers/{supplier.Id}", supplier);
        });

        group.MapPut("/{id:guid}", async Task<Results<Ok<SupplierResponse>, NotFound>> (
            Guid id,
            UpdateSupplierRequest request,
            SuppliersService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var supplier = await service.UpdateAsync(id, request, correlationId, cancellationToken);
            return supplier is null ? TypedResults.NotFound() : TypedResults.Ok(supplier);
        });

        group.MapPatch("/{id:guid}/status", async Task<Results<Ok<SupplierResponse>, NotFound>> (
            Guid id,
            SetSupplierStatusRequest request,
            SuppliersService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var supplier = await service.SetStatusAsync(id, request, correlationId, cancellationToken);
            return supplier is null ? TypedResults.NotFound() : TypedResults.Ok(supplier);
        });

        group.MapGet("/{id:guid}", async Task<Results<Ok<SupplierResponse>, NotFound>> (
            Guid id,
            SuppliersService service,
            CancellationToken cancellationToken) =>
        {
            var supplier = await service.GetByIdAsync(id, cancellationToken);
            return supplier is null ? TypedResults.NotFound() : TypedResults.Ok(supplier);
        });

        group.MapGet("/by-code/{code}", async Task<Results<Ok<SupplierResponse>, NotFound>> (
            string code,
            SuppliersService service,
            CancellationToken cancellationToken) =>
        {
            var supplier = await service.GetByCodeAsync(code, cancellationToken);
            return supplier is null ? TypedResults.NotFound() : TypedResults.Ok(supplier);
        });

        group.MapGet("/", async (SuppliersService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetAllAsync(cancellationToken)));

        group.MapPost("/{id:guid}/addresses", async Task<Results<Created<AddressResponse>, NotFound<string>>> (
            Guid id,
            AddSupplierAddressRequest request,
            SuppliersService service,
            CancellationToken cancellationToken) =>
        {
            var address = await service.AddAddressAsync(id, request, cancellationToken);

            return address is null
                ? TypedResults.NotFound($"Supplier '{id}' not found.")
                : TypedResults.Created($"/api/warehouse/partner/suppliers/{id}/addresses/{address.Id}", address);
        });

        group.MapPost("/{id:guid}/contacts", async Task<Results<Created<ContactResponse>, NotFound<string>>> (
            Guid id,
            AddSupplierContactRequest request,
            SuppliersService service,
            CancellationToken cancellationToken) =>
        {
            var contact = await service.AddContactAsync(id, request, cancellationToken);

            return contact is null
                ? TypedResults.NotFound($"Supplier '{id}' not found.")
                : TypedResults.Created($"/api/warehouse/partner/suppliers/{id}/contacts/{contact.Id}", contact);
        });

        return app;
    }
}
