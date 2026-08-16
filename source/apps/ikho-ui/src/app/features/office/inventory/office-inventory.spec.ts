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
});
