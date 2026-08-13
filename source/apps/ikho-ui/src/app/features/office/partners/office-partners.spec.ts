import { TestBed } from '@angular/core/testing';
import { OfficePartners } from './office-partners';

describe('OfficePartners', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficePartners],
    }).compileComponents();
  });

  it('renders KPI tiles computed from the seeded partners', () => {
    const fixture = TestBed.createComponent(OfficePartners);
    fixture.detectChanges();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('lib-kpi-card');
    expect(cards.length).toBe(3);
    expect(cards[0].textContent).toContain('Suppliers');
    expect(cards[0].textContent).toContain('4');
    expect(cards[1].textContent).toContain('Customers');
    expect(cards[1].textContent).toContain('3');
    expect(cards[2].textContent).toContain('Blocked');
    expect(cards[2].textContent).toContain('2');
  });

  it('renders all seeded partners in the table', () => {
    const fixture = TestBed.createComponent(OfficePartners);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Vanderberg Steel');
    expect(text).toContain('Meijer Retail Group');
    expect(text).toContain('Hafen Bremen GmbH');
  });

  it('type filter narrows the table to the selected type', () => {
    const fixture = TestBed.createComponent(OfficePartners);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { typeFilter: { set: (v: 'all' | 'supplier' | 'customer') => void } };
    instance.typeFilter.set('customer');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Meijer Retail Group');
    expect(text).not.toContain('Vanderberg Steel');
  });

  it('search narrows the table by name, code, city, or contact', () => {
    const fixture = TestBed.createComponent(OfficePartners);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('Eindhoven');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Vanderberg Steel');
    expect(text).not.toContain('Meijer Retail Group');
  });
});
