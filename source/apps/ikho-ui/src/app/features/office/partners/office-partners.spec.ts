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

  it('displays bilingual empty label when search yields no results', () => {
    const fixture = TestBed.createComponent(OfficePartners);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('xyznonexistentpartner');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No partners match');
  });

  it("row click opens the detail panel with the row's addresses and contacts", () => {
    const fixture = TestBed.createComponent(OfficePartners);
    fixture.detectChanges();

    const table = (fixture.nativeElement as HTMLElement).querySelector('lib-data-table')!;
    const firstRow = table.querySelector('tbody tr') as HTMLElement;
    firstRow.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Partner detail');
    expect(text).toContain('Eindhoven');
  });

  it("activate/deactivate flips the selected partner's status", () => {
    const fixture = TestBed.createComponent(OfficePartners);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      selectedCode: { set: (v: string) => void };
      store: { partners: () => { code: string; isActive: boolean }[] };
    };
    instance.selectedCode.set('SUP-0142');
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const deactivateButton = buttons.find((b) => b.textContent?.includes('Deactivate'));
    deactivateButton?.click();
    fixture.detectChanges();

    expect(instance.store.partners().find((p) => p.code === 'SUP-0142')!.isActive).toBe(false);
  });
});
