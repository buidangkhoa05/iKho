using System.Text.Json;
using Ikho.SchemaManagement.Contracts.WarehouseReturns.Events.V1;
using Ikho.SharedLibrary.Outbox;
using Ikho.WarehouseReturns.Domain;
using Ikho.WarehouseReturns.Shared.Clients;

namespace Ikho.WarehouseReturns.Features.ReturnOrders;

/// <summary>Distinguishes why a return-order creation attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum CreateReturnOrderOutcome
{
    /// <summary>The return order was created successfully.</summary>
    Created,

    /// <summary>The request failed local validation (no lines, a non-positive quantity, a missing reason code, or a party id that doesn't match the order type).</summary>
    ValidationFailed,

    /// <summary>The referenced customer does not exist in Partner, or is inactive.</summary>
    CustomerNotFound,

    /// <summary>The referenced supplier does not exist in Partner, or is inactive.</summary>
    SupplierNotFound,

    /// <summary>The referenced warehouse does not exist in Organization.</summary>
    WarehouseNotFound,

    /// <summary>The referenced warehouse exists but is not currently active.</summary>
    WarehouseInactive,

    /// <summary>A referenced product does not exist in Catalog, or is inactive.</summary>
    ProductNotFound,
}

/// <summary>
/// Business logic for creating and querying return orders. Validates the warehouse
/// (Organization), the customer or supplier (Partner, whichever <see cref="ReturnOrderType"/>
/// calls for), and every returned product (Catalog) before creating the order. There is no Kafka
/// consumer wiring in this codebase yet, so the reference ids that would otherwise arrive via
/// <c>CustomerCreated</c>/<c>SupplierCreated</c>/<c>ProductCreated</c>/<c>ShipmentDispatched</c>
/// events are instead supplied on the request and validated synchronously here, mirroring how
/// Inbound validates its <c>PurchaseOrder</c> creation requests.
/// </summary>
public sealed class ReturnOrdersService(
    IReturnOrdersRepository repository,
    ICatalogApiClient catalogClient,
    IOrganizationApiClient organizationClient,
    IPartnerApiClient partnerClient,
    IOutboxWriter outbox)
{
    /// <summary>Creates a new return order after validating its warehouse, party (customer or supplier), and every returned product.</summary>
    public async Task<(CreateReturnOrderOutcome Outcome, ReturnOrderResponse? ReturnOrder, string? Error)> CreateAsync(
        CreateReturnOrderRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (request.Lines.Count == 0)
        {
            return (CreateReturnOrderOutcome.ValidationFailed, null, "At least one line is required.");
        }

        if (request.Lines.Any(line => line.Quantity <= 0))
        {
            return (CreateReturnOrderOutcome.ValidationFailed, null, "Quantity must be greater than zero for every line.");
        }

        if (request.Lines.Any(line => string.IsNullOrWhiteSpace(line.ReasonCode)))
        {
            return (CreateReturnOrderOutcome.ValidationFailed, null, "ReasonCode is required for every line.");
        }

        if (request.Type == ReturnOrderType.CustomerReturn && request.CustomerId is null)
        {
            return (CreateReturnOrderOutcome.ValidationFailed, null, "CustomerId is required for a customer return.");
        }

        if (request.Type == ReturnOrderType.SupplierReturn && request.SupplierId is null)
        {
            return (CreateReturnOrderOutcome.ValidationFailed, null, "SupplierId is required for a supplier return.");
        }

        Guid? customerId = null;
        Guid? supplierId = null;

        if (request.Type == ReturnOrderType.CustomerReturn)
        {
            var customer = await partnerClient.GetCustomerAsync(request.CustomerId!.Value, cancellationToken);
            if (customer is null || !customer.IsActive)
            {
                return (CreateReturnOrderOutcome.CustomerNotFound, null, $"Customer '{request.CustomerId}' was not found or is inactive.");
            }

            customerId = customer.Id;
        }
        else
        {
            var supplier = await partnerClient.GetSupplierAsync(request.SupplierId!.Value, cancellationToken);
            if (supplier is null || !supplier.IsActive)
            {
                return (CreateReturnOrderOutcome.SupplierNotFound, null, $"Supplier '{request.SupplierId}' was not found or is inactive.");
            }

            supplierId = supplier.Id;
        }

        var warehouse = await organizationClient.GetWarehouseAsync(request.WarehouseId, cancellationToken);
        if (warehouse is null)
        {
            return (CreateReturnOrderOutcome.WarehouseNotFound, null, $"Warehouse '{request.WarehouseId}' was not found.");
        }

        if (!warehouse.IsActive)
        {
            return (CreateReturnOrderOutcome.WarehouseInactive, null, $"Warehouse '{request.WarehouseId}' is not currently active.");
        }

        var returnOrder = new ReturnOrder
        {
            Type = request.Type,
            CustomerId = customerId,
            SupplierId = supplierId,
            WarehouseId = warehouse.Id,
            SourceReferenceType = request.SourceReferenceType,
            SourceReferenceId = request.SourceReferenceId,
        };

        foreach (var line in request.Lines)
        {
            var product = await catalogClient.GetProductAsync(line.ProductId, cancellationToken);
            if (product is null || !product.IsActive)
            {
                return (CreateReturnOrderOutcome.ProductNotFound, null, $"Product '{line.ProductId}' was not found or is inactive.");
            }

            returnOrder.Lines.Add(new ReturnOrderLine
            {
                ReturnOrderId = returnOrder.Id,
                ProductId = product.Id,
                Quantity = line.Quantity,
                ReasonCode = line.ReasonCode,
            });
        }

        repository.Add(returnOrder);

        var @event = new ReturnOrderCreated
        {
            eventId = Guid.NewGuid().ToString(),
            returnOrderId = returnOrder.Id.ToString(),
            type = returnOrder.Type.ToString(),
            warehouseId = returnOrder.WarehouseId.ToString(),
            customerId = returnOrder.CustomerId?.ToString() ?? string.Empty,
            supplierId = returnOrder.SupplierId?.ToString() ?? string.Empty,
            sourceReferenceType = returnOrder.SourceReferenceType ?? string.Empty,
            sourceReferenceId = returnOrder.SourceReferenceId ?? string.Empty,
            createdOn = returnOrder.CreatedOnUtc.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(ReturnOrderCreated), JsonSerializer.Serialize(@event), correlationId));

        await repository.SaveChangesAsync(cancellationToken);

        return (CreateReturnOrderOutcome.Created, ReturnOrderResponse.FromEntity(returnOrder), null);
    }

    /// <summary>Returns a single return order with its lines, or <see langword="null"/> if not found.</summary>
    public async Task<ReturnOrderResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var returnOrder = await repository.GetByIdAsync(id, cancellationToken);
        return returnOrder is null ? null : ReturnOrderResponse.FromEntity(returnOrder);
    }

    /// <summary>Returns every return order with its lines, ordered by creation time descending, optionally filtered by source reference id.</summary>
    public async Task<List<ReturnOrderResponse>> GetAllAsync(string? sourceReferenceId, CancellationToken cancellationToken)
    {
        var returnOrders = await repository.GetAllAsync(sourceReferenceId, cancellationToken);
        return returnOrders.ConvertAll(ReturnOrderResponse.FromEntity);
    }
}
