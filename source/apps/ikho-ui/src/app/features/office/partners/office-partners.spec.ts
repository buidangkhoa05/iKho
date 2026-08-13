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

  it('adding an address appends it to the partner and clears the form for the next add', () => {
    const fixture = TestBed.createComponent(OfficePartners);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const table = root.querySelector('lib-data-table')!;
    const firstRow = table.querySelector('tbody tr') as HTMLElement;
    firstRow.click();
    fixture.detectChanges();

    const setTextInputByLabel = (label: string, value: string) => {
      const textInputs = Array.from(root.querySelectorAll('lib-text-input'));
      const host = textInputs.find((el) => Array.from(el.querySelectorAll('span')).some((s) => s.textContent?.trim() === label));
      const input = host?.querySelector('input') as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const clickButtonWithText = (text: string) => {
      const buttons = Array.from(root.querySelectorAll('button'));
      buttons.find((b) => b.textContent?.trim() === text)?.click();
    };

    clickButtonWithText('Add address');
    fixture.detectChanges();

    setTextInputByLabel('Line 1', 'Nieuwe Kade 8');
    setTextInputByLabel('City', 'Rotterdam');
    setTextInputByLabel('Country', 'Netherlands');
    fixture.detectChanges();

    clickButtonWithText('Save address');
    fixture.detectChanges();

    let text = root.textContent ?? '';
    expect(text).toContain('Nieuwe Kade 8, Rotterdam');

    // Reopening "Add address" after a successful save must show empty fields, not the
    // just-saved values (regression guard for the stale-field-values bug).
    clickButtonWithText('Add address');
    fixture.detectChanges();

    const line1Input = Array.from(root.querySelectorAll('lib-text-input'))
      .find((el) => Array.from(el.querySelectorAll('span')).some((s) => s.textContent?.trim() === 'Line 1'))
      ?.querySelector('input') as HTMLInputElement;
    const cityInput = Array.from(root.querySelectorAll('lib-text-input'))
      .find((el) => Array.from(el.querySelectorAll('span')).some((s) => s.textContent?.trim() === 'City'))
      ?.querySelector('input') as HTMLInputElement;

    expect(line1Input.value).toBe('');
    expect(cityInput.value).toBe('');

    text = root.textContent ?? '';
    expect(text).toContain('Nieuwe Kade 8, Rotterdam');
  });

  it('opens the add-partner form, rejects a duplicate code, and creates a row on valid submit', () => {
    const fixture = TestBed.createComponent(OfficePartners);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showCreateForm: { set: (v: boolean) => void };
      formType: { set: (v: 'supplier' | 'customer') => void };
      formCode: { set: (v: string) => void };
      formName: { set: (v: string) => void };
      formTaxId: { set: (v: string) => void };
      formError: () => string | null;
      submitCreate: () => void;
    };

    instance.showCreateForm.set(true);
    instance.formType.set('customer');
    instance.formCode.set('SUP-0142'); // duplicate
    instance.formName.set('New Co');
    instance.formTaxId.set('NL-1');
    instance.submitCreate();
    fixture.detectChanges();

    expect(instance.formError()).toContain('SUP-0142');

    instance.formCode.set('CUS-9001');
    instance.submitCreate();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('New Co');
  });
});
