using Ikho.SharedLibrary;
using Ikho.Warehouse.Partner.Shared;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Ikho.Warehouse.Partner.Features.Customers;

/// <summary>
/// Minimal API endpoint mappings for the Customers feature, including address and contact
/// management.
/// </summary>
public static class CustomersEndpoints
{
    /// <summary>
    /// Maps customer CRUD, status-change, address, and contact endpoints under
    /// <c>/api/warehouse/partner/customers</c>.
    /// </summary>
    public static IEndpointRouteBuilder MapCustomersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warehouse/partner/customers").WithTags("Customers");

        group.MapPost("/", async Task<Results<Created<CustomerResponse>, Conflict<string>, BadRequest<string>>> (
            CreateCustomerRequest request,
            CustomersService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, customer) = await service.CreateAsync(request, correlationId, cancellationToken);

            return outcome switch
            {
                CreateCustomerOutcome.ValidationFailed => TypedResults.BadRequest("Code, Name, and TaxId are required."),
                CreateCustomerOutcome.CodeAlreadyExists => TypedResults.Conflict($"Customer code '{request.Code}' is already in use."),
                _ => TypedResults.Created($"/api/warehouse/partner/customers/{customer!.Id}", customer),
            };
        });

        group.MapPut("/{id:guid}", async Task<Results<Ok<CustomerResponse>, NotFound, BadRequest<string>>> (
            Guid id,
            UpdateCustomerRequest request,
            CustomersService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var (outcome, customer) = await service.UpdateAsync(id, request, correlationId, cancellationToken);

            return outcome switch
            {
                UpdateCustomerOutcome.NotFound => TypedResults.NotFound(),
                UpdateCustomerOutcome.ValidationFailed => TypedResults.BadRequest("Name and TaxId are required."),
                _ => TypedResults.Ok(customer!),
            };
        });

        group.MapPatch("/{id:guid}/status", async Task<Results<Ok<CustomerResponse>, NotFound>> (
            Guid id,
            SetCustomerStatusRequest request,
            CustomersService service,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var correlationId = httpContext.GetCorrelationId();
            var customer = await service.SetStatusAsync(id, request, correlationId, cancellationToken);
            return customer is null ? TypedResults.NotFound() : TypedResults.Ok(customer);
        });

        group.MapGet("/{id:guid}", async Task<Results<Ok<CustomerResponse>, NotFound>> (
            Guid id,
            CustomersService service,
            CancellationToken cancellationToken) =>
        {
            var customer = await service.GetByIdAsync(id, cancellationToken);
            return customer is null ? TypedResults.NotFound() : TypedResults.Ok(customer);
        });

        group.MapGet("/by-code/{code}", async Task<Results<Ok<CustomerResponse>, NotFound>> (
            string code,
            CustomersService service,
            CancellationToken cancellationToken) =>
        {
            var customer = await service.GetByCodeAsync(code, cancellationToken);
            return customer is null ? TypedResults.NotFound() : TypedResults.Ok(customer);
        });

        group.MapGet("/", async (CustomersService service, CancellationToken cancellationToken) =>
            TypedResults.Ok(await service.GetAllAsync(cancellationToken)));

        group.MapPost("/{id:guid}/addresses", async Task<Results<Created<AddressResponse>, NotFound<string>>> (
            Guid id,
            AddCustomerAddressRequest request,
            CustomersService service,
            CancellationToken cancellationToken) =>
        {
            var address = await service.AddAddressAsync(id, request, cancellationToken);

            return address is null
                ? TypedResults.NotFound($"Customer '{id}' not found.")
                : TypedResults.Created($"/api/warehouse/partner/customers/{id}/addresses/{address.Id}", address);
        });

        group.MapPost("/{id:guid}/contacts", async Task<Results<Created<ContactResponse>, NotFound<string>>> (
            Guid id,
            AddCustomerContactRequest request,
            CustomersService service,
            CancellationToken cancellationToken) =>
        {
            var contact = await service.AddContactAsync(id, request, cancellationToken);

            return contact is null
                ? TypedResults.NotFound($"Customer '{id}' not found.")
                : TypedResults.Created($"/api/warehouse/partner/customers/{id}/contacts/{contact.Id}", contact);
        });

        return app;
    }
}
