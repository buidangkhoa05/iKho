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
