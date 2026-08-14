# Billing UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/office/billing` into an actionable directory backed by a mock `BillingStore`: create invoices with a repeatable product-line builder, record payments against them, and create credit notes — mirroring `ikho-warehouse-billing`'s exact create/read-only API surface and validation order.

**Architecture:** `OfficeBilling` bypasses `OfficeScreen` (same as Partners/Organization/Reporting) and composes `lib-data-panel`/`lib-data-table`/`lib-kpi-card` directly. A section-toggle signal switches between an Invoices view and a Credit Notes view, each with its own table, detail panel, and create panel. A shared `LineItemsBuilder` component (used by both create panels) manages a repeatable product-line list. `InvoiceDetailPanel` nests a Payments list and a "Record payment" form (no cross-invoice payments list exists on the backend). `CreditNoteDetailPanel` is view-only (the backend has no mutation endpoint for credit notes beyond creation).

**Tech Stack:** Angular 19 standalone components, Signals (no RxJS), Tailwind v4 utility classes, `vitest-angular` (`vi.setSystemTime` for date-dependent KPI tests), `@ikho/shared-ui` (`DataPanel`, `DataTable`, `KpiCard`, `TextInput`, `Button`, `StatusBadge`, `Icon`). No `HttpClient` — plain in-memory signal store seeded from static mock data.

## Global Constraints

- **`@angular-eslint/no-output-native`**: no Angular `output()` may be named `close` — use `closePanel` (bit Partners UI in production CI; baked into Organization from the start; must be baked in here too).
- **`DataTable.rows` typing**: any row interface bound to `lib-data-table`'s `[rows]` must `extends Record<string, unknown>` (`DataTable.rows` is `input.required<Record<string, unknown>[]>()`).
- **`DataTable.emptyLabel`**: always bind `[emptyLabel]` to a bilingual `t()` key — never leave it to the component's hardcoded English default (`'No results'`).
- **Store owns validation, in the backend's exact order.** Every guard in `BillingStore` mirrors its corresponding backend service method's validation order precisely (see the design spec's Data model section). Components only translate outcome strings into bilingual error text — they never duplicate the guard logic itself, beyond the same client-side blank-check pattern Organization used (validate obviously-required fields before making the store call, to avoid a pointless round trip — never a *substitute* for the store's own check).
- **Every mutation's outcome must be surfaced to the UI**, never discarded. A form that silently no-ops on `'duplicate-code'`/`'invalid'`/etc. is a defect (this was finding F2 in Organization's final review) — every `submit*`/`onRecordPayment` handler must branch on every non-`'ok'` outcome and call the relevant `setXError` method on the child panel via a `viewChild` reference.
- **`effect()` reset pattern**: any detail panel with local mutable form state must reset ALL of it (visibility flags AND typed field values) via a constructor `effect()` keyed on the `input()` signal — not just on selection change, but implicitly on every successful save too, since the store's immutable updates give the input a new object identity on every mutation.
- **Cancel handlers must clear stale state.** Every "Cancel" button must reset the same fields a successful save resets, not just close the form — a cancelled form must not resurrect old text and a stale error on reopen (finding F4 in Organization's final review).
- **No delete, no void/reverse action, no pagination, no modal/dialog** anywhere in this module.

---

### Task 1: Billing data model & `BillingStore`

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/billing.data.ts`
- Create: `source/apps/ikho-ui/src/app/core/state/billing-store.ts`
- Test: `source/apps/ikho-ui/src/app/core/state/billing-store.spec.ts`

**Interfaces:**
- Consumes: `PARTNERS` (existing, `core/mock-data/partners.data.ts`), `PRODUCTS`/`Product` (existing, `core/mock-data/products.data.ts`).
- Produces: types `InvoiceStatus`, `CreditNoteStatus`, `PaymentStatus`, `InvoiceLine`, `CreditNoteLine`, `Payment`, `Invoice`, `CreditNote` (`billing.data.ts`); `BillingStore` (`providedIn: 'root'`) exposing `invoices`/`creditNotes` readonly signals plus `addInvoice(input: AddInvoiceInput): AddInvoiceOutcome`, `addCreditNote(input: AddCreditNoteInput): AddCreditNoteOutcome`, `recordPayment(invoiceCode: string, input: RecordPaymentInput): RecordPaymentOutcome`, and types `LineInput`, `AddInvoiceInput`, `AddCreditNoteInput`, `RecordPaymentInput`, `AddInvoiceOutcome = 'ok' | 'invalid' | 'customer-not-found' | 'product-not-found'`, `AddCreditNoteOutcome` (same shape), `RecordPaymentOutcome = 'ok' | 'invalid' | 'invoice-not-found' | 'invoice-void' | 'exceeds-total'`. All of Tasks 2–6 depend on these exact names and shapes.

- [ ] **Step 1: Write `billing.data.ts`**

```ts
// source/apps/ikho-ui/src/app/core/mock-data/billing.data.ts
import { PRODUCTS } from './products.data';

export type InvoiceStatus = 'issued' | 'partially-paid' | 'paid' | 'void';
export type CreditNoteStatus = 'issued' | 'void';
// 'void' on Invoice/CreditNote and 'reversed' on Payment are unreachable through any UI
// action — the backend exposes no endpoint that ever sets them. They're modeled here only
// for fidelity, and so INV-4400 below can give the invoice-void payment guard a real seed
// invoice to reject against (mirrors Organization seeding one inactive warehouse, WH-3,
// specifically to exercise a status guard).
export type PaymentStatus = 'recorded' | 'reversed';

export interface InvoiceLine {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CreditNoteLine {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Payment {
  id: string;
  amount: number;
  paidOnUtc: string;
  method: string;
  referenceNote?: string;
  status: PaymentStatus;
}

export interface Invoice {
  code: string;
  customerCode: string;
  warehouseCode: string;
  sourceReferenceType?: string;
  sourceReferenceId?: string;
  status: InvoiceStatus;
  issuedOnUtc: string;
  totalAmount: number;
  lines: InvoiceLine[];
  payments: Payment[];
}

export interface CreditNote {
  code: string;
  customerCode: string;
  sourceReferenceType?: string;
  sourceReferenceId?: string;
  status: CreditNoteStatus;
  issuedOnUtc: string;
  totalAmount: number;
  lines: CreditNoteLine[];
}

function seedLine(id: string, sku: string, quantity: number, unitPrice: number): InvoiceLine {
  const product = PRODUCTS.find((p) => p.sku === sku);
  if (!product) throw new Error(`Seed data error: unknown product sku '${sku}'.`);
  return { id, productCode: product.sku, productName: product.name.en, quantity, unitPrice, lineTotal: quantity * unitPrice };
}

// Issue dates are deliberately split across the current month (2026-08) and the prior one
// (2026-07) so "this month" KPIs in office-billing.spec.ts have both included and excluded
// rows to assert against. See the design spec's "Seed data" section for the worked totals.
export const INVOICES: Invoice[] = [
  {
    code: 'INV-4468',
    customerCode: 'CUS-2210',
    warehouseCode: 'WH-1',
    status: 'paid',
    issuedOnUtc: '2026-07-28T09:00:00Z',
    totalAmount: 38400,
    lines: [seedLine('INVL-1', 'IKH-201884', 12, 3200)],
    payments: [{ id: 'PAY-2214', amount: 38400, paidOnUtc: '2026-08-05T09:00:00Z', method: 'Bank transfer', status: 'recorded' }],
  },
  {
    code: 'INV-4470',
    customerCode: 'CUS-2274',
    warehouseCode: 'WH-1',
    status: 'paid',
    issuedOnUtc: '2026-07-30T09:00:00Z',
    totalAmount: 12880,
    lines: [seedLine('INVL-2', 'IKH-105522', 3220, 4)],
    payments: [{ id: 'PAY-2215', amount: 12880, paidOnUtc: '2026-08-06T09:00:00Z', method: 'Bank transfer', status: 'recorded' }],
  },
  {
    code: 'INV-4471',
    customerCode: 'CUS-2210',
    warehouseCode: 'WH-1',
    status: 'issued',
    issuedOnUtc: '2026-08-01T09:00:00Z',
    totalAmount: 42180,
    lines: [seedLine('INVL-3', 'IKH-482910', 700, 60), seedLine('INVL-4', 'IKH-330298', 30, 6)],
    payments: [],
  },
  {
    code: 'INV-4472',
    customerCode: 'CUS-2274',
    warehouseCode: 'WH-1',
    status: 'issued',
    issuedOnUtc: '2026-08-02T09:00:00Z',
    totalAmount: 18940,
    lines: [seedLine('INVL-5', 'IKH-770145', 430, 44), seedLine('INVL-6', 'IKH-559071', 4, 5)],
    payments: [],
  },
  {
    // Hafen Bremen (CUS-2318) is an inactive customer in PARTNERS — this invoice was issued
    // before they went inactive and stays on the books; addInvoice must still reject NEW
    // invoices for this customer (see the 'customer-not-found' test in Step 6).
    code: 'INV-4455',
    customerCode: 'CUS-2318',
    warehouseCode: 'WH-2',
    status: 'partially-paid',
    issuedOnUtc: '2026-07-12T09:00:00Z',
    totalAmount: 7320,
    lines: [seedLine('INVL-7', 'IKH-902316', 6, 1220)],
    payments: [{ id: 'PAY-2216', amount: 3000, paidOnUtc: '2026-08-07T09:00:00Z', method: 'Bank transfer', status: 'recorded' }],
  },
  {
    code: 'INV-4400',
    customerCode: 'CUS-2210',
    warehouseCode: 'WH-1',
    status: 'void',
    issuedOnUtc: '2026-07-01T09:00:00Z',
    totalAmount: 500,
    lines: [seedLine('INVL-8', 'IKH-447203', 50, 10)],
    payments: [],
  },
];

export const CREDIT_NOTES: CreditNote[] = [
  {
    code: 'CRN-0118',
    customerCode: 'CUS-2210',
    status: 'issued',
    issuedOnUtc: '2026-08-04T09:00:00Z',
    totalAmount: 1260,
    lines: [seedLine('CRNL-1', 'IKH-318440', 18, 70)],
  },
];
```

- [ ] **Step 2: Write `billing-store.ts`**

```ts
// source/apps/ikho-ui/src/app/core/state/billing-store.ts
import { Injectable, signal } from '@angular/core';
import {
  CREDIT_NOTES,
  CreditNote,
  CreditNoteLine,
  INVOICES,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  Payment,
} from '../mock-data/billing.data';
import { PARTNERS } from '../mock-data/partners.data';
import { PRODUCTS } from '../mock-data/products.data';

export type AddInvoiceOutcome = 'ok' | 'invalid' | 'customer-not-found' | 'product-not-found';
export type AddCreditNoteOutcome = 'ok' | 'invalid' | 'customer-not-found' | 'product-not-found';
export type RecordPaymentOutcome = 'ok' | 'invalid' | 'invoice-not-found' | 'invoice-void' | 'exceeds-total';

export interface LineInput {
  productCode: string;
  quantity: number;
  unitPrice: number;
}

export interface AddInvoiceInput {
  customerCode: string;
  warehouseCode: string;
  sourceReferenceType?: string;
  sourceReferenceId?: string;
  lines: LineInput[];
}

export interface AddCreditNoteInput {
  customerCode: string;
  sourceReferenceType?: string;
  sourceReferenceId?: string;
  lines: LineInput[];
}

export interface RecordPaymentInput {
  amount: number;
  method: string;
  referenceNote?: string;
}

let invoiceSeq = 4473;
let creditNoteSeq = 119;
let paymentSeq = 2217;
let lineSeq = 100;

function validateLines(lines: LineInput[]): boolean {
  if (lines.length === 0) return false;
  if (lines.some((l) => l.quantity <= 0)) return false;
  if (lines.some((l) => l.unitPrice < 0)) return false;
  return true;
}

/** Resolves each line's product and snapshots its code/name, mirroring InvoicesService/CreditNotesService. Returns null if any productCode doesn't resolve. */
function buildLines(lines: LineInput[]): InvoiceLine[] | CreditNoteLine[] | null {
  const built: InvoiceLine[] = [];
  for (const l of lines) {
    const product = PRODUCTS.find((p) => p.sku === l.productCode);
    if (!product) return null;
    built.push({
      id: `LN-${lineSeq++}`,
      productCode: product.sku,
      productName: product.name.en,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.quantity * l.unitPrice,
    });
  }
  return built;
}

function resolveActiveCustomer(customerCode: string): boolean {
  const customer = PARTNERS.find((p) => p.code === customerCode);
  return !!customer && customer.type === 'customer' && customer.isActive;
}

@Injectable({ providedIn: 'root' })
export class BillingStore {
  readonly invoices = signal<Invoice[]>([...INVOICES]);
  readonly creditNotes = signal<CreditNote[]>([...CREDIT_NOTES]);

  addInvoice(input: AddInvoiceInput): AddInvoiceOutcome {
    const customerCode = input.customerCode.trim();
    const warehouseCode = input.warehouseCode.trim();
    if (!customerCode || !warehouseCode || !validateLines(input.lines)) return 'invalid';
    if (!resolveActiveCustomer(customerCode)) return 'customer-not-found';

    const lines = buildLines(input.lines);
    if (!lines) return 'product-not-found';

    const totalAmount = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const invoice: Invoice = {
      code: `INV-${invoiceSeq++}`,
      customerCode,
      warehouseCode,
      sourceReferenceType: input.sourceReferenceType,
      sourceReferenceId: input.sourceReferenceId,
      status: 'issued',
      issuedOnUtc: new Date().toISOString(),
      totalAmount,
      lines,
      payments: [],
    };
    this.invoices.update((list) => [invoice, ...list]);
    return 'ok';
  }

  addCreditNote(input: AddCreditNoteInput): AddCreditNoteOutcome {
    const customerCode = input.customerCode.trim();
    if (!customerCode || !validateLines(input.lines)) return 'invalid';
    if (!resolveActiveCustomer(customerCode)) return 'customer-not-found';

    const lines = buildLines(input.lines);
    if (!lines) return 'product-not-found';

    const totalAmount = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const creditNote: CreditNote = {
      code: `CRN-${String(creditNoteSeq++).padStart(4, '0')}`,
      customerCode,
      sourceReferenceType: input.sourceReferenceType,
      sourceReferenceId: input.sourceReferenceId,
      status: 'issued',
      issuedOnUtc: new Date().toISOString(),
      totalAmount,
      lines,
    };
    this.creditNotes.update((list) => [creditNote, ...list]);
    return 'ok';
  }

  recordPayment(invoiceCode: string, input: RecordPaymentInput): RecordPaymentOutcome {
    const method = input.method.trim();
    if (input.amount <= 0 || !method) return 'invalid';

    const invoice = this.invoices().find((i) => i.code === invoiceCode);
    if (!invoice) return 'invoice-not-found';
    if (invoice.status === 'void') return 'invoice-void';

    const recordedSoFar = invoice.payments.filter((p) => p.status === 'recorded').reduce((sum, p) => sum + p.amount, 0);
    const cumulative = recordedSoFar + input.amount;
    if (cumulative > invoice.totalAmount) return 'exceeds-total';

    const payment: Payment = {
      id: `PAY-${paymentSeq++}`,
      amount: input.amount,
      paidOnUtc: new Date().toISOString(),
      method,
      referenceNote: input.referenceNote,
      status: 'recorded',
    };
    const newStatus: InvoiceStatus = cumulative === invoice.totalAmount ? 'paid' : 'partially-paid';

    this.invoices.update((list) =>
      list.map((i) => (i.code === invoiceCode ? { ...i, status: newStatus, payments: [...i.payments, payment] } : i)),
    );
    return 'ok';
  }
}
```

- [ ] **Step 3: Write `billing-store.spec.ts`**

```ts
// source/apps/ikho-ui/src/app/core/state/billing-store.spec.ts
import { TestBed } from '@angular/core/testing';
import { BillingStore } from './billing-store';

describe('BillingStore', () => {
  let store: BillingStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(BillingStore);
  });

  it('seeds 6 invoices and 1 credit note', () => {
    expect(store.invoices().length).toBe(6);
    expect(store.creditNotes().length).toBe(1);
  });

  describe('addInvoice', () => {
    const validLines = [{ productCode: 'IKH-482910', quantity: 2, unitPrice: 60 }];

    it('rejects a blank customerCode or warehouseCode as invalid', () => {
      expect(store.addInvoice({ customerCode: '', warehouseCode: 'WH-1', lines: validLines })).toBe('invalid');
      expect(store.addInvoice({ customerCode: 'CUS-2210', warehouseCode: '  ', lines: validLines })).toBe('invalid');
    });

    it('rejects an empty lines array as invalid', () => {
      expect(store.addInvoice({ customerCode: 'CUS-2210', warehouseCode: 'WH-1', lines: [] })).toBe('invalid');
    });

    it('rejects a non-positive quantity as invalid', () => {
      const outcome = store.addInvoice({
        customerCode: 'CUS-2210',
        warehouseCode: 'WH-1',
        lines: [{ productCode: 'IKH-482910', quantity: 0, unitPrice: 60 }],
      });
      expect(outcome).toBe('invalid');
    });

    it('rejects a negative unit price as invalid', () => {
      const outcome = store.addInvoice({
        customerCode: 'CUS-2210',
        warehouseCode: 'WH-1',
        lines: [{ productCode: 'IKH-482910', quantity: 2, unitPrice: -1 }],
      });
      expect(outcome).toBe('invalid');
    });

    it('rejects an unknown customer code', () => {
      expect(store.addInvoice({ customerCode: 'CUS-9999', warehouseCode: 'WH-1', lines: validLines })).toBe('customer-not-found');
    });

    it('rejects an inactive customer (CUS-2318, Hafen Bremen)', () => {
      expect(store.addInvoice({ customerCode: 'CUS-2318', warehouseCode: 'WH-1', lines: validLines })).toBe('customer-not-found');
    });

    it('rejects a supplier-type partner code, since it is not a customer', () => {
      expect(store.addInvoice({ customerCode: 'SUP-0142', warehouseCode: 'WH-1', lines: validLines })).toBe('customer-not-found');
    });

    it('rejects an unknown product code', () => {
      const outcome = store.addInvoice({
        customerCode: 'CUS-2210',
        warehouseCode: 'WH-1',
        lines: [{ productCode: 'IKH-000000', quantity: 1, unitPrice: 10 }],
      });
      expect(outcome).toBe('product-not-found');
    });

    it('creates an invoice with a computed total, issued status, next INV code, and empty payments', () => {
      const before = store.invoices().length;
      const outcome = store.addInvoice({
        customerCode: 'CUS-2210',
        warehouseCode: 'WH-1',
        sourceReferenceType: 'OutboundShipment',
        sourceReferenceId: 'SHP-1',
        lines: [
          { productCode: 'IKH-482910', quantity: 2, unitPrice: 60 },
          { productCode: 'IKH-330298', quantity: 3, unitPrice: 6 },
        ],
      });
      expect(outcome).toBe('ok');
      expect(store.invoices().length).toBe(before + 1);

      const created = store.invoices()[0];
      expect(created.code).toBe('INV-4473');
      expect(created.status).toBe('issued');
      expect(created.totalAmount).toBe(138); // 2*60 + 3*6
      expect(created.payments).toEqual([]);
      expect(created.sourceReferenceType).toBe('OutboundShipment');
      expect(created.lines[0].productName).toBe('Steel shelving bracket, 400mm');
      expect(created.lines[0].lineTotal).toBe(120);
    });

    it('assigns sequential INV codes across multiple creations', () => {
      store.addInvoice({ customerCode: 'CUS-2210', warehouseCode: 'WH-1', lines: validLines });
      store.addInvoice({ customerCode: 'CUS-2210', warehouseCode: 'WH-1', lines: validLines });
      const codes = store.invoices().slice(0, 2).map((i) => i.code);
      expect(codes).toEqual(['INV-4475', 'INV-4474']);
    });
  });

  describe('addCreditNote', () => {
    const validLines = [{ productCode: 'IKH-318440', quantity: 1, unitPrice: 70 }];

    it('rejects a blank customerCode as invalid', () => {
      expect(store.addCreditNote({ customerCode: '', lines: validLines })).toBe('invalid');
    });

    it('rejects an empty lines array as invalid', () => {
      expect(store.addCreditNote({ customerCode: 'CUS-2210', lines: [] })).toBe('invalid');
    });

    it('rejects a non-positive quantity as invalid', () => {
      const outcome = store.addCreditNote({ customerCode: 'CUS-2210', lines: [{ productCode: 'IKH-318440', quantity: 0, unitPrice: 70 }] });
      expect(outcome).toBe('invalid');
    });

    it('rejects a negative unit price as invalid', () => {
      const outcome = store.addCreditNote({ customerCode: 'CUS-2210', lines: [{ productCode: 'IKH-318440', quantity: 1, unitPrice: -1 }] });
      expect(outcome).toBe('invalid');
    });

    it('rejects an inactive customer', () => {
      expect(store.addCreditNote({ customerCode: 'CUS-2318', lines: validLines })).toBe('customer-not-found');
    });

    it('rejects an unknown product code', () => {
      const outcome = store.addCreditNote({ customerCode: 'CUS-2210', lines: [{ productCode: 'IKH-000000', quantity: 1, unitPrice: 10 }] });
      expect(outcome).toBe('product-not-found');
    });

    it('creates a credit note with a computed total, issued status, and next zero-padded CRN code', () => {
      const outcome = store.addCreditNote({ customerCode: 'CUS-2274', lines: validLines });
      expect(outcome).toBe('ok');
      const created = store.creditNotes()[0];
      expect(created.code).toBe('CRN-0119');
      expect(created.status).toBe('issued');
      expect(created.totalAmount).toBe(70);
    });
  });

  describe('recordPayment', () => {
    it('rejects a non-positive amount as invalid', () => {
      expect(store.recordPayment('INV-4471', { amount: 0, method: 'Bank transfer' })).toBe('invalid');
    });

    it('rejects a blank method as invalid', () => {
      expect(store.recordPayment('INV-4471', { amount: 100, method: '  ' })).toBe('invalid');
    });

    it('rejects an unknown invoice code', () => {
      expect(store.recordPayment('INV-9999', { amount: 100, method: 'Bank transfer' })).toBe('invoice-not-found');
    });

    it('rejects a payment against a void invoice (INV-4400)', () => {
      expect(store.recordPayment('INV-4400', { amount: 100, method: 'Bank transfer' })).toBe('invoice-void');
    });

    it('rejects a payment that would exceed the invoice total', () => {
      // INV-4455 has totalAmount 7320 and 3000 already recorded; 4321 would push cumulative to 7321.
      expect(store.recordPayment('INV-4455', { amount: 4321, method: 'Bank transfer' })).toBe('exceeds-total');
    });

    it('records a partial payment and sets status to partially-paid', () => {
      const outcome = store.recordPayment('INV-4471', { amount: 20000, method: 'Bank transfer', referenceNote: 'Ref-1' });
      expect(outcome).toBe('ok');
      const invoice = store.invoices().find((i) => i.code === 'INV-4471');
      expect(invoice?.status).toBe('partially-paid');
      expect(invoice?.payments.length).toBe(1);
      expect(invoice?.payments[0].referenceNote).toBe('Ref-1');
    });

    it('records a payment that exactly reaches the total and sets status to paid', () => {
      // INV-4455 needs exactly 4320 more to reach its 7320 total.
      const outcome = store.recordPayment('INV-4455', { amount: 4320, method: 'Bank transfer' });
      expect(outcome).toBe('ok');
      const invoice = store.invoices().find((i) => i.code === 'INV-4455');
      expect(invoice?.status).toBe('paid');
    });

    it('assigns sequential PAY codes', () => {
      store.recordPayment('INV-4471', { amount: 100, method: 'Cash' });
      const invoice = store.invoices().find((i) => i.code === 'INV-4471');
      expect(invoice?.payments[0].id).toBe('PAY-2217');
    });
  });
});
```

- [ ] **Step 4: Run the store tests**

Run: `pnpm nx test ikho-ui --skip-nx-cache -- billing-store.spec.ts` (from `source/`)
Expected: all tests in `billing-store.spec.ts` PASS. If seed totals don't match (e.g. `expect(created.totalAmount).toBe(138)`), double-check the arithmetic in the test against the seed helper's `quantity * unitPrice` — do not adjust the store to match a wrong test.

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/billing.data.ts source/apps/ikho-ui/src/app/core/state/billing-store.ts source/apps/ikho-ui/src/app/core/state/billing-store.spec.ts
git commit -m "feat(ikho-ui): add Billing data model and BillingStore"
```

---

### Task 2: `LineItemsBuilder` shared component and currency formatting

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/billing/billing-format.util.ts`
- Create: `source/apps/ikho-ui/src/app/features/office/billing/line-items-builder.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/billing/line-items-builder.spec.ts`

**Interfaces:**
- Consumes: `Product`, `PRODUCTS` (Task 1's dependency, pre-existing in `core/mock-data/products.data.ts`), `LangService` (existing).
- Produces: `formatCurrency(amount: number): string` (used by Tasks 3–6 for every money value shown in the UI); `LineItemsBuilder` (selector `app-line-items-builder`) with no inputs, and public methods `getLines(): LineItemDraft[]` and `reset(): void`. Tasks 5 and 6 hold a `viewChild<LineItemsBuilder>` reference to call both.

- [ ] **Step 1: Write `billing-format.util.ts`**

```ts
// source/apps/ikho-ui/src/app/features/office/billing/billing-format.util.ts
/** Formats a plain number as a euro amount, e.g. 42180 -> "€ 42,180" — matches the app's existing placeholder copy. */
export function formatCurrency(amount: number): string {
  return `€ ${amount.toLocaleString('en-US')}`;
}
```

- [ ] **Step 2: Write the failing `line-items-builder.spec.ts`**

```ts
// source/apps/ikho-ui/src/app/features/office/billing/line-items-builder.spec.ts
import { TestBed } from '@angular/core/testing';
import { LineItemsBuilder } from './line-items-builder';

describe('LineItemsBuilder', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LineItemsBuilder] }).compileComponents();
  });

  it('starts with a single blank line', () => {
    const fixture = TestBed.createComponent(LineItemsBuilder);
    fixture.detectChanges();
    expect(fixture.componentInstance.getLines()).toEqual([{ productCode: '', quantity: 1, unitPrice: 0 }]);
  });

  it('renders every product as a picker option', () => {
    const fixture = TestBed.createComponent(LineItemsBuilder);
    fixture.detectChanges();
    const options = (fixture.nativeElement as HTMLElement).querySelectorAll('option');
    // +1 for the disabled "select a product" placeholder option.
    expect(options.length).toBeGreaterThan(1);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-482910');
  });

  it('addRow appends a new blank line, and removeRow removes it but never the last remaining line', () => {
    const fixture = TestBed.createComponent(LineItemsBuilder);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as {
      addRow: () => void;
      removeRow: (id: number) => void;
      rows: () => { id: number }[];
    };

    instance.addRow();
    expect(instance.rows().length).toBe(2);

    const firstId = instance.rows()[0].id;
    instance.removeRow(firstId);
    expect(instance.rows().length).toBe(1);

    const lastId = instance.rows()[0].id;
    instance.removeRow(lastId);
    expect(instance.rows().length).toBe(1); // cannot remove the last row
  });

  it('updateRow patches a line and getLines reflects it, with the live total updating', () => {
    const fixture = TestBed.createComponent(LineItemsBuilder);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as {
      rows: () => { id: number }[];
      updateRow: (id: number, patch: Partial<{ productCode: string; quantity: number; unitPrice: number }>) => void;
    };

    const id = instance.rows()[0].id;
    instance.updateRow(id, { productCode: 'IKH-482910', quantity: 3, unitPrice: 60 });
    fixture.detectChanges();

    expect(fixture.componentInstance.getLines()).toEqual([{ productCode: 'IKH-482910', quantity: 3, unitPrice: 60 }]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('€ 180');
  });

  it('reset restores a single blank line', () => {
    const fixture = TestBed.createComponent(LineItemsBuilder);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { addRow: () => void };
    instance.addRow();
    instance.addRow();
    expect(fixture.componentInstance.getLines().length).toBe(3);

    fixture.componentInstance.reset();
    expect(fixture.componentInstance.getLines()).toEqual([{ productCode: '', quantity: 1, unitPrice: 0 }]);
  });
});
```

- [ ] **Step 3: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --skip-nx-cache -- line-items-builder.spec.ts` (from `source/`)
Expected: FAIL — `line-items-builder.ts` does not exist yet.

- [ ] **Step 4: Implement `LineItemsBuilder`**

```ts
// source/apps/ikho-ui/src/app/features/office/billing/line-items-builder.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { Product, PRODUCTS } from '../../../core/mock-data/products.data';
import { formatCurrency } from './billing-format.util';

export interface LineItemDraft {
  productCode: string;
  quantity: number;
  unitPrice: number;
}

interface LineItemRow extends LineItemDraft {
  id: number;
}

@Component({
  selector: 'app-line-items-builder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, TextInput],
  host: { class: 'block' },
  template: `
    <div class="flex flex-col gap-3">
      @for (row of rows(); track row.id) {
        <div class="grid grid-cols-[2fr_1fr_1fr_auto] items-end gap-2 rounded-md border border-hairline-light p-2.5">
          <label class="flex flex-col gap-1.5">
            <span class="font-core text-[13px] font-semibold text-ink">{{ t().product }}</span>
            <select
              class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
              [value]="row.productCode"
              (change)="updateRow(row.id, { productCode: $any($event.target).value })"
            >
              <option value="" disabled>{{ t().selectProduct }}</option>
              @for (p of products; track p.sku) {
                <option [value]="p.sku">{{ p.sku }} — {{ productName(p) }}</option>
              }
            </select>
          </label>
          <lib-text-input
            [label]="t().quantity"
            type="number"
            [value]="quantityValue(row)"
            (valueChange)="onQuantityChange(row.id, $event)"
          />
          <lib-text-input
            [label]="t().unitPrice"
            type="number"
            [value]="unitPriceValue(row)"
            (valueChange)="onUnitPriceChange(row.id, $event)"
          />
          <lib-button variant="ghost" [disabled]="rows().length === 1" (click)="removeRow(row.id)">{{ t().removeLine }}</lib-button>
        </div>
      }
      <lib-button variant="secondary" (click)="addRow()">{{ t().addLine }}</lib-button>
      <div class="flex items-baseline justify-between border-t border-hairline-light pt-3">
        <span class="font-core text-[13px] text-shade-50">{{ t().total }}</span>
        <span class="font-mono text-body-md font-semibold text-ink">{{ totalDisplay() }}</span>
      </div>
    </div>
  `,
})
export class LineItemsBuilder {
  protected readonly lang = inject(LangService);
  protected readonly products = PRODUCTS;

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      product: en ? 'Product' : 'Sản phẩm',
      selectProduct: en ? 'Select a product' : 'Chọn sản phẩm',
      quantity: en ? 'Quantity' : 'Số lượng',
      unitPrice: en ? 'Unit price' : 'Đơn giá',
      removeLine: en ? 'Remove' : 'Xoá',
      addLine: en ? '+ Add line' : '+ Thêm dòng',
      total: en ? 'Total' : 'Tổng cộng',
    };
  });

  private nextId = 1;
  protected readonly rows = signal<LineItemRow[]>([this.blankRow()]);

  protected readonly total = computed(() => this.rows().reduce((sum, r) => sum + r.quantity * r.unitPrice, 0));
  protected readonly totalDisplay = computed(() => formatCurrency(this.total()));

  private blankRow(): LineItemRow {
    return { id: this.nextId++, productCode: '', quantity: 1, unitPrice: 0 };
  }

  protected productName(p: Product): string {
    return this.lang.pick(p.name);
  }

  protected addRow(): void {
    this.rows.update((list) => [...list, this.blankRow()]);
  }

  protected removeRow(id: number): void {
    this.rows.update((list) => (list.length > 1 ? list.filter((r) => r.id !== id) : list));
  }

  protected updateRow(id: number, patch: Partial<LineItemDraft>): void {
    this.rows.update((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  protected quantityValue(row: LineItemRow): string {
    return String(row.quantity);
  }

  protected onQuantityChange(id: number, value: string): void {
    this.updateRow(id, { quantity: Number(value) || 0 });
  }

  protected unitPriceValue(row: LineItemRow): string {
    return String(row.unitPrice);
  }

  protected onUnitPriceChange(id: number, value: string): void {
    this.updateRow(id, { unitPrice: Number(value) || 0 });
  }

  /** Reads the current lines as plain drafts — called by the parent on submit. */
  getLines(): LineItemDraft[] {
    return this.rows().map(({ productCode, quantity, unitPrice }) => ({ productCode, quantity, unitPrice }));
  }

  /** Restores a single blank line — called by the parent after a successful save or on cancel. */
  reset(): void {
    this.nextId = 1;
    this.rows.set([this.blankRow()]);
  }
}
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --skip-nx-cache -- line-items-builder.spec.ts` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/billing/billing-format.util.ts source/apps/ikho-ui/src/app/features/office/billing/line-items-builder.ts source/apps/ikho-ui/src/app/features/office/billing/line-items-builder.spec.ts
git commit -m "feat(ikho-ui): add LineItemsBuilder and currency formatting for Billing"
```

---

### Task 3: `OfficeBilling` screen shell — header, KPIs, section toggle, both tables

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/billing/office-billing.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/billing/office-billing.spec.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/office.routes.ts`

**Interfaces:**
- Consumes: `BillingStore`, `Invoice`, `CreditNote` (Task 1); `formatCurrency` (Task 2); `PARTNERS`/`Partner` (existing); `OrganizationStore`/`Warehouse` (existing, from the Organization module); `LangService`, `screenTitle`/`screenMeta` (existing).
- Produces: `OfficeBilling` (selector `app-office-billing`) with protected members `activeSection: WritableSignal<'invoices' | 'credit-notes'>`, `query`, `kpis`, `invoiceColumns`/`creditNoteColumns`, `filteredInvoiceRows`/`filteredCreditNoteRows`, `nameOfCustomer(code): string`, `nameOfWarehouse(code): string`. Task 4 adds row-click/detail-panel wiring for Invoices; Task 5 adds the Invoice create panel; Task 6 adds the Credit Note detail panel and create panel. This task's markup leaves two named anchor comments, `<!-- INVOICE_SECTION_EXTRA -->` and `<!-- CREDIT_NOTE_SECTION_EXTRA -->`, immediately after each table's closing `lib-data-panel`, purely so later tasks have an unambiguous insertion point — remove the comments as each later task fills them in.

- [ ] **Step 1: Write the failing `office-billing.spec.ts`**

```ts
// source/apps/ikho-ui/src/app/features/office/billing/office-billing.spec.ts
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
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --skip-nx-cache -- office-billing.spec.ts` (from `source/`)
Expected: FAIL — `office-billing.ts` does not exist yet.

- [ ] **Step 3: Implement `office-billing.ts`**

```ts
// source/apps/ikho-ui/src/app/features/office/billing/office-billing.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, DataPanel, DataTable, DataTableColumn, KpiCard, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { PARTNERS } from '../../../core/mock-data/partners.data';
import { screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
import { CreditNote, Invoice, InvoiceStatus, CreditNoteStatus } from '../../../core/mock-data/billing.data';
import { OrganizationStore } from '../../../core/state/organization-store';
import { BillingStore } from '../../../core/state/billing-store';
import { formatCurrency } from './billing-format.util';

type BillingSection = 'invoices' | 'credit-notes';

interface InvoiceRow extends Record<string, unknown> {
  code: string;
  customerName: string;
  warehouseCode: string;
  issued: string;
  total: string;
  status: 'in-stock' | 'low-stock' | 'inbound' | 'out-of-stock';
  statusLabel: string;
}

interface CreditNoteRow extends Record<string, unknown> {
  code: string;
  customerName: string;
  issued: string;
  total: string;
  status: 'inbound' | 'out-of-stock';
  statusLabel: string;
}

function isThisMonth(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
}

@Component({
  selector: 'app-office-billing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DataPanel, DataTable, KpiCard, TextInput],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
          <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
        </div>
      </div>

      <div class="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        @for (k of kpis(); track k.label) {
          <lib-kpi-card [label]="k.label" [value]="k.value" />
        }
      </div>

      <div class="flex gap-2">
        <lib-button [variant]="activeSection() === 'invoices' ? 'primary' : 'secondary'" (click)="selectSection('invoices')">{{ t().invoicesTab }}</lib-button>
        <lib-button [variant]="activeSection() === 'credit-notes' ? 'primary' : 'secondary'" (click)="selectSection('credit-notes')">{{ t().creditNotesTab }}</lib-button>
      </div>

      @if (activeSection() === 'invoices') {
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchInvoicesPlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <lib-data-panel [title]="t().invoicesPanelTitle">
          <lib-data-table [columns]="invoiceColumns()" [rows]="filteredInvoiceRows()" [emptyLabel]="t().noInvoices" />
        </lib-data-panel>
        <!-- INVOICE_SECTION_EXTRA -->
      } @else {
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchCreditNotesPlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <lib-data-panel [title]="t().creditNotesPanelTitle">
          <lib-data-table [columns]="creditNoteColumns()" [rows]="filteredCreditNoteRows()" [emptyLabel]="t().noCreditNotes" />
        </lib-data-panel>
        <!-- CREDIT_NOTE_SECTION_EXTRA -->
      }
    </div>
  `,
})
export class OfficeBilling {
  protected readonly lang = inject(LangService);
  protected readonly store = inject(BillingStore);
  protected readonly organizationStore = inject(OrganizationStore);

  protected readonly title = computed(() => screenTitle('billing', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('billing', 'admin', this.lang.lang()));

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      invoicesTab: en ? 'Invoices' : 'Hoá đơn',
      creditNotesTab: en ? 'Credit Notes' : 'Giấy báo có',
      invoicesPanelTitle: en ? 'Invoices' : 'Hoá đơn',
      creditNotesPanelTitle: en ? 'Credit notes' : 'Giấy báo có',
      searchInvoicesPlaceholder: en ? 'Search code or customer' : 'Tìm mã hoặc khách hàng',
      searchCreditNotesPlaceholder: en ? 'Search code or customer' : 'Tìm mã hoặc khách hàng',
      noInvoices: en ? 'No invoices match' : 'Không có hoá đơn phù hợp',
      noCreditNotes: en ? 'No credit notes match' : 'Không có giấy báo có phù hợp',
      invoicedThisMonth: en ? 'Invoiced this month' : 'Đã xuất hoá đơn tháng này',
      outstanding: en ? 'Outstanding' : 'Chưa thu',
      paidThisMonth: en ? 'Paid this month' : 'Đã thu tháng này',
      creditNotesKpi: en ? 'Credit notes' : 'Giấy báo có',
      colInvoice: en ? 'Invoice' : 'Hoá đơn',
      colCreditNote: en ? 'Credit note' : 'Giấy báo có',
      colCustomer: en ? 'Customer' : 'Khách hàng',
      colWarehouse: en ? 'Warehouse' : 'Kho',
      colIssued: en ? 'Issued' : 'Ngày phát hành',
      colTotal: en ? 'Total' : 'Tổng cộng',
      colStatus: en ? 'Status' : 'Trạng thái',
      statusIssued: en ? 'Issued' : 'Đã phát hành',
      statusPartiallyPaid: en ? 'Partially paid' : 'Thanh toán một phần',
      statusPaid: en ? 'Paid' : 'Đã thanh toán',
      statusVoid: en ? 'Void' : 'Đã huỷ',
    };
  });

  protected readonly activeSection = signal<BillingSection>('invoices');
  protected readonly query = signal('');

  protected selectSection(section: BillingSection): void {
    this.activeSection.set(section);
    this.query.set('');
  }

  protected readonly kpis = computed(() => {
    const now = new Date();
    const invoices = this.store.invoices();
    const creditNotes = this.store.creditNotes();

    const invoicedThisMonth = invoices.filter((i) => isThisMonth(i.issuedOnUtc, now)).reduce((sum, i) => sum + i.totalAmount, 0);
    const outstanding = invoices
      .filter((i) => i.status !== 'void')
      .reduce((sum, i) => sum + (i.totalAmount - i.payments.filter((p) => p.status === 'recorded').reduce((s, p) => s + p.amount, 0)), 0);
    const paidThisMonth = invoices
      .flatMap((i) => i.payments)
      .filter((p) => p.status === 'recorded' && isThisMonth(p.paidOnUtc, now))
      .reduce((sum, p) => sum + p.amount, 0);

    return [
      { label: this.t().invoicedThisMonth, value: formatCurrency(invoicedThisMonth) },
      { label: this.t().outstanding, value: formatCurrency(outstanding) },
      { label: this.t().paidThisMonth, value: formatCurrency(paidThisMonth) },
      { label: this.t().creditNotesKpi, value: creditNotes.length },
    ];
  });

  protected readonly invoiceColumns = computed<DataTableColumn[]>(() => {
    const t = this.t();
    return [
      { key: 'code', label: t.colInvoice, mono: true },
      { key: 'customerName', label: t.colCustomer },
      { key: 'warehouseCode', label: t.colWarehouse, mono: true },
      { key: 'issued', label: t.colIssued, mono: true },
      { key: 'total', label: t.colTotal, align: 'right', mono: true },
      { key: 'status', label: t.colStatus, status: true, statusLabelKey: 'statusLabel' },
    ];
  });

  protected readonly creditNoteColumns = computed<DataTableColumn[]>(() => {
    const t = this.t();
    return [
      { key: 'code', label: t.colCreditNote, mono: true },
      { key: 'customerName', label: t.colCustomer },
      { key: 'issued', label: t.colIssued, mono: true },
      { key: 'total', label: t.colTotal, align: 'right', mono: true },
      { key: 'status', label: t.colStatus, status: true, statusLabelKey: 'statusLabel' },
    ];
  });

  protected nameOfCustomer(code: string): string {
    return PARTNERS.find((p) => p.code === code)?.name ?? '—';
  }

  protected nameOfWarehouse(code: string): string {
    return this.organizationStore.warehouses().find((w) => w.code === code)?.name ?? '—';
  }

  private invoiceStatusBadge(status: InvoiceStatus): { status: InvoiceRow['status']; statusLabel: string } {
    const t = this.t();
    switch (status) {
      case 'paid':
        return { status: 'in-stock', statusLabel: t.statusPaid };
      case 'partially-paid':
        return { status: 'low-stock', statusLabel: t.statusPartiallyPaid };
      case 'void':
        return { status: 'out-of-stock', statusLabel: t.statusVoid };
      default:
        return { status: 'inbound', statusLabel: t.statusIssued };
    }
  }

  private creditNoteStatusBadge(status: CreditNoteStatus): { status: CreditNoteRow['status']; statusLabel: string } {
    const t = this.t();
    return status === 'void' ? { status: 'out-of-stock', statusLabel: t.statusVoid } : { status: 'inbound', statusLabel: t.statusIssued };
  }

  private toInvoiceRow(i: Invoice): InvoiceRow {
    const badge = this.invoiceStatusBadge(i.status);
    return {
      code: i.code,
      customerName: this.nameOfCustomer(i.customerCode),
      warehouseCode: i.warehouseCode,
      issued: i.issuedOnUtc.slice(0, 10),
      total: formatCurrency(i.totalAmount),
      ...badge,
    };
  }

  private toCreditNoteRow(c: CreditNote): CreditNoteRow {
    const badge = this.creditNoteStatusBadge(c.status);
    return {
      code: c.code,
      customerName: this.nameOfCustomer(c.customerCode),
      issued: c.issuedOnUtc.slice(0, 10),
      total: formatCurrency(c.totalAmount),
      ...badge,
    };
  }

  protected readonly invoiceRows = computed<InvoiceRow[]>(() => this.store.invoices().map((i) => this.toInvoiceRow(i)));
  protected readonly creditNoteRows = computed<CreditNoteRow[]>(() => this.store.creditNotes().map((c) => this.toCreditNoteRow(c)));

  protected readonly filteredInvoiceRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.invoiceRows();
    return this.invoiceRows().filter((row) => [row.code, row.customerName].join(' ').toLowerCase().includes(q));
  });

  protected readonly filteredCreditNoteRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.creditNoteRows();
    return this.creditNoteRows().filter((row) => [row.code, row.customerName].join(' ').toLowerCase().includes(q));
  });
}
```

- [ ] **Step 4: Wire the `billing` route**

In `office.routes.ts`, replace `genericScreen('billing'),` with:

```ts
  {
    path: 'billing',
    loadComponent: () => import('./billing/office-billing').then((m) => m.OfficeBilling),
  },
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --skip-nx-cache -- office-billing.spec.ts` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/billing/office-billing.ts source/apps/ikho-ui/src/app/features/office/billing/office-billing.spec.ts source/apps/ikho-ui/src/app/features/office/office.routes.ts
git commit -m "feat(ikho-ui): add OfficeBilling screen shell with KPIs, section toggle, and tables"
```

---

### Task 4: `InvoiceDetailPanel` — lines, payments, record payment; wire into `OfficeBilling`

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/billing/invoice-detail-panel.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/billing/invoice-detail-panel.spec.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/billing/office-billing.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/billing/office-billing.spec.ts`

**Interfaces:**
- Consumes: `Invoice` (Task 1), `formatCurrency` (Task 2), `LangService` (existing).
- Produces: `InvoiceDetailPanel` (selector `app-invoice-detail-panel`) with `invoice = input.required<Invoice>()`, `customerName = input.required<string>()`, `warehouseName = input.required<string>()`, outputs `closePanel: output<void>()`, `recordPayment: output<{ amount: number; method: string; referenceNote?: string }>()`, and public method `setPaymentError(message: string): void`. `OfficeBilling` gains `selectedInvoiceCode`, `selectedInvoice`, `onInvoiceRowClick`, `onRecordPayment` — Task 5 reuses `selectedInvoice`.

- [ ] **Step 1: Write the failing `invoice-detail-panel.spec.ts`**

```ts
// source/apps/ikho-ui/src/app/features/office/billing/invoice-detail-panel.spec.ts
import { TestBed } from '@angular/core/testing';
import { Invoice } from '../../../core/mock-data/billing.data';
import { InvoiceDetailPanel } from './invoice-detail-panel';

const TEST_INVOICE: Invoice = {
  code: 'INV-4471',
  customerCode: 'CUS-2210',
  warehouseCode: 'WH-1',
  status: 'issued',
  issuedOnUtc: '2026-08-01T09:00:00Z',
  totalAmount: 42180,
  lines: [
    { id: 'L1', productCode: 'IKH-482910', productName: 'Steel shelving bracket, 400mm', quantity: 700, unitPrice: 60, lineTotal: 42000 },
    { id: 'L2', productCode: 'IKH-330298', productName: 'Barcode label roll, 100×50mm', quantity: 30, unitPrice: 6, lineTotal: 180 },
  ],
  payments: [],
};

describe('InvoiceDetailPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InvoiceDetailPanel] }).compileComponents();
  });

  function create(invoice: Invoice = TEST_INVOICE) {
    const fixture = TestBed.createComponent(InvoiceDetailPanel);
    fixture.componentRef.setInput('invoice', invoice);
    fixture.componentRef.setInput('customerName', 'Meijer Retail Group');
    fixture.componentRef.setInput('warehouseName', 'Rotterdam DC');
    fixture.detectChanges();
    return fixture;
  }

  it('renders the invoice code, customer, warehouse, total, and lines', () => {
    const fixture = create();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('INV-4471');
    expect(text).toContain('Meijer Retail Group');
    expect(text).toContain('Rotterdam DC');
    expect(text).toContain('€ 42,180');
    expect(text).toContain('Steel shelving bracket, 400mm');
    expect(text).toContain('Barcode label roll, 100×50mm');
  });

  it('renders existing payments', () => {
    const fixture = create({
      ...TEST_INVOICE,
      payments: [{ id: 'PAY-2214', amount: 38400, paidOnUtc: '2026-08-05T09:00:00Z', method: 'Bank transfer', status: 'recorded' }],
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('€ 38,400');
    expect(text).toContain('Bank transfer');
  });

  it('closePanel emits when the close button is clicked', () => {
    const fixture = create();
    let emitted = false;
    fixture.componentInstance.closePanel.subscribe(() => (emitted = true));
    (fixture.nativeElement as HTMLElement).querySelector('button[aria-label]')?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(emitted).toBe(true);
  });

  it('rejects a record-payment submission missing amount or method, and emits a well-formed payment on success', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as {
      showPaymentForm: { set: (v: boolean) => void };
      paymentAmount: { set: (v: string) => void };
      paymentMethod: { set: (v: string) => void };
      submitPayment: () => void;
    };
    let payload: { amount: number; method: string; referenceNote?: string } | undefined;
    fixture.componentInstance.recordPayment.subscribe((v) => (payload = v));

    instance.showPaymentForm.set(true);
    instance.paymentAmount.set('0');
    instance.paymentMethod.set('');
    instance.submitPayment();
    expect(payload).toBeUndefined();

    instance.paymentAmount.set('1000');
    instance.paymentMethod.set('Bank transfer');
    instance.submitPayment();
    expect(payload).toEqual({ amount: 1000, method: 'Bank transfer', referenceNote: undefined });
  });

  it('setPaymentError surfaces a store-side outcome on the open payment form', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as { showPaymentForm: { set: (v: boolean) => void } };
    instance.showPaymentForm.set(true);
    fixture.componentInstance.setPaymentError('This invoice has been voided and cannot accept payments.');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This invoice has been voided and cannot accept payments.');
  });

  it('resets the payment form when the invoice input changes identity', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as {
      showPaymentForm: { set: (v: boolean) => void };
      paymentAmount: { set: (v: string) => void };
    };
    instance.showPaymentForm.set(true);
    instance.paymentAmount.set('500');

    fixture.componentRef.setInput('invoice', { ...TEST_INVOICE, totalAmount: 99999 });
    fixture.detectChanges();

    expect(fixture.componentInstance.getLines?.()).toBeUndefined(); // sanity: no stray API
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('500');
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --skip-nx-cache -- invoice-detail-panel.spec.ts` (from `source/`)
Expected: FAIL — `invoice-detail-panel.ts` does not exist yet.

- [ ] **Step 3: Implement `InvoiceDetailPanel`**

```ts
// source/apps/ikho-ui/src/app/features/office/billing/invoice-detail-panel.ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Button, Icon, StatusBadge, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { Invoice, InvoiceStatus } from '../../../core/mock-data/billing.data';
import { formatCurrency } from './billing-format.util';

function statusBadgeOf(status: InvoiceStatus): 'in-stock' | 'low-stock' | 'inbound' | 'out-of-stock' {
  switch (status) {
    case 'paid':
      return 'in-stock';
    case 'partially-paid':
      return 'low-stock';
    case 'void':
      return 'out-of-stock';
    default:
      return 'inbound';
  }
}

@Component({
  selector: 'app-invoice-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, StatusBadge, TextInput],
  host: { class: 'block' },
  template: `
    <aside class="flex w-96 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ t().eyebrow }}</span>
          <span class="font-mono text-[13px] text-primary">{{ invoice().code }}</span>
          <span class="font-core text-lg font-bold tracking-[-0.2px] text-ink">{{ customerName() }}</span>
        </div>
        <button
          type="button"
          class="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent hover:bg-surface-elevated-light"
          [attr.aria-label]="lang.pick(strings.close)"
          (click)="closePanel.emit()"
        >
          <lib-icon name="x" [size]="18" color="var(--color-shade-50)" />
        </button>
      </div>

      <lib-status-badge [status]="statusBadge()" [label]="statusLabel()" />

      <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().warehouse }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ warehouseName() }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().issued }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ invoice().issuedOnUtc.slice(0, 10) }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().total }}</span>
          <span class="text-right font-mono text-[13px] font-semibold text-text-body">{{ formatCurrency(invoice().totalAmount) }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().lines }}</span>
        @for (l of invoice().lines; track l.id) {
          <div class="flex items-center justify-between gap-2 rounded-md border border-hairline-light p-2.5">
            <div class="flex flex-col gap-0.5">
              <span class="font-core text-[13px] text-text-body">{{ l.productName }}</span>
              <span class="font-mono text-[11px] text-shade-50">{{ l.productCode }} · {{ l.quantity }} × {{ formatCurrency(l.unitPrice) }}</span>
            </div>
            <span class="font-mono text-[13px] font-semibold text-text-body">{{ formatCurrency(l.lineTotal) }}</span>
          </div>
        }
      </div>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().payments }}</span>
        @for (p of invoice().payments; track p.id) {
          <div class="flex items-center justify-between gap-2 rounded-md border border-hairline-light p-2.5">
            <div class="flex flex-col gap-0.5">
              <span class="font-core text-[13px] text-text-body">{{ p.method }}</span>
              <span class="font-mono text-[11px] text-shade-50">{{ p.paidOnUtc.slice(0, 10) }}</span>
            </div>
            <span class="font-mono text-[13px] font-semibold text-text-body">{{ formatCurrency(p.amount) }}</span>
          </div>
        } @empty {
          <span class="font-core text-[13px] text-shade-50">{{ t().noPayments }}</span>
        }
        @if (showPaymentForm()) {
          <div class="flex flex-col gap-2 rounded-md border border-hairline-light p-2.5">
            <lib-text-input [label]="t().amount" type="number" [value]="paymentAmount()" (valueChange)="paymentAmount.set($event)" />
            <lib-text-input [label]="t().method" [value]="paymentMethod()" (valueChange)="paymentMethod.set($event)" />
            <lib-text-input [label]="t().referenceNote" [value]="paymentReferenceNote()" (valueChange)="paymentReferenceNote.set($event)" />
            @if (paymentError(); as err) {
              <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
            }
            <div class="flex gap-2">
              <lib-button variant="primary" (click)="submitPayment()">{{ t().savePayment }}</lib-button>
              <lib-button variant="ghost" (click)="cancelPayment()">{{ t().cancel }}</lib-button>
            </div>
          </div>
        } @else {
          <lib-button variant="secondary" (click)="showPaymentForm.set(true)">{{ t().recordPaymentAction }}</lib-button>
        }
      </div>
    </aside>
  `,
})
export class InvoiceDetailPanel {
  protected readonly lang = inject(LangService);
  protected readonly strings = UI_STRINGS;
  protected readonly formatCurrency = formatCurrency;

  readonly invoice = input.required<Invoice>();
  readonly customerName = input.required<string>();
  readonly warehouseName = input.required<string>();

  readonly closePanel = output<void>();
  readonly recordPayment = output<{ amount: number; method: string; referenceNote?: string }>();

  protected readonly statusBadge = computed(() => statusBadgeOf(this.invoice().status));
  protected readonly statusLabel = computed(() => {
    const t = this.t();
    switch (this.invoice().status) {
      case 'paid':
        return t.statusPaid;
      case 'partially-paid':
        return t.statusPartiallyPaid;
      case 'void':
        return t.statusVoid;
      default:
        return t.statusIssued;
    }
  });

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      eyebrow: en ? 'Invoice detail' : 'Chi tiết hoá đơn',
      warehouse: en ? 'Warehouse' : 'Kho',
      issued: en ? 'Issued' : 'Ngày phát hành',
      total: en ? 'Total' : 'Tổng cộng',
      lines: en ? 'Lines' : 'Dòng hoá đơn',
      payments: en ? 'Payments' : 'Thanh toán',
      noPayments: en ? 'No payments yet.' : 'Chưa có thanh toán.',
      recordPaymentAction: en ? 'Record payment' : 'Ghi nhận thanh toán',
      savePayment: en ? 'Save payment' : 'Lưu thanh toán',
      cancel: en ? 'Cancel' : 'Huỷ',
      amount: en ? 'Amount' : 'Số tiền',
      method: en ? 'Method' : 'Hình thức',
      referenceNote: en ? 'Reference note' : 'Ghi chú',
      paymentRequired: en ? 'Amount and Method are required.' : 'Cần nhập số tiền và hình thức.',
      statusIssued: en ? 'Issued' : 'Đã phát hành',
      statusPartiallyPaid: en ? 'Partially paid' : 'Thanh toán một phần',
      statusPaid: en ? 'Paid' : 'Đã thanh toán',
      statusVoid: en ? 'Void' : 'Đã huỷ',
    };
  });

  protected readonly showPaymentForm = signal(false);
  protected readonly paymentAmount = signal('');
  protected readonly paymentMethod = signal('');
  protected readonly paymentReferenceNote = signal('');
  protected readonly paymentError = signal<string | null>(null);

  constructor() {
    // Resets the payment form whenever the selected invoice changes AND after any successful
    // payment for this invoice — the store's immutable updates give invoice() a new object
    // identity on every mutation, so recording a payment "closes" its own form as a side effect.
    effect(() => {
      this.invoice();
      this.showPaymentForm.set(false);
      this.paymentAmount.set('');
      this.paymentMethod.set('');
      this.paymentReferenceNote.set('');
      this.paymentError.set(null);
    });
  }

  protected submitPayment(): void {
    const amount = Number(this.paymentAmount());
    const method = this.paymentMethod().trim();
    if (!amount || amount <= 0 || !method) {
      this.paymentError.set(this.t().paymentRequired);
      return;
    }
    this.recordPayment.emit({ amount, method, referenceNote: this.paymentReferenceNote().trim() || undefined });
  }

  protected cancelPayment(): void {
    this.showPaymentForm.set(false);
    this.paymentAmount.set('');
    this.paymentMethod.set('');
    this.paymentReferenceNote.set('');
    this.paymentError.set(null);
  }

  /** Lets the parent surface a store-side outcome (e.g. exceeds-total) for the open payment form. */
  setPaymentError(message: string): void {
    this.paymentError.set(message);
  }
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --skip-nx-cache -- invoice-detail-panel.spec.ts` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 5: Wire row selection, the detail panel, and payment recording into `OfficeBilling`**

In `office-billing.ts`:
- Add `import { viewChild } from '@angular/core';` to the existing `@angular/core` import.
- Add `import { InvoiceDetailPanel } from './invoice-detail-panel';`.
- Add `InvoiceDetailPanel` and `Button` to the `@Component` `imports` array (`Button` may already be present from Task 3's note — if not, add it now).
- Replace the `<!-- INVOICE_SECTION_EXTRA -->` comment with:

```html
        <div class="flex items-start gap-5">
          <div class="min-w-0 flex-1">
            <!-- move the existing <lib-data-panel> for invoices inside this wrapper div, and add [clickable]="true" (rowClick)="onInvoiceRowClick($event)" to its <lib-data-table> -->
          </div>
          @if (selectedInvoice(); as inv) {
            <app-invoice-detail-panel
              #invoiceDetailPanel
              [invoice]="inv"
              [customerName]="nameOfCustomer(inv.customerCode)"
              [warehouseName]="nameOfWarehouse(inv.warehouseCode)"
              (closePanel)="selectedInvoiceCode.set(null)"
              (recordPayment)="onRecordPayment($event)"
            />
          }
        </div>
```

Concretely: the Invoices branch's `lib-data-panel` block changes from:

```html
        <lib-data-panel [title]="t().invoicesPanelTitle">
          <lib-data-table [columns]="invoiceColumns()" [rows]="filteredInvoiceRows()" [emptyLabel]="t().noInvoices" />
        </lib-data-panel>
        <!-- INVOICE_SECTION_EXTRA -->
```

to:

```html
        <div class="flex items-start gap-5">
          <div class="min-w-0 flex-1">
            <lib-data-panel [title]="t().invoicesPanelTitle">
              <lib-data-table [columns]="invoiceColumns()" [rows]="filteredInvoiceRows()" [emptyLabel]="t().noInvoices" [clickable]="true" (rowClick)="onInvoiceRowClick($event)" />
            </lib-data-panel>
          </div>
          @if (selectedInvoice(); as inv) {
            <app-invoice-detail-panel
              #invoiceDetailPanel
              [invoice]="inv"
              [customerName]="nameOfCustomer(inv.customerCode)"
              [warehouseName]="nameOfWarehouse(inv.warehouseCode)"
              (closePanel)="selectedInvoiceCode.set(null)"
              (recordPayment)="onRecordPayment($event)"
            />
          }
        </div>
```

- Add these members to the `OfficeBilling` class (after `query`):

```ts
  protected readonly selectedInvoiceCode = signal<string | null>(null);
  protected readonly invoiceDetailPanel = viewChild<InvoiceDetailPanel>('invoiceDetailPanel');

  protected readonly selectedInvoice = computed<Invoice | null>(() => {
    const code = this.selectedInvoiceCode();
    if (!code) return null;
    return this.store.invoices().find((i) => i.code === code) ?? null;
  });
```

- Add these methods to the class (after `nameOfWarehouse`):

```ts
  protected onInvoiceRowClick(row: Record<string, unknown>): void {
    this.selectedInvoiceCode.set(String(row['code']));
  }

  protected onRecordPayment(event: { amount: number; method: string; referenceNote?: string }): void {
    const invoice = this.selectedInvoice();
    if (!invoice) return;
    const outcome = this.store.recordPayment(invoice.code, event);
    if (outcome === 'invalid') {
      this.invoiceDetailPanel()?.setPaymentError(this.t().paymentInvalidError);
    } else if (outcome === 'invoice-void') {
      this.invoiceDetailPanel()?.setPaymentError(this.t().paymentInvoiceVoidError);
    } else if (outcome === 'exceeds-total') {
      this.invoiceDetailPanel()?.setPaymentError(this.t().paymentExceedsTotalError);
    }
    // 'invoice-not-found' is unreachable via the UI — recordPayment is only ever invoked
    // for the currently selected, real invoice.
  }
```

- Add these 3 keys to the `t()` computed's returned object (anywhere, e.g. after `statusVoid`):

```ts
      paymentInvalidError: en ? 'Amount and Method are required.' : 'Cần nhập số tiền và hình thức.',
      paymentInvoiceVoidError: en ? 'This invoice has been voided and cannot accept payments.' : 'Hoá đơn đã bị huỷ và không thể nhận thanh toán.',
      paymentExceedsTotalError: en ? 'This payment would exceed the invoice total.' : 'Khoản thanh toán này vượt quá tổng tiền hoá đơn.',
```

- [ ] **Step 6: Add failing tests for the wiring, then confirm they pass**

Append to `office-billing.spec.ts` (inside the existing `describe('OfficeBilling', ...)` block):

```ts
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

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Partially paid');
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
```

Run: `pnpm nx test ikho-ui --skip-nx-cache -- office-billing.spec.ts` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/billing/invoice-detail-panel.ts source/apps/ikho-ui/src/app/features/office/billing/invoice-detail-panel.spec.ts source/apps/ikho-ui/src/app/features/office/billing/office-billing.ts source/apps/ikho-ui/src/app/features/office/billing/office-billing.spec.ts
git commit -m "feat(ikho-ui): add InvoiceDetailPanel with payments and record-payment flow"
```

---

### Task 5: Invoice create panel — wire `LineItemsBuilder` and pickers into `OfficeBilling`

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/office/billing/office-billing.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/billing/office-billing.spec.ts`

**Interfaces:**
- Consumes: `LineItemsBuilder`/`LineItemDraft` (Task 2), `Invoice`/`AddInvoiceOutcome` (Task 1), `PARTNERS`/`Partner` (existing, filtered for active customers), `OrganizationStore.warehouses` (existing, filtered for active warehouses).
- Produces: `OfficeBilling` gains a header "New invoice" action button, an inline create panel for Invoices, and members `showInvoiceCreateForm`, `invoiceCustomerCode`, `invoiceWarehouseCode`, `invoiceSourceType`, `invoiceSourceId`, `invoiceFormError`, `activeCustomers`, `activeWarehouses`, `submitInvoice()`, `cancelInvoiceCreate()`.

- [ ] **Step 1: Add the failing tests for the invoice create flow**

Append to `office-billing.spec.ts`:

```ts
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
    expect((fixture.nativeElement as HTMLElement).querySelector('lib-data-panel[title="New invoice"]')).toBeFalsy();
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
```

- [ ] **Step 2: Add the header action button, the Invoice create panel, and wire the class**

In `office-billing.ts`, replace the header block:

```html
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
          <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
        </div>
      </div>
```

with:

```html
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
          <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
        </div>
        @if (activeSection() === 'invoices') {
          <lib-button variant="primary" (click)="showInvoiceCreateForm.set(true)">{{ t().newInvoiceAction }}</lib-button>
        } @else {
          <lib-button variant="primary" (click)="showCreditNoteCreateForm.set(true)">{{ t().newCreditNoteAction }}</lib-button>
        }
      </div>
```

(`showCreditNoteCreateForm` is added by Task 6 — its reference here is forward-declared in the template now so Task 6 only needs to add the signal itself, not touch this block again.)

Then, immediately above the Invoices section's search box (`<div class="min-w-60 max-w-md"> ... searchInvoicesPlaceholder ...`), inside the `@if (activeSection() === 'invoices') {` branch, add:

```html
        @if (showInvoiceCreateForm()) {
          <lib-data-panel [title]="t().newInvoiceTitle" [subtitle]="t().newInvoiceSubtitle">
            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-2 gap-4">
                <label class="flex flex-col gap-1.5">
                  <span class="font-core text-[13px] font-semibold text-ink">{{ t().customer }}</span>
                  <select
                    class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
                    [value]="invoiceCustomerCode()"
                    (change)="invoiceCustomerCode.set($any($event.target).value)"
                  >
                    <option value="" disabled>{{ t().selectCustomer }}</option>
                    @for (c of activeCustomers(); track c.code) {
                      <option [value]="c.code">{{ c.name }}</option>
                    }
                  </select>
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="font-core text-[13px] font-semibold text-ink">{{ t().warehouse }}</span>
                  <select
                    class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
                    [value]="invoiceWarehouseCode()"
                    (change)="invoiceWarehouseCode.set($any($event.target).value)"
                  >
                    <option value="" disabled>{{ t().selectWarehouse }}</option>
                    @for (w of activeWarehouses(); track w.code) {
                      <option [value]="w.code">{{ w.name }}</option>
                    }
                  </select>
                </label>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <lib-text-input [label]="t().sourceReferenceType" [value]="invoiceSourceType()" (valueChange)="invoiceSourceType.set($event)" />
                <lib-text-input [label]="t().sourceReferenceId" [value]="invoiceSourceId()" (valueChange)="invoiceSourceId.set($event)" />
              </div>
              <app-line-items-builder #invoiceLinesBuilder />
              @if (invoiceFormError(); as err) {
                <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
              }
              <div class="flex gap-3">
                <lib-button variant="primary" (click)="submitInvoice()">{{ t().save }}</lib-button>
                <lib-button variant="ghost" (click)="cancelInvoiceCreate()">{{ t().cancel }}</lib-button>
              </div>
            </div>
          </lib-data-panel>
        }
```

Then wire the class:

- Add `import { LineItemsBuilder } from './line-items-builder';` and add `LineItemsBuilder` to the `@Component` `imports` array.
- Add these members to the class (after `selectedInvoice`):

```ts
  protected readonly showInvoiceCreateForm = signal(false);
  protected readonly invoiceCustomerCode = signal('');
  protected readonly invoiceWarehouseCode = signal('');
  protected readonly invoiceSourceType = signal('');
  protected readonly invoiceSourceId = signal('');
  protected readonly invoiceFormError = signal<string | null>(null);
  protected readonly invoiceLinesBuilder = viewChild<LineItemsBuilder>('invoiceLinesBuilder');

  protected readonly activeCustomers = computed(() => PARTNERS.filter((p) => p.type === 'customer' && p.isActive));
  protected readonly activeWarehouses = computed(() => this.organizationStore.warehouses().filter((w) => w.isActive));
```

- Add these methods to the class (after `onRecordPayment`):

```ts
  protected submitInvoice(): void {
    const customerCode = this.invoiceCustomerCode();
    const warehouseCode = this.invoiceWarehouseCode();
    if (!customerCode || !warehouseCode) {
      this.invoiceFormError.set(this.t().selectCustomerAndWarehouseError);
      return;
    }

    const lines = this.invoiceLinesBuilder()?.getLines() ?? [];
    const outcome = this.store.addInvoice({
      customerCode,
      warehouseCode,
      sourceReferenceType: this.invoiceSourceType().trim() || undefined,
      sourceReferenceId: this.invoiceSourceId().trim() || undefined,
      lines,
    });

    if (outcome === 'invalid') {
      this.invoiceFormError.set(this.t().invoiceLinesInvalidError);
      return;
    }
    if (outcome === 'customer-not-found') {
      this.invoiceFormError.set(this.t().customerNotFoundError);
      return;
    }
    if (outcome === 'product-not-found') {
      this.invoiceFormError.set(this.t().productNotFoundError);
      return;
    }

    this.resetInvoiceForm();
  }

  protected cancelInvoiceCreate(): void {
    this.resetInvoiceForm();
  }

  private resetInvoiceForm(): void {
    this.invoiceFormError.set(null);
    this.invoiceCustomerCode.set('');
    this.invoiceWarehouseCode.set('');
    this.invoiceSourceType.set('');
    this.invoiceSourceId.set('');
    this.invoiceLinesBuilder()?.reset();
    this.showInvoiceCreateForm.set(false);
  }
```

- Add these keys to the `t()` computed's returned object:

```ts
      newInvoiceAction: en ? 'New invoice' : 'Hoá đơn mới',
      newInvoiceTitle: en ? 'New invoice' : 'Hoá đơn mới',
      newInvoiceSubtitle: en ? 'Customer, warehouse, and product lines' : 'Khách hàng, kho và các dòng sản phẩm',
      customer: en ? 'Customer' : 'Khách hàng',
      selectCustomer: en ? 'Select a customer' : 'Chọn khách hàng',
      warehouse: en ? 'Warehouse' : 'Kho',
      selectWarehouse: en ? 'Select a warehouse' : 'Chọn kho',
      sourceReferenceType: en ? 'Source reference type (optional)' : 'Loại chứng từ nguồn (tuỳ chọn)',
      sourceReferenceId: en ? 'Source reference id (optional)' : 'Mã chứng từ nguồn (tuỳ chọn)',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      selectCustomerAndWarehouseError: en ? 'Customer and Warehouse are required.' : 'Cần chọn khách hàng và kho.',
      invoiceLinesInvalidError: en ? 'At least one valid line is required.' : 'Cần ít nhất một dòng hợp lệ.',
      customerNotFoundError: en ? 'This customer could not be found or is inactive.' : 'Không tìm thấy khách hàng hoặc khách hàng ngừng hoạt động.',
      productNotFoundError: en ? 'One or more selected products could not be found.' : 'Không tìm thấy một hoặc nhiều sản phẩm đã chọn.',
```

- [ ] **Step 3: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --skip-nx-cache -- office-billing.spec.ts` (from `source/`)
Expected: all tests PASS, including the 3 tests added in Step 1.

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/billing/office-billing.ts source/apps/ikho-ui/src/app/features/office/billing/office-billing.spec.ts
git commit -m "feat(ikho-ui): add invoice create panel with line-item builder to OfficeBilling"
```

---

### Task 6: `CreditNoteDetailPanel` (view-only) and credit note create panel

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/billing/credit-note-detail-panel.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/billing/credit-note-detail-panel.spec.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/billing/office-billing.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/billing/office-billing.spec.ts`

**Interfaces:**
- Consumes: `CreditNote` (Task 1), `formatCurrency` (Task 2), `LineItemsBuilder` (Task 2), `AddCreditNoteOutcome` (Task 1).
- Produces: `CreditNoteDetailPanel` (selector `app-credit-note-detail-panel`) with `creditNote = input.required<CreditNote>()`, `customerName = input.required<string>()`, output `closePanel: output<void>()`. `OfficeBilling` gains `selectedCreditNoteCode`, `selectedCreditNote`, `onCreditNoteRowClick`, `showCreditNoteCreateForm` (already referenced by Task 5's header button), `creditNoteCustomerCode`, `creditNoteSourceType`, `creditNoteSourceId`, `creditNoteFormError`, `submitCreditNote()`, `cancelCreditNoteCreate()`.

- [ ] **Step 1: Write the failing `credit-note-detail-panel.spec.ts`**

```ts
// source/apps/ikho-ui/src/app/features/office/billing/credit-note-detail-panel.spec.ts
import { TestBed } from '@angular/core/testing';
import { CreditNote } from '../../../core/mock-data/billing.data';
import { CreditNoteDetailPanel } from './credit-note-detail-panel';

const TEST_CREDIT_NOTE: CreditNote = {
  code: 'CRN-0118',
  customerCode: 'CUS-2210',
  status: 'issued',
  issuedOnUtc: '2026-08-04T09:00:00Z',
  totalAmount: 1260,
  lines: [{ id: 'L1', productCode: 'IKH-318440', productName: 'Shelf divider, 600mm', quantity: 18, unitPrice: 70, lineTotal: 1260 }],
};

describe('CreditNoteDetailPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CreditNoteDetailPanel] }).compileComponents();
  });

  it('renders the credit note code, customer, total, status, and lines', () => {
    const fixture = TestBed.createComponent(CreditNoteDetailPanel);
    fixture.componentRef.setInput('creditNote', TEST_CREDIT_NOTE);
    fixture.componentRef.setInput('customerName', 'Meijer Retail Group');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('CRN-0118');
    expect(text).toContain('Meijer Retail Group');
    expect(text).toContain('€ 1,260');
    expect(text).toContain('Shelf divider, 600mm');
    expect(text).toContain('Issued');
  });

  it('closePanel emits when the close button is clicked', () => {
    const fixture = TestBed.createComponent(CreditNoteDetailPanel);
    fixture.componentRef.setInput('creditNote', TEST_CREDIT_NOTE);
    fixture.componentRef.setInput('customerName', 'Meijer Retail Group');
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.closePanel.subscribe(() => (emitted = true));
    (fixture.nativeElement as HTMLElement).querySelector('button[aria-label]')?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(emitted).toBe(true);
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --skip-nx-cache -- credit-note-detail-panel.spec.ts` (from `source/`)
Expected: FAIL — `credit-note-detail-panel.ts` does not exist yet.

- [ ] **Step 3: Implement `CreditNoteDetailPanel`**

```ts
// source/apps/ikho-ui/src/app/features/office/billing/credit-note-detail-panel.ts
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Icon, StatusBadge } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { CreditNote } from '../../../core/mock-data/billing.data';
import { formatCurrency } from './billing-format.util';

@Component({
  selector: 'app-credit-note-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusBadge],
  host: { class: 'block' },
  template: `
    <aside class="flex w-96 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ t().eyebrow }}</span>
          <span class="font-mono text-[13px] text-primary">{{ creditNote().code }}</span>
          <span class="font-core text-lg font-bold tracking-[-0.2px] text-ink">{{ customerName() }}</span>
        </div>
        <button
          type="button"
          class="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent hover:bg-surface-elevated-light"
          [attr.aria-label]="lang.pick(strings.close)"
          (click)="closePanel.emit()"
        >
          <lib-icon name="x" [size]="18" color="var(--color-shade-50)" />
        </button>
      </div>

      <lib-status-badge [status]="creditNote().status === 'void' ? 'out-of-stock' : 'inbound'" [label]="statusLabel()" />

      <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().issued }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ creditNote().issuedOnUtc.slice(0, 10) }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().total }}</span>
          <span class="text-right font-mono text-[13px] font-semibold text-text-body">{{ formatCurrency(creditNote().totalAmount) }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().lines }}</span>
        @for (l of creditNote().lines; track l.id) {
          <div class="flex items-center justify-between gap-2 rounded-md border border-hairline-light p-2.5">
            <div class="flex flex-col gap-0.5">
              <span class="font-core text-[13px] text-text-body">{{ l.productName }}</span>
              <span class="font-mono text-[11px] text-shade-50">{{ l.productCode }} · {{ l.quantity }} × {{ formatCurrency(l.unitPrice) }}</span>
            </div>
            <span class="font-mono text-[13px] font-semibold text-text-body">{{ formatCurrency(l.lineTotal) }}</span>
          </div>
        }
      </div>
    </aside>
  `,
})
export class CreditNoteDetailPanel {
  protected readonly lang = inject(LangService);
  protected readonly strings = UI_STRINGS;
  protected readonly formatCurrency = formatCurrency;

  readonly creditNote = input.required<CreditNote>();
  readonly customerName = input.required<string>();

  readonly closePanel = output<void>();

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      eyebrow: en ? 'Credit note detail' : 'Chi tiết giấy báo có',
      issued: en ? 'Issued' : 'Ngày phát hành',
      total: en ? 'Total' : 'Tổng cộng',
      lines: en ? 'Lines' : 'Dòng giấy báo có',
      statusIssued: en ? 'Issued' : 'Đã phát hành',
      statusVoid: en ? 'Void' : 'Đã huỷ',
    };
  });

  protected readonly statusLabel = computed(() => (this.creditNote().status === 'void' ? this.t().statusVoid : this.t().statusIssued));
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --skip-nx-cache -- credit-note-detail-panel.spec.ts` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 5: Wire the Credit Notes section's row click, detail panel, and create panel into `OfficeBilling`**

In `office-billing.ts`:
- Add `import { CreditNoteDetailPanel } from './credit-note-detail-panel';` and add `CreditNoteDetailPanel` to the `@Component` `imports` array.
- Replace the Credit Notes branch's `lib-data-panel` block:

```html
        <lib-data-panel [title]="t().creditNotesPanelTitle">
          <lib-data-table [columns]="creditNoteColumns()" [rows]="filteredCreditNoteRows()" [emptyLabel]="t().noCreditNotes" />
        </lib-data-panel>
        <!-- CREDIT_NOTE_SECTION_EXTRA -->
```

with:

```html
        <div class="flex items-start gap-5">
          <div class="min-w-0 flex-1">
            <lib-data-panel [title]="t().creditNotesPanelTitle">
              <lib-data-table [columns]="creditNoteColumns()" [rows]="filteredCreditNoteRows()" [emptyLabel]="t().noCreditNotes" [clickable]="true" (rowClick)="onCreditNoteRowClick($event)" />
            </lib-data-panel>
          </div>
          @if (selectedCreditNote(); as cn) {
            <app-credit-note-detail-panel
              [creditNote]="cn"
              [customerName]="nameOfCustomer(cn.customerCode)"
              (closePanel)="selectedCreditNoteCode.set(null)"
            />
          }
        </div>
```

- Immediately above the Credit Notes section's search box, inside the `} @else {` branch, add the create panel markup:

```html
        @if (showCreditNoteCreateForm()) {
          <lib-data-panel [title]="t().newCreditNoteTitle" [subtitle]="t().newCreditNoteSubtitle">
            <div class="flex flex-col gap-4">
              <label class="flex flex-col gap-1.5">
                <span class="font-core text-[13px] font-semibold text-ink">{{ t().customer }}</span>
                <select
                  class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
                  [value]="creditNoteCustomerCode()"
                  (change)="creditNoteCustomerCode.set($any($event.target).value)"
                >
                  <option value="" disabled>{{ t().selectCustomer }}</option>
                  @for (c of activeCustomers(); track c.code) {
                    <option [value]="c.code">{{ c.name }}</option>
                  }
                </select>
              </label>
              <div class="grid grid-cols-2 gap-4">
                <lib-text-input [label]="t().sourceReferenceType" [value]="creditNoteSourceType()" (valueChange)="creditNoteSourceType.set($event)" />
                <lib-text-input [label]="t().sourceReferenceId" [value]="creditNoteSourceId()" (valueChange)="creditNoteSourceId.set($event)" />
              </div>
              <app-line-items-builder #creditNoteLinesBuilder />
              @if (creditNoteFormError(); as err) {
                <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
              }
              <div class="flex gap-3">
                <lib-button variant="primary" (click)="submitCreditNote()">{{ t().save }}</lib-button>
                <lib-button variant="ghost" (click)="cancelCreditNoteCreate()">{{ t().cancel }}</lib-button>
              </div>
            </div>
          </lib-data-panel>
        }
```

- Add these members to the class (after `activeWarehouses`):

```ts
  protected readonly selectedCreditNoteCode = signal<string | null>(null);

  protected readonly selectedCreditNote = computed<CreditNote | null>(() => {
    const code = this.selectedCreditNoteCode();
    if (!code) return null;
    return this.store.creditNotes().find((c) => c.code === code) ?? null;
  });

  protected readonly showCreditNoteCreateForm = signal(false);
  protected readonly creditNoteCustomerCode = signal('');
  protected readonly creditNoteSourceType = signal('');
  protected readonly creditNoteSourceId = signal('');
  protected readonly creditNoteFormError = signal<string | null>(null);
  protected readonly creditNoteLinesBuilder = viewChild<LineItemsBuilder>('creditNoteLinesBuilder');
```

- Add these methods to the class (after `cancelInvoiceCreate`'s `resetInvoiceForm` private method):

```ts
  protected onCreditNoteRowClick(row: Record<string, unknown>): void {
    this.selectedCreditNoteCode.set(String(row['code']));
  }

  protected submitCreditNote(): void {
    const customerCode = this.creditNoteCustomerCode();
    if (!customerCode) {
      this.creditNoteFormError.set(this.t().selectCustomerError);
      return;
    }

    const lines = this.creditNoteLinesBuilder()?.getLines() ?? [];
    const outcome = this.store.addCreditNote({
      customerCode,
      sourceReferenceType: this.creditNoteSourceType().trim() || undefined,
      sourceReferenceId: this.creditNoteSourceId().trim() || undefined,
      lines,
    });

    if (outcome === 'invalid') {
      this.creditNoteFormError.set(this.t().invoiceLinesInvalidError);
      return;
    }
    if (outcome === 'customer-not-found') {
      this.creditNoteFormError.set(this.t().customerNotFoundError);
      return;
    }
    if (outcome === 'product-not-found') {
      this.creditNoteFormError.set(this.t().productNotFoundError);
      return;
    }

    this.resetCreditNoteForm();
  }

  protected cancelCreditNoteCreate(): void {
    this.resetCreditNoteForm();
  }

  private resetCreditNoteForm(): void {
    this.creditNoteFormError.set(null);
    this.creditNoteCustomerCode.set('');
    this.creditNoteSourceType.set('');
    this.creditNoteSourceId.set('');
    this.creditNoteLinesBuilder()?.reset();
    this.showCreditNoteCreateForm.set(false);
  }
```

- Add these keys to the `t()` computed's returned object:

```ts
      newCreditNoteAction: en ? 'New credit note' : 'Giấy báo có mới',
      newCreditNoteTitle: en ? 'New credit note' : 'Giấy báo có mới',
      newCreditNoteSubtitle: en ? 'Customer and product lines' : 'Khách hàng và các dòng sản phẩm',
      selectCustomerError: en ? 'Customer is required.' : 'Cần chọn khách hàng.',
```

- [ ] **Step 6: Add failing tests for the wiring, then confirm they pass**

Append to `office-billing.spec.ts`:

```ts
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
```

Run: `pnpm nx test ikho-ui --skip-nx-cache -- office-billing.spec.ts` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/billing/credit-note-detail-panel.ts source/apps/ikho-ui/src/app/features/office/billing/credit-note-detail-panel.spec.ts source/apps/ikho-ui/src/app/features/office/billing/office-billing.ts source/apps/ikho-ui/src/app/features/office/billing/office-billing.spec.ts
git commit -m "feat(ikho-ui): add CreditNoteDetailPanel and credit note create panel to OfficeBilling"
```

---

### Task 7: Final verification and rollout doc update

**Files:**
- Modify: `docs/plans/organization-partners-billing-rollout-plan.md`

**Interfaces:**
- Consumes: nothing new — this task only runs verification commands and updates tracking documentation.

- [ ] **Step 1: Run the full test suite**

Run: `pnpm nx test ikho-ui --skip-nx-cache` (from `source/`)
Expected: all tests pass, including every `billing-store.spec.ts`, `line-items-builder.spec.ts`, `office-billing.spec.ts`, `invoice-detail-panel.spec.ts`, and `credit-note-detail-panel.spec.ts` test written in Tasks 1–6, alongside every pre-existing test in the app (162 tests existed before this plan; expect that count plus every new test added above).

- [ ] **Step 2: Run lint**

Run: `pnpm nx lint ikho-ui` (from `source/`)
Expected: 0 errors. In particular, confirm no `@angular-eslint/no-output-native` violation exists anywhere in `features/office/billing/` (`grep -rn "output<" source/apps/ikho-ui/src/app/features/office/billing/*.ts` and manually confirm none of them are named `close`).

- [ ] **Step 3: Run the production build**

Run: `pnpm nx build ikho-ui` (from `source/`)
Expected: clean build, with an `office-billing` lazy chunk emitted alongside the existing `office-organization`/`office-partners`/`office-reporting` chunks.

- [ ] **Step 4: Manual smoke test**

Start the dev server (`pnpm nx serve ikho-ui` from `source/`) and, using a browser, walk through:
1. Navigate to `/office/billing`. Confirm the 4 KPI tiles render with non-zero values and the Invoices table shows 6 rows.
2. Click the "Credit Notes" toggle — confirm the table switches to showing `CRN-0118` and the Invoices rows disappear.
3. Click "Invoices" to switch back. Click the `INV-4471` row — confirm the detail panel opens showing its two lines and an empty Payments list.
4. Click "Record payment", enter an amount larger than the invoice's remaining balance, submit — confirm an error appears and the form stays open.
5. Enter a valid partial amount, submit — confirm the payment appears in the list, the invoice's status badge changes to "Partially paid", and the form closes.
6. Click "New invoice", pick a customer and warehouse, add a product line, submit — confirm a new `INV-4473` row appears and the form closes.
7. Switch to Credit Notes, click "New credit note", pick a customer, add a product line, submit — confirm a new `CRN-0119` row appears.
8. Search for a customer name in each section — confirm the table narrows to matching rows, and an empty search shows the bilingual "no results" label.
9. Switch the app's language toggle (if present in the header) to Vietnamese — confirm the Billing screen's labels, KPI titles, and status badges all switch language with no leftover English strings.

If any step fails, treat it as a real defect — do not mark this task complete until every step passes.

- [ ] **Step 5: Update the rollout tracking doc**

In `docs/plans/organization-partners-billing-rollout-plan.md`, replace the Billing row:

```markdown
| 3 | Billing | — | — | Not started |
```

with:

```markdown
| 3 | Billing | [2026-08-14-billing-ui-design.md](../superpowers/specs/2026-08-14-billing-ui-design.md) | [2026-08-14-billing-ui.md](../superpowers/plans/2026-08-14-billing-ui.md) | Implemented |
```

- [ ] **Step 6: Commit**

```bash
git add docs/plans/organization-partners-billing-rollout-plan.md
git commit -m "docs: Mark Billing UI implemented in the rollout tracking doc"
```
