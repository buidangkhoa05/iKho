# Partners UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/office/partners` placeholder with a real, editable partner directory (Suppliers + Customers) backed by a mutable mock store — create partners, edit name/tax id, activate/deactivate, add addresses and contacts.

**Architecture:** A `PartnersStore` (Angular signals, `providedIn: 'root'`) owns a unified `Partner[]` list seeded from `partners.data.ts`, with guarded mutations mirroring the real backend's outcomes. `OfficePartners` composes `DataPanel`/`DataTable`/`KpiCard`/`Button`/`TextInput` directly (not wrapped in the shared `OfficeScreen`, which doesn't fit this screen's type-filter and multi-action detail panel needs) and delegates the detail view to a dedicated `PartnerDetailPanel` component.

**Tech Stack:** Angular 19 (standalone, signals, `OnPush`), Tailwind v4 utility classes, `@ikho/shared-ui` (`DataPanel`, `DataTable`, `KpiCard`, `Button`, `TextInput`, `StatusBadge`, `Icon`).

## Global Constraints

- Standalone components only, `OnPush` change detection, `inject()` for DI — no `NgModule`.
- Styling is Tailwind utility classes against `apps/ikho-ui/src/styles/tokens.css` design tokens only — no hand-written `styles:` blocks.
- All UI copy is bilingual (English/Vietnamese) via inline `this.lang.lang() === 'en' ? '...' : '...'` ternaries (grouped into a single `t()` computed object per component) or the shared `Localized<string>` type — matching every prior module (Inbound/Outbound/Returns/Reporting). No English-only strings.
- No `HttpClient`, no async — `PartnersStore` is a plain in-memory signal store, matching Inbound/Outbound/Returns/Reporting.
- No modal/dialog component exists in `@ikho/shared-ui` — all creation/editing is inline expand-panels.
- No delete of partners, addresses, or contacts — the backend exposes no delete endpoint for any of the three.
- No primary-address/contact reordering — `isPrimary` is set at creation time only.
- No pagination.
- `OfficePartners` does not wrap `<app-office-screen>` — it composes `lib-data-panel`/`lib-data-table`/`lib-kpi-card` directly, the same precedent `OfficeReporting` set.

---

### Task 1: Partner data model & `PartnersStore`

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/partners.data.ts`
- Create: `source/apps/ikho-ui/src/app/core/state/partners-store.ts`
- Test: `source/apps/ikho-ui/src/app/core/state/partners-store.spec.ts`

**Interfaces:**
- Produces: `PartnerType = 'supplier' | 'customer'`; `PartnerAddress { id, line1, line2, city, state, postalCode, country, isPrimary }`; `PartnerContact { id, name, email, phone, isPrimary }`; `Partner { code, type, name, taxId, isActive, createdOnUtc, addresses: PartnerAddress[], contacts: PartnerContact[] }`; `PARTNERS: Partner[]` (7 seed rows). `PartnersStore` with `partners: Signal<Partner[]>`, `addPartner(input: AddPartnerInput): AddPartnerOutcome`, `updatePartner(code: string, input: UpdatePartnerInput): UpdatePartnerOutcome`, `setStatus(code: string, isActive: boolean): void`, `addAddress(code: string, address: NewPartnerAddress): void`, `addContact(code: string, contact: NewPartnerContact): void`. Types `AddPartnerOutcome = 'ok' | 'duplicate-code' | 'invalid'`, `UpdatePartnerOutcome = 'ok' | 'not-found' | 'invalid'`, `AddPartnerInput { code, type, name, taxId }`, `UpdatePartnerInput { name, taxId }`, `NewPartnerAddress = Omit<PartnerAddress, 'id'>`, `NewPartnerContact = Omit<PartnerContact, 'id'>`.

- [ ] **Step 1: Create the seed data file**

```ts
// source/apps/ikho-ui/src/app/core/mock-data/partners.data.ts
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
  code: string;
  type: PartnerType;
  name: string;
  taxId: string;
  isActive: boolean;
  createdOnUtc: string;
  addresses: PartnerAddress[];
  contacts: PartnerContact[];
}

export const PARTNERS: Partner[] = [
  {
    code: 'SUP-0142',
    type: 'supplier',
    name: 'Vanderberg Steel',
    taxId: 'NL-810234567B01',
    isActive: true,
    createdOnUtc: '2024-03-11T09:00:00Z',
    addresses: [
      { id: 'ADR-1001', line1: 'Kanaalweg 14', line2: '', city: 'Eindhoven', state: 'Noord-Brabant', postalCode: '5613 BA', country: 'Netherlands', isPrimary: true },
    ],
    contacts: [
      { id: 'CNT-1001', name: 'J. Vanderberg', email: 'j.vanderberg@vbsteel.nl', phone: '+31 40 224 8810', isPrimary: true },
    ],
  },
  {
    code: 'SUP-0188',
    type: 'supplier',
    name: 'Nordic Labels A/S',
    taxId: 'DK-29458812',
    isActive: true,
    createdOnUtc: '2024-05-02T09:00:00Z',
    addresses: [
      { id: 'ADR-1002', line1: 'Sonderborggade 9', line2: '', city: 'Aarhus', state: '', postalCode: '8000', country: 'Denmark', isPrimary: true },
    ],
    contacts: [
      { id: 'CNT-1002', name: 'L. Sørensen', email: 'ls@nordiclabels.dk', phone: '+45 86 12 44 00', isPrimary: true },
    ],
  },
  {
    code: 'SUP-0195',
    type: 'supplier',
    name: 'EuroPallet NV',
    taxId: 'BE-0456789123',
    isActive: false,
    createdOnUtc: '2024-06-18T09:00:00Z',
    addresses: [
      { id: 'ADR-1003', line1: 'Havenlaan 22', line2: '', city: 'Antwerp', state: '', postalCode: '2030', country: 'Belgium', isPrimary: true },
    ],
    contacts: [
      { id: 'CNT-1003', name: 'K. Peeters', email: 'k.peeters@europallet.be', phone: '+32 3 225 4090', isPrimary: true },
    ],
  },
  {
    code: 'SUP-0201',
    type: 'supplier',
    name: 'Wrapline BV',
    taxId: 'NL-822345678B02',
    isActive: true,
    createdOnUtc: '2024-07-09T09:00:00Z',
    addresses: [
      { id: 'ADR-1004', line1: 'Industrieweg 5', line2: '', city: 'Tilburg', state: 'Noord-Brabant', postalCode: '5061 KA', country: 'Netherlands', isPrimary: true },
    ],
    contacts: [
      { id: 'CNT-1004', name: 'R. de Groot', email: 'r.degroot@wrapline.nl', phone: '+31 13 549 2200', isPrimary: true },
    ],
  },
  {
    code: 'CUS-2210',
    type: 'customer',
    name: 'Meijer Retail Group',
    taxId: 'NL-807654321B03',
    isActive: true,
    createdOnUtc: '2024-02-14T09:00:00Z',
    addresses: [
      { id: 'ADR-1005', line1: 'Prinsengracht 88', line2: '', city: 'Amsterdam', state: 'Noord-Holland', postalCode: '1015 DZ', country: 'Netherlands', isPrimary: true },
    ],
    contacts: [
      { id: 'CNT-1005', name: 'S. Meijer', email: 's.meijer@meijerretail.nl', phone: '+31 20 555 1201', isPrimary: true },
    ],
  },
  {
    code: 'CUS-2274',
    type: 'customer',
    name: 'Brico Bouwmarkt',
    taxId: 'BE-0678912345',
    isActive: true,
    createdOnUtc: '2024-04-22T09:00:00Z',
    addresses: [
      { id: 'ADR-1006', line1: 'Kortrijksesteenweg 210', line2: '', city: 'Ghent', state: '', postalCode: '9000', country: 'Belgium', isPrimary: true },
    ],
    contacts: [
      { id: 'CNT-1006', name: 'P. Claes', email: 'p.claes@bricobouwmarkt.be', phone: '+32 9 220 1180', isPrimary: true },
    ],
  },
  {
    code: 'CUS-2318',
    type: 'customer',
    name: 'Hafen Bremen GmbH',
    taxId: 'DE-114532678',
    isActive: false,
    createdOnUtc: '2024-08-01T09:00:00Z',
    addresses: [
      { id: 'ADR-1007', line1: 'Am Hafen 3', line2: '', city: 'Bremen', state: '', postalCode: '28197', country: 'Germany', isPrimary: true },
    ],
    contacts: [
      { id: 'CNT-1007', name: 'M. Fischer', email: 'm.fischer@hafenbremen.de', phone: '+49 421 330 5500', isPrimary: true },
    ],
  },
];
```

This file has no logic — no dedicated spec, matching `ReportingStore`'s data files ("no logic, just seeded signals").

- [ ] **Step 2: Write the failing store spec**

```ts
// source/apps/ikho-ui/src/app/core/state/partners-store.spec.ts
import { PartnersStore } from './partners-store';

describe('PartnersStore', () => {
  let store: PartnersStore;

  beforeEach(() => {
    store = new PartnersStore();
  });

  it('seeds partners from mock data with both suppliers and customers', () => {
    expect(store.partners().length).toBeGreaterThan(0);
    expect(store.partners().some((p) => p.type === 'supplier')).toBe(true);
    expect(store.partners().some((p) => p.type === 'customer')).toBe(true);
  });

  it('addPartner prepends a new active partner with empty addresses and contacts', () => {
    const before = store.partners().length;

    const outcome = store.addPartner({ code: 'SUP-9001', type: 'supplier', name: 'Test Supplier BV', taxId: 'NL-999999999B01' });

    expect(outcome).toBe('ok');
    expect(store.partners().length).toBe(before + 1);
    const created = store.partners()[0];
    expect(created.code).toBe('SUP-9001');
    expect(created.isActive).toBe(true);
    expect(created.addresses).toEqual([]);
    expect(created.contacts).toEqual([]);
  });

  it('addPartner rejects a blank code, name, or tax id', () => {
    const before = store.partners().length;

    const outcome = store.addPartner({ code: '', type: 'supplier', name: 'Test', taxId: 'NL-1' });

    expect(outcome).toBe('invalid');
    expect(store.partners().length).toBe(before);
  });

  it('addPartner rejects a duplicate code', () => {
    const before = store.partners().length;

    const outcome = store.addPartner({ code: 'SUP-0142', type: 'supplier', name: 'Another Vanderberg', taxId: 'NL-1' });

    expect(outcome).toBe('duplicate-code');
    expect(store.partners().length).toBe(before);
  });

  it('updatePartner updates name and tax id for an existing partner', () => {
    const outcome = store.updatePartner('SUP-0142', { name: 'Vanderberg Steel BV', taxId: 'NL-810234567B99' });

    expect(outcome).toBe('ok');
    const updated = store.partners().find((p) => p.code === 'SUP-0142')!;
    expect(updated.name).toBe('Vanderberg Steel BV');
    expect(updated.taxId).toBe('NL-810234567B99');
  });

  it('updatePartner fails for an unknown code', () => {
    const outcome = store.updatePartner('SUP-9999', { name: 'X', taxId: 'Y' });

    expect(outcome).toBe('not-found');
  });

  it('updatePartner rejects a blank name or tax id', () => {
    const outcome = store.updatePartner('SUP-0142', { name: '', taxId: 'NL-1' });

    expect(outcome).toBe('invalid');
    const unchanged = store.partners().find((p) => p.code === 'SUP-0142')!;
    expect(unchanged.name).toBe('Vanderberg Steel');
  });

  it('setStatus flips isActive for the matching partner only', () => {
    store.setStatus('SUP-0142', false);

    expect(store.partners().find((p) => p.code === 'SUP-0142')!.isActive).toBe(false);
    expect(store.partners().find((p) => p.code === 'SUP-0188')!.isActive).toBe(true);
  });

  it('addAddress appends a new address with a generated id to the matching partner only', () => {
    const before = store.partners().find((p) => p.code === 'SUP-0142')!.addresses.length;

    store.addAddress('SUP-0142', {
      line1: 'Nieuwe Kade 8', line2: '', city: 'Rotterdam', state: '', postalCode: '3011 AK', country: 'Netherlands', isPrimary: false,
    });

    const updated = store.partners().find((p) => p.code === 'SUP-0142')!;
    expect(updated.addresses.length).toBe(before + 1);
    expect(updated.addresses[updated.addresses.length - 1].city).toBe('Rotterdam');
    expect(updated.addresses[updated.addresses.length - 1].id).toBeTruthy();
    expect(store.partners().find((p) => p.code === 'SUP-0188')!.addresses.length).toBe(1);
  });

  it('addContact appends a new contact with a generated id to the matching partner only', () => {
    const before = store.partners().find((p) => p.code === 'SUP-0142')!.contacts.length;

    store.addContact('SUP-0142', { name: 'A. Jansen', email: 'a.jansen@vbsteel.nl', phone: '+31 40 224 8811', isPrimary: false });

    const updated = store.partners().find((p) => p.code === 'SUP-0142')!;
    expect(updated.contacts.length).toBe(before + 1);
    expect(updated.contacts[updated.contacts.length - 1].name).toBe('A. Jansen');
    expect(updated.contacts[updated.contacts.length - 1].id).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --testPathPattern=partners-store`
Expected: FAIL — `Cannot find module './partners-store'`

- [ ] **Step 4: Implement `PartnersStore`**

```ts
// source/apps/ikho-ui/src/app/core/state/partners-store.ts
import { Injectable, signal } from '@angular/core';
import { Partner, PartnerAddress, PartnerContact, PartnerType, PARTNERS } from '../mock-data/partners.data';

export type AddPartnerOutcome = 'ok' | 'duplicate-code' | 'invalid';
export type UpdatePartnerOutcome = 'ok' | 'not-found' | 'invalid';

export interface AddPartnerInput {
  code: string;
  type: PartnerType;
  name: string;
  taxId: string;
}

export interface UpdatePartnerInput {
  name: string;
  taxId: string;
}

export type NewPartnerAddress = Omit<PartnerAddress, 'id'>;
export type NewPartnerContact = Omit<PartnerContact, 'id'>;

let addressSeq = 2001;
let contactSeq = 2001;

@Injectable({ providedIn: 'root' })
export class PartnersStore {
  readonly partners = signal<Partner[]>([...PARTNERS]);

  addPartner(input: AddPartnerInput): AddPartnerOutcome {
    const code = input.code.trim();
    const name = input.name.trim();
    const taxId = input.taxId.trim();
    if (!code || !name || !taxId) return 'invalid';
    if (this.partners().some((p) => p.code === code)) return 'duplicate-code';

    const partner: Partner = {
      code,
      type: input.type,
      name,
      taxId,
      isActive: true,
      createdOnUtc: new Date().toISOString(),
      addresses: [],
      contacts: [],
    };
    this.partners.update((list) => [partner, ...list]);
    return 'ok';
  }

  updatePartner(code: string, input: UpdatePartnerInput): UpdatePartnerOutcome {
    const name = input.name.trim();
    const taxId = input.taxId.trim();
    if (!name || !taxId) return 'invalid';
    if (!this.partners().some((p) => p.code === code)) return 'not-found';

    this.partners.update((list) => list.map((p) => (p.code === code ? { ...p, name, taxId } : p)));
    return 'ok';
  }

  setStatus(code: string, isActive: boolean): void {
    this.partners.update((list) => list.map((p) => (p.code === code ? { ...p, isActive } : p)));
  }

  addAddress(code: string, address: NewPartnerAddress): void {
    const newAddress: PartnerAddress = { ...address, id: `ADR-${addressSeq++}` };
    this.partners.update((list) =>
      list.map((p) => (p.code === code ? { ...p, addresses: [...p.addresses, newAddress] } : p)),
    );
  }

  addContact(code: string, contact: NewPartnerContact): void {
    const newContact: PartnerContact = { ...contact, id: `CNT-${contactSeq++}` };
    this.partners.update((list) =>
      list.map((p) => (p.code === code ? { ...p, contacts: [...p.contacts, newContact] } : p)),
    );
  }
}
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --testPathPattern=partners-store`
Expected: PASS (11 tests)

- [ ] **Step 6: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/partners.data.ts source/apps/ikho-ui/src/app/core/state/partners-store.ts source/apps/ikho-ui/src/app/core/state/partners-store.spec.ts
git commit -m "feat(ikho-ui): add Partner data model and PartnersStore"
```

---

### Task 2: `OfficePartners` screen — header, KPIs, type filter, search, table

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/partners/office-partners.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/partners/office-partners.spec.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/office.routes.ts`

**Interfaces:**
- Consumes: `PartnersStore.partners: Signal<Partner[]>` (Task 1); `screenTitle`/`screenMeta` from `screens.data.ts`; `UI_STRINGS.all`/`UI_STRINGS.results` from `ui-strings.data.ts`.
- Produces: `OfficePartners` component (selector `app-office-partners`), with `protected readonly t`, `columns`, `typeChips`, `kpis`, `query`, `typeFilter`, `filteredRows` — Task 3 and Task 4 extend this same class and its template.

- [ ] **Step 1: Write the failing screen spec**

```ts
// source/apps/ikho-ui/src/app/features/office/partners/office-partners.spec.ts
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
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --testPathPattern=office-partners`
Expected: FAIL — `Cannot find module './office-partners'`

- [ ] **Step 3: Implement `OfficePartners`**

```ts
// source/apps/ikho-ui/src/app/features/office/partners/office-partners.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DataPanel, DataTable, DataTableColumn, KpiCard, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { Partner } from '../../../core/mock-data/partners.data';
import { screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
import { PartnersStore } from '../../../core/state/partners-store';

type TypeFilter = 'all' | 'supplier' | 'customer';

const CHIP_BASE = 'min-h-8 cursor-pointer rounded-pill border px-3.5 py-[7px] font-core text-[13px] font-semibold';
const CHIP_DEFAULT = 'border-hairline-light bg-canvas-light text-shade-60';
const CHIP_ACTIVE = 'border-primary bg-primary text-on-primary';

interface PartnerRow {
  code: string;
  name: string;
  type: 'inbound' | 'outbound';
  typeLabel: string;
  city: string;
  contact: string;
  status: 'in-stock' | 'out-of-stock';
  statusLabel: string;
}

@Component({
  selector: 'app-office-partners',
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
        <div class="flex flex-wrap gap-2">
          @for (chip of typeChips(); track chip.id) {
            <button type="button" [class]="chipClasses(chip.id)" [attr.aria-pressed]="chip.id === typeFilter()" (click)="typeFilter.set(chip.id)">
              {{ chip.label }}
            </button>
          }
        </div>
        <span class="ml-auto font-core text-[13px] text-shade-50">{{ filteredRows().length }} {{ lang.pick(strings.results) }}</span>
      </div>

      <lib-data-panel [title]="t().panelTitle">
        <lib-data-table [columns]="columns()" [rows]="filteredRows()" />
      </lib-data-panel>
    </div>
  `,
})
export class OfficePartners {
  protected readonly lang = inject(LangService);
  protected readonly store = inject(PartnersStore);
  protected readonly strings = UI_STRINGS;

  protected readonly title = computed(() => screenTitle('partners', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('partners', 'admin', this.lang.lang()));

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      panelTitle: en ? 'Suppliers and customers' : 'Nhà cung cấp và khách hàng',
      searchPlaceholder: en ? 'Search name, code, city, contact' : 'Tìm tên, mã, thành phố, liên hệ',
      suppliers: en ? 'Suppliers' : 'Nhà cung cấp',
      customers: en ? 'Customers' : 'Khách hàng',
      blocked: en ? 'Blocked' : 'Bị khoá',
      active: en ? 'Active' : 'Hoạt động',
      supplier: en ? 'Supplier' : 'Nhà cung cấp',
      customer: en ? 'Customer' : 'Khách hàng',
    };
  });

  protected readonly columns = computed<DataTableColumn[]>(() => {
    const en = this.lang.lang() === 'en';
    return [
      { key: 'code', label: en ? 'Partner' : 'Đối tác', mono: true },
      { key: 'name', label: en ? 'Name' : 'Tên' },
      { key: 'type', label: en ? 'Type' : 'Loại', status: true, statusLabelKey: 'typeLabel' },
      { key: 'city', label: en ? 'City' : 'Thành phố' },
      { key: 'contact', label: en ? 'Contact' : 'Liên hệ' },
      { key: 'status', label: en ? 'Status' : 'Trạng thái', status: true, statusLabelKey: 'statusLabel' },
    ];
  });

  protected readonly typeChips = computed(() => [
    { id: 'all' as TypeFilter, label: this.lang.pick(UI_STRINGS.all) },
    { id: 'supplier' as TypeFilter, label: this.t().suppliers },
    { id: 'customer' as TypeFilter, label: this.t().customers },
  ]);

  protected readonly kpis = computed(() => {
    const partners = this.store.partners();
    return [
      { label: this.t().suppliers, value: partners.filter((p) => p.type === 'supplier').length },
      { label: this.t().customers, value: partners.filter((p) => p.type === 'customer').length },
      { label: this.t().blocked, value: partners.filter((p) => !p.isActive).length },
    ];
  });

  protected readonly query = signal('');
  protected readonly typeFilter = signal<TypeFilter>('all');

  protected readonly rows = computed<PartnerRow[]>(() => this.store.partners().map((p) => this.toRow(p)));

  protected readonly filteredRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    const type = this.typeFilter();
    return this.rows().filter((row) => {
      if (type !== 'all' && row.type !== (type === 'supplier' ? 'inbound' : 'outbound')) return false;
      if (!q) return true;
      return [row.code, row.name, row.city, row.contact].join(' ').toLowerCase().includes(q);
    });
  });

  protected chipClasses(id: TypeFilter): string {
    return id === this.typeFilter() ? `${CHIP_BASE} ${CHIP_ACTIVE}` : `${CHIP_BASE} ${CHIP_DEFAULT}`;
  }

  private toRow(p: Partner): PartnerRow {
    const primaryAddress = p.addresses.find((a) => a.isPrimary) ?? p.addresses[0];
    const primaryContact = p.contacts.find((c) => c.isPrimary) ?? p.contacts[0];
    return {
      code: p.code,
      name: p.name,
      // Reuses the 'inbound'/'outbound' status colors purely for their hue (Supplier vs Customer) — not their receiving/shipping meaning.
      type: p.type === 'supplier' ? 'inbound' : 'outbound',
      typeLabel: p.type === 'supplier' ? this.t().supplier : this.t().customer,
      city: primaryAddress?.city ?? '—',
      contact: primaryContact?.name ?? '—',
      status: p.isActive ? 'in-stock' : 'out-of-stock',
      statusLabel: p.isActive ? this.t().active : this.t().blocked,
    };
  }
}
```

- [ ] **Step 4: Wire the route**

In `source/apps/ikho-ui/src/app/features/office/office.routes.ts`, replace:

```ts
  genericScreen('partners'),
```

with:

```ts
  {
    path: 'partners',
    loadComponent: () => import('./partners/office-partners').then((m) => m.OfficePartners),
  },
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --testPathPattern=office-partners`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/partners/office-partners.ts source/apps/ikho-ui/src/app/features/office/partners/office-partners.spec.ts source/apps/ikho-ui/src/app/features/office/office.routes.ts
git commit -m "feat(ikho-ui): add OfficePartners screen with KPIs, type filter, and search"
```

---

### Task 3: `PartnerDetailPanel` — view, edit, activate/deactivate, add address/contact

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/partners/partner-detail-panel.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/partners/partner-detail-panel.spec.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/partners/office-partners.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/partners/office-partners.spec.ts`

**Interfaces:**
- Consumes: `Partner` (Task 1), `NewPartnerAddress`/`NewPartnerContact` (Task 1), `LangService` (existing).
- Produces: `PartnerDetailPanel` (selector `app-partner-detail-panel`) with `partner = input.required<Partner>()`, outputs `close`, `toggleStatus`, `saveDetails: output<{name, taxId}>`, `addAddress: output<NewPartnerAddress>`, `addContact: output<NewPartnerContact>`. `OfficePartners` gains `selectedCode`, `selectedPartner` — Task 4 reuses `selectedPartner`.

- [ ] **Step 1: Write the failing detail-panel spec**

```ts
// source/apps/ikho-ui/src/app/features/office/partners/partner-detail-panel.spec.ts
import { TestBed } from '@angular/core/testing';
import { Partner } from '../../../core/mock-data/partners.data';
import { PartnerDetailPanel } from './partner-detail-panel';

const TEST_PARTNER: Partner = {
  code: 'SUP-0142',
  type: 'supplier',
  name: 'Vanderberg Steel',
  taxId: 'NL-810234567B01',
  isActive: true,
  createdOnUtc: '2024-03-11T09:00:00Z',
  addresses: [
    { id: 'ADR-1001', line1: 'Kanaalweg 14', line2: '', city: 'Eindhoven', state: 'Noord-Brabant', postalCode: '5613 BA', country: 'Netherlands', isPrimary: true },
  ],
  contacts: [
    { id: 'CNT-1001', name: 'J. Vanderberg', email: 'j.vanderberg@vbsteel.nl', phone: '+31 40 224 8810', isPrimary: true },
  ],
};

describe('PartnerDetailPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerDetailPanel],
    }).compileComponents();
  });

  it('renders the partner name, code, and Active status', () => {
    const fixture = TestBed.createComponent(PartnerDetailPanel);
    fixture.componentRef.setInput('partner', TEST_PARTNER);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Vanderberg Steel');
    expect(text).toContain('SUP-0142');
    expect(text).toContain('Active');
  });

  it('toggleStatus emits when the activate/deactivate button is clicked', () => {
    const fixture = TestBed.createComponent(PartnerDetailPanel);
    fixture.componentRef.setInput('partner', TEST_PARTNER);
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.toggleStatus.subscribe(() => (emitted = true));

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const deactivateButton = buttons.find((b) => b.textContent?.includes('Deactivate'));
    deactivateButton?.click();

    expect(emitted).toBe(true);
  });

  it('rejects a blank name on edit and does not emit saveDetails', () => {
    const fixture = TestBed.createComponent(PartnerDetailPanel);
    fixture.componentRef.setInput('partner', TEST_PARTNER);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      startEdit: () => void;
      editName: { set: (v: string) => void };
      editTaxId: { set: (v: string) => void };
      submitDetails: () => void;
    };
    let emitted = false;
    fixture.componentInstance.saveDetails.subscribe(() => (emitted = true));

    instance.startEdit();
    instance.editName.set('');
    instance.editTaxId.set('NL-999');
    instance.submitDetails();

    expect(emitted).toBe(false);
  });

  it('saveDetails emits trimmed name and tax id on a valid edit', () => {
    const fixture = TestBed.createComponent(PartnerDetailPanel);
    fixture.componentRef.setInput('partner', TEST_PARTNER);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      startEdit: () => void;
      editName: { set: (v: string) => void };
      editTaxId: { set: (v: string) => void };
      submitDetails: () => void;
    };
    let payload: { name: string; taxId: string } | undefined;
    fixture.componentInstance.saveDetails.subscribe((v) => (payload = v));

    instance.startEdit();
    instance.editName.set('  Vanderberg Steel BV  ');
    instance.editTaxId.set('  NL-810234567B01  ');
    instance.submitDetails();

    expect(payload).toEqual({ name: 'Vanderberg Steel BV', taxId: 'NL-810234567B01' });
  });

  it('rejects an address missing City and does not emit addAddress', () => {
    const fixture = TestBed.createComponent(PartnerDetailPanel);
    fixture.componentRef.setInput('partner', TEST_PARTNER);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showAddressForm: { set: (v: boolean) => void };
      addrLine1: { set: (v: string) => void };
      addrCountry: { set: (v: string) => void };
      submitAddress: () => void;
    };
    let emitted = false;
    fixture.componentInstance.addAddress.subscribe(() => (emitted = true));

    instance.showAddressForm.set(true);
    instance.addrLine1.set('Some street');
    instance.addrCountry.set('Netherlands');
    instance.submitAddress();

    expect(emitted).toBe(false);
  });

  it('addAddress emits a well-formed address on a valid submission', () => {
    const fixture = TestBed.createComponent(PartnerDetailPanel);
    fixture.componentRef.setInput('partner', TEST_PARTNER);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showAddressForm: { set: (v: boolean) => void };
      addrLine1: { set: (v: string) => void };
      addrCity: { set: (v: string) => void };
      addrCountry: { set: (v: string) => void };
      addrPrimary: { set: (v: boolean) => void };
      submitAddress: () => void;
    };
    let payload: unknown;
    fixture.componentInstance.addAddress.subscribe((v) => (payload = v));

    instance.showAddressForm.set(true);
    instance.addrLine1.set('Nieuwe Kade 8');
    instance.addrCity.set('Rotterdam');
    instance.addrCountry.set('Netherlands');
    instance.addrPrimary.set(true);
    instance.submitAddress();

    expect(payload).toEqual({
      line1: 'Nieuwe Kade 8',
      line2: '',
      city: 'Rotterdam',
      state: '',
      postalCode: '',
      country: 'Netherlands',
      isPrimary: true,
    });
  });

  it('addContact emits a well-formed contact on a valid submission, and rejects a missing phone', () => {
    const fixture = TestBed.createComponent(PartnerDetailPanel);
    fixture.componentRef.setInput('partner', TEST_PARTNER);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showContactForm: { set: (v: boolean) => void };
      contactName: { set: (v: string) => void };
      contactEmail: { set: (v: string) => void };
      contactPhone: { set: (v: string) => void };
      submitContact: () => void;
    };
    let payload: unknown;
    fixture.componentInstance.addContact.subscribe((v) => (payload = v));

    instance.showContactForm.set(true);
    instance.contactName.set('A. Jansen');
    instance.contactEmail.set('a.jansen@vbsteel.nl');
    instance.submitContact();
    expect(payload).toBeUndefined();

    instance.contactPhone.set('+31 40 224 8811');
    instance.submitContact();
    expect(payload).toEqual({ name: 'A. Jansen', email: 'a.jansen@vbsteel.nl', phone: '+31 40 224 8811', isPrimary: false });
  });

  it('close emits when the close button is clicked', () => {
    const fixture = TestBed.createComponent(PartnerDetailPanel);
    fixture.componentRef.setInput('partner', TEST_PARTNER);
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.close.subscribe(() => (emitted = true));

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-label="Close"]')?.click();

    expect(emitted).toBe(true);
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --testPathPattern=partner-detail-panel`
Expected: FAIL — `Cannot find module './partner-detail-panel'`

- [ ] **Step 3: Implement `PartnerDetailPanel`**

```ts
// source/apps/ikho-ui/src/app/features/office/partners/partner-detail-panel.ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Button, Icon, StatusBadge, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { Partner } from '../../../core/mock-data/partners.data';
import { NewPartnerAddress, NewPartnerContact } from '../../../core/state/partners-store';

@Component({
  selector: 'app-partner-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, StatusBadge, TextInput],
  host: { class: 'block' },
  template: `
    <aside class="flex w-96 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ t().eyebrow }}</span>
          <span class="font-core text-lg font-bold tracking-[-0.2px] text-ink">{{ partner().name }}</span>
          <span class="font-mono text-[13px] text-primary">{{ partner().code }}</span>
        </div>
        <button
          type="button"
          class="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent hover:bg-surface-elevated-light"
          [attr.aria-label]="t().close"
          (click)="close.emit()"
        >
          <lib-icon name="x" [size]="18" color="var(--color-shade-50)" />
        </button>
      </div>

      <lib-status-badge [status]="partner().isActive ? 'in-stock' : 'out-of-stock'" [label]="partner().isActive ? t().active : t().blocked" />

      <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
        @if (editing()) {
          <lib-text-input [label]="t().name" [value]="editName()" (valueChange)="editName.set($event)" />
          <lib-text-input [label]="t().taxId" [value]="editTaxId()" (valueChange)="editTaxId.set($event)" />
          @if (editError(); as err) {
            <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
          }
          <div class="flex gap-2">
            <lib-button variant="primary" (click)="submitDetails()">{{ t().save }}</lib-button>
            <lib-button variant="ghost" (click)="editing.set(false)">{{ t().cancel }}</lib-button>
          </div>
        } @else {
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().taxId }}</span>
            <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ partner().taxId }}</span>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().created }}</span>
            <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ partner().createdOnUtc.slice(0, 10) }}</span>
          </div>
          <lib-button variant="secondary" (click)="startEdit()">{{ t().editDetails }}</lib-button>
        }
      </div>

      <lib-button variant="primary" [fullWidth]="true" (click)="toggleStatus.emit()">
        {{ partner().isActive ? t().deactivate : t().activate }}
      </lib-button>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().addresses }}</span>
        @for (a of partner().addresses; track a.id) {
          <div class="flex flex-col gap-0.5 rounded-md border border-hairline-light p-2.5">
            <div class="flex items-center justify-between gap-2">
              <span class="font-core text-[13px] text-text-body">{{ a.line1 }}, {{ a.city }}</span>
              @if (a.isPrimary) {
                <span class="font-core text-[11px] font-semibold text-primary">{{ t().primary }}</span>
              }
            </div>
          </div>
        } @empty {
          <span class="font-core text-[13px] text-shade-50">{{ t().noAddresses }}</span>
        }
        @if (showAddressForm()) {
          <div class="flex flex-col gap-2 rounded-md border border-hairline-light p-2.5">
            <lib-text-input [label]="t().line1" [value]="addrLine1()" (valueChange)="addrLine1.set($event)" />
            <lib-text-input [label]="t().line2" [value]="addrLine2()" (valueChange)="addrLine2.set($event)" />
            <lib-text-input [label]="t().city" [value]="addrCity()" (valueChange)="addrCity.set($event)" />
            <lib-text-input [label]="t().state" [value]="addrState()" (valueChange)="addrState.set($event)" />
            <lib-text-input [label]="t().postalCode" [value]="addrPostal()" (valueChange)="addrPostal.set($event)" />
            <lib-text-input [label]="t().country" [value]="addrCountry()" (valueChange)="addrCountry.set($event)" />
            <label class="flex items-center gap-2 font-core text-[13px] text-text-body">
              <input type="checkbox" [checked]="addrPrimary()" (change)="addrPrimary.set($any($event.target).checked)" />
              {{ t().primaryAddress }}
            </label>
            @if (addressError(); as err) {
              <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
            }
            <div class="flex gap-2">
              <lib-button variant="primary" (click)="submitAddress()">{{ t().saveAddress }}</lib-button>
              <lib-button variant="ghost" (click)="showAddressForm.set(false)">{{ t().cancel }}</lib-button>
            </div>
          </div>
        } @else {
          <lib-button variant="secondary" (click)="showAddressForm.set(true)">{{ t().addAddress }}</lib-button>
        }
      </div>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().contacts }}</span>
        @for (c of partner().contacts; track c.id) {
          <div class="flex flex-col gap-0.5 rounded-md border border-hairline-light p-2.5">
            <div class="flex items-center justify-between gap-2">
              <span class="font-core text-[13px] text-text-body">{{ c.name }}</span>
              @if (c.isPrimary) {
                <span class="font-core text-[11px] font-semibold text-primary">{{ t().primary }}</span>
              }
            </div>
            <span class="font-core text-[12px] text-shade-50">{{ c.email }} · {{ c.phone }}</span>
          </div>
        } @empty {
          <span class="font-core text-[13px] text-shade-50">{{ t().noContacts }}</span>
        }
        @if (showContactForm()) {
          <div class="flex flex-col gap-2 rounded-md border border-hairline-light p-2.5">
            <lib-text-input [label]="t().name" [value]="contactName()" (valueChange)="contactName.set($event)" />
            <lib-text-input [label]="t().email" type="email" [value]="contactEmail()" (valueChange)="contactEmail.set($event)" />
            <lib-text-input [label]="t().phone" [value]="contactPhone()" (valueChange)="contactPhone.set($event)" />
            <label class="flex items-center gap-2 font-core text-[13px] text-text-body">
              <input type="checkbox" [checked]="contactPrimary()" (change)="contactPrimary.set($any($event.target).checked)" />
              {{ t().primaryContact }}
            </label>
            @if (contactError(); as err) {
              <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
            }
            <div class="flex gap-2">
              <lib-button variant="primary" (click)="submitContact()">{{ t().saveContact }}</lib-button>
              <lib-button variant="ghost" (click)="showContactForm.set(false)">{{ t().cancel }}</lib-button>
            </div>
          </div>
        } @else {
          <lib-button variant="secondary" (click)="showContactForm.set(true)">{{ t().addContact }}</lib-button>
        }
      </div>
    </aside>
  `,
})
export class PartnerDetailPanel {
  private readonly lang = inject(LangService);

  readonly partner = input.required<Partner>();

  readonly close = output<void>();
  readonly toggleStatus = output<void>();
  readonly saveDetails = output<{ name: string; taxId: string }>();
  readonly addAddress = output<NewPartnerAddress>();
  readonly addContact = output<NewPartnerContact>();

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      eyebrow: en ? 'Partner detail' : 'Chi tiết đối tác',
      close: en ? 'Close' : 'Đóng',
      active: en ? 'Active' : 'Hoạt động',
      blocked: en ? 'Blocked' : 'Bị khoá',
      taxId: en ? 'Tax ID' : 'Mã số thuế',
      created: en ? 'Created' : 'Ngày tạo',
      editDetails: en ? 'Edit details' : 'Sửa thông tin',
      name: en ? 'Name' : 'Tên',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      detailsRequired: en ? 'Name and Tax ID are required.' : 'Cần nhập tên và mã số thuế.',
      deactivate: en ? 'Deactivate' : 'Vô hiệu hoá',
      activate: en ? 'Activate' : 'Kích hoạt',
      addresses: en ? 'Addresses' : 'Địa chỉ',
      primary: en ? 'Primary' : 'Chính',
      noAddresses: en ? 'No addresses yet.' : 'Chưa có địa chỉ.',
      line1: en ? 'Line 1' : 'Địa chỉ 1',
      line2: en ? 'Line 2' : 'Địa chỉ 2',
      city: en ? 'City' : 'Thành phố',
      state: en ? 'State' : 'Bang/Tỉnh',
      postalCode: en ? 'Postal code' : 'Mã bưu điện',
      country: en ? 'Country' : 'Quốc gia',
      primaryAddress: en ? 'Primary address' : 'Địa chỉ chính',
      saveAddress: en ? 'Save address' : 'Lưu địa chỉ',
      addAddress: en ? 'Add address' : 'Thêm địa chỉ',
      addressRequired: en ? 'Line 1, City, and Country are required.' : 'Cần nhập địa chỉ 1, thành phố và quốc gia.',
      contacts: en ? 'Contacts' : 'Người liên hệ',
      noContacts: en ? 'No contacts yet.' : 'Chưa có người liên hệ.',
      email: en ? 'Email' : 'Email',
      phone: en ? 'Phone' : 'Điện thoại',
      primaryContact: en ? 'Primary contact' : 'Liên hệ chính',
      saveContact: en ? 'Save contact' : 'Lưu liên hệ',
      addContact: en ? 'Add contact' : 'Thêm liên hệ',
      contactRequired: en ? 'Name, Email, and Phone are required.' : 'Cần nhập tên, email và điện thoại.',
    };
  });

  protected readonly editing = signal(false);
  protected readonly editName = signal('');
  protected readonly editTaxId = signal('');
  protected readonly editError = signal<string | null>(null);

  protected readonly showAddressForm = signal(false);
  protected readonly addrLine1 = signal('');
  protected readonly addrLine2 = signal('');
  protected readonly addrCity = signal('');
  protected readonly addrState = signal('');
  protected readonly addrPostal = signal('');
  protected readonly addrCountry = signal('');
  protected readonly addrPrimary = signal(false);
  protected readonly addressError = signal<string | null>(null);

  protected readonly showContactForm = signal(false);
  protected readonly contactName = signal('');
  protected readonly contactEmail = signal('');
  protected readonly contactPhone = signal('');
  protected readonly contactPrimary = signal(false);
  protected readonly contactError = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.partner();
      this.editing.set(false);
      this.editError.set(null);
      this.showAddressForm.set(false);
      this.addressError.set(null);
      this.showContactForm.set(false);
      this.contactError.set(null);
    });
  }

  protected startEdit(): void {
    this.editName.set(this.partner().name);
    this.editTaxId.set(this.partner().taxId);
    this.editError.set(null);
    this.editing.set(true);
  }

  protected submitDetails(): void {
    const name = this.editName().trim();
    const taxId = this.editTaxId().trim();
    if (!name || !taxId) {
      this.editError.set(this.t().detailsRequired);
      return;
    }
    this.saveDetails.emit({ name, taxId });
  }

  protected submitAddress(): void {
    const line1 = this.addrLine1().trim();
    const city = this.addrCity().trim();
    const country = this.addrCountry().trim();
    if (!line1 || !city || !country) {
      this.addressError.set(this.t().addressRequired);
      return;
    }
    this.addAddress.emit({
      line1,
      line2: this.addrLine2().trim(),
      city,
      state: this.addrState().trim(),
      postalCode: this.addrPostal().trim(),
      country,
      isPrimary: this.addrPrimary(),
    });
  }

  protected submitContact(): void {
    const name = this.contactName().trim();
    const email = this.contactEmail().trim();
    const phone = this.contactPhone().trim();
    if (!name || !email || !phone) {
      this.contactError.set(this.t().contactRequired);
      return;
    }
    this.addContact.emit({ name, email, phone, isPrimary: this.contactPrimary() });
  }
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --testPathPattern=partner-detail-panel`
Expected: PASS (8 tests)

- [ ] **Step 5: Wire row selection and the detail panel into `OfficePartners`**

In `office-partners.ts`:
- Add to the imports line: `Partner` is already imported; add `NewPartnerAddress, NewPartnerContact` to the `partners-store` import; add `import { PartnerDetailPanel } from './partner-detail-panel';`.
- Add `PartnerDetailPanel` to the `@Component` `imports` array.
- Replace the closing `<lib-data-panel>...</lib-data-panel>` block with:

```ts
      <div class="flex items-start gap-5">
        <div class="min-w-0 flex-1">
          <lib-data-panel [title]="t().panelTitle">
            <lib-data-table [columns]="columns()" [rows]="filteredRows()" [clickable]="true" (rowClick)="onRowClick($event)" />
          </lib-data-panel>
        </div>
        @if (selectedPartner(); as sp) {
          <app-partner-detail-panel
            [partner]="sp"
            (close)="selectedCode.set(null)"
            (toggleStatus)="onToggleStatus()"
            (saveDetails)="onSaveDetails($event)"
            (addAddress)="onAddAddress($event)"
            (addContact)="onAddContact($event)"
          />
        }
      </div>
```

- Add these members to the `OfficePartners` class (after `typeFilter`):

```ts
  protected readonly selectedCode = signal<string | null>(null);

  protected readonly selectedPartner = computed<Partner | null>(() => {
    const code = this.selectedCode();
    if (!code) return null;
    return this.store.partners().find((p) => p.code === code) ?? null;
  });
```

- Add these methods to the class (after `chipClasses`):

```ts
  protected onRowClick(row: Record<string, unknown>): void {
    this.selectedCode.set(String(row['code']));
  }

  protected onToggleStatus(): void {
    const p = this.selectedPartner();
    if (!p) return;
    this.store.setStatus(p.code, !p.isActive);
  }

  protected onSaveDetails(input: { name: string; taxId: string }): void {
    const p = this.selectedPartner();
    if (!p) return;
    this.store.updatePartner(p.code, input);
  }

  protected onAddAddress(address: NewPartnerAddress): void {
    const p = this.selectedPartner();
    if (!p) return;
    this.store.addAddress(p.code, address);
  }

  protected onAddContact(contact: NewPartnerContact): void {
    const p = this.selectedPartner();
    if (!p) return;
    this.store.addContact(p.code, contact);
  }
```

- [ ] **Step 6: Add failing tests for the wiring, then confirm they pass**

Append to `office-partners.spec.ts`:

```ts
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
```

Run: `pnpm nx test ikho-ui --testPathPattern=office-partners`
Expected: PASS (6 tests)

- [ ] **Step 7: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/partners/partner-detail-panel.ts source/apps/ikho-ui/src/app/features/office/partners/partner-detail-panel.spec.ts source/apps/ikho-ui/src/app/features/office/partners/office-partners.ts source/apps/ikho-ui/src/app/features/office/partners/office-partners.spec.ts
git commit -m "feat(ikho-ui): add PartnerDetailPanel with edit, status toggle, and address/contact forms"
```

---

### Task 4: Add-partner inline create panel

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/office/partners/office-partners.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/partners/office-partners.spec.ts`

**Interfaces:**
- Consumes: `PartnersStore.addPartner` (Task 1), `SCREENS.partners.action` (existing `screens.data.ts`).

- [ ] **Step 1: Add the failing create-form test**

Append to `office-partners.spec.ts`:

```ts
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
```

Run: `pnpm nx test ikho-ui --testPathPattern=office-partners`
Expected: FAIL — `showCreateForm`/`formType`/etc. are not defined on `OfficePartners`

- [ ] **Step 2: Add the create panel to `OfficePartners`**

In `office-partners.ts`:
- Add `Button` to the `import { ... } from '@ikho/shared-ui';` line.
- Add `import { PartnerType } from '../../../core/mock-data/partners.data';` (alongside the existing `Partner` import from the same file — combine into one import line: `import { Partner, PartnerType } from '../../../core/mock-data/partners.data';`).
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
        <lib-button variant="primary" (click)="showCreateForm.set(true)">{{ addPartnerLabel() }}</lib-button>
      </div>

      @if (showCreateForm()) {
        <lib-data-panel [title]="t().createTitle" [subtitle]="t().createSubtitle">
          <div class="flex flex-col gap-4">
            <div class="flex gap-3">
              <lib-button [variant]="formType() === 'supplier' ? 'primary' : 'secondary'" (click)="formType.set('supplier')">{{ t().supplier }}</lib-button>
              <lib-button [variant]="formType() === 'customer' ? 'primary' : 'secondary'" (click)="formType.set('customer')">{{ t().customer }}</lib-button>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <lib-text-input [label]="t().code" [value]="formCode()" (valueChange)="formCode.set($event)" />
              <lib-text-input [label]="t().name" [value]="formName()" (valueChange)="formName.set($event)" />
              <lib-text-input [label]="t().taxId" [value]="formTaxId()" (valueChange)="formTaxId.set($event)" />
            </div>
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
- Add `addPartnerLabel` next to `meta`:

```ts
  protected readonly addPartnerLabel = computed(() => SCREENS.partners.action[this.lang.lang()]);
```

- Extend the `t()` computed's returned object with these additional keys:

```ts
      createTitle: en ? 'Add partner' : 'Thêm đối tác',
      createSubtitle: en ? 'Code, type, name, and tax ID' : 'Mã, loại, tên và mã số thuế',
      code: en ? 'Code' : 'Mã',
      name: en ? 'Name' : 'Tên',
      taxId: en ? 'Tax ID' : 'Mã số thuế',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      requiredError: en ? 'Code, Name, and Tax ID are required.' : 'Cần nhập mã, tên và mã số thuế.',
      duplicateError: (code: string) => (en ? `Partner code '${code}' is already in use.` : `Mã đối tác '${code}' đã được sử dụng.`),
```

- Add these members and methods to the class (after `selectedPartner`):

```ts
  protected readonly showCreateForm = signal(false);
  protected readonly formType = signal<PartnerType>('supplier');
  protected readonly formCode = signal('');
  protected readonly formName = signal('');
  protected readonly formTaxId = signal('');
  protected readonly formError = signal<string | null>(null);
```

```ts
  protected submitCreate(): void {
    const outcome = this.store.addPartner({
      code: this.formCode(),
      type: this.formType(),
      name: this.formName(),
      taxId: this.formTaxId(),
    });

    if (outcome === 'invalid') {
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
    this.formTaxId.set('');
    this.formType.set('supplier');
    this.showCreateForm.set(false);
  }

  protected cancelCreate(): void {
    this.formError.set(null);
    this.showCreateForm.set(false);
  }
```

- [ ] **Step 3: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --testPathPattern=office-partners`
Expected: PASS (7 tests)

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/partners/office-partners.ts source/apps/ikho-ui/src/app/features/office/partners/office-partners.spec.ts
git commit -m "feat(ikho-ui): add inline add-partner create panel to OfficePartners"
```

---

### Task 5: Final verification

**Files:** None (verification only), plus:
- Create: `docs/plans/organization-partners-billing-rollout-plan.md`

- [ ] **Step 1: Run the full `ikho-ui` test suite**

Run: `pnpm nx test ikho-ui`
Expected: PASS, 0 failures (includes all Task 1-4 specs plus every pre-existing spec).

- [ ] **Step 2: Run the production build**

Run: `pnpm nx build ikho-ui`
Expected: build succeeds with no TypeScript or template errors.

- [ ] **Step 3: Manual smoke test**

Start the dev server: `pnpm nx serve ikho-ui` (proxies `/api/*` to `:5143`, not needed here since Partners has no `HttpClient` calls). Navigate to `/office/partners` as an admin user and verify:
1. The KPI row shows Suppliers 4 / Customers 3 / Blocked 2.
2. The type filter chips narrow the table to Suppliers-only / Customers-only / All.
3. The search box filters by typing a city (e.g. "Eindhoven") and a contact name.
4. Clicking "Add partner" opens the inline form; submitting with a duplicate code (e.g. `SUP-0142`) shows the duplicate-code error; submitting a new code creates a new row and closes the form.
5. Clicking a table row opens the detail panel showing its addresses/contacts.
6. "Deactivate"/"Activate" flips the Status badge and the Blocked KPI.
7. "Edit details" allows changing Name/Tax ID and saves.
8. "Add address" and "Add contact" append new entries to their respective lists.
9. Switching the app's language toggle (en/vi) re-renders every label above in Vietnamese.

If any step fails, fix the underlying issue (do not proceed to Step 4 with a known defect).

- [ ] **Step 4: Create the Organization/Partners/Billing rollout tracking doc**

```markdown
# Organization / Partners / Billing — UI Rollout Plan

Decomposed from the Warehouse Operations Console UI rollout's follow-up ("extend to Organization, Partners, and Billing"). Unlike the original 4-module rollout (Inbound/Outbound/Returns/Reporting — see [warehouse-ui-rollout-plan.md](warehouse-ui-rollout-plan.md)), these three are independent backend subsystems (`ikho-warehouse-organization`, `ikho-warehouse-partner`, `ikho-warehouse-billing`) with no Operator Mode counterpart — each gets its own design spec and implementation plan, built one at a time.

## Status

| # | Module | Design spec | Implementation plan | Status |
|---|--------|-------------|----------------------|--------|
| 1 | Partners | [2026-08-12-partners-ui-design.md](../superpowers/specs/2026-08-12-partners-ui-design.md) | [2026-08-12-partners-ui.md](../superpowers/plans/2026-08-12-partners-ui.md) | Implemented |
| 2 | Organization | — | — | Not started |
| 3 | Billing | — | — | Not started |

Update the table as each module's spec and plan land.
```

Save this to `docs/plans/organization-partners-billing-rollout-plan.md`.

- [ ] **Step 5: Commit**

```bash
git add docs/plans/organization-partners-billing-rollout-plan.md
git commit -m "docs: Add Organization/Partners/Billing rollout tracking doc; mark Partners implemented"
```

- [ ] **Step 6: Hand off to `superpowers:finishing-a-development-branch`**

Once Steps 1-5 are green, use the `finishing-a-development-branch` skill to verify tests, present merge/PR/keep options, and clean up the workspace.
