import { TestBed } from '@angular/core/testing';
import { InventoryStore } from './inventory-store';

describe('InventoryStore', () => {
  let store: InventoryStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(InventoryStore);
  });

  it('seeds 8 stock items, 9 ledger entries, and 2 reservations', () => {
    expect(store.stockItems().length).toBe(8);
    expect(store.ledger().length).toBe(9);
    expect(store.reservations().length).toBe(2);
  });

  it('seeds IKH-201884 as two stock items, one per serial unit', () => {
    const items = store.stockItems().filter((s) => s.sku === 'IKH-201884');
    expect(items.length).toBe(2);
    expect(items.map((i) => i.serial?.serialValue).sort()).toEqual(['SN-VDB-0001', 'SN-VDB-0002']);
  });

  describe('receiveStock', () => {
    const valid = { sku: 'IKH-770145', warehouseCode: 'WH-1', bin: 'B-02-01', quantity: 10 };

    it('rejects a blank sku, blank bin, or non-positive quantity as invalid', () => {
      expect(store.receiveStock({ ...valid, sku: '' })).toBe('invalid');
      expect(store.receiveStock({ ...valid, bin: '  ' })).toBe('invalid');
      expect(store.receiveStock({ ...valid, quantity: 0 })).toBe('invalid');
    });

    it('rejects an unknown or inactive product as product-not-found', () => {
      expect(store.receiveStock({ ...valid, sku: 'NOPE' })).toBe('product-not-found');
      expect(store.receiveStock({ ...valid, sku: 'IKH-447203' })).toBe('product-not-found'); // seeded inactive in Catalogue
    });

    it('rejects a lot-controlled product with a blank lot number', () => {
      expect(store.receiveStock({ ...valid, sku: 'IKH-330298' })).toBe('lot-required');
    });

    it('rejects a serial-controlled product with no serial numbers', () => {
      expect(store.receiveStock({ ...valid, sku: 'IKH-201884' })).toBe('serial-required');
    });

    it('rejects a serial-controlled product whose serial count does not match quantity', () => {
      expect(store.receiveStock({ ...valid, sku: 'IKH-201884', quantity: 2, serialNumbers: ['SN-NEW-01'] })).toBe('serial-count-mismatch');
    });

    it('rejects duplicate serial numbers within the same request (case-insensitive)', () => {
      expect(
        store.receiveStock({ ...valid, sku: 'IKH-201884', quantity: 2, serialNumbers: ['SN-NEW-01', 'sn-new-01'] }),
      ).toBe('duplicate-serial');
    });

    it('increments an existing untracked stock item in place rather than creating a new row', () => {
      const before = store.stockItems().length;
      const outcome = store.receiveStock(valid); // matches SI-3's sku/warehouse/bin, no lot
      expect(outcome).toBe('ok');
      expect(store.stockItems().length).toBe(before);
      const updated = store.stockItems().find((s) => s.id === 'SI-3');
      expect(updated?.onHand).toBe(10);
    });

    it('creates a new stock item for a lot-controlled product with a lot number', () => {
      const before = store.stockItems().length;
      const outcome = store.receiveStock({
        sku: 'IKH-330298', warehouseCode: 'WH-1', bin: 'A-04-09', quantity: 20, lotNumber: 'LOT-2026-9999',
      });
      expect(outcome).toBe('ok');
      expect(store.stockItems().length).toBe(before + 1);
      const created = store.stockItems()[0];
      expect(created).toMatchObject({ sku: 'IKH-330298', onHand: 20, lot: { lotNumber: 'LOT-2026-9999' } });
    });

    it('creates one stock item per serial value for a serial-controlled product', () => {
      const before = store.stockItems().length;
      const outcome = store.receiveStock({
        sku: 'IKH-902316', warehouseCode: 'WH-1', bin: 'D-02-01', quantity: 2, serialNumbers: ['SN-SCT-01', 'SN-SCT-02'],
      });
      expect(outcome).toBe('ok');
      expect(store.stockItems().length).toBe(before + 2);
      const created = store.stockItems().slice(0, 2);
      expect(created.every((s) => s.onHand === 1 && s.sku === 'IKH-902316')).toBe(true);
      expect(created.map((s) => s.serial?.serialValue).sort()).toEqual(['SN-SCT-01', 'SN-SCT-02']);
    });

    it('appends one receipt ledger entry per affected stock item', () => {
      const before = store.ledger().length;
      store.receiveStock({ sku: 'IKH-902316', warehouseCode: 'WH-1', bin: 'D-02-01', quantity: 2, serialNumbers: ['SN-SCT-03', 'SN-SCT-04'] });
      expect(store.ledger().length).toBe(before + 2);
      expect(store.ledger().slice(0, 2).every((e) => e.movementType === 'receipt' && e.quantityDelta === 1)).toBe(true);
    });
  });

  describe('adjustStock', () => {
    it('rejects a blank reason code as invalid', () => {
      expect(store.adjustStock('SI-1', { quantityDelta: 5, reasonCode: ' ', notes: '' })).toBe('invalid');
    });

    it('rejects an unknown stock item id', () => {
      expect(store.adjustStock('NOPE', { quantityDelta: 5, reasonCode: 'FOUND', notes: '' })).toBe('not-found');
    });

    it('rejects a delta that would drive on-hand negative', () => {
      expect(store.adjustStock('SI-3', { quantityDelta: -1, reasonCode: 'DAMAGE', notes: '' })).toBe('would-go-negative'); // SI-3 is already at 0
    });

    it('applies a positive delta and appends an adjustment ledger entry with the reason code', () => {
      const outcome = store.adjustStock('SI-1', { quantityDelta: 10, reasonCode: 'FOUND', notes: 'Found on a mis-shelved pallet.' });
      expect(outcome).toBe('ok');
      expect(store.stockItems().find((s) => s.id === 'SI-1')?.onHand).toBe(250);
      const entry = store.ledger()[0];
      expect(entry).toMatchObject({ stockItemId: 'SI-1', movementType: 'adjustment', quantityDelta: 10, reasonCode: 'FOUND' });
    });

    it('applies a negative delta down to exactly zero', () => {
      const outcome = store.adjustStock('SI-3', { quantityDelta: 0, reasonCode: 'CYCLE_COUNT', notes: '' });
      expect(outcome).toBe('ok');
      expect(store.stockItems().find((s) => s.id === 'SI-3')?.onHand).toBe(0);
    });
  });

  describe('releaseReservation', () => {
    it('rejects an unknown reservation id', () => {
      expect(store.releaseReservation('NOPE')).toBe('not-found');
    });

    it('rejects a reservation that is not active', () => {
      expect(store.releaseReservation('RES-2')).toBe('not-active'); // seeded already-released
    });

    it('releases an active reservation, decrements the stock item reserved quantity, and appends a zero-delta release ledger entry', () => {
      const outcome = store.releaseReservation('RES-1');
      expect(outcome).toBe('ok');
      expect(store.reservations().find((r) => r.id === 'RES-1')?.status).toBe('released');
      expect(store.stockItems().find((s) => s.id === 'SI-8')?.reserved).toBe(0);
      const entry = store.ledger()[0];
      expect(entry).toMatchObject({ stockItemId: 'SI-8', movementType: 'release', quantityDelta: 0, referenceType: 'SalesOrder', referenceId: 'SO-3301' });
    });
  });
});
