import { TestBed } from '@angular/core/testing';
import { StockItem, StockLedgerEntry } from '../../../core/mock-data/inventory.data';
import { StockItemDetailPanel } from './stock-item-detail-panel';

const LOT_ITEM: StockItem = {
  id: 'SI-2', sku: 'IKH-330298', warehouseCode: 'WH-1', bin: 'A-04-09',
  lot: { lotNumber: 'LOT-2026-0392', expirationDateUtc: '2027-03-02T00:00:00Z' },
  onHand: 60, reserved: 12, damaged: 0, quarantine: 0, status: 'low-stock',
  createdOnUtc: '2024-02-15T09:00:00Z', updatedOnUtc: '2024-02-15T09:00:00Z',
};

const SERIAL_ITEM: StockItem = {
  id: 'SI-7', sku: 'IKH-201884', warehouseCode: 'WH-1', bin: 'D-01-01',
  serial: { serialValue: 'SN-VDB-0001', status: 'in-stock' },
  onHand: 1, reserved: 0, damaged: 0, quarantine: 0, status: 'in-stock',
  createdOnUtc: '2024-05-01T09:00:00Z', updatedOnUtc: '2024-05-01T09:00:00Z',
};

const LEDGER: StockLedgerEntry[] = [
  { id: 'LED-2', stockItemId: 'SI-2', movementType: 'receipt', quantityDelta: 60, occurredOnUtc: '2024-02-15T09:00:00Z' },
];

describe('StockItemDetailPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StockItemDetailPanel] }).compileComponents();
  });

  function create(stockItem: StockItem = LOT_ITEM, ledgerEntries: StockLedgerEntry[] = LEDGER) {
    const fixture = TestBed.createComponent(StockItemDetailPanel);
    fixture.componentRef.setInput('stockItem', stockItem);
    fixture.componentRef.setInput('productName', 'Barcode label roll, 100×50mm');
    fixture.componentRef.setInput('warehouseName', 'Rotterdam DC');
    fixture.componentRef.setInput('ledgerEntries', ledgerEntries);
    fixture.detectChanges();
    return fixture;
  }

  it('renders sku, product/warehouse name, bin, lot, quantity breakdown, and ledger history', () => {
    const fixture = create();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-330298');
    expect(text).toContain('Barcode label roll, 100×50mm');
    expect(text).toContain('Rotterdam DC');
    expect(text).toContain('A-04-09');
    expect(text).toContain('LOT-2026-0392');
    expect(text).toContain('60'); // on hand
    expect(text).toContain('12'); // reserved
    expect(text).toContain('48'); // available = 60 - 12 - 0 - 0
  });

  it('renders the serial value instead of a lot for a serial-controlled stock item', () => {
    const fixture = create(SERIAL_ITEM, []);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('SN-VDB-0001');
  });

  it('closePanel emits when the close button is clicked', () => {
    const fixture = create();
    let emitted = false;
    fixture.componentInstance.closePanel.subscribe(() => (emitted = true));
    (fixture.nativeElement as HTMLElement).querySelector('button[aria-label]')?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(emitted).toBe(true);
  });

  it('rejects an adjust submission with a blank reason code, a zero delta, or a delta that would go negative', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as {
      startAdjust: () => void;
      adjustDelta: { set: (v: string) => void };
      adjustReasonCode: { set: (v: string) => void };
      submitAdjustment: () => void;
    };
    let payload: unknown;
    fixture.componentInstance.saveAdjustment.subscribe((v) => (payload = v));

    instance.startAdjust();
    instance.adjustDelta.set('5');
    instance.adjustReasonCode.set('');
    instance.submitAdjustment();
    expect(payload).toBeUndefined();

    instance.adjustReasonCode.set('CYCLE_COUNT');
    instance.adjustDelta.set('0');
    instance.submitAdjustment();
    expect(payload).toBeUndefined();

    instance.adjustDelta.set('-100'); // LOT_ITEM.onHand is 60
    instance.submitAdjustment();
    expect(payload).toBeUndefined();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('would leave on-hand quantity negative');
  });

  it('emits the parsed payload on a valid adjust submission', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as {
      startAdjust: () => void;
      adjustDelta: { set: (v: string) => void };
      adjustReasonCode: { set: (v: string) => void };
      adjustNotes: { set: (v: string) => void };
      submitAdjustment: () => void;
    };
    let payload: { quantityDelta: number; reasonCode: string; notes: string } | undefined;
    fixture.componentInstance.saveAdjustment.subscribe((v) => (payload = v));

    instance.startAdjust();
    instance.adjustDelta.set('-10');
    instance.adjustReasonCode.set('DAMAGE');
    instance.adjustNotes.set('  Crushed pallet.  ');
    instance.submitAdjustment();

    expect(payload).toEqual({ quantityDelta: -10, reasonCode: 'DAMAGE', notes: 'Crushed pallet.' });
  });

  it('setAdjustError surfaces a store-side outcome on the open adjust form', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as { startAdjust: () => void };
    instance.startAdjust();
    fixture.componentInstance.setAdjustError('This stock item could not be found.');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This stock item could not be found.');
  });

  it('resets the adjust form when the stockItem input changes identity, including after a successful save', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as {
      startAdjust: () => void;
      adjustDelta: { set: (v: string) => void; (): string };
      adjusting: () => boolean;
    };
    instance.startAdjust();
    instance.adjustDelta.set('5');
    expect(instance.adjusting()).toBe(true);

    fixture.componentRef.setInput('stockItem', { ...LOT_ITEM, onHand: 70 });
    fixture.detectChanges();

    expect(instance.adjusting()).toBe(false);
    expect(instance.adjustDelta()).toBe('');
  });

  it('renders each ledger entry with its movement type and signed delta', () => {
    const fixture = create();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Receipt');
    expect(text).toContain('60');
  });
});
