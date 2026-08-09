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

  it('recordDockReceipt marks the order low-stock when an under-receipt has an exception reason', () => {
    store.recordDockReceipt('PO-10490', [
      { sku: 'IKH-770145', qty: 20, exceptionReason: { en: 'Short-shipped', vi: 'Giao thiếu' } },
    ]);

    const order = store.purchaseOrders().find((o) => o.po === 'PO-10490')!;
    expect(order.received).toBe(20);
    expect(order.status).toBe('low-stock');
  });

  it('recordDockReceipt marks the order in-stock (not low-stock) when an over-receipt exception also completes it', () => {
    // PO-10488 expects 18, already received 12 → remaining is 6. Entering 10 both over-receives
    // (triggering hasException via a mismatch reason) and completes the order.
    store.recordDockReceipt('PO-10488', [
      { sku: 'IKH-330298', qty: 10, exceptionReason: { en: 'Over-received', vi: 'Nhận vượt số lượng' } },
    ]);

    const order = store.purchaseOrders().find((o) => o.po === 'PO-10488')!;
    expect(order.received).toBe(22);
    expect(order.status).toBe('in-stock');

    const receipt = store.receipts()[0];
    expect(receipt.status).toBe('in-stock');
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

  it('confirmPutaway keeps the task in the ledger and flips its status to in-stock', () => {
    const taskId = store.putawayTasks()[0].id;
    const originalBin = store.putawayTasks()[0].toBin;
    store.confirmPutaway(taskId);

    const task = store.putawayTasks().find((t) => t.id === taskId);
    expect(task).toBeDefined();
    expect(task!.status).toBe('in-stock');
    expect(task!.toBin).toBe(originalBin);
  });

  it('confirmPutaway applies a bin override when provided', () => {
    const taskId = store.putawayTasks()[0].id;
    store.confirmPutaway(taskId, 'Z-99-01');

    const task = store.putawayTasks().find((t) => t.id === taskId)!;
    expect(task.status).toBe('in-stock');
    expect(task.toBin).toBe('Z-99-01');
  });

  it('confirmPutaway keeps the original bin when the override is empty or omitted', () => {
    const taskId = store.putawayTasks()[0].id;
    const originalBin = store.putawayTasks()[0].toBin;
    store.confirmPutaway(taskId, '   ');

    const task = store.putawayTasks().find((t) => t.id === taskId)!;
    expect(task.toBin).toBe(originalBin);
  });

  it('recordDockReceipt carries lot number, expiration date and serial numbers onto the receipt line details', () => {
    store.recordDockReceipt('PO-10488', [
      {
        sku: 'IKH-330298',
        qty: 6,
        lotNumber: 'LOT-42',
        expirationDate: '2027-01-01',
        serialNumbers: ['SN-1', 'SN-2'],
      },
    ]);

    const receipt = store.receipts()[0];
    expect(receipt.lineDetails[0].lotNumber).toBe('LOT-42');
    expect(receipt.lineDetails[0].expirationDate).toBe('2027-01-01');
    expect(receipt.lineDetails[0].serialNumbers).toEqual(['SN-1', 'SN-2']);
  });
});
