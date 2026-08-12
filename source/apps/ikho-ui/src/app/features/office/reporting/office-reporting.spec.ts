import { TestBed } from '@angular/core/testing';
import { OfficeReporting } from './office-reporting';

describe('OfficeReporting', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeReporting],
    }).compileComponents();
  });

  it('renders KPI tiles computed from the seeded data', () => {
    const fixture = TestBed.createComponent(OfficeReporting);
    fixture.detectChanges();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('lib-kpi-card');
    expect(cards.length).toBe(4);
    expect(cards[0].textContent).toContain('Receipts today');
    expect(cards[0].textContent).toContain('20');
    expect(cards[3].textContent).toContain('SKUs at zero available');
    expect(cards[3].textContent).toContain('1');
  });

  it('renders all three status tables with seeded rows', () => {
    const fixture = TestBed.createComponent(OfficeReporting);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-482910');
    expect(text).toContain('PO-20144');
    expect(text).toContain('SO-91002');
  });

  it('renders the fulfillment trend chart', () => {
    const fixture = TestBed.createComponent(OfficeReporting);
    fixture.detectChanges();

    const bars = (fixture.nativeElement as HTMLElement).querySelectorAll('.chart-bar');
    expect(bars.length).toBe(21); // 7 days × 3 series
  });
});
