# Partners UI — Office Console

First of three sub-projects decomposed from "extend the Warehouse Operations Console UI rollout to Organization, Partners, and Billing" (the other two — Organization, Billing — are separate, later spec/plan/build cycles). Unlike the original 4-module rollout (Inbound/Outbound/Returns/Reporting), Organization/Partners/Billing are independent backend subsystems (`ikho-warehouse-organization`, `ikho-warehouse-partner`, `ikho-warehouse-billing`), each needing its own design.

## Context

`ikho-warehouse-partner` owns two nearly-identical resources — Customers and Suppliers — each with `Code`/`Name`/`TaxId`/`IsActive`/`CreatedOnUtc` plus `Addresses[]` and `Contacts[]` sub-collections, and real mutation endpoints: create (validates Code/Name/TaxId required, rejects a duplicate Code), update (Name/TaxId), set-status (activate/deactivate), add-address, add-contact. Neither resource exposes a delete endpoint.

The current placeholder (`ADMIN_SCREENS.partners`) already renders a combined "Suppliers and customers" list with a Type column and a separate Contacts tab, and its mock names (Vanderberg Steel, Nordic Labels A/S, Meijer Retail Group, Brico Bouwmarkt) already overlap with `supplier`/`customer` free-text strings used in `purchase-orders.data.ts`, `sales-orders.data.ts`, and `return-orders.data.ts`. This spec replaces the placeholder with a real, mutable `PartnersStore` and a custom `OfficePartners` screen.

`screens.data.ts`'s `partners` entry is `roles: ['admin']` only — Office Console only, no Operator Mode counterpart, and that's a pre-existing decision this spec doesn't revisit.

`OfficePartners` does **not** wrap `<app-office-screen>`. `OfficeScreen`'s detail panel supports exactly one action button and its built-in filter chips are hardcoded to stock-status semantics (`in-stock`/`low-stock`/`out-of-stock`) — neither fits a partner directory that needs a Customer/Supplier type filter and multiple detail-panel actions (activate/deactivate, edit, add address, add contact). Rather than extend `OfficeScreen` for one consumer (it's depended on by Inbound/Outbound/Returns), `OfficePartners` composes its own layout directly from the same primitives `OfficeScreen` uses internally (`lib-data-panel`, `lib-data-table`, `lib-kpi-card`), the same precedent Reporting set for bypassing `OfficeScreen` when it doesn't fit.

## Goals

Turn `/office/partners` into a real, editable partner directory: create partners, edit name/tax id, activate/deactivate, add addresses and contacts — all backed by a mutable mock store enforcing the same guard rules the backend does (Code required + unique, Name/TaxId required).

## Non-goals

- **No modal/dialog component.** `@ikho/shared-ui` has no Modal/Dialog — all creation/editing is inline expand-panels, matching every other module in this app.
- **No delete of partners, addresses, or contacts.** The backend exposes no delete endpoint for any of the three; only create/update/status-toggle.
- **No cross-store derivation.** `PartnersStore` owns independent seed data. Existing free-text `customer`/`supplier` strings in Outbound/Inbound/Returns mock data stay free text; this spec doesn't wire them to `PartnersStore` by id — the same boundary Reporting drew against joining other services' data.
- **No primary-address/contact reordering UI.** New addresses/contacts are appended; `isPrimary` is set at creation time only (a checkbox on the add-form), not editable after the fact.
- **No pagination.** Matches every prior module — Inbound/Outbound/Returns/Reporting all render full result sets.

## Data model & `PartnersStore`

`partners.data.ts` — seed data shaped after the backend entities, using display-friendly mock codes instead of GUIDs:

```ts
export type PartnerType = 'supplier' | 'customer';

export interface PartnerAddress {
  id: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
}

export interface PartnerContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export interface Partner {
  code: string;           // e.g. 'SUP-0142' / 'CUS-2210' — also the row key
  type: PartnerType;
  name: string;
  taxId: string;
  isActive: boolean;
  createdOnUtc: string;
  addresses: PartnerAddress[];
  contacts: PartnerContact[];
}

export const PARTNERS: Partner[] = [
  // Seeded from the current placeholder's rows — Vanderberg Steel, Nordic Labels A/S,
  // EuroPallet NV, Wrapline BV (suppliers), Meijer Retail Group, Brico Bouwmarkt,
  // Hafen Bremen GmbH (customers) — extended with taxId/createdOnUtc/addresses/contacts.
];
```

`PartnersStore` (`providedIn: 'root'`) exposes `partners` as a readonly signal seeded from `PARTNERS`, plus guarded mutations mirroring the backend's own outcomes:

- `addPartner(input: { code: string; type: PartnerType; name: string; taxId: string }): 'ok' | 'duplicate-code' | 'invalid'` — rejects blank code/name/taxId (`'invalid'`); rejects a code that already exists anywhere in the unified list (`'duplicate-code'`, since both types share one `code` display column here even though the backend's uniqueness is per-resource).
- `updatePartner(code: string, input: { name: string; taxId: string }): 'ok' | 'not-found' | 'invalid'`
- `setStatus(code: string, isActive: boolean): void`
- `addAddress(code: string, address: Omit<PartnerAddress, 'id'>): void`
- `addContact(code: string, contact: Omit<PartnerContact, 'id'>): void`

All mutations are plain signal updates (`this.partners.update(...)`) — no async, no `HttpClient`, matching every prior store.

## Office Console — `OfficePartners` screen

Route: `/office/partners`, replacing `OfficeGenericScreen` for the `partners` screen id (same swap pattern as every prior module).

Layout, top to bottom:

1. **Header** — title/meta, plus primary action "Add partner" (existing `screens.data.ts` copy), which toggles an inline create-panel above the table: Code, Name, TaxId text inputs, a Supplier/Customer radio choice, Save/Cancel.
2. **KPI row** — 3 `lib-kpi-card` tiles computed live from `PartnersStore`: Suppliers (count where `type === 'supplier'`), Customers (count where `type === 'customer'`), Blocked (count where `!isActive`).
3. **Type filter chips** — All / Suppliers / Customers — plus a search box matching partner name, code, primary-address city, or primary-contact name.
4. **`lib-data-panel` + `lib-data-table`** — columns: Partner (code, mono), Name, Type (badge), City (primary address's city, em-dash if none), Contact (primary contact's name, em-dash if none), Status (badge: Active/Blocked). Row click opens the detail panel.
5. **Detail panel** — custom component (not the shared `OfficeDetailPanel`, which supports only one action): partner name/code header, Status badge, read-only Tax ID and Created-on fields, an inline "Edit" toggle for Name/TaxId, an Activate/Deactivate button, an Addresses list (each row's `isPrimary` shown as a small badge) with an "Add address" inline expand-form, and a Contacts list with an "Add contact" inline expand-form.

## Testing

Same conventions as every prior module: colocated `.spec.ts`, `TestBed` + real store injection (no mocks). `PartnersStore.spec.ts` covers each mutation's guard: duplicate code rejected, blank fields rejected, not-found handled on update/status-toggle of an unknown code, address/contact append correctly with generated ids. `OfficePartners.spec.ts` covers: KPI counts match seeded data, type-filter narrows rows, search matches name/code/city/contact, the add-partner panel creates a row and validates/clears the form, row click opens the detail panel with the row's addresses/contacts, activate/deactivate flips status and its badge, and the add-address/add-contact panels append and clear.
