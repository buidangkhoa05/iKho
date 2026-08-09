import { InboundStore } from './inbound-store';

describe('InboundStore', () => {
  let store: InboundStore;

  beforeEach(() => {
    store = new InboundStore();
  });

  it('seeds purchase orders, receipts and putaway tasks from mock data', () => {
    expect(store.purchaseOrders().length).toBeGreaterThan(0);
    expect(store.receipts().length).toBeGreaterThan(0);
    expect(store.putawayTasks().length).toBeGreaterThan(0);
  });

  it('createPurchaseOrder prepends a new order with aggregated expected qty', () => {
    const order = store.createPurchaseOrder({
      supplier: 'Test Supplier',
      dock: 'Dock 9',
      lines: [{ sku: 'IKH-482910', qty: 10 }],
    });

    expect(store.purchaseOrders()[0]).toBe(order);
    expect(order.expected).toBe(10);
    expect(order.received).toBe(0);
    expect(order.status).toBe('inbound');
    expect(order.lines[0].productName.en).toBe('Steel shelving bracket, 400mm');
  });

  it('recordDockReceipt marks the order in-stock when fully received with no exception', () => {
    store.recordDockReceipt('PO-10488', [{ sku: 'IKH-330298', qty: 6 }]);

    const order = store.purchaseOrders().find((o) => o.po === 'PO-10488')!;
    expect(order.received).toBe(18);
    expect(order.status).toBe('in-stock');
    expect(order.lines[0].receivedQty).toBe(18);
  });

  it('recordDockReceipt marks the order low-stock when a line has an exception reason', () => {
    store.recordDockReceipt('PO-10490', [
      { sku: 'IKH-770145', qty: 20, exceptionReason: { en: 'Short-shipped', vi: 'Giao thiếu' } },
    ]);

    const order = store.purchaseOrders().find((o) => o.po === 'PO-10490')!;
    expect(order.status).toBe('low-stock');
  });

  it('recordDockReceipt appends a receipt and a putaway task per received line', () => {
    const receiptsBefore = store.receipts().length;
    const tasksBefore = store.putawayTasks().length;

    store.recordDockReceipt('PO-10490', [{ sku: 'IKH-770145', qty: 24 }]);

    expect(store.receipts().length).toBe(receiptsBefore + 1);
    expect(store.receipts()[0].po).toBe('PO-10490');

    expect(store.putawayTasks().length).toBe(tasksBefore + 1);
    const task = store.putawayTasks()[store.putawayTasks().length - 1];
    expect(task.sku).toBe('IKH-770145');
    expect(task.fromDock).toBe('Dock 1');
    expect(task.toBin).toBe('D-01-01');
  });

  it('confirmPutaway removes the task from the queue', () => {
    const taskId = store.putawayTasks()[0].id;
    store.confirmPutaway(taskId);
    expect(store.putawayTasks().some((t) => t.id === taskId)).toBe(false);
  });
});
