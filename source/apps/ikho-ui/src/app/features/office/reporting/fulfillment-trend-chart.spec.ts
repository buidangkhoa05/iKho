import { TestBed } from '@angular/core/testing';
import { FulfillmentTrendChart } from './fulfillment-trend-chart';

const SAMPLE_DATA = [
  { date: 'Aug 06', receipts: 24, shipments: 19, allocations: 21 },
  { date: 'Aug 07', receipts: 15, shipments: 27, allocations: 30 },
  { date: 'Aug 08', receipts: 21, shipments: 24, allocations: 23 },
];

describe('FulfillmentTrendChart', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FulfillmentTrendChart],
    }).compileComponents();
  });

  it('renders one bar per series per day', () => {
    const fixture = TestBed.createComponent(FulfillmentTrendChart);
    fixture.componentRef.setInput('data', SAMPLE_DATA);
    fixture.detectChanges();

    const bars = (fixture.nativeElement as HTMLElement).querySelectorAll('.chart-bar');
    expect(bars.length).toBe(9); // 3 days × 3 series
  });

  it('renders a legend item per series', () => {
    const fixture = TestBed.createComponent(FulfillmentTrendChart);
    fixture.componentRef.setInput('data', SAMPLE_DATA);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Receipts');
    expect(text).toContain('Shipments');
    expect(text).toContain('Allocations');
  });

  it('renders one table row per day with the seeded dates', () => {
    const fixture = TestBed.createComponent(FulfillmentTrendChart);
    fixture.componentRef.setInput('data', SAMPLE_DATA);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Aug 06');
    expect(text).toContain('Aug 07');
    expect(text).toContain('Aug 08');
  });

  it('shows a tooltip with the series and value when a bar is hovered', () => {
    const fixture = TestBed.createComponent(FulfillmentTrendChart);
    fixture.componentRef.setInput('data', SAMPLE_DATA);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { hoveredBar: { set: (v: unknown) => void } };
    instance.hoveredBar.set({ x: 0, y: 0, width: 16, height: 40, color: '#2563eb', value: 24, series: 'receipts' });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Receipts: 24');
  });

  it('renders always-visible value labels above each bar', () => {
    const fixture = TestBed.createComponent(FulfillmentTrendChart);
    fixture.componentRef.setInput('data', SAMPLE_DATA);
    fixture.detectChanges();

    const labels = (fixture.nativeElement as HTMLElement).querySelectorAll('.chart-bar-label');
    expect(labels.length).toBe(9); // one label per bar, 3 days × 3 series

    // Verify labels contain the expected values
    const labelValues = Array.from(labels).map((l) => l.textContent?.trim());
    expect(labelValues).toContain('24'); // receipts for Aug 06 and shipments for Aug 08
    expect(labelValues).toContain('19'); // shipments for Aug 06
    expect(labelValues).toContain('21'); // allocations for Aug 06 and receipts for Aug 08
    expect(labelValues).toContain('15'); // receipts for Aug 07
    expect(labelValues).toContain('27'); // shipments for Aug 07
    expect(labelValues).toContain('30'); // allocations for Aug 07
    expect(labelValues).toContain('23'); // allocations for Aug 08
  });
});
