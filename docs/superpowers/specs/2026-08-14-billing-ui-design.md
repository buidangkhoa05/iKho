# Billing UI — Office Console

Third and final sub-project decomposed from "extend the Warehouse Operations Console UI rollout to Organization, Partners, and Billing" (Partners and Organization are both complete and merged). Like Organization, Billing is an independent backend subsystem (`ikho-warehouse-billing`) with no Operator Mode counterpart.

## Context

`ikho-warehouse-billing` owns `Invoice → InvoiceLine`, `Payment` (nested under an Invoice), and `CreditNote → CreditNoteLine`. `Invoice.CustomerId`/`CreditNote.CustomerId` reference the Partner service's Customer aggregate by id only; `Invoice.WarehouseId` is an opaque reference into the Organization service, deliberately unvalidated and unjoined ("no cross-database joins" is explicit in the backend's own docs).

The backend exposes **only create and read endpoints** — there is no void, no reverse, no status-mutation endpoint anywhere in this service. `InvoiceStatus`/`CreditNoteStatus`/`PaymentStatus` all include a terminal `Void`/`Reversed` value in the domain model, but nothing in the API can ever set it. Status badges in this UI are therefore informational only, not interactive — a structural difference from Organization (which had Activate/Deactivate) and from what the current placeholder implies.

Every create endpoint validates in a fixed order, which the mock store mirrors exactly:
- **Invoices/CreditNotes**: lines non-empty → every line's quantity > 0 → every line's unit price ≥ 0 → customer exists and is active → every product exists (and is active, on the real backend — our mock `PRODUCTS` array has no active/inactive concept, so this reduces to an existence check).
- **Payments**: amount > 0 → method non-blank → invoice exists → invoice is not Void → cumulative recorded payments (this payment plus all prior `Recorded` ones) does not exceed the invoice's total. On success, the invoice's status is recomputed: `cumulative === total ? Paid : PartiallyPaid`.

`TotalAmount` is always computed server-side from lines (`Σ quantity × unitPrice`) — never entered directly by the caller. Every line snapshots its product's code/name at creation time, so it stays business-readable even if the product record changes later (the "ID plus snapshot" pattern used throughout this codebase).

The current placeholder (`ADMIN_SCREENS.billing`) has a mixed Invoices/Credit-notes table (4 rows) and a separate Payments tab (3 rows), referencing customer names that correspond to real `PARTNERS` entries (`CUS-2210` Meijer Retail Group, `CUS-2274` Brico Bouwmarkt, `CUS-2318` Hafen Bremen GmbH, the last one inactive). This spec's seed data builds on that placeholder for continuity, with two deliberate deviations (see below).

`OfficeBilling` does **not** wrap `<app-office-screen>` — same reasoning as Partners/Organization/Reporting: the Invoice detail panel needs multiple independent actions (view lines, record a payment), which `OfficeScreen`'s single-action detail panel can't support. `OfficeBilling` composes its own layout directly from the same primitives `OfficeScreen` uses internally (`lib-data-panel`, `lib-data-table`, `lib-kpi-card`).

### Deviations from the placeholder

1. **No due date / "Overdue" concept.** `Invoice` has no due-date field anywhere in the backend domain model — the placeholder's Due column and "Overdue" status aren't backed by any real data. Both are dropped rather than invented. The KPI row's fourth tile becomes **"Paid this month"** (sum of payments recorded this month) instead of "Overdue" — it mirrors "Invoiced this month" and is fully computable from real fields.
2. **Invoices and Credit Notes are split into two separate lists**, not one mixed table. They are different backend entities with different shapes (`Invoice` has a `WarehouseId` and a 4-state status; `CreditNote` has neither a warehouse nor the `PartiallyPaid`/`Paid` states) — a single row shape would need to paper over real field differences.

## Goals

Turn `/office/billing` into an actionable directory: create invoices (customer + warehouse + a repeatable product-line builder), record payments against an invoice, and create credit notes (customer + line builder) — all backed by a mutable mock store enforcing the same guard rules, in the same order, as the real backend.

## Non-goals

- **No void/reverse actions anywhere.** The backend exposes no endpoint for any of them; status badges are informational only.
- **No cross-invoice payments list.** The backend only supports querying payments per-invoice (`GET /invoices/{id}/payments`, no global equivalent), so Payments live nested inside the Invoice detail panel, never as a standalone top-level list.
- **No inline customer creation.** Unlike Organization's lightweight Company picker (which had no dedicated directory to draw from), Partners already has a full customer directory — Billing's Customer picker only selects from existing active `type: 'customer'` partners.
- **No product creation/editing.** The Product picker is read-only reference data drawn from the existing `PRODUCTS` mock array (`products.data.ts`) — no new product store.
- **No modal/dialog, no pagination.** Matches every prior module.
- **No delete** of invoices, credit notes, or payments — the backend exposes no delete endpoint for any of them.
- **No editing of an issued invoice or credit note's lines.** The backend has no endpoint to add/change lines after creation — lines are fixed at issuance; only recording a payment against an existing invoice is possible afterward.

## Data model & `BillingStore`

`billing.data.ts` — seed data shaped after the backend entities, using display-friendly mock codes instead of GUIDs:

```ts
export type InvoiceStatus = 'issued' | 'partially-paid' | 'paid' | 'void';
export type CreditNoteStatus = 'issued' | 'void';
export type PaymentStatus = 'recorded' | 'reversed';
// 'void' / 'reversed' are unreachable through any UI action (no mutation endpoint sets them) —
// modeled only for backend fidelity, and to give the invoice-void payment guard a real seed
// invoice to reject against (see Seed data below).

export interface InvoiceLine {
  id: string;
  productCode: string;   // snapshot from PRODUCTS at creation time
  productName: string;   // snapshot from PRODUCTS at creation time
  quantity: number;
  unitPrice: number;
  lineTotal: number;     // quantity * unitPrice
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
  id: string;             // e.g. 'PAY-2214'
  amount: number;
  paidOnUtc: string;
  method: string;
  referenceNote?: string;
  status: PaymentStatus;
}

export interface Invoice {
  code: string;            // e.g. 'INV-4471' — row/reference key
  customerCode: string;    // FK to Partner.code (PartnersStore, type: 'customer')
  warehouseCode: string;   // FK to Warehouse.code (OrganizationStore) — opaque, never validated on mutation
  sourceReferenceType?: string;
  sourceReferenceId?: string;
  status: InvoiceStatus;
  issuedOnUtc: string;
  totalAmount: number;     // store-computed from lines, never user-entered
  lines: InvoiceLine[];
  payments: Payment[];     // nested — no cross-invoice payments list exists on the backend
}

export interface CreditNote {
  code: string;            // e.g. 'CRN-0118'
  customerCode: string;
  sourceReferenceType?: string;
  sourceReferenceId?: string;
  status: CreditNoteStatus;
  issuedOnUtc: string;
  totalAmount: number;
  lines: CreditNoteLine[];
}

export const INVOICES: Invoice[] = [
  // Seeded from the placeholder's rows plus the two invoices its Payments tab referenced —
  // see "Seed data" below for the exact 6 rows and their rationale.
];

export const CREDIT_NOTES: CreditNote[] = [
  // CRN-0118, Meijer/CUS-2210, issued, ~€1,260 — the placeholder's one credit-note row.
];
```

`BillingStore` (`providedIn: 'root'`) exposes `invoices` and `creditNotes` as readonly signals seeded from `INVOICES`/`CREDIT_NOTES`, plus guarded mutations mirroring the backend's own outcomes:

- `addInvoice(input: { customerCode: string; warehouseCode: string; sourceReferenceType?: string; sourceReferenceId?: string; lines: { productCode: string; quantity: number; unitPrice: number }[] }): 'ok' | 'invalid' | 'customer-not-found' | 'product-not-found'` — validates in the exact order `InvoicesService.CreateAsync` does: `lines.length === 0` → any `quantity <= 0` → any `unitPrice < 0` → all `'invalid'`; then customer must resolve to an active `type: 'customer'` partner (`'customer-not-found'`); then every `productCode` must exist in `PRODUCTS` (`'product-not-found'`, defensive — unreachable through the picker-only UI, but tested at store level, same posture as Organization's `company-not-found`). On `'ok'`, computes each `lineTotal`, sums `totalAmount`, sets `status: 'issued'`, `issuedOnUtc: now`, assigns the next `INV-####` code, and appends with `payments: []`.
- `addCreditNote(input: { customerCode: string; sourceReferenceType?: string; sourceReferenceId?: string; lines: {...} }): 'ok' | 'invalid' | 'customer-not-found' | 'product-not-found'` — identical validation order and shape, minus the warehouse field, assigning the next `CRN-####` code.
- `recordPayment(invoiceCode: string, input: { amount: number; method: string; referenceNote?: string }): 'ok' | 'invalid' | 'invoice-not-found' | 'invoice-void' | 'exceeds-total'` — mirrors `PaymentsService.RecordAsync`'s exact order: `amount <= 0` → blank `method` → both `'invalid'`; then `invoiceCode` must resolve to a seeded invoice (`'invoice-not-found'`, defensive — unreachable through the UI since it's always invoked from a real invoice's own detail panel); then that invoice's `status !== 'void'` (`'invoice-void'`); then `recordedSoFar + amount <= totalAmount` (`'exceeds-total'`). On `'ok'`, appends the payment (`status: 'recorded'`, next `PAY-####` code) to that invoice's `payments` and recomputes `status: cumulative === totalAmount ? 'paid' : 'partially-paid'`.

All mutations are plain signal updates (`this.invoices.update(...)` / `this.creditNotes.update(...)`) — no async, no `HttpClient`, matching every prior store.

### Seed data

Six invoices and one credit note, cross-referencing real `PARTNERS`/`WAREHOUSES` codes, chosen to exercise every store guard and status value at least once. Issue dates are deliberately split across the current month and the prior one (relative to today, 2026-08-14) so the "this month" KPIs have both included and excluded rows to test against:

| Code | Customer | Warehouse | Issued | Status | Total | Payments |
|---|---|---|---|---|---|---|
| `INV-4468` | Meijer / `CUS-2210` | `WH-1` | 2026-07-28 | `paid` | €38,400 | `PAY-2214` €38,400 on 2026-08-05 |
| `INV-4470` | Brico / `CUS-2274` | `WH-1` | 2026-07-30 | `paid` | €12,880 | `PAY-2215` €12,880 on 2026-08-06 |
| `INV-4471` | Meijer / `CUS-2210` | `WH-1` | 2026-08-01 | `issued` | €42,180 | — |
| `INV-4472` | Brico / `CUS-2274` | `WH-1` | 2026-08-02 | `issued` | €18,940 | — |
| `INV-4455` | Hafen Bremen / `CUS-2318` (inactive customer — kept on the books from before they went inactive) | `WH-2` | 2026-07-12 | `partially-paid` | €7,320 | `PAY-2216` €3,000 on 2026-08-07 |
| `INV-4400` | Meijer / `CUS-2210` | `WH-1` | 2026-07-01 | `void` | €500 | — |

With these dates: **Invoiced this month** = `INV-4471 + INV-4472` = €61,120 (the two July-issued invoices are excluded). **Outstanding** = `INV-4471 + INV-4472 + (INV-4455 − its payment)` = €42,180 + €18,940 + €4,320 = €65,440 (the two `paid` invoices contribute €0; `INV-4400` is void and excluded). **Paid this month** = all three payments, since every payment in this seed lands in August = €54,280. **Credit notes** = 1. These figures give the plan concrete expected values for KPI tests, not just a formula.

`INV-4400` exists solely so `recordPayment`'s `invoice-void` guard has a real invoice to reject against in tests — mirrors Organization seeding one inactive warehouse (`WH-3`) specifically to exercise a status guard. Line items are invented against real `PRODUCTS` skus to reach these approximate totals (not cent-exact to the old placeholder's figures — realism over pixel-matching). `CRN-0118` (Meijer/`CUS-2210`, issued 2026-08-04, ~€1,260) is the placeholder's one credit-note row. Next-sequence counters for new codes seed from the highest existing suffix per prefix (`INV-4473`, `CRN-0119`, `PAY-2217`).

## Office Console — `OfficeBilling` screen

Route: `/office/billing`, replacing `OfficeGenericScreen` for the `billing` screen id (same swap pattern as every prior module).

Layout, top to bottom:

1. **Header** — title/meta, plus a primary action that follows the active section: "New invoice" while viewing Invoices, "New credit note" while viewing Credit Notes. Toggles that section's inline create-panel above its table.
2. **KPI row** — 4 `lib-kpi-card` tiles computed live from `BillingStore`: Invoiced this month (Σ invoice totals issued in the current month), Outstanding (Σ `total − Σrecorded payments` across non-void invoices), Paid this month (Σ payments recorded in the current month), Credit notes (count).
3. **Section toggle** — two buttons, "Invoices" / "Credit Notes", driving an `activeSection` signal (no dedicated Tab component exists in `@ikho/shared-ui`; a signal + `@if` is sufficient, same primitive-composition posture as the rest of this screen). Only the active section's search/table/detail-panel/create-panel renders below.
4. **Invoices section**: search box (matches invoice code or customer name) → `lib-data-panel` + `lib-data-table` — columns: Invoice (code, mono), Customer (name), Warehouse (code), Issued (date), Total (amount, right-aligned mono), Status (badge). Row click opens `InvoiceDetailPanel`. Create-panel (inline expand, toggled by the header action): Customer picker (dropdown of active `type: 'customer'` partners), Warehouse picker (dropdown of active warehouses), optional Source reference type/id text inputs, a repeatable **line-item builder** — each row: Product picker (dropdown of `PRODUCTS`) + Quantity number input + Unit Price number input, a live-computed read-only line total, and a remove-line button; an "+ Add line" button appends a new blank row; a live-computed grand total renders below the lines; Save/Cancel.
5. **`InvoiceDetailPanel`** (custom component, not the shared `OfficeDetailPanel`, which supports only one action): code/customer/warehouse/status-badge/issued-date/total header; a read-only Lines table (lines are fixed at creation — no add-line endpoint exists on the backend); a Payments list (amount, method, date, status) with an inline "Record payment" expand-form (Amount, Method, ReferenceNote inputs, Save/Cancel) wired to `recordPayment`'s return value so `'invalid'`/`'invoice-void'`/`'exceeds-total'` render as a visible error in the form rather than the submission silently no-opping — the exact "route the outcome back to the UI" lesson from Organization's final whole-branch review (finding F2).
6. **Credit Notes section**: search box (matches credit-note code or customer name) → table — columns: Credit note (code, mono), Customer (name), Issued (date), Total (amount), Status (badge). Row click opens `CreditNoteDetailPanel` (view-only: header + read-only Lines table — no actions, since the backend exposes zero mutation endpoints for credit notes beyond creation). Create-panel: Customer picker, optional Source reference fields, the same repeatable line-item builder as Invoices, Save/Cancel.

## Testing

Same conventions as every prior module: colocated `.spec.ts`, `TestBed` + real store injection (no mocks). `BillingStore.spec.ts` covers `addInvoice`/`addCreditNote`'s full validation order (blank lines → bad quantity → bad unit price → inactive/unknown customer → unknown product) and `recordPayment`'s full order (bad amount → blank method → unknown invoice → void invoice → exceeds-total), plus status derivation at the exact `partially-paid`/`paid` boundary (`cumulative === totalAmount`). `OfficeBilling.spec.ts` covers KPI computation against the seed data, the section toggle, per-section search, both create flows including the line-item builder's add/remove-line behavior and live grand total, the Record Payment flow updating an invoice's status and Payments list, and an end-to-end append-and-clear assertion on every form — the standing lesson from Partners' original final review (its own spec never enforced "and clear," and the gap only surfaced in whole-branch review).
