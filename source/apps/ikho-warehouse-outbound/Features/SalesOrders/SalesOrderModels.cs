namespace Ikho.WarehouseOutbound.Features.SalesOrders;

/// <summary>Request body for a single line within a <see cref="CreateSalesOrderRequest"/>.</summary>
public sealed record SalesOrderLineRequest(Guid ProductId, decimal Quantity);

/// <summary>Request body to create a new sales order.</summary>
public sealed record CreateSalesOrderRequest(Guid CustomerId, Guid WarehouseId, List<SalesOrderLineRequest> Lines);
