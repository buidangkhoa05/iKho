import { TestBed } from '@angular/core/testing';
import { LineItemsBuilder } from './line-items-builder';

describe('LineItemsBuilder', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LineItemsBuilder] }).compileComponents();
  });

  it('starts with a single blank line', () => {
    const fixture = TestBed.createComponent(LineItemsBuilder);
    fixture.detectChanges();
    expect(fixture.componentInstance.getLines()).toEqual([{ productCode: '', quantity: 1, unitPrice: 0 }]);
  });

  it('renders every product as a picker option', () => {
    const fixture = TestBed.createComponent(LineItemsBuilder);
    fixture.detectChanges();
    const options = (fixture.nativeElement as HTMLElement).querySelectorAll('option');
    // +1 for the disabled "select a product" placeholder option.
    expect(options.length).toBeGreaterThan(1);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-482910');
  });

  it('addRow appends a new blank line, and removeRow removes it but never the last remaining line', () => {
    const fixture = TestBed.createComponent(LineItemsBuilder);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as {
      addRow: () => void;
      removeRow: (id: number) => void;
      rows: () => { id: number }[];
    };

    instance.addRow();
    expect(instance.rows().length).toBe(2);

    const firstId = instance.rows()[0].id;
    instance.removeRow(firstId);
    expect(instance.rows().length).toBe(1);

    const lastId = instance.rows()[0].id;
    instance.removeRow(lastId);
    expect(instance.rows().length).toBe(1); // cannot remove the last row
  });

  it('updateRow patches a line and getLines reflects it, with the live total updating', () => {
    const fixture = TestBed.createComponent(LineItemsBuilder);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as {
      rows: () => { id: number }[];
      updateRow: (id: number, patch: Partial<{ productCode: string; quantity: number; unitPrice: number }>) => void;
    };

    const id = instance.rows()[0].id;
    instance.updateRow(id, { productCode: 'IKH-482910', quantity: 3, unitPrice: 60 });
    fixture.detectChanges();

    expect(fixture.componentInstance.getLines()).toEqual([{ productCode: 'IKH-482910', quantity: 3, unitPrice: 60 }]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('€ 180');
  });

  it('renders a live-computed per-row total that updates independently of the grand total', () => {
    const fixture = TestBed.createComponent(LineItemsBuilder);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as {
      addRow: () => void;
      rows: () => { id: number }[];
      updateRow: (id: number, patch: Partial<{ productCode: string; quantity: number; unitPrice: number }>) => void;
    };

    instance.addRow();
    const [firstId, secondId] = instance.rows().map((r) => r.id);
    instance.updateRow(firstId, { productCode: 'IKH-482910', quantity: 3, unitPrice: 60 });
    instance.updateRow(secondId, { productCode: 'IKH-330298', quantity: 2, unitPrice: 6 });
    fixture.detectChanges();

    const rowEls = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.grid.grid-cols-\\[2fr_1fr_1fr_auto\\]'));
    expect(rowEls[0].textContent).toContain('€ 180'); // 3 * 60, this row's total, not the 192 grand total
    expect(rowEls[1].textContent).toContain('€ 12'); // 2 * 6

    instance.updateRow(firstId, { quantity: 5 });
    fixture.detectChanges();
    expect(rowEls[0].textContent).toContain('€ 300'); // 5 * 60, row total tracks its own row's edits
    expect(rowEls[1].textContent).toContain('€ 12'); // unaffected by the other row's change
  });

  it('reset restores a single blank line', () => {
    const fixture = TestBed.createComponent(LineItemsBuilder);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { addRow: () => void };
    instance.addRow();
    instance.addRow();
    expect(fixture.componentInstance.getLines().length).toBe(3);

    fixture.componentInstance.reset();
    expect(fixture.componentInstance.getLines()).toEqual([{ productCode: '', quantity: 1, unitPrice: 0 }]);
  });
});
