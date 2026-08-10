import { OutboundStore } from './outbound-store';

describe('OutboundStore', () => {
  let store: OutboundStore;

  beforeEach(() => {
    store = new OutboundStore();
  });

  it('seeds sales orders, allocations and shipments from mock data', () => {
    expect(store.salesOrders().length).toBeGreaterThan(0);
    expect(store.allocations().length).toBeGreaterThan(0);
    expect(store.shipments().length).toBeGreaterThan(0);
  });

  it('createSalesOrder prepends a new order with aggregated ordered qty and zero allocation', () => {
    const order = store.createSalesOrder({
      customer: 'Test Retail BV',
      dock: 'Dock 9',
      cutoff: '15:00',
      lines: [{ sku: 'IKH-482910', qty: 10 }],
    });

    expect(store.salesOrders()[0]).toBe(order);
    expect(order.ordered).toBe(10);
    expect(order.allocated).toBe(0);
    expect(order.status).toBe('inbound');
    expect(order.lines[0].productName.en).toBe('Steel shelving bracket, 400mm');
  });

  it('allocate succeeds for a fully-stocked order and records an allocation per line', () => {
    const allocationsBefore = store.allocations().length;
    const order = store.createSalesOrder({ customer: 'Test Retail BV', dock: 'Dock 5', cutoff: '16:00', lines: [{ sku: 'IKH-482910', qty: 10 }] });

    const result = store.allocate(order.so);

    expect(result.ok).toBe(true);
    const updated = store.salesOrders().find((o) => o.so === order.so)!;
    expect(updated.status).toBe('outbound');
    expect(updated.allocated).toBe(10);
    expect(updated.lines[0].allocatedQty).toBe(10);
    expect(store.allocations().length).toBe(allocationsBefore + 1);
  });

  it('allocate fails with insufficient stock and leaves the order unallocated', () => {
    const allocationsBefore = store.allocations().length;

    const result = store.allocate('SO-88208');

    expect(result.ok).toBe(false);
    const order = store.salesOrders().find((o) => o.so === 'SO-88208')!;
    expect(order.status).toBe('inbound');
    expect(order.allocated).toBe(0);
    expect(store.allocations().length).toBe(allocationsBefore);
  });

  it('dispatch succeeds for an allocated order, creates a shipment, and clears its allocations', () => {
    const shipmentsBefore = store.shipments().length;

    const result = store.dispatch('SO-88219');

    expect(result.ok).toBe(true);
    const order = store.salesOrders().find((o) => o.so === 'SO-88219')!;
    expect(order.status).toBe('in-stock');
    expect(store.shipments().length).toBe(shipmentsBefore + 1);
    expect(store.allocations().some((a) => a.so === 'SO-88219')).toBe(false);
  });

  it('dispatch fails for an order that is not allocated', () => {
    const shipmentsBefore = store.shipments().length;

    const result = store.dispatch('SO-88208');

    expect(result.ok).toBe(false);
    expect(store.shipments().length).toBe(shipmentsBefore);
  });
});
