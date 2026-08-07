using Ikho.Warehouse.Inbound.Domain;
using Ikho.Warehouse.Inbound.Shared.Clients;

namespace Ikho.Warehouse.Inbound.Features.PurchaseOrders;

/// <summary>Distinguishes why a purchase-order creation attempt did or did not succeed, so the endpoint can return an accurate status code.</summary>
public enum CreatePurchaseOrderOutcome
{
    /// <summary>The purchase order was created successfully.</summary>
    Created,

    /// <summary>The request failed local validation (no lines, or a non-positive quantity).</summary>
    ValidationFailed,

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
/// Business logic for creating and querying purchase orders. Validates the supplier (Partner),
/// warehouse (Organization), and every ordered product (Catalog) before creating the order,
/// snapshotting business-readable fields onto the order and its lines per the "ID plus snapshot"
/// reference pattern (<c>docs/architecture/warehouse-db-relationships.md</c>). Purchase-order
/// creation does not publish an integration event in this slice — only receipt completion and
/// putaway completion do (see the Receipts feature).
/// </summary>
public sealed class PurchaseOrdersService(
    IPurchaseOrdersRepository repository,
    IPartnerApiClient partnerClient,
    IOrganizationApiClient organizationClient,
    ICatalogApiClient catalogClient)
{
    /// <summary>Creates a new purchase order after validating its supplier, warehouse, and every ordered product.</summary>
    public async Task<(CreatePurchaseOrderOutcome Outcome, PurchaseOrderResponse? PurchaseOrder, string? Error)> CreateAsync(
        CreatePurchaseOrderRequest request, CancellationToken cancellationToken)
    {
        if (request.Lines.Count == 0)
        {
            return (CreatePurchaseOrderOutcome.ValidationFailed, null, "At least one line is required.");
        }

        if (request.Lines.Any(line => line.Quantity <= 0))
        {
            return (CreatePurchaseOrderOutcome.ValidationFailed, null, "Quantity must be greater than zero for every line.");
        }

        var supplier = await partnerClient.GetSupplierAsync(request.SupplierId, cancellationToken);
        if (supplier is null || !supplier.IsActive)
        {
            return (CreatePurchaseOrderOutcome.SupplierNotFound, null, $"Supplier '{request.SupplierId}' was not found or is inactive.");
        }

        var warehouse = await organizationClient.GetWarehouseAsync(request.WarehouseId, cancellationToken);
        if (warehouse is null)
        {
            return (CreatePurchaseOrderOutcome.WarehouseNotFound, null, $"Warehouse '{request.WarehouseId}' was not found.");
        }

        if (!warehouse.IsActive)
        {
            return (CreatePurchaseOrderOutcome.WarehouseInactive, null, $"Warehouse '{request.WarehouseId}' is not currently active.");
        }

        var purchaseOrder = new PurchaseOrder
        {
            SupplierId = supplier.Id,
            SupplierCodeSnapshot = supplier.Code,
            SupplierNameSnapshot = supplier.Name,
            WarehouseId = warehouse.Id,
        };

        foreach (var line in request.Lines)
        {
            var product = await catalogClient.GetProductAsync(line.ProductId, cancellationToken);
            if (product is null || !product.IsActive)
            {
                return (CreatePurchaseOrderOutcome.ProductNotFound, null, $"Product '{line.ProductId}' was not found or is inactive.");
            }

            purchaseOrder.Lines.Add(new PurchaseOrderLine
            {
                PurchaseOrderId = purchaseOrder.Id,
                ProductId = product.Id,
                SkuSnapshot = product.Sku,
                ProductNameSnapshot = product.Name,
                OrderedQuantity = line.Quantity,
            });
        }

        repository.Add(purchaseOrder);
        await repository.SaveChangesAsync(cancellationToken);

        return (CreatePurchaseOrderOutcome.Created, PurchaseOrderResponse.FromEntity(purchaseOrder), null);
    }

    /// <summary>Returns a single purchase order with its lines, or <see langword="null"/> if not found.</summary>
    public async Task<PurchaseOrderResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var purchaseOrder = await repository.GetByIdAsync(id, cancellationToken);
        return purchaseOrder is null ? null : PurchaseOrderResponse.FromEntity(purchaseOrder);
    }

    /// <summary>Returns every purchase order with its lines, ordered by creation time descending.</summary>
    public async Task<List<PurchaseOrderResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var purchaseOrders = await repository.GetAllAsync(cancellationToken);
        return purchaseOrders.ConvertAll(PurchaseOrderResponse.FromEntity);
    }
}
