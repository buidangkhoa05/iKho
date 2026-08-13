# Organization UI — Office Console

Second of three sub-projects decomposed from "extend the Warehouse Operations Console UI rollout to Organization, Partners, and Billing" (Partners is complete; Billing remains a later spec/plan/build cycle). Like Partners, Organization is an independent backend subsystem (`ikho-warehouse-organization`) with no Operator Mode counterpart.

## Context

`ikho-warehouse-organization` owns `Company → Warehouse → Zone/Dock` (Zone further contains Aisle → Bin, out of scope here — see Non-goals). Warehouse: `Code, CompanyId, Name, IsActive, CreatedOnUtc` — no delete endpoint, only create/update/status-toggle. Zone and Dock: `Code, WarehouseId, Name, IsActive` — each sibling to the other under a Warehouse, code unique per warehouse, no delete. Company: `Code, Name, IsActive, CreatedOnUtc` — no delete; its own update endpoint folds `IsActive` into the same call (unlike Warehouse, which has a separate status-toggle endpoint).

The current placeholder (`ADMIN_SCREENS.organization`) already has fake Warehouses/Zones/Docks tables (WH-1 Rotterdam, WH-2 Antwerp Overflow, WH-3 Utrecht Returns Hub) that this spec's seed data builds on for continuity with the rest of the app (`"WH-1 Rotterdam"` is referenced everywhere as the default warehouse).

`OfficeOrganization` does **not** wrap `<app-office-screen>` — same reasoning as Partners/Reporting: the detail panel needs multiple independent actions (Edit, Activate/Deactivate, Add zone, Add dock), which `OfficeScreen`'s single-action detail panel can't support. `OfficeOrganization` composes its own layout directly from the same primitives `OfficeScreen` uses internally (`lib-data-panel`, `lib-data-table`, `lib-kpi-card`).

## Goals

Turn `/office/organization` into a real, editable warehouse directory: create warehouses (picking or inline-creating their company), edit warehouse name, activate/deactivate, and manage each warehouse's Zones and Docks (add + activate/deactivate) — all backed by a mutable mock store enforcing the same guard rules as the backend (Code required + unique at the right scope, Name required, parent-exists checks).

## Non-goals

- **No Aisle/Bin management.** Deferred to a later cycle — Zones and Docks are the deepest level this cycle touches. A future spec can add drill-down (Warehouse → Zone → Aisle → Bin) if needed.
- **No dedicated Company directory.** Company is a lightweight picker in the "Add warehouse" form (existing companies + inline "new company" fields) — no separate list, KPIs, or detail panel for companies.
- **No modal/dialog.** `@ikho/shared-ui` has no Modal/Dialog — inline expand-panels only, matching every other module.
- **No delete** of companies, warehouses, zones, or docks — the backend exposes no delete endpoint for any of them.
- **No cascading status changes** — deactivating a warehouse does not deactivate its zones/docks (matches backend: no cascade logic there either).
- **No pagination.** Matches every prior module.

## Data model & `OrganizationStore`

`organization.data.ts` — seed data shaped after the backend entities, using display-friendly mock codes instead of GUIDs:

```ts
export interface Company {
  code: string;        // e.g. 'RTM-LOG' — row/reference key, globally unique
  name: string;
  isActive: boolean;
  createdOnUtc: string;
}

export interface Zone {
  code: string;         // unique per warehouse
  name: string;
  isActive: boolean;
}

export interface Dock {
  code: string;         // unique per warehouse
  name: string;
  isActive: boolean;
}

export interface Warehouse {
  code: string;         // e.g. 'WH-1' — row/reference key, unique per company
  companyCode: string;  // FK to Company.code
  name: string;
  isActive: boolean;
  createdOnUtc: string;
  zones: Zone[];
  docks: Dock[];
}

export const COMPANIES: Company[] = [
  // Seeded from the app-wide default: Rotterdam Logistics BV.
];

export const WAREHOUSES: Warehouse[] = [
  // Seeded from the current placeholder's rows — WH-1 Rotterdam, WH-2 Antwerp Overflow
  // (active), WH-3 Utrecht Returns Hub (inactive) — extended with a company code and a
  // couple of zones/docks each.
];
```

`OrganizationStore` (`providedIn: 'root'`) exposes `companies` and `warehouses` as readonly signals seeded from `COMPANIES`/`WAREHOUSES`, plus guarded mutations mirroring the backend's own outcomes:

- `addCompany(input: { code: string; name: string }): 'ok' | 'duplicate-code' | 'invalid'`
- `addWarehouse(input: { code: string; companyCode: string; name: string }): 'ok' | 'duplicate-code' | 'invalid' | 'company-not-found'` — rejects blank code/companyCode/name (`'invalid'`); rejects an unknown `companyCode` (`'company-not-found'`); rejects a `code` already used by another warehouse **in the same company** (`'duplicate-code'`), matching the backend's per-company uniqueness scope.
- `updateWarehouse(code: string, input: { name: string }): 'ok' | 'not-found' | 'invalid'`
- `setWarehouseStatus(code: string, isActive: boolean): void`
- `addZone(warehouseCode: string, input: { code: string; name: string }): 'ok' | 'duplicate-code' | 'invalid' | 'not-found'` — `'not-found'` if `warehouseCode` doesn't exist; `'duplicate-code'` if the zone code already exists **within that warehouse**. Unlike Partners' addresses/contacts (no uniqueness constraint), Zone and Dock codes are unique per warehouse on the backend, so these mutations return an outcome instead of void.
- `setZoneStatus(warehouseCode: string, zoneCode: string, isActive: boolean): void`
- `addDock(warehouseCode: string, input: { code: string; name: string }): 'ok' | 'duplicate-code' | 'invalid' | 'not-found'` — same rules as `addZone`, scoped to docks.
- `setDockStatus(warehouseCode: string, dockCode: string, isActive: boolean): void`

All mutations are plain signal updates (`this.warehouses.update(...)` / `this.companies.update(...)`) — no async, no `HttpClient`, matching every prior store.

## Office Console — `OfficeOrganization` screen

Route: `/office/organization`, replacing `OfficeGenericScreen` for the `organization` screen id (same swap pattern as every prior module).

Layout, top to bottom:

1. **Header** — title/meta, plus primary action "Add warehouse" (existing `screens.data.ts` copy), which toggles an inline create-panel above the table: Code, Name text inputs, a Company picker (dropdown of existing companies + a "+ New company" toggle revealing Code/Name inputs for an inline company creation), Save/Cancel. On submit with "new company" active, the form first calls `addCompany` with the new code/name; if that returns `'duplicate-code'` or `'invalid'`, submission stops and shows that error (the warehouse is not created). Only once the company step succeeds (or an existing company was picked) does the form call `addWarehouse` with the resulting `companyCode`.
2. **KPI row** — 3 `lib-kpi-card` tiles computed live from `OrganizationStore`: Warehouses (count), Active (count where `isActive`), Inactive (count where `!isActive`).
3. **Search box** — matches warehouse code, name, or company name. No type-filter chips this time (single entity type in the list).
4. **`lib-data-panel` + `lib-data-table`** — columns: Warehouse (code, mono), Name, Company (name), Zones (count), Docks (count), Status (badge: Active/Inactive). Row click opens the detail panel.
5. **Detail panel** — custom component (not the shared `OfficeDetailPanel`, which supports only one action): warehouse name/code header, Status badge, an inline "Edit" toggle for Name, an Activate/Deactivate button, a Zones list (each row: code, name, status badge, with its own inline Activate/Deactivate toggle) with an "Add zone" inline expand-form, and a Docks list (same shape) with an "Add dock" inline expand-form. No drill-down past Zone/Dock — Aisles and Bins are out of scope.

## Testing

Same conventions as every prior module: colocated `.spec.ts`, `TestBed` + real store injection (no mocks). `OrganizationStore.spec.ts` covers each mutation's guard: duplicate code rejected at the right scope (company-wide for Company, per-company for Warehouse, per-warehouse for Zone/Dock), blank fields rejected, not-found handled for an unknown parent (`companyCode`/`warehouseCode`) or an unknown target code on a status toggle. `OfficeOrganization.spec.ts` covers: KPI counts match seeded data, search narrows rows, the add-warehouse panel (including inline company creation) creates a row and validates/clears the form, row click opens the detail panel with its zones/docks, activate/deactivate flips a warehouse's status and its badge, and the add-zone/add-dock panels append and clear — with a real end-to-end test covering the append-and-clear behavior end to end, per the lesson from the Partners final review (its spec's own code never enforced "and clear," and that gap only surfaced in the whole-branch review).
