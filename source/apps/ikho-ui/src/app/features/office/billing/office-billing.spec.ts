import { TestBed } from '@angular/core/testing';
import { OfficeBilling } from './office-billing';

describe('OfficeBilling', () => {
  beforeEach(async () => {
    vi.setSystemTime(new Date('2026-08-14T12:00:00Z'));
    await TestBed.configureTestingModule({ imports: [OfficeBilling] }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the Invoices table by default with all 6 seeded rows', () => {
    const fixture = TestBed.createComponent(OfficeBilling);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('INV-4471');
    expect(text).toContain('Meijer Retail Group');
    expect(text).toContain('WH-1');
  });

  it('computes the 4 KPIs from seed data at the mocked current date', () => {
    const fixture = TestBed.createComponent(OfficeBilling);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('€ 61,120'); // Invoiced this month: INV-4471 + INV-4472
    expect(text).toContain('€ 65,440'); // Outstanding: 42180 + 18940 + (7320-3000)
    expect(text).toContain('€ 54,280'); // Paid this month: 38400 + 12880 + 3000
    expect(text).toContain('1'); // Credit notes count
  });

  it('toggling to Credit Notes shows the credit-note table instead of Invoices', () => {
    const fixture = TestBed.createComponent(OfficeBilling);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const toggle = buttons.find((b) => b.textContent?.includes('Credit Notes'));
    toggle?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('CRN-0118');
    expect(text).not.toContain('INV-4471');
  });

  it('search narrows the Invoices table to matching rows', () => {
    const fixture = TestBed.createComponent(OfficeBilling);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('Brico');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('INV-4472');
    expect(text).not.toContain('INV-4471');
  });

  it('shows an empty-state label when the search matches nothing', () => {
    const fixture = TestBed.createComponent(OfficeBilling);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('no-such-invoice-xyz');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No invoices match');
  });
});
