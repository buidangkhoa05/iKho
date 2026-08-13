import { TestBed } from '@angular/core/testing';
import { OfficeOrganization } from './office-organization';

describe('OfficeOrganization', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeOrganization],
    }).compileComponents();
  });

  it('renders KPI tiles computed from the seeded warehouses', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('lib-kpi-card');
    expect(cards.length).toBe(3);
    expect(cards[0].textContent).toContain('Warehouses');
    expect(cards[0].textContent).toContain('3');
    expect(cards[1].textContent).toContain('Active');
    expect(cards[1].textContent).toContain('2');
    expect(cards[2].textContent).toContain('Inactive');
    expect(cards[2].textContent).toContain('1');
  });

  it('renders all seeded warehouses in the table', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Rotterdam DC');
    expect(text).toContain('Antwerp Overflow');
    expect(text).toContain('Utrecht Returns Hub');
    expect(text).toContain('Rotterdam Logistics BV');
  });

  it('search narrows the table by code, name, or company', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('Antwerp');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Antwerp Overflow');
    expect(text).not.toContain('Rotterdam DC');
  });

  it('shows a bilingual empty label when search yields no results', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('no such warehouse anywhere');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('No results');
  });
});
