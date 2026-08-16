import { TestBed } from '@angular/core/testing';
import { OperatorInventory } from './operator-inventory';

describe('OperatorInventory', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OperatorInventory] }).compileComponents();
  });

  it('lists all 8 seeded stock items by default with resolved product and warehouse names', () => {
    const fixture = TestBed.createComponent(OperatorInventory);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-482910');
    expect(text).toContain('Steel shelving bracket, 400mm');
    expect(text).toContain('Rotterdam DC');
    expect(text).toContain('A-12-04');
  });

  it('search narrows results by sku, product name, or bin', () => {
    const fixture = TestBed.createComponent(OperatorInventory);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('D-01-01');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-201884');
    expect(text).not.toContain('IKH-482910');
  });

  it('shows an empty-state message when nothing matches', () => {
    const fixture = TestBed.createComponent(OperatorInventory);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('no-such-bin-xyz');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No SKUs match');
  });
});
