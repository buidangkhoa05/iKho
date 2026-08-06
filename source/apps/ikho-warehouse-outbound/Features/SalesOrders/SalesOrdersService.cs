using Ikho.WarehouseOutbound.Domain;
using Ikho.WarehouseOutbound.Shared;
using Ikho.WarehouseOutbound.Shared.Clients;

namespace Ikho.WarehouseOutbound.Features.SalesOrders;

/// <summary>Distinguishes why a sales-order creation attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum CreateSalesOrderOutcome
{
    /// <summary>The sales order was created successfully.</summary>
    Created,

    /// <summary>The request itself is invalid (no lines, or a non-positive quantity).</summary>
    ValidationFailed,

    /// <summary>The referenced customer does not exist in Partner, or is inactive.</summary>
    CustomerNotFound,

    /// <summary>The referenced warehouse does not exist in Organization.</summary>
    WarehouseNotFound,

    /// <summary>The referenced warehouse exists but is not currently active.</summary>
    WarehouseInactive,

    /// <summary>One of the referenced products does not exist in Catalog, or is inactive.</summary>
    ProductNotFound,
}

/// <summary>
/// Business logic for creating and reading sales orders. Validates the customer, warehouse, and
/// every line's product against Partner, Organization, and Catalog respectively (the same
/// synchronous service-to-service pattern Inventory established for receiving stock), snapshotting
/// the customer's code/name and each product's SKU/name onto the order.
/// </summary>
public sealed class SalesOrdersService(
    ISalesOrdersRepository repository,
    IPartnerApiClient partnerClient,
    IOrganizationApiClient organizationClient,
    ICatalogApiClient catalogClient)
{
    /// <summary>Validates and creates a new sales order with its lines.</summary>
    public async Task<(CreateSalesOrderOutcome Outcome, SalesOrderResponse? SalesOrder, string? Error)> CreateAsync(
        CreateSalesOrderRequest request, CancellationToken cancellationToken)
    {
        if (request.Lines is null || request.Lines.Count == 0)
        {
            return (CreateSalesOrderOutcome.ValidationFailed, null, "At least one line is required.");
        }

        if (request.Lines.Any(line => line.Quantity <= 0))
        {
            return (CreateSalesOrderOutcome.ValidationFailed, null, "Every line quantity must be greater than zero.");
        }

        var customer = await partnerClient.GetCustomerAsync(request.CustomerId, cancellationToken);
        if (customer is null || !customer.IsActive)
        {
            return (CreateSalesOrderOutcome.CustomerNotFound, null, $"Customer '{request.CustomerId}' was not found or is inactive.");
        }

        var warehouse = await organizationClient.GetWarehouseAsync(request.WarehouseId, cancellationToken);
        if (warehouse is null)
        {
            return (CreateSalesOrderOutcome.WarehouseNotFound, null, $"Warehouse '{request.WarehouseId}' was not found.");
        }

        if (!warehouse.IsActive)
        {
            return (CreateSalesOrderOutcome.WarehouseInactive, null, $"Warehouse '{request.WarehouseId}' is not active.");
        }

        var salesOrder = new SalesOrder
        {
            CustomerId = customer.Id,
            CustomerCodeSnapshot = customer.Code,
            CustomerNameSnapshot = customer.Name,
            WarehouseId = warehouse.Id,
            Status = SalesOrderStatus.Open,
        };

        foreach (var line in request.Lines)
        {
            var product = await catalogClient.GetProductAsync(line.ProductId, cancellationToken);
            if (product is null || !product.IsActive)
            {
                return (CreateSalesOrderOutcome.ProductNotFound, null, $"Product '{line.ProductId}' was not found or is inactive.");
            }

            salesOrder.Lines.Add(new SalesOrderLine
            {
                SalesOrderId = salesOrder.Id,
                ProductId = product.Id,
                SkuSnapshot = product.Sku,
                ProductNameSnapshot = product.Name,
                Quantity = line.Quantity,
            });
        }

        repository.Add(salesOrder);
        await repository.SaveChangesAsync(cancellationToken);

        return (CreateSalesOrderOutcome.Created, SalesOrderResponse.FromEntity(salesOrder), null);
    }

    /// <summary>Fetches a sales order by id, or <see langword="null"/> if it does not exist.</summary>
    public async Task<SalesOrderResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var salesOrder = await repository.GetByIdAsync(id, cancellationToken);
        return salesOrder is null ? null : SalesOrderResponse.FromEntity(salesOrder);
    }

    /// <summary>Returns every sales order, newest first.</summary>
    public async Task<IReadOnlyList<SalesOrderResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var salesOrders = await repository.GetAllAsync(cancellationToken);
        return salesOrders.Select(SalesOrderResponse.FromEntity).ToList();
    }
}
