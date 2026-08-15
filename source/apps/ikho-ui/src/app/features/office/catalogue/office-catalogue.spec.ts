import { TestBed } from '@angular/core/testing';
import { OfficeCatalogue } from './office-catalogue';

describe('OfficeCatalogue', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OfficeCatalogue] }).compileComponents();
  });

  it('shows the Products table by default with all 10 seeded rows', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-482910');
    expect(text).toContain('Steel shelving bracket, 400mm');
    expect(text).toContain('Racking'); // resolved category name, not just the code
    expect(text).toContain('Vanderberg'); // resolved brand name
  });

  it('computes the 4 KPIs from seed data', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    // Assert directly on the kpis() computed rather than a page-wide digit search — single
    // digits like '9' or '4' would also coincidentally match SKU codes elsewhere on the page
    // (e.g. 'IKH-902316' contains '9'), so a text-search assertion here would be vacuous.
    const kpis = (fixture.componentInstance as unknown as { kpis: () => { label: string; value: number }[] }).kpis();
    expect(kpis[0].value).toBe(9); // Active SKUs: 10 seeded, 1 inactive (IKH-447203)
    expect(kpis[1].value).toBe(4); // Categories: total directory size
    expect(kpis[2].value).toBe(6); // Brands: total directory size
    expect(kpis[3].value).toBe(5); // Lot-controlled: count of isLotControlled products
  });

  it('toggling to Categories shows the categories table instead of Products', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons.find((b) => b.textContent?.trim() === 'Categories')?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('RACK');
    expect(text).toContain('Racking');
    expect(text).not.toContain('IKH-482910');
  });

  it('toggling to Brands shows the brands table', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons.find((b) => b.textContent?.trim() === 'Brands')?.click();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('VDB');
    expect(text).toContain('Vanderberg');
  });

  it('toggling to Units of Measure shows the UoM table', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons.find((b) => b.textContent?.trim() === 'Units of Measure')?.click();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('EA');
    expect(text).toContain('Each');
  });

  it('search narrows the Products table to matching rows', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('scanner');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-902316');
    expect(text).not.toContain('IKH-482910');
  });

  it('shows an empty-state label when the search matches nothing', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('no-such-product-xyz');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No products match');
  });
});
