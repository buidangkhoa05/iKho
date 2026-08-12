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

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Receipts today');
    expect(text).toContain('20');
    expect(text).toContain('SKUs at zero available');
    expect(text).toContain('1');
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
