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

  it('clicking an invoice row opens its detail panel with lines and payments', () => {
    const fixture = TestBed.createComponent(OfficeBilling);
    fixture.detectChanges();
    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="button"]'));
    const invoiceRow = rows.find((r) => r.textContent?.includes('INV-4471'));
    (invoiceRow as HTMLElement)?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Steel shelving bracket, 400mm');
  });

  it('recording a valid payment updates the invoice status and appears in the Payments list', () => {
    const fixture = TestBed.createComponent(OfficeBilling);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { selectedInvoiceCode: { set: (v: string) => void } };
    instance.selectedInvoiceCode.set('INV-4471');
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons.find((b) => b.textContent?.includes('Record payment'))?.click();
    fixture.detectChanges();

    const inputs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input'));
    const amountInput = inputs.find((i) => i.type === 'number');
    const methodInput = inputs[inputs.indexOf(amountInput!) + 1];
    amountInput!.value = '20000';
    amountInput!.dispatchEvent(new Event('input'));
    methodInput!.value = 'Bank transfer';
    methodInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('Save payment')) b.click();
    });
    fixture.detectChanges();

    // Scoped to the detail panel's own <aside> — the Invoices table always renders every
    // row's status (including seeded INV-4455, which is already "Partially paid"), so an
    // unscoped page-wide search for that text would pass even if onRecordPayment did nothing.
    const panelText = (fixture.nativeElement as HTMLElement).querySelector('aside')?.textContent ?? '';
    expect(panelText).toContain('Partially paid');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('€ 20,000');
  });

  it('recording a payment that exceeds the invoice total shows an error and does not close the form', () => {
    const fixture = TestBed.createComponent(OfficeBilling);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { selectedInvoiceCode: { set: (v: string) => void } };
    instance.selectedInvoiceCode.set('INV-4471'); // total 42180
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('Record payment')) b.click();
    });
    fixture.detectChanges();

    const inputs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input'));
    const amountInput = inputs.find((i) => i.type === 'number');
    amountInput!.value = '999999';
    amountInput!.dispatchEvent(new Event('input'));
    const methodInput = inputs[inputs.indexOf(amountInput!) + 1];
    methodInput!.value = 'Bank transfer';
    methodInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('Save payment')) b.click();
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('exceed the invoice total');
    expect(text).toContain('Save payment'); // form is still open
  });

  it('creating an invoice with a valid form adds a row and clears the form', () => {
    const fixture = TestBed.createComponent(OfficeBilling);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('New invoice')) b.click();
    });
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      invoiceCustomerCode: { set: (v: string) => void };
      invoiceWarehouseCode: { set: (v: string) => void };
    };
    instance.invoiceCustomerCode.set('CUS-2210');
    instance.invoiceWarehouseCode.set('WH-1');
    fixture.detectChanges();

    const selects = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('select'));
    const productSelect = selects[selects.length - 1];
    productSelect.value = 'IKH-482910';
    productSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('Save') && !b.textContent?.includes('payment')) b.click();
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('INV-4473');
    expect((fixture.componentInstance as unknown as { showInvoiceCreateForm: () => boolean }).showInvoiceCreateForm()).toBe(false);
  });

  it('submitting the invoice form with no customer/warehouse shows an error and does not create a row', () => {
    const fixture = TestBed.createComponent(OfficeBilling);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('New invoice')) b.click();
    });
    fixture.detectChanges();

    const before = (fixture.componentInstance as unknown as { store: { invoices: () => unknown[] } }).store.invoices().length;
    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('Save') && !b.textContent?.includes('payment')) b.click();
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Customer and Warehouse are required.');
    expect((fixture.componentInstance as unknown as { store: { invoices: () => unknown[] } }).store.invoices().length).toBe(before);
  });

  it('cancelling the invoice form clears its fields for next time', () => {
    const fixture = TestBed.createComponent(OfficeBilling);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('New invoice')) b.click();
    });
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      invoiceCustomerCode: { set: (v: string) => void; (): string };
    };
    instance.invoiceCustomerCode.set('CUS-2210');

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('Cancel')) b.click();
    });
    fixture.detectChanges();

    expect(instance.invoiceCustomerCode()).toBe('');
  });

  it('clicking a credit note row opens its view-only detail panel', () => {
    const fixture = TestBed.createComponent(OfficeBilling);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { activeSection: { set: (v: string) => void } };
    instance.activeSection.set('credit-notes');
    fixture.detectChanges();

    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="button"]'));
    const row = rows.find((r) => r.textContent?.includes('CRN-0118'));
    (row as HTMLElement)?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Shelf divider, 600mm');
  });

  it('creating a credit note with a valid form appends a row and clears the form', () => {
    const fixture = TestBed.createComponent(OfficeBilling);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { activeSection: { set: (v: string) => void } };
    instance.activeSection.set('credit-notes');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('New credit note')) b.click();
    });
    fixture.detectChanges();

    const creditNoteInstance = fixture.componentInstance as unknown as { creditNoteCustomerCode: { set: (v: string) => void } };
    creditNoteInstance.creditNoteCustomerCode.set('CUS-2274');
    fixture.detectChanges();

    const selects = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('select'));
    const productSelect = selects[selects.length - 1];
    productSelect.value = 'IKH-318440';
    productSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('Save') && !b.textContent?.includes('payment')) b.click();
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('CRN-0119');
  });

  it('cancelling the credit note form clears its fields for next time', () => {
    const fixture = TestBed.createComponent(OfficeBilling);
    fixture.detectChanges();
    const sectionInstance = fixture.componentInstance as unknown as { activeSection: { set: (v: string) => void } };
    sectionInstance.activeSection.set('credit-notes');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('New credit note')) b.click();
    });
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { creditNoteCustomerCode: { set: (v: string) => void; (): string } };
    instance.creditNoteCustomerCode.set('CUS-2274');

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('Cancel')) b.click();
    });
    fixture.detectChanges();

    expect(instance.creditNoteCustomerCode()).toBe('');
  });
});
