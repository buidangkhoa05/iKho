# Organization UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/office/organization` placeholder with a real, editable warehouse directory — create warehouses (picking or inline-creating their company), edit warehouse name, activate/deactivate, and manage each warehouse's Zones and Docks (add + activate/deactivate) — backed by a mutable mock store.

**Architecture:** An `OrganizationStore` (Angular signals, `providedIn: 'root'`) owns `Company[]` and `Warehouse[]` lists seeded from `organization.data.ts`, with guarded mutations mirroring the real backend's outcomes (including per-scope uniqueness: company codes globally unique, warehouse codes unique per company, zone/dock codes unique per warehouse). `OfficeOrganization` composes `DataPanel`/`DataTable`/`KpiCard`/`Button`/`TextInput` directly (not wrapped in the shared `OfficeScreen`, which doesn't fit this screen's multi-action detail panel needs) and delegates the detail view to a dedicated `WarehouseDetailPanel` component.

**Tech Stack:** Angular 19 (standalone, signals, `OnPush`), Tailwind v4 utility classes, `@ikho/shared-ui` (`DataPanel`, `DataTable`, `KpiCard`, `Button`, `TextInput`, `StatusBadge`, `Icon`).

## Global Constraints

- Standalone components only, `OnPush` change detection, `inject()` for DI — no `NgModule`.
- Styling is Tailwind utility classes against `apps/ikho-ui/src/styles/tokens.css` design tokens only — no hand-written `styles:` blocks.
- All UI copy is bilingual (English/Vietnamese) via inline `this.lang.lang() === 'en' ? '...' : '...'` ternaries grouped into a single `t()` computed object per component — matching every prior module (Inbound/Outbound/Returns/Reporting/Partners). No English-only strings, including empty-state labels (`DataTable`'s `emptyLabel` input defaults to a hardcoded English string — always bind it explicitly).
- No `HttpClient`, no async — `OrganizationStore` is a plain in-memory signal store.
- No modal/dialog component exists in `@ikho/shared-ui` — all creation/editing is inline expand-panels.
- No delete of companies, warehouses, zones, or docks — the backend exposes no delete endpoint for any of the three.
- No cascading status changes — deactivating a warehouse does not deactivate its zones/docks.
- No Aisle/Bin management — Zones and Docks are the deepest level this plan touches.
- No dedicated Company directory — Company is only a picker/inline-create inside the "Add warehouse" form.
- No pagination.
- `OfficeOrganization` does not wrap `<app-office-screen>` — it composes `lib-data-panel`/`lib-data-table`/`lib-kpi-card` directly, the same precedent `OfficeReporting`/`OfficePartners` set.
- Angular `output()` names must not collide with native DOM event names (e.g. `close`, `load`, `error`) — `@angular-eslint/no-output-native` fails CI's lint step on this. Use a qualifying name instead (e.g. `closePanel`).
- Any `PartnerRow`/`WarehouseRow`-style interface bound to `DataTable`'s `rows` input must `extends Record<string, unknown>` from the start (`DataTable.rows` is typed `input.required<Record<string, unknown>[]>()`).

---

### Task 1: Organization data model & `OrganizationStore`

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/organization.data.ts`
- Create: `source/apps/ikho-ui/src/app/core/state/organization-store.ts`
- Test: `source/apps/ikho-ui/src/app/core/state/organization-store.spec.ts`

**Interfaces:**
- Produces: `Company { code, name, isActive, createdOnUtc }`; `Zone { code, name, isActive }`; `Dock { code, name, isActive }`; `Warehouse { code, companyCode, name, isActive, createdOnUtc, zones: Zone[], docks: Dock[] }`; `COMPANIES: Company[]` (1 seed row), `WAREHOUSES: Warehouse[]` (3 seed rows — WH-1/WH-2 active, WH-3 inactive, matching KPI test expectations). `OrganizationStore` with `companies: Signal<Company[]>`, `warehouses: Signal<Warehouse[]>`, `addCompany(input: AddCompanyInput): AddCompanyOutcome`, `addWarehouse(input: AddWarehouseInput): AddWarehouseOutcome`, `updateWarehouse(code: string, input: UpdateWarehouseInput): UpdateWarehouseOutcome`, `setWarehouseStatus(code: string, isActive: boolean): void`, `addZone(warehouseCode: string, input: AddZoneInput): AddZoneOutcome`, `setZoneStatus(warehouseCode: string, zoneCode: string, isActive: boolean): void`, `addDock(warehouseCode: string, input: AddDockInput): AddDockOutcome`, `setDockStatus(warehouseCode: string, dockCode: string, isActive: boolean): void`. Outcome types: `AddCompanyOutcome = 'ok' | 'duplicate-code' | 'invalid'`, `AddWarehouseOutcome = 'ok' | 'duplicate-code' | 'invalid' | 'company-not-found'`, `UpdateWarehouseOutcome = 'ok' | 'not-found' | 'invalid'`, `AddZoneOutcome = 'ok' | 'duplicate-code' | 'invalid' | 'not-found'`, `AddDockOutcome = 'ok' | 'duplicate-code' | 'invalid' | 'not-found'`. Input types: `AddCompanyInput { code, name }`, `AddWarehouseInput { code, companyCode, name }`, `UpdateWarehouseInput { name }`, `AddZoneInput { code, name }`, `AddDockInput { code, name }`.

- [ ] **Step 1: Create the seed data file**

```ts
// source/apps/ikho-ui/src/app/core/mock-data/organization.data.ts
export interface Company {
  code: string;
  name: string;
  isActive: boolean;
  createdOnUtc: string;
}

export interface Zone {
  code: string;
  name: string;
  isActive: boolean;
}

export interface Dock {
  code: string;
  name: string;
  isActive: boolean;
}

export interface Warehouse {
  code: string;
  companyCode: string;
  name: string;
  isActive: boolean;
  createdOnUtc: string;
  zones: Zone[];
  docks: Dock[];
}

export const COMPANIES: Company[] = [
  { code: 'RTM-LOG', name: 'Rotterdam Logistics BV', isActive: true, createdOnUtc: '2023-11-01T09:00:00Z' },
];

export const WAREHOUSES: Warehouse[] = [
  {
    code: 'WH-1',
    companyCode: 'RTM-LOG',
    name: 'Rotterdam DC',
    isActive: true,
    createdOnUtc: '2023-11-05T09:00:00Z',
    zones: [
      { code: 'Z-A', name: 'Bulk storage', isActive: true },
      { code: 'Z-B', name: 'Pick face', isActive: true },
    ],
    docks: [
      { code: 'D-1', name: 'Inbound door 1', isActive: true },
      { code: 'D-2', name: 'Outbound door 1', isActive: true },
    ],
  },
  {
    code: 'WH-2',
    companyCode: 'RTM-LOG',
    name: 'Antwerp Overflow',
    isActive: true,
    createdOnUtc: '2024-01-14T09:00:00Z',
    zones: [
      { code: 'Z-A', name: 'Bulk storage', isActive: true },
    ],
    docks: [
      { code: 'D-1', name: 'Inbound door 1', isActive: true },
    ],
  },
  {
    code: 'WH-3',
    companyCode: 'RTM-LOG',
    name: 'Utrecht Returns Hub',
    isActive: false,
    createdOnUtc: '2024-06-20T09:00:00Z',
    zones: [
      { code: 'Z-A', name: 'Quarantine', isActive: true },
    ],
    docks: [
      { code: 'D-1', name: 'Inbound door 1', isActive: false },
    ],
  },
];
```

This file has no logic — no dedicated spec, matching `ReportingStore`'s and `PartnersStore`'s data files.

- [ ] **Step 2: Write the failing store spec**

```ts
// source/apps/ikho-ui/src/app/core/state/organization-store.spec.ts
import { OrganizationStore } from './organization-store';

describe('OrganizationStore', () => {
  let store: OrganizationStore;

  beforeEach(() => {
    store = new OrganizationStore();
  });

  it('seeds companies and warehouses from mock data', () => {
    expect(store.companies().length).toBeGreaterThan(0);
    expect(store.warehouses().length).toBe(3);
  });

  it('addCompany prepends a new active company', () => {
    const before = store.companies().length;

    const outcome = store.addCompany({ code: 'ANT-LOG', name: 'Antwerp Freight NV' });

    expect(outcome).toBe('ok');
    expect(store.companies().length).toBe(before + 1);
    const created = store.companies()[0];
    expect(created.code).toBe('ANT-LOG');
    expect(created.isActive).toBe(true);
  });

  it('addCompany rejects a blank code or name', () => {
    const before = store.companies().length;

    const outcome = store.addCompany({ code: '', name: 'Test' });

    expect(outcome).toBe('invalid');
    expect(store.companies().length).toBe(before);
  });

  it('addCompany rejects a duplicate code', () => {
    const before = store.companies().length;

    const outcome = store.addCompany({ code: 'RTM-LOG', name: 'Another Co' });

    expect(outcome).toBe('duplicate-code');
    expect(store.companies().length).toBe(before);
  });

  it('addWarehouse prepends a new active warehouse with empty zones and docks', () => {
    const before = store.warehouses().length;

    const outcome = store.addWarehouse({ code: 'WH-9', companyCode: 'RTM-LOG', name: 'Test Warehouse' });

    expect(outcome).toBe('ok');
    expect(store.warehouses().length).toBe(before + 1);
    const created = store.warehouses()[0];
    expect(created.code).toBe('WH-9');
    expect(created.isActive).toBe(true);
    expect(created.zones).toEqual([]);
    expect(created.docks).toEqual([]);
  });

  it('addWarehouse rejects a blank code, companyCode, or name', () => {
    const outcome = store.addWarehouse({ code: '', companyCode: 'RTM-LOG', name: 'Test' });

    expect(outcome).toBe('invalid');
  });

  it('addWarehouse rejects an unknown companyCode', () => {
    const outcome = store.addWarehouse({ code: 'WH-9', companyCode: 'NO-SUCH-CO', name: 'Test' });

    expect(outcome).toBe('company-not-found');
  });

  it('addWarehouse rejects a duplicate code within the same company', () => {
    const before = store.warehouses().length;

    const outcome = store.addWarehouse({ code: 'WH-1', companyCode: 'RTM-LOG', name: 'Duplicate' });

    expect(outcome).toBe('duplicate-code');
    expect(store.warehouses().length).toBe(before);
  });

  it('addWarehouse allows the same code under a different company', () => {
    store.addCompany({ code: 'ANT-LOG', name: 'Antwerp Freight NV' });

    const outcome = store.addWarehouse({ code: 'WH-1', companyCode: 'ANT-LOG', name: 'Antwerp WH-1' });

    expect(outcome).toBe('ok');
  });

  it('updateWarehouse updates the name of an existing warehouse', () => {
    const outcome = store.updateWarehouse('WH-1', { name: 'Rotterdam DC (Renovated)' });

    expect(outcome).toBe('ok');
    const updated = store.warehouses().find((w) => w.code === 'WH-1')!;
    expect(updated.name).toBe('Rotterdam DC (Renovated)');
  });

  it('updateWarehouse fails for an unknown code', () => {
    const outcome = store.updateWarehouse('WH-999', { name: 'X' });

    expect(outcome).toBe('not-found');
  });

  it('updateWarehouse rejects a blank name', () => {
    const outcome = store.updateWarehouse('WH-1', { name: '' });

    expect(outcome).toBe('invalid');
    const unchanged = store.warehouses().find((w) => w.code === 'WH-1')!;
    expect(unchanged.name).toBe('Rotterdam DC');
  });

  it('setWarehouseStatus flips isActive for the matching warehouse only', () => {
    store.setWarehouseStatus('WH-1', false);

    expect(store.warehouses().find((w) => w.code === 'WH-1')!.isActive).toBe(false);
    expect(store.warehouses().find((w) => w.code === 'WH-2')!.isActive).toBe(true);
  });

  it('addZone appends a new active zone to the matching warehouse only', () => {
    const before = store.warehouses().find((w) => w.code === 'WH-1')!.zones.length;

    const outcome = store.addZone('WH-1', { code: 'Z-C', name: 'Returns processing' });

    expect(outcome).toBe('ok');
    const updated = store.warehouses().find((w) => w.code === 'WH-1')!;
    expect(updated.zones.length).toBe(before + 1);
    expect(updated.zones[updated.zones.length - 1]).toEqual({ code: 'Z-C', name: 'Returns processing', isActive: true });
    expect(store.warehouses().find((w) => w.code === 'WH-2')!.zones.length).toBe(1);
  });

  it('addZone rejects a blank code or name', () => {
    const outcome = store.addZone('WH-1', { code: '', name: 'Test' });

    expect(outcome).toBe('invalid');
  });

  it('addZone rejects an unknown warehouseCode', () => {
    const outcome = store.addZone('WH-999', { code: 'Z-X', name: 'Test' });

    expect(outcome).toBe('not-found');
  });

  it('addZone rejects a duplicate code within the same warehouse', () => {
    const before = store.warehouses().find((w) => w.code === 'WH-1')!.zones.length;

    const outcome = store.addZone('WH-1', { code: 'Z-A', name: 'Duplicate' });

    expect(outcome).toBe('duplicate-code');
    expect(store.warehouses().find((w) => w.code === 'WH-1')!.zones.length).toBe(before);
  });

  it('addZone allows the same code under a different warehouse', () => {
    const outcome = store.addZone('WH-2', { code: 'Z-B', name: 'Second zone' });

    expect(outcome).toBe('ok');
  });

  it('setZoneStatus flips isActive for the matching zone in the matching warehouse only', () => {
    store.setZoneStatus('WH-1', 'Z-A', false);

    const wh1 = store.warehouses().find((w) => w.code === 'WH-1')!;
    expect(wh1.zones.find((z) => z.code === 'Z-A')!.isActive).toBe(false);
    expect(wh1.zones.find((z) => z.code === 'Z-B')!.isActive).toBe(true);
    expect(store.warehouses().find((w) => w.code === 'WH-2')!.zones.find((z) => z.code === 'Z-A')!.isActive).toBe(true);
  });

  it('addDock appends a new active dock to the matching warehouse only', () => {
    const before = store.warehouses().find((w) => w.code === 'WH-1')!.docks.length;

    const outcome = store.addDock('WH-1', { code: 'D-3', name: 'Cross-dock lane' });

    expect(outcome).toBe('ok');
    const updated = store.warehouses().find((w) => w.code === 'WH-1')!;
    expect(updated.docks.length).toBe(before + 1);
    expect(updated.docks[updated.docks.length - 1]).toEqual({ code: 'D-3', name: 'Cross-dock lane', isActive: true });
  });

  it('addDock rejects a duplicate code within the same warehouse', () => {
    const outcome = store.addDock('WH-1', { code: 'D-1', name: 'Duplicate' });

    expect(outcome).toBe('duplicate-code');
  });

  it('setDockStatus flips isActive for the matching dock in the matching warehouse only', () => {
    store.setDockStatus('WH-1', 'D-1', false);

    const wh1 = store.warehouses().find((w) => w.code === 'WH-1')!;
    expect(wh1.docks.find((d) => d.code === 'D-1')!.isActive).toBe(false);
    expect(wh1.docks.find((d) => d.code === 'D-2')!.isActive).toBe(true);
  });
});
```

- [ ] **Step 3: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --testPathPattern=organization-store`
Expected: FAIL — `Cannot find module './organization-store'`

- [ ] **Step 4: Implement `OrganizationStore`**

```ts
// source/apps/ikho-ui/src/app/core/state/organization-store.ts
import { Injectable, signal } from '@angular/core';
import { Company, Dock, Warehouse, Zone, COMPANIES, WAREHOUSES } from '../mock-data/organization.data';

export type AddCompanyOutcome = 'ok' | 'duplicate-code' | 'invalid';
export type AddWarehouseOutcome = 'ok' | 'duplicate-code' | 'invalid' | 'company-not-found';
export type UpdateWarehouseOutcome = 'ok' | 'not-found' | 'invalid';
export type AddZoneOutcome = 'ok' | 'duplicate-code' | 'invalid' | 'not-found';
export type AddDockOutcome = 'ok' | 'duplicate-code' | 'invalid' | 'not-found';

export interface AddCompanyInput {
  code: string;
  name: string;
}

export interface AddWarehouseInput {
  code: string;
  companyCode: string;
  name: string;
}

export interface UpdateWarehouseInput {
  name: string;
}

export interface AddZoneInput {
  code: string;
  name: string;
}

export interface AddDockInput {
  code: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizationStore {
  readonly companies = signal<Company[]>([...COMPANIES]);
  readonly warehouses = signal<Warehouse[]>([...WAREHOUSES]);

  addCompany(input: AddCompanyInput): AddCompanyOutcome {
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) return 'invalid';
    if (this.companies().some((c) => c.code === code)) return 'duplicate-code';

    const company: Company = { code, name, isActive: true, createdOnUtc: new Date().toISOString() };
    this.companies.update((list) => [company, ...list]);
    return 'ok';
  }

  addWarehouse(input: AddWarehouseInput): AddWarehouseOutcome {
    const code = input.code.trim();
    const companyCode = input.companyCode.trim();
    const name = input.name.trim();
    if (!code || !companyCode || !name) return 'invalid';
    if (!this.companies().some((c) => c.code === companyCode)) return 'company-not-found';
    if (this.warehouses().some((w) => w.code === code && w.companyCode === companyCode)) return 'duplicate-code';

    const warehouse: Warehouse = {
      code,
      companyCode,
      name,
      isActive: true,
      createdOnUtc: new Date().toISOString(),
      zones: [],
      docks: [],
    };
    this.warehouses.update((list) => [warehouse, ...list]);
    return 'ok';
  }

  updateWarehouse(code: string, input: UpdateWarehouseInput): UpdateWarehouseOutcome {
    const name = input.name.trim();
    if (!name) return 'invalid';
    if (!this.warehouses().some((w) => w.code === code)) return 'not-found';

    this.warehouses.update((list) => list.map((w) => (w.code === code ? { ...w, name } : w)));
    return 'ok';
  }

  setWarehouseStatus(code: string, isActive: boolean): void {
    this.warehouses.update((list) => list.map((w) => (w.code === code ? { ...w, isActive } : w)));
  }

  addZone(warehouseCode: string, input: AddZoneInput): AddZoneOutcome {
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) return 'invalid';
    const warehouse = this.warehouses().find((w) => w.code === warehouseCode);
    if (!warehouse) return 'not-found';
    if (warehouse.zones.some((z) => z.code === code)) return 'duplicate-code';

    const zone: Zone = { code, name, isActive: true };
    this.warehouses.update((list) =>
      list.map((w) => (w.code === warehouseCode ? { ...w, zones: [...w.zones, zone] } : w)),
    );
    return 'ok';
  }

  setZoneStatus(warehouseCode: string, zoneCode: string, isActive: boolean): void {
    this.warehouses.update((list) =>
      list.map((w) =>
        w.code === warehouseCode
          ? { ...w, zones: w.zones.map((z) => (z.code === zoneCode ? { ...z, isActive } : z)) }
          : w,
      ),
    );
  }

  addDock(warehouseCode: string, input: AddDockInput): AddDockOutcome {
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) return 'invalid';
    const warehouse = this.warehouses().find((w) => w.code === warehouseCode);
    if (!warehouse) return 'not-found';
    if (warehouse.docks.some((d) => d.code === code)) return 'duplicate-code';

    const dock: Dock = { code, name, isActive: true };
    this.warehouses.update((list) =>
      list.map((w) => (w.code === warehouseCode ? { ...w, docks: [...w.docks, dock] } : w)),
    );
    return 'ok';
  }

  setDockStatus(warehouseCode: string, dockCode: string, isActive: boolean): void {
    this.warehouses.update((list) =>
      list.map((w) =>
        w.code === warehouseCode
          ? { ...w, docks: w.docks.map((d) => (d.code === dockCode ? { ...d, isActive } : d)) }
          : w,
      ),
    );
  }
}
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --testPathPattern=organization-store`
Expected: PASS (22 tests)

- [ ] **Step 6: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/organization.data.ts source/apps/ikho-ui/src/app/core/state/organization-store.ts source/apps/ikho-ui/src/app/core/state/organization-store.spec.ts
git commit -m "feat(ikho-ui): add Organization data model and OrganizationStore"
```

---

### Task 2: `OfficeOrganization` screen — header, KPIs, search, table

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/organization/office-organization.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/organization/office-organization.spec.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/office.routes.ts`

**Interfaces:**
- Consumes: `OrganizationStore.warehouses: Signal<Warehouse[]>`, `OrganizationStore.companies: Signal<Company[]>` (Task 1); `screenTitle`/`screenMeta` from `screens.data.ts`; `UI_STRINGS.results` from `ui-strings.data.ts`.
- Produces: `OfficeOrganization` component (selector `app-office-organization`), with `protected readonly t`, `columns`, `kpis`, `query`, `filteredRows` — Task 3 and Task 4 extend this same class and its template.

- [ ] **Step 1: Write the failing screen spec**

```ts
// source/apps/ikho-ui/src/app/features/office/organization/office-organization.spec.ts
import { TestBed } from '@angular/core/testing';
import { OfficeOrganization } from './office-organization';

describe('OfficeOrganization', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeOrganization],
    }).compileComponents();
  });

  it('renders KPI tiles computed from the seeded warehouses', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('lib-kpi-card');
    expect(cards.length).toBe(3);
    expect(cards[0].textContent).toContain('Warehouses');
    expect(cards[0].textContent).toContain('3');
    expect(cards[1].textContent).toContain('Active');
    expect(cards[1].textContent).toContain('2');
    expect(cards[2].textContent).toContain('Inactive');
    expect(cards[2].textContent).toContain('1');
  });

  it('renders all seeded warehouses in the table', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Rotterdam DC');
    expect(text).toContain('Antwerp Overflow');
    expect(text).toContain('Utrecht Returns Hub');
    expect(text).toContain('Rotterdam Logistics BV');
  });

  it('search narrows the table by code, name, or company', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('Antwerp');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Antwerp Overflow');
    expect(text).not.toContain('Rotterdam DC');
  });

  it('shows a bilingual empty label when search yields no results', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('no such warehouse anywhere');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('No results');
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --testPathPattern=office-organization`
Expected: FAIL — `Cannot find module './office-organization'`

- [ ] **Step 3: Implement `OfficeOrganization`**

```ts
// source/apps/ikho-ui/src/app/features/office/organization/office-organization.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DataPanel, DataTable, DataTableColumn, KpiCard, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { Warehouse } from '../../../core/mock-data/organization.data';
import { screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
import { OrganizationStore } from '../../../core/state/organization-store';

interface WarehouseRow extends Record<string, unknown> {
  code: string;
  name: string;
  companyName: string;
  zonesCount: number;
  docksCount: number;
  status: 'in-stock' | 'out-of-stock';
  statusLabel: string;
}

@Component({
  selector: 'app-office-organization',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataPanel, DataTable, KpiCard, TextInput],
  template: `
    <div class="flex flex-col gap-6">
      <div>
        <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
        <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
      </div>

      <div class="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        @for (k of kpis(); track k.label) {
          <lib-kpi-card [label]="k.label" [value]="k.value" />
        }
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="min-w-60 flex-1">
          <lib-text-input [placeholder]="t().searchPlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <span class="ml-auto font-core text-[13px] text-shade-50">{{ filteredRows().length }} {{ lang.pick(strings.results) }}</span>
      </div>

      <lib-data-panel [title]="t().panelTitle">
        <lib-data-table [columns]="columns()" [rows]="filteredRows()" [emptyLabel]="t().noResults" />
      </lib-data-panel>
    </div>
  `,
})
export class OfficeOrganization {
  protected readonly lang = inject(LangService);
  protected readonly store = inject(OrganizationStore);
  protected readonly strings = UI_STRINGS;

  protected readonly title = computed(() => screenTitle('organization', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('organization', 'admin', this.lang.lang()));

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      panelTitle: en ? 'Warehouses' : 'Danh sách kho',
      searchPlaceholder: en ? 'Search code, name, company' : 'Tìm mã, tên, công ty',
      warehouses: en ? 'Warehouses' : 'Kho',
      active: en ? 'Active' : 'Hoạt động',
      inactive: en ? 'Inactive' : 'Ngừng hoạt động',
      noResults: en ? 'No warehouses match' : 'Không có kho phù hợp',
      colWarehouse: en ? 'Warehouse' : 'Kho',
      colName: en ? 'Name' : 'Tên',
      colCompany: en ? 'Company' : 'Công ty',
      colZones: en ? 'Zones' : 'Khu',
      colDocks: en ? 'Docks' : 'Cửa kho',
      colStatus: en ? 'Status' : 'Trạng thái',
    };
  });

  protected readonly columns = computed<DataTableColumn[]>(() => {
    const t = this.t();
    return [
      { key: 'code', label: t.colWarehouse, mono: true },
      { key: 'name', label: t.colName },
      { key: 'companyName', label: t.colCompany },
      { key: 'zonesCount', label: t.colZones, align: 'right', mono: true },
      { key: 'docksCount', label: t.colDocks, align: 'right', mono: true },
      { key: 'status', label: t.colStatus, status: true, statusLabelKey: 'statusLabel' },
    ];
  });

  protected readonly kpis = computed(() => {
    const warehouses = this.store.warehouses();
    return [
      { label: this.t().warehouses, value: warehouses.length },
      { label: this.t().active, value: warehouses.filter((w) => w.isActive).length },
      { label: this.t().inactive, value: warehouses.filter((w) => !w.isActive).length },
    ];
  });

  protected readonly query = signal('');

  protected readonly rows = computed<WarehouseRow[]>(() => {
    const companies = this.store.companies();
    return this.store.warehouses().map((w) => this.toRow(w, companies.find((c) => c.code === w.companyCode)?.name ?? '—'));
  });

  protected readonly filteredRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter((row) => [row.code, row.name, row.companyName].join(' ').toLowerCase().includes(q));
  });

  private toRow(w: Warehouse, companyName: string): WarehouseRow {
    return {
      code: w.code,
      name: w.name,
      companyName,
      zonesCount: w.zones.length,
      docksCount: w.docks.length,
      status: w.isActive ? 'in-stock' : 'out-of-stock',
      statusLabel: w.isActive ? this.t().active : this.t().inactive,
    };
  }
}
```

**Note:** add `import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';` alongside the other imports (used for `strings.results`).

- [ ] **Step 4: Wire the route**

In `source/apps/ikho-ui/src/app/features/office/office.routes.ts`, replace:

```ts
  genericScreen('organization'),
```

with:

```ts
  {
    path: 'organization',
    loadComponent: () => import('./organization/office-organization').then((m) => m.OfficeOrganization),
  },
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --testPathPattern=office-organization`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/organization/office-organization.ts source/apps/ikho-ui/src/app/features/office/organization/office-organization.spec.ts source/apps/ikho-ui/src/app/features/office/office.routes.ts
git commit -m "feat(ikho-ui): add OfficeOrganization screen with KPIs, search, and table"
```

---

### Task 3: `WarehouseDetailPanel` — view, edit, activate/deactivate, zones/docks

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/organization/warehouse-detail-panel.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/organization/warehouse-detail-panel.spec.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/organization/office-organization.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/organization/office-organization.spec.ts`

**Interfaces:**
- Consumes: `Warehouse` (Task 1), `AddZoneInput`/`AddDockInput` (Task 1), `LangService` (existing).
- Produces: `WarehouseDetailPanel` (selector `app-warehouse-detail-panel`) with `warehouse = input.required<Warehouse>()`, `companyName = input.required<string>()`, outputs `closePanel`, `toggleStatus`, `saveDetails: output<{name: string}>`, `addZone: output<{code: string; name: string}>`, `toggleZoneStatus: output<{zoneCode: string; isActive: boolean}>`, `addDock: output<{code: string; name: string}>`, `toggleDockStatus: output<{dockCode: string; isActive: boolean}>`. `OfficeOrganization` gains `selectedCode`, `selectedWarehouse`, `selectedCompanyName` — Task 4 reuses `selectedWarehouse`.

- [ ] **Step 1: Write the failing detail-panel spec**

```ts
// source/apps/ikho-ui/src/app/features/office/organization/warehouse-detail-panel.spec.ts
import { TestBed } from '@angular/core/testing';
import { Warehouse } from '../../../core/mock-data/organization.data';
import { WarehouseDetailPanel } from './warehouse-detail-panel';

const TEST_WAREHOUSE: Warehouse = {
  code: 'WH-1',
  companyCode: 'RTM-LOG',
  name: 'Rotterdam DC',
  isActive: true,
  createdOnUtc: '2023-11-05T09:00:00Z',
  zones: [
    { code: 'Z-A', name: 'Bulk storage', isActive: true },
    { code: 'Z-B', name: 'Pick face', isActive: true },
  ],
  docks: [
    { code: 'D-1', name: 'Inbound door 1', isActive: true },
  ],
};

describe('WarehouseDetailPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WarehouseDetailPanel],
    }).compileComponents();
  });

  it('renders the warehouse name, code, company, and Active status', () => {
    const fixture = TestBed.createComponent(WarehouseDetailPanel);
    fixture.componentRef.setInput('warehouse', TEST_WAREHOUSE);
    fixture.componentRef.setInput('companyName', 'Rotterdam Logistics BV');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Rotterdam DC');
    expect(text).toContain('WH-1');
    expect(text).toContain('Rotterdam Logistics BV');
    expect(text).toContain('Active');
  });

  it('renders zones and docks with their names', () => {
    const fixture = TestBed.createComponent(WarehouseDetailPanel);
    fixture.componentRef.setInput('warehouse', TEST_WAREHOUSE);
    fixture.componentRef.setInput('companyName', 'Rotterdam Logistics BV');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Bulk storage');
    expect(text).toContain('Pick face');
    expect(text).toContain('Inbound door 1');
  });

  it('toggleStatus emits when the activate/deactivate button is clicked', () => {
    const fixture = TestBed.createComponent(WarehouseDetailPanel);
    fixture.componentRef.setInput('warehouse', TEST_WAREHOUSE);
    fixture.componentRef.setInput('companyName', 'Rotterdam Logistics BV');
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.toggleStatus.subscribe(() => (emitted = true));

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const deactivateButton = buttons.find((b) => b.textContent?.includes('Deactivate'));
    deactivateButton?.click();

    expect(emitted).toBe(true);
  });

  it('saveDetails emits the trimmed name on a valid edit, and rejects a blank name', () => {
    const fixture = TestBed.createComponent(WarehouseDetailPanel);
    fixture.componentRef.setInput('warehouse', TEST_WAREHOUSE);
    fixture.componentRef.setInput('companyName', 'Rotterdam Logistics BV');
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      startEdit: () => void;
      editName: { set: (v: string) => void };
      submitDetails: () => void;
    };
    let payload: { name: string } | undefined;
    fixture.componentInstance.saveDetails.subscribe((v) => (payload = v));

    instance.startEdit();
    instance.editName.set('');
    instance.submitDetails();
    expect(payload).toBeUndefined();

    instance.editName.set('  Rotterdam DC (Renovated)  ');
    instance.submitDetails();
    expect(payload).toEqual({ name: 'Rotterdam DC (Renovated)' });
  });

  it('rejects an add-zone submission missing code or name, and emits a well-formed zone on success', () => {
    const fixture = TestBed.createComponent(WarehouseDetailPanel);
    fixture.componentRef.setInput('warehouse', TEST_WAREHOUSE);
    fixture.componentRef.setInput('companyName', 'Rotterdam Logistics BV');
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showZoneForm: { set: (v: boolean) => void };
      zoneCode: { set: (v: string) => void };
      zoneName: { set: (v: string) => void };
      submitZone: () => void;
    };
    let payload: unknown;
    fixture.componentInstance.addZone.subscribe((v) => (payload = v));

    instance.showZoneForm.set(true);
    instance.zoneCode.set('Z-C');
    instance.submitZone();
    expect(payload).toBeUndefined();

    instance.zoneName.set('Returns processing');
    instance.submitZone();
    expect(payload).toEqual({ code: 'Z-C', name: 'Returns processing' });
  });

  it('toggleZoneStatus emits the zone code and inverted status when a zone row toggle is clicked', () => {
    const fixture = TestBed.createComponent(WarehouseDetailPanel);
    fixture.componentRef.setInput('warehouse', TEST_WAREHOUSE);
    fixture.componentRef.setInput('companyName', 'Rotterdam Logistics BV');
    fixture.detectChanges();

    let payload: { zoneCode: string; isActive: boolean } | undefined;
    fixture.componentInstance.toggleZoneStatus.subscribe((v) => (payload = v));

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const zoneToggle = buttons.find((b) => b.getAttribute('data-zone-toggle') === 'Z-A');
    zoneToggle?.click();

    expect(payload).toEqual({ zoneCode: 'Z-A', isActive: false });
  });

  it('rejects an add-dock submission missing code or name, and emits a well-formed dock on success', () => {
    const fixture = TestBed.createComponent(WarehouseDetailPanel);
    fixture.componentRef.setInput('warehouse', TEST_WAREHOUSE);
    fixture.componentRef.setInput('companyName', 'Rotterdam Logistics BV');
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showDockForm: { set: (v: boolean) => void };
      dockCode: { set: (v: string) => void };
      dockName: { set: (v: string) => void };
      submitDock: () => void;
    };
    let payload: unknown;
    fixture.componentInstance.addDock.subscribe((v) => (payload = v));

    instance.showDockForm.set(true);
    instance.dockCode.set('D-2');
    instance.submitDock();
    expect(payload).toBeUndefined();

    instance.dockName.set('Outbound door 2');
    instance.submitDock();
    expect(payload).toEqual({ code: 'D-2', name: 'Outbound door 2' });
  });

  it('closePanel emits when the close button is clicked', () => {
    const fixture = TestBed.createComponent(WarehouseDetailPanel);
    fixture.componentRef.setInput('warehouse', TEST_WAREHOUSE);
    fixture.componentRef.setInput('companyName', 'Rotterdam Logistics BV');
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.closePanel.subscribe(() => (emitted = true));

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-label="Close"]')?.click();

    expect(emitted).toBe(true);
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --testPathPattern=warehouse-detail-panel`
Expected: FAIL — `Cannot find module './warehouse-detail-panel'`

- [ ] **Step 3: Implement `WarehouseDetailPanel`**

```ts
// source/apps/ikho-ui/src/app/features/office/organization/warehouse-detail-panel.ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Button, Icon, StatusBadge, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { Warehouse } from '../../../core/mock-data/organization.data';

@Component({
  selector: 'app-warehouse-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, StatusBadge, TextInput],
  host: { class: 'block' },
  template: `
    <aside class="flex w-96 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ t().eyebrow }}</span>
          <span class="font-core text-lg font-bold tracking-[-0.2px] text-ink">{{ warehouse().name }}</span>
          <span class="font-mono text-[13px] text-primary">{{ warehouse().code }}</span>
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

      <lib-status-badge [status]="warehouse().isActive ? 'in-stock' : 'out-of-stock'" [label]="warehouse().isActive ? t().active : t().inactive" />

      <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
        @if (editing()) {
          <lib-text-input [label]="t().name" [value]="editName()" (valueChange)="editName.set($event)" />
          @if (editError(); as err) {
            <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
          }
          <div class="flex gap-2">
            <lib-button variant="primary" (click)="submitDetails()">{{ t().save }}</lib-button>
            <lib-button variant="ghost" (click)="editing.set(false)">{{ t().cancel }}</lib-button>
          </div>
        } @else {
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().company }}</span>
            <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ companyName() }}</span>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().created }}</span>
            <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ warehouse().createdOnUtc.slice(0, 10) }}</span>
          </div>
          <lib-button variant="secondary" (click)="startEdit()">{{ t().editDetails }}</lib-button>
        }
      </div>

      <lib-button variant="primary" [fullWidth]="true" (click)="toggleStatus.emit()">
        {{ warehouse().isActive ? t().deactivate : t().activate }}
      </lib-button>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().zones }}</span>
        @for (z of warehouse().zones; track z.code) {
          <div class="flex items-center justify-between gap-2 rounded-md border border-hairline-light p-2.5">
            <div class="flex flex-col gap-0.5">
              <span class="font-core text-[13px] text-text-body">{{ z.name }}</span>
              <span class="font-mono text-[11px] text-shade-50">{{ z.code }}</span>
            </div>
            <button
              type="button"
              [attr.data-zone-toggle]="z.code"
              class="cursor-pointer rounded-md border border-hairline-light bg-transparent px-2 py-1 font-core text-[11px] font-semibold text-shade-60 hover:bg-surface-elevated-light"
              (click)="toggleZoneStatus.emit({ zoneCode: z.code, isActive: !z.isActive })"
            >
              {{ z.isActive ? t().deactivate : t().activate }}
            </button>
          </div>
        } @empty {
          <span class="font-core text-[13px] text-shade-50">{{ t().noZones }}</span>
        }
        @if (showZoneForm()) {
          <div class="flex flex-col gap-2 rounded-md border border-hairline-light p-2.5">
            <lib-text-input [label]="t().code" [value]="zoneCode()" (valueChange)="zoneCode.set($event)" />
            <lib-text-input [label]="t().name" [value]="zoneName()" (valueChange)="zoneName.set($event)" />
            @if (zoneError(); as err) {
              <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
            }
            <div class="flex gap-2">
              <lib-button variant="primary" (click)="submitZone()">{{ t().saveZone }}</lib-button>
              <lib-button variant="ghost" (click)="showZoneForm.set(false)">{{ t().cancel }}</lib-button>
            </div>
          </div>
        } @else {
          <lib-button variant="secondary" (click)="showZoneForm.set(true)">{{ t().addZone }}</lib-button>
        }
      </div>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().docks }}</span>
        @for (d of warehouse().docks; track d.code) {
          <div class="flex items-center justify-between gap-2 rounded-md border border-hairline-light p-2.5">
            <div class="flex flex-col gap-0.5">
              <span class="font-core text-[13px] text-text-body">{{ d.name }}</span>
              <span class="font-mono text-[11px] text-shade-50">{{ d.code }}</span>
            </div>
            <button
              type="button"
              [attr.data-dock-toggle]="d.code"
              class="cursor-pointer rounded-md border border-hairline-light bg-transparent px-2 py-1 font-core text-[11px] font-semibold text-shade-60 hover:bg-surface-elevated-light"
              (click)="toggleDockStatus.emit({ dockCode: d.code, isActive: !d.isActive })"
            >
              {{ d.isActive ? t().deactivate : t().activate }}
            </button>
          </div>
        } @empty {
          <span class="font-core text-[13px] text-shade-50">{{ t().noDocks }}</span>
        }
        @if (showDockForm()) {
          <div class="flex flex-col gap-2 rounded-md border border-hairline-light p-2.5">
            <lib-text-input [label]="t().code" [value]="dockCode()" (valueChange)="dockCode.set($event)" />
            <lib-text-input [label]="t().name" [value]="dockName()" (valueChange)="dockName.set($event)" />
            @if (dockError(); as err) {
              <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
            }
            <div class="flex gap-2">
              <lib-button variant="primary" (click)="submitDock()">{{ t().saveDock }}</lib-button>
              <lib-button variant="ghost" (click)="showDockForm.set(false)">{{ t().cancel }}</lib-button>
            </div>
          </div>
        } @else {
          <lib-button variant="secondary" (click)="showDockForm.set(true)">{{ t().addDock }}</lib-button>
        }
      </div>
    </aside>
  `,
})
export class WarehouseDetailPanel {
  protected readonly lang = inject(LangService);
  protected readonly strings = UI_STRINGS;

  readonly warehouse = input.required<Warehouse>();
  readonly companyName = input.required<string>();

  readonly closePanel = output<void>();
  readonly toggleStatus = output<void>();
  readonly saveDetails = output<{ name: string }>();
  readonly addZone = output<{ code: string; name: string }>();
  readonly toggleZoneStatus = output<{ zoneCode: string; isActive: boolean }>();
  readonly addDock = output<{ code: string; name: string }>();
  readonly toggleDockStatus = output<{ dockCode: string; isActive: boolean }>();

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      eyebrow: en ? 'Warehouse detail' : 'Chi tiết kho',
      active: en ? 'Active' : 'Hoạt động',
      inactive: en ? 'Inactive' : 'Ngừng hoạt động',
      company: en ? 'Company' : 'Công ty',
      created: en ? 'Created' : 'Ngày tạo',
      editDetails: en ? 'Edit details' : 'Sửa thông tin',
      name: en ? 'Name' : 'Tên',
      code: en ? 'Code' : 'Mã',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      detailsRequired: en ? 'Name is required.' : 'Cần nhập tên.',
      deactivate: en ? 'Deactivate' : 'Vô hiệu hoá',
      activate: en ? 'Activate' : 'Kích hoạt',
      zones: en ? 'Zones' : 'Khu',
      noZones: en ? 'No zones yet.' : 'Chưa có khu.',
      saveZone: en ? 'Save zone' : 'Lưu khu',
      addZone: en ? 'Add zone' : 'Thêm khu',
      zoneRequired: en ? 'Code and Name are required.' : 'Cần nhập mã và tên.',
      docks: en ? 'Docks' : 'Cửa kho',
      noDocks: en ? 'No docks yet.' : 'Chưa có cửa kho.',
      saveDock: en ? 'Save dock' : 'Lưu cửa kho',
      addDock: en ? 'Add dock' : 'Thêm cửa kho',
      dockRequired: en ? 'Code and Name are required.' : 'Cần nhập mã và tên.',
    };
  });

  protected readonly editing = signal(false);
  protected readonly editName = signal('');
  protected readonly editError = signal<string | null>(null);

  protected readonly showZoneForm = signal(false);
  protected readonly zoneCode = signal('');
  protected readonly zoneName = signal('');
  protected readonly zoneError = signal<string | null>(null);

  protected readonly showDockForm = signal(false);
  protected readonly dockCode = signal('');
  protected readonly dockName = signal('');
  protected readonly dockError = signal<string | null>(null);

  constructor() {
    // Resets state whenever the selected warehouse changes AND after any successful save
    // for this warehouse — the store's immutable updates give warehouse() a new object
    // identity on every mutation, so a save "closes" its own form as a side effect.
    effect(() => {
      this.warehouse();
      this.editing.set(false);
      this.editError.set(null);
      this.editName.set('');
      this.showZoneForm.set(false);
      this.zoneError.set(null);
      this.zoneCode.set('');
      this.zoneName.set('');
      this.showDockForm.set(false);
      this.dockError.set(null);
      this.dockCode.set('');
      this.dockName.set('');
    });
  }

  protected startEdit(): void {
    this.editName.set(this.warehouse().name);
    this.editError.set(null);
    this.editing.set(true);
  }

  protected submitDetails(): void {
    const name = this.editName().trim();
    if (!name) {
      this.editError.set(this.t().detailsRequired);
      return;
    }
    this.saveDetails.emit({ name });
  }

  protected submitZone(): void {
    const code = this.zoneCode().trim();
    const name = this.zoneName().trim();
    if (!code || !name) {
      this.zoneError.set(this.t().zoneRequired);
      return;
    }
    this.addZone.emit({ code, name });
  }

  protected submitDock(): void {
    const code = this.dockCode().trim();
    const name = this.dockName().trim();
    if (!code || !name) {
      this.dockError.set(this.t().dockRequired);
      return;
    }
    this.addDock.emit({ code, name });
  }
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --testPathPattern=warehouse-detail-panel`
Expected: PASS (9 tests)

- [ ] **Step 5: Wire row selection and the detail panel into `OfficeOrganization`**

In `office-organization.ts`:
- Add `import { WarehouseDetailPanel } from './warehouse-detail-panel';`.
- Add `WarehouseDetailPanel` to the `@Component` `imports` array.
- Replace the closing `<lib-data-panel>...</lib-data-panel>` block with:

```ts
      <div class="flex items-start gap-5">
        <div class="min-w-0 flex-1">
          <lib-data-panel [title]="t().panelTitle">
            <lib-data-table [columns]="columns()" [rows]="filteredRows()" [emptyLabel]="t().noResults" [clickable]="true" (rowClick)="onRowClick($event)" />
          </lib-data-panel>
        </div>
        @if (selectedWarehouse(); as sw) {
          <app-warehouse-detail-panel
            [warehouse]="sw"
            [companyName]="selectedCompanyName()"
            (closePanel)="selectedCode.set(null)"
            (toggleStatus)="onToggleStatus()"
            (saveDetails)="onSaveDetails($event)"
            (addZone)="onAddZone($event)"
            (toggleZoneStatus)="onToggleZoneStatus($event)"
            (addDock)="onAddDock($event)"
            (toggleDockStatus)="onToggleDockStatus($event)"
          />
        }
      </div>
```

- Add these members to the `OfficeOrganization` class (after `query`):

```ts
  protected readonly selectedCode = signal<string | null>(null);

  protected readonly selectedWarehouse = computed<Warehouse | null>(() => {
    const code = this.selectedCode();
    if (!code) return null;
    return this.store.warehouses().find((w) => w.code === code) ?? null;
  });

  protected readonly selectedCompanyName = computed<string>(() => {
    const w = this.selectedWarehouse();
    if (!w) return '';
    return this.store.companies().find((c) => c.code === w.companyCode)?.name ?? '—';
  });
```

- Add these methods to the class (after `toRow`):

```ts
  protected onRowClick(row: Record<string, unknown>): void {
    this.selectedCode.set(String(row['code']));
  }

  protected onToggleStatus(): void {
    const w = this.selectedWarehouse();
    if (!w) return;
    this.store.setWarehouseStatus(w.code, !w.isActive);
  }

  protected onSaveDetails(input: { name: string }): void {
    const w = this.selectedWarehouse();
    if (!w) return;
    this.store.updateWarehouse(w.code, input);
  }

  protected onAddZone(zone: { code: string; name: string }): void {
    const w = this.selectedWarehouse();
    if (!w) return;
    this.store.addZone(w.code, zone);
  }

  protected onToggleZoneStatus(event: { zoneCode: string; isActive: boolean }): void {
    const w = this.selectedWarehouse();
    if (!w) return;
    this.store.setZoneStatus(w.code, event.zoneCode, event.isActive);
  }

  protected onAddDock(dock: { code: string; name: string }): void {
    const w = this.selectedWarehouse();
    if (!w) return;
    this.store.addDock(w.code, dock);
  }

  protected onToggleDockStatus(event: { dockCode: string; isActive: boolean }): void {
    const w = this.selectedWarehouse();
    if (!w) return;
    this.store.setDockStatus(w.code, event.dockCode, event.isActive);
  }
```

- [ ] **Step 6: Add failing tests for the wiring, then confirm they pass**

Append to `office-organization.spec.ts`:

```ts
  it("row click opens the detail panel with the warehouse's zones and docks", () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const table = (fixture.nativeElement as HTMLElement).querySelector('lib-data-table')!;
    const firstRow = table.querySelector('tbody tr') as HTMLElement;
    firstRow.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Warehouse detail');
  });

  it("activate/deactivate flips the selected warehouse's status", () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      selectedCode: { set: (v: string) => void };
      store: { warehouses: () => { code: string; isActive: boolean }[] };
    };
    instance.selectedCode.set('WH-1');
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const deactivateButton = buttons.find((b) => b.textContent?.includes('Deactivate'));
    deactivateButton?.click();
    fixture.detectChanges();

    expect(instance.store.warehouses().find((w) => w.code === 'WH-1')!.isActive).toBe(false);
  });

  it('adding a zone appends it to the warehouse and clears the form for the next add', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const table = (fixture.nativeElement as HTMLElement).querySelector('lib-data-table')!;
    (table.querySelector('tbody tr') as HTMLElement).click();
    fixture.detectChanges();

    let addZoneButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add zone'),
    );
    addZoneButton?.click();
    fixture.detectChanges();

    const inputs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input'));
    const codeInput = inputs.find((i) => i.closest('div')?.textContent?.includes('Code')) as HTMLInputElement;
    const nameInput = inputs.find((i) => i.closest('div')?.textContent?.includes('Name')) as HTMLInputElement;
    codeInput.value = 'Z-C';
    codeInput.dispatchEvent(new Event('input'));
    nameInput.value = 'Returns processing';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveZoneButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Save zone'),
    );
    saveZoneButton?.click();
    fixture.detectChanges();

    let text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Returns processing');

    addZoneButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add zone'),
    );
    addZoneButton?.click();
    fixture.detectChanges();

    const reopenedInputs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input'));
    const reopenedCode = reopenedInputs.find((i) => i.closest('div')?.textContent?.includes('Code')) as HTMLInputElement;
    expect(reopenedCode.value).toBe('');
  });
```

Run: `pnpm nx test ikho-ui --testPathPattern=office-organization`
Expected: PASS (7 tests)

- [ ] **Step 7: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/organization/warehouse-detail-panel.ts source/apps/ikho-ui/src/app/features/office/organization/warehouse-detail-panel.spec.ts source/apps/ikho-ui/src/app/features/office/organization/office-organization.ts source/apps/ikho-ui/src/app/features/office/organization/office-organization.spec.ts
git commit -m "feat(ikho-ui): add WarehouseDetailPanel with edit, status toggle, and zone/dock management"
```

---

### Task 4: Add-warehouse inline create panel (with company picker)

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/office/organization/office-organization.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/organization/office-organization.spec.ts`

**Interfaces:**
- Consumes: `OrganizationStore.addCompany`/`addWarehouse` (Task 1), `SCREENS.organization.action` (existing `screens.data.ts`).

- [ ] **Step 1: Add the failing create-form tests**

Append to `office-organization.spec.ts`:

```ts
  it('creates a warehouse under an existing company', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showCreateForm: { set: (v: boolean) => void };
      formCode: { set: (v: string) => void };
      formName: { set: (v: string) => void };
      formCompanyCode: { set: (v: string) => void };
      formError: () => string | null;
      submitCreate: () => void;
    };

    instance.showCreateForm.set(true);
    instance.formCode.set('WH-1'); // duplicate within RTM-LOG
    instance.formName.set('New WH');
    instance.formCompanyCode.set('RTM-LOG');
    instance.submitCreate();
    fixture.detectChanges();

    expect(instance.formError()).toContain('WH-1');

    instance.formCode.set('WH-9');
    instance.submitCreate();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('New WH');
  });

  it('creates a warehouse under a newly created inline company', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showCreateForm: { set: (v: boolean) => void };
      formCode: { set: (v: string) => void };
      formName: { set: (v: string) => void };
      showNewCompanyForm: { set: (v: boolean) => void };
      newCompanyCode: { set: (v: string) => void };
      newCompanyName: { set: (v: string) => void };
      formError: () => string | null;
      submitCreate: () => void;
    };

    instance.showCreateForm.set(true);
    instance.formCode.set('WH-9');
    instance.formName.set('Ghent Satellite');
    instance.showNewCompanyForm.set(true);
    instance.newCompanyCode.set('GHT-LOG');
    instance.newCompanyName.set('Ghent Logistics NV');
    instance.submitCreate();
    fixture.detectChanges();

    expect(instance.formError()).toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ghent Satellite');
    expect(text).toContain('Ghent Logistics NV');
  });
```

Run: `pnpm nx test ikho-ui --testPathPattern=office-organization`
Expected: FAIL — `showCreateForm`/`formCode`/etc. are not defined on `OfficeOrganization`

- [ ] **Step 2: Add the create panel to `OfficeOrganization`**

In `office-organization.ts`:
- Add `Button` to the `import { ... } from '@ikho/shared-ui';` line.
- Add `import { screenMeta, screenTitle, SCREENS } from '../../../core/mock-data/screens.data';` (replacing the existing `screenMeta, screenTitle` import line).
- Replace the template's header block:

```ts
      <div>
        <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
        <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
      </div>
```

with:

```ts
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
          <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
        </div>
        <lib-button variant="primary" (click)="showCreateForm.set(true)">{{ addWarehouseLabel() }}</lib-button>
      </div>

      @if (showCreateForm()) {
        <lib-data-panel [title]="t().createTitle" [subtitle]="t().createSubtitle">
          <div class="flex flex-col gap-4">
            <div class="grid grid-cols-2 gap-4">
              <lib-text-input [label]="t().code" [value]="formCode()" (valueChange)="formCode.set($event)" />
              <lib-text-input [label]="t().name" [value]="formName()" (valueChange)="formName.set($event)" />
            </div>

            @if (showNewCompanyForm()) {
              <div class="flex flex-col gap-3 rounded-md border border-hairline-light p-3">
                <div class="grid grid-cols-2 gap-4">
                  <lib-text-input [label]="t().companyCode" [value]="newCompanyCode()" (valueChange)="newCompanyCode.set($event)" />
                  <lib-text-input [label]="t().companyName" [value]="newCompanyName()" (valueChange)="newCompanyName.set($event)" />
                </div>
                <lib-button variant="ghost" (click)="showNewCompanyForm.set(false)">{{ t().useExistingCompany }}</lib-button>
              </div>
            } @else {
              <div class="flex flex-col gap-2">
                <span class="font-core text-[13px] text-shade-50">{{ t().company }}</span>
                <select
                  class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
                  [value]="formCompanyCode()"
                  (change)="formCompanyCode.set($any($event.target).value)"
                >
                  <option value="" disabled>{{ t().selectCompany }}</option>
                  @for (c of store.companies(); track c.code) {
                    <option [value]="c.code">{{ c.name }}</option>
                  }
                </select>
                <lib-button variant="ghost" (click)="showNewCompanyForm.set(true)">{{ t().newCompany }}</lib-button>
              </div>
            }

            @if (formError(); as err) {
              <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
            }
            <div class="flex gap-3">
              <lib-button variant="primary" (click)="submitCreate()">{{ t().save }}</lib-button>
              <lib-button variant="ghost" (click)="cancelCreate()">{{ t().cancel }}</lib-button>
            </div>
          </div>
        </lib-data-panel>
      }
```

- Add `Button` to the `@Component` `imports` array.
- Add `addWarehouseLabel` next to `meta`:

```ts
  protected readonly addWarehouseLabel = computed(() => SCREENS.organization.action[this.lang.lang()]);
```

- Extend the `t()` computed's returned object with these additional keys:

```ts
      createTitle: en ? 'Add warehouse' : 'Thêm kho',
      createSubtitle: en ? 'Code, name, and company' : 'Mã, tên và công ty',
      code: en ? 'Code' : 'Mã',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      company: en ? 'Company' : 'Công ty',
      companyCode: en ? 'Company code' : 'Mã công ty',
      companyName: en ? 'Company name' : 'Tên công ty',
      selectCompany: en ? 'Select a company' : 'Chọn công ty',
      newCompany: en ? '+ New company' : '+ Công ty mới',
      useExistingCompany: en ? 'Use an existing company instead' : 'Dùng công ty đã có',
      requiredError: en ? 'Code, Name, and Company are required.' : 'Cần nhập mã, tên và công ty.',
      duplicateError: (code: string) => (en ? `Warehouse code '${code}' is already in use for this company.` : `Mã kho '${code}' đã được sử dụng cho công ty này.`),
      companyRequiredError: en ? 'Company code and name are required.' : 'Cần nhập mã và tên công ty.',
      companyDuplicateError: (code: string) => (en ? `Company code '${code}' is already in use.` : `Mã công ty '${code}' đã được sử dụng.`),
```

- Add these members and methods to the class (after `selectedCompanyName`):

```ts
  protected readonly showCreateForm = signal(false);
  protected readonly formCode = signal('');
  protected readonly formName = signal('');
  protected readonly formCompanyCode = signal('');
  protected readonly showNewCompanyForm = signal(false);
  protected readonly newCompanyCode = signal('');
  protected readonly newCompanyName = signal('');
  protected readonly formError = signal<string | null>(null);
```

```ts
  protected submitCreate(): void {
    let companyCode = this.formCompanyCode();

    if (this.showNewCompanyForm()) {
      const code = this.newCompanyCode().trim();
      const name = this.newCompanyName().trim();
      if (!code || !name) {
        this.formError.set(this.t().companyRequiredError);
        return;
      }
      const companyOutcome = this.store.addCompany({ code, name });
      if (companyOutcome === 'duplicate-code') {
        this.formError.set(this.t().companyDuplicateError(code));
        return;
      }
      companyCode = code;
    }

    const outcome = this.store.addWarehouse({
      code: this.formCode(),
      companyCode,
      name: this.formName(),
    });

    if (outcome === 'invalid' || outcome === 'company-not-found') {
      this.formError.set(this.t().requiredError);
      return;
    }
    if (outcome === 'duplicate-code') {
      this.formError.set(this.t().duplicateError(this.formCode().trim()));
      return;
    }

    this.formError.set(null);
    this.formCode.set('');
    this.formName.set('');
    this.formCompanyCode.set('');
    this.showNewCompanyForm.set(false);
    this.newCompanyCode.set('');
    this.newCompanyName.set('');
    this.showCreateForm.set(false);
  }

  protected cancelCreate(): void {
    this.formError.set(null);
    this.showCreateForm.set(false);
  }
```

- [ ] **Step 3: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --testPathPattern=office-organization`
Expected: PASS (9 tests)

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/organization/office-organization.ts source/apps/ikho-ui/src/app/features/office/organization/office-organization.spec.ts
git commit -m "feat(ikho-ui): add inline add-warehouse create panel with company picker to OfficeOrganization"
```

---

### Task 5: Final verification

**Files:** None (verification only), plus:
- Modify: `docs/plans/organization-partners-billing-rollout-plan.md`

- [ ] **Step 1: Run the full `ikho-ui` test suite**

Run: `pnpm nx test ikho-ui`
Expected: PASS, 0 failures (includes all Task 1-4 specs plus every pre-existing spec).

- [ ] **Step 2: Run lint**

Run: `pnpm nx lint ikho-ui`
Expected: 0 errors (warnings for pre-existing `@typescript-eslint/no-non-null-assertion` in other files are fine; this task introduces none itself since none of the new code uses `!`). Specifically check there is no `@angular-eslint/no-output-native` error — every `output()` name in `WarehouseDetailPanel` (`closePanel`, `toggleStatus`, `saveDetails`, `addZone`, `toggleZoneStatus`, `addDock`, `toggleDockStatus`) must be free of native DOM event names.

- [ ] **Step 3: Run the production build**

Run: `pnpm nx build ikho-ui`
Expected: build succeeds with no TypeScript or template errors.

- [ ] **Step 4: Manual smoke test**

Start the dev server: `pnpm nx serve ikho-ui`. Navigate to `/office/organization` as an admin user and verify:
1. The KPI row shows Warehouses 3 / Active 2 / Inactive 1.
2. The search box filters by typing a warehouse name (e.g. "Antwerp") and a company name (e.g. "Rotterdam Logistics").
3. Clicking "Add warehouse" opens the inline form; submitting with a duplicate code for the same company (e.g. `WH-1` under Rotterdam Logistics BV) shows the duplicate-code error; picking "+ New company", filling a new company code/name, and submitting creates both the company and the warehouse, and the form closes.
4. Clicking a table row opens the detail panel showing its company, zones, and docks.
5. "Deactivate"/"Activate" on the warehouse flips the Status badge and the Active/Inactive KPIs.
6. "Edit details" allows changing the warehouse Name and saves.
7. "Add zone" and "Add dock" append new entries; reopening either form afterward shows empty fields (not the just-saved values).
8. Each zone/dock row's own Activate/Deactivate button flips only that row's status, independent of the warehouse's own status.
9. Switching the app's language toggle (en/vi) re-renders every label above in Vietnamese.

If any step fails, fix the underlying issue (do not proceed to Step 5 with a known defect).

- [ ] **Step 5: Update the Organization/Partners/Billing rollout tracking doc**

In `docs/plans/organization-partners-billing-rollout-plan.md`, update the status table row for Organization:

```markdown
| 2 | Organization | [2026-08-13-organization-ui-design.md](../superpowers/specs/2026-08-13-organization-ui-design.md) | [2026-08-13-organization-ui.md](../superpowers/plans/2026-08-13-organization-ui.md) | Implemented |
```

(replacing the existing `| 2 | Organization | — | — | Not started |` row).

- [ ] **Step 6: Commit**

```bash
git add docs/plans/organization-partners-billing-rollout-plan.md
git commit -m "docs: Mark Organization UI implemented in the rollout tracking doc"
```

- [ ] **Step 7: Hand off to `superpowers:finishing-a-development-branch`**

Once Steps 1-6 are green, use the `finishing-a-development-branch` skill to verify tests, present merge/PR/keep options, and clean up the workspace.
