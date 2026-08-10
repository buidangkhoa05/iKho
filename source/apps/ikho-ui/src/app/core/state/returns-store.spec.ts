import { ReturnsStore } from './returns-store';

describe('ReturnsStore', () => {
  let store: ReturnsStore;

  beforeEach(() => {
    store = new ReturnsStore();
  });

  it('seeds return orders, inspections and dispositions from mock data', () => {
    expect(store.returnOrders().length).toBeGreaterThan(0);
    expect(store.inspections().length).toBeGreaterThan(0);
    expect(store.dispositions().length).toBeGreaterThan(0);
  });

  it('createReturnOrder prepends a new order with aggregated qty and the created stage', () => {
    const order = store.createReturnOrder({
      type: 'customer',
      partner: 'Test Retail BV',
      sourceRef: 'SO-99001',
      lines: [{ sku: 'IKH-482910', qty: 3, reasonCode: 'WrongItem' }],
    });

    expect(store.returnOrders()[0]).toBe(order);
    expect(order.qty).toBe(3);
    expect(order.stage).toBe('created');
    expect(order.status).toBe('returns');
    expect(order.lines[0].productName.en).toBe('Steel shelving bracket, 400mm');
  });

  it('toReceive/toInspect/toDisposition only include orders at the matching stage', () => {
    expect(store.toReceive().every((o) => o.stage === 'created')).toBe(true);
    expect(store.toInspect().every((o) => o.stage === 'received')).toBe(true);
    expect(store.toDisposition().every((o) => o.stage === 'inspected')).toBe(true);
    expect(store.toReceive().some((o) => o.rma === 'RMA-0343')).toBe(true);
    expect(store.toInspect().some((o) => o.rma === 'RMA-0337')).toBe(true);
    expect(store.toDisposition().some((o) => o.rma === 'RMA-0340')).toBe(true);
  });

  it('receive succeeds for a created order and moves it to the received stage', () => {
    const result = store.receive('RMA-0343');

    expect(result.ok).toBe(true);
    const order = store.returnOrders().find((o) => o.rma === 'RMA-0343')!;
    expect(order.stage).toBe('received');
  });

  it('receive fails for an order not awaiting receipt', () => {
    const result = store.receive('RMA-0337'); // already received

    expect(result.ok).toBe(false);
    const order = store.returnOrders().find((o) => o.rma === 'RMA-0337')!;
    expect(order.stage).toBe('received');
  });

  it('inspect succeeds for a received order, records an inspection, and moves it to the inspected stage', () => {
    const inspectionsBefore = store.inspections().length;

    const result = store.inspect('RMA-0337', 'Good');

    expect(result.ok).toBe(true);
    const order = store.returnOrders().find((o) => o.rma === 'RMA-0337')!;
    expect(order.stage).toBe('inspected');
    expect(order.inspectionResult).toBe('Good');
    expect(store.inspections().length).toBe(inspectionsBefore + 1);
  });

  it('inspect fails for an order not awaiting inspection', () => {
    const result = store.inspect('RMA-0340', 'Good'); // already inspected

    expect(result.ok).toBe(false);
  });

  it('disposition succeeds for an outcome matching the inspection result, records a disposition, and moves it to the dispositioned stage', () => {
    const dispositionsBefore = store.dispositions().length;

    const result = store.disposition('RMA-0340', 'Scrap');

    expect(result.ok).toBe(true);
    const order = store.returnOrders().find((o) => o.rma === 'RMA-0340')!;
    expect(order.stage).toBe('dispositioned');
    expect(order.dispositionOutcome).toBe('Scrap');
    expect(store.dispositions().length).toBe(dispositionsBefore + 1);
  });

  it('disposition fails when the outcome does not match the inspection-result rule', () => {
    const dispositionsBefore = store.dispositions().length;

    // RMA-0340 was inspected as Damaged, so Restock (Good-only) is not a valid outcome.
    const result = store.disposition('RMA-0340', 'Restock');

    expect(result.ok).toBe(false);
    const order = store.returnOrders().find((o) => o.rma === 'RMA-0340')!;
    expect(order.stage).toBe('inspected');
    expect(store.dispositions().length).toBe(dispositionsBefore);
  });

  it('disposition requires a bin for Restock/Quarantine and fails without one', () => {
    store.receive('RMA-0343');
    store.inspect('RMA-0343', 'Good');
    const dispositionsBefore = store.dispositions().length;

    const result = store.disposition('RMA-0343', 'Restock');

    expect(result.ok).toBe(false);
    expect(store.dispositions().length).toBe(dispositionsBefore);
  });

  it('disposition succeeds with a bin for Restock and records it on the order', () => {
    store.receive('RMA-0343');
    store.inspect('RMA-0343', 'Good');

    const result = store.disposition('RMA-0343', 'Restock', 'A-04-02');

    expect(result.ok).toBe(true);
    const order = store.returnOrders().find((o) => o.rma === 'RMA-0343')!;
    expect(order.dispositionBin).toBe('A-04-02');
  });

  it('disposition fails for an order not awaiting disposition (double-disposition guard)', () => {
    const dispositionsBefore = store.dispositions().length;

    const result = store.disposition('RMA-0331', 'Scrap'); // RMA-0331 is already dispositioned

    expect(result.ok).toBe(false);
    expect(store.dispositions().length).toBe(dispositionsBefore);
  });
});
