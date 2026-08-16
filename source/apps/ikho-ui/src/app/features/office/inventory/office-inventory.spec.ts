import { TestBed } from '@angular/core/testing';
import { OfficeInventory } from './office-inventory';

describe('OfficeInventory', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OfficeInventory] }).compileComponents();
  });

  it('shows the Stock Positions table by default with all 8 seeded rows', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-482910');
    expect(text).toContain('Steel shelving bracket, 400mm'); // resolved product name
    expect(text).toContain('Rotterdam DC'); // resolved warehouse name
    expect(text).toContain('A-12-04');
  });

  it('computes the 4 KPIs from seed data', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const kpis = (fixture.componentInstance as unknown as { kpis: () => { label: string; value: number }[] }).kpis();
    expect(kpis[0].value).toBe(2194); // Total on-hand: sum across all 8 stock items
    expect(kpis[1].value).toBe(1795); // Total available: sum of onHand - reserved - damaged - quarantine
    expect(kpis[2].value).toBe(369); // Total reserved
    expect(kpis[3].value).toBe(1); // Active reservations: only RES-1
  });

  it('toggling to Reservations shows the reservations table instead of stock positions', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons.find((b) => b.textContent?.trim() === 'Reservations')?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('SO-3301');
    expect(text).not.toContain('A-12-04');
  });

  it('search narrows the Stock Positions table to matching rows', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('D-01-01');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-201884');
    expect(text).not.toContain('IKH-482910');
  });

  it('shows an empty-state label when the search matches nothing', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('no-such-bin-xyz');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No stock positions match');
  });

  it('search narrows the Reservations table by sku', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons.find((b) => b.textContent?.trim() === 'Reservations')?.click();
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('IKH-330298');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('SO-3288');
    expect(text).not.toContain('SO-3301');
  });

  it('clicking a stock position row opens its detail panel with resolved names and ledger history', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="button"]'));
    const row = rows.find((r) => r.textContent?.includes('IKH-330298'));
    (row as HTMLElement)?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('LOT-2026-0392');
    expect(text).toContain('Receipt');
  });

  it('ledger entries render newest-first for a stock item with multiple movements', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    // SI-3 (IKH-770145) has a receipt on 2024-03-01 followed by a shrinkage adjustment on
    // 2024-07-10 — the newer adjustment must render before the older receipt.
    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="button"]'));
    const row = rows.find((r) => r.textContent?.includes('IKH-770145'));
    (row as HTMLElement)?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const adjustmentIndex = text.indexOf('Adjustment');
    const receiptIndex = text.indexOf('Receipt');
    expect(adjustmentIndex).toBeGreaterThanOrEqual(0);
    expect(receiptIndex).toBeGreaterThanOrEqual(0);
    expect(adjustmentIndex).toBeLessThan(receiptIndex);
  });

  it('adjusting a stock item from its detail panel updates on-hand in the table', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { selectedStockItemId: { set: (v: string) => void } };
    instance.selectedStockItemId.set('SI-1');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.trim() === 'Adjust') b.click();
    });
    fixture.detectChanges();

    const numberInput = (fixture.nativeElement as HTMLElement).querySelector('input[type="number"]') as HTMLInputElement;
    numberInput.value = '10';
    numberInput.dispatchEvent(new Event('input'));
    const select = (fixture.nativeElement as HTMLElement).querySelector('select') as HTMLSelectElement;
    select.value = 'FOUND';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.trim() === 'Save') b.click();
    });
    fixture.detectChanges();

    const store = (fixture.componentInstance as unknown as { store: { stockItems: () => { id: string; onHand: number }[] } }).store;
    expect(store.stockItems().find((s) => s.id === 'SI-1')?.onHand).toBe(250);
  });

  it('receiving stock for a lot-controlled product without a lot number shows an error and does not create a row', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const before = (fixture.componentInstance as unknown as { store: { stockItems: () => unknown[] } }).store.stockItems().length;

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.trim() === 'Receive stock') b.click();
    });
    fixture.detectChanges();

    const selects = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('select'));
    const productSelect = selects[0];
    productSelect.value = 'IKH-330298'; // lot-controlled
    productSelect.dispatchEvent(new Event('change'));
    const warehouseSelect = selects[1];
    warehouseSelect.value = 'WH-1';
    warehouseSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const inputs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input'));
    // The page's own search box is type="search" — the receive form's Bin field defaults to
    // type="text", so filtering to exactly 'text' (not 'search') targets the right input.
    const binInput = inputs.find((i) => i.type === 'text');
    binInput!.value = 'A-04-09';
    binInput!.dispatchEvent(new Event('input'));
    const qtyInput = inputs.find((i) => i.type === 'number');
    qtyInput!.value = '5';
    qtyInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.trim() === 'Save') b.click();
    });
    fixture.detectChanges();

    const store = (fixture.componentInstance as unknown as { store: { stockItems: () => unknown[] } }).store;
    expect(store.stockItems().length).toBe(before);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('lot-controlled');
  });

  it('clicking the header Receive stock button while the form is open clears it rather than just hiding it', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();

    const clickReceiveHeaderButton = () => {
      (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
        if (b.textContent?.trim() === 'Receive stock') b.click();
      });
    };

    clickReceiveHeaderButton(); // open
    fixture.detectChanges();

    const productSelect = (fixture.nativeElement as HTMLElement).querySelectorAll('select')[0] as HTMLSelectElement;
    productSelect.value = 'IKH-330298';
    productSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    // Trigger a validation error by saving with no warehouse/bin/quantity filled in.
    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.trim() === 'Save') b.click();
    });
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      receiveSku: () => string;
      receiveError: () => string | null;
      showReceiveForm: () => boolean;
    };
    expect(instance.receiveSku()).toBe('IKH-330298');
    expect(instance.receiveError()).not.toBeNull();

    clickReceiveHeaderButton(); // click again while open -> clears the form and closes it
    fixture.detectChanges();

    expect(instance.showReceiveForm()).toBe(false);
    expect(instance.receiveSku()).toBe('');
    expect(instance.receiveError()).toBeNull();

    clickReceiveHeaderButton(); // reopen -> must be blank, not the stale state from before
    fixture.detectChanges();

    expect(instance.showReceiveForm()).toBe(true);
    expect(instance.receiveSku()).toBe('');
    const reopenedSelect = (fixture.nativeElement as HTMLElement).querySelectorAll('select')[0] as HTMLSelectElement;
    expect(reopenedSelect.value).toBe('');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Select a product and warehouse');
  });

  it('switching sections clears the receive form and the selected stock item', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as {
      selectedStockItemId: { set: (v: string) => void };
      showReceiveForm: { set: (v: boolean) => void; (): boolean };
    };
    instance.selectedStockItemId.set('SI-1');
    instance.showReceiveForm.set(true);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.trim() === 'Reservations') b.click();
    });
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.trim() === 'Stock Positions') b.click();
    });
    fixture.detectChanges();

    expect(instance.showReceiveForm()).toBe(false);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Ledger');
  });

  it('clicking an active reservation row shows a Release button, and releasing it updates its status', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const buttons1 = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons1.find((b) => b.textContent?.trim() === 'Reservations')?.click();
    fixture.detectChanges();

    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="button"]'));
    const row = rows.find((r) => r.textContent?.includes('SO-3301'));
    (row as HTMLElement)?.click();
    fixture.detectChanges();

    const buttons2 = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    (buttons2.find((b) => b.textContent?.includes('Release')) as HTMLElement)?.click();
    fixture.detectChanges();

    const store = (fixture.componentInstance as unknown as { store: { reservations: () => { id: string; status: string }[] } }).store;
    expect(store.reservations().find((r) => r.id === 'RES-1')?.status).toBe('released');
  });

  it('an already-released reservation shows no Release button', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const buttons1 = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons1.find((b) => b.textContent?.trim() === 'Reservations')?.click();
    fixture.detectChanges();

    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="button"]'));
    const row = rows.find((r) => r.textContent?.includes('SO-3288'));
    (row as HTMLElement)?.click();
    fixture.detectChanges();

    const buttons2 = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons2.some((b) => b.textContent?.includes('Release'))).toBe(false);
  });
});
