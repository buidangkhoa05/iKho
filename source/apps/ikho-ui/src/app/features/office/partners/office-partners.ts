import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, DataPanel, DataTable, DataTableColumn, KpiCard, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { Partner, PartnerType } from '../../../core/mock-data/partners.data';
import { screenMeta, screenTitle, SCREENS } from '../../../core/mock-data/screens.data';
import { NewPartnerAddress, NewPartnerContact, PartnersStore } from '../../../core/state/partners-store';
import { PartnerDetailPanel } from './partner-detail-panel';

type TypeFilter = 'all' | 'supplier' | 'customer';

const CHIP_BASE = 'min-h-8 cursor-pointer rounded-pill border px-3.5 py-[7px] font-core text-[13px] font-semibold';
const CHIP_DEFAULT = 'border-hairline-light bg-canvas-light text-shade-60';
const CHIP_ACTIVE = 'border-primary bg-primary text-on-primary';

interface PartnerRow extends Record<string, unknown> {
  code: string;
  name: string;
  partnerType: PartnerType;
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
  imports: [Button, DataPanel, DataTable, KpiCard, PartnerDetailPanel, TextInput],
  template: `
    <div class="flex flex-col gap-6">
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

      <div class="flex items-start gap-5">
        <div class="min-w-0 flex-1">
          <lib-data-panel [title]="t().panelTitle">
            <lib-data-table [columns]="columns()" [rows]="filteredRows()" [emptyLabel]="t().noResults" [clickable]="true" (rowClick)="onRowClick($event)" />
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
    </div>
  `,
})
export class OfficePartners {
  protected readonly lang = inject(LangService);
  protected readonly store = inject(PartnersStore);
  protected readonly strings = UI_STRINGS;

  protected readonly title = computed(() => screenTitle('partners', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('partners', 'admin', this.lang.lang()));
  protected readonly addPartnerLabel = computed(() => SCREENS.partners.action[this.lang.lang()]);

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
      noResults: en ? 'No partners match' : 'Không có đối tác phù hợp',
      colPartner: en ? 'Partner' : 'Đối tác',
      colName: en ? 'Name' : 'Tên',
      colType: en ? 'Type' : 'Loại',
      colCity: en ? 'City' : 'Thành phố',
      colContact: en ? 'Contact' : 'Liên hệ',
      colStatus: en ? 'Status' : 'Trạng thái',
      createTitle: en ? 'Add partner' : 'Thêm đối tác',
      createSubtitle: en ? 'Code, type, name, and tax ID' : 'Mã, loại, tên và mã số thuế',
      code: en ? 'Code' : 'Mã',
      name: en ? 'Name' : 'Tên',
      taxId: en ? 'Tax ID' : 'Mã số thuế',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      requiredError: en ? 'Code, Name, and Tax ID are required.' : 'Cần nhập mã, tên và mã số thuế.',
      duplicateError: (code: string) => (en ? `Partner code '${code}' is already in use.` : `Mã đối tác '${code}' đã được sử dụng.`),
    };
  });

  protected readonly columns = computed<DataTableColumn[]>(() => {
    const t = this.t();
    return [
      { key: 'code', label: t.colPartner, mono: true },
      { key: 'name', label: t.colName },
      { key: 'type', label: t.colType, status: true, statusLabelKey: 'typeLabel' },
      { key: 'city', label: t.colCity },
      { key: 'contact', label: t.colContact },
      { key: 'status', label: t.colStatus, status: true, statusLabelKey: 'statusLabel' },
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

  protected readonly selectedCode = signal<string | null>(null);

  protected readonly selectedPartner = computed<Partner | null>(() => {
    const code = this.selectedCode();
    if (!code) return null;
    return this.store.partners().find((p) => p.code === code) ?? null;
  });

  protected readonly showCreateForm = signal(false);
  protected readonly formType = signal<PartnerType>('supplier');
  protected readonly formCode = signal('');
  protected readonly formName = signal('');
  protected readonly formTaxId = signal('');
  protected readonly formError = signal<string | null>(null);

  protected readonly rows = computed<PartnerRow[]>(() => this.store.partners().map((p) => this.toRow(p)));

  protected readonly filteredRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    const type = this.typeFilter();
    return this.rows().filter((row) => {
      if (type !== 'all' && row.partnerType !== type) return false;
      if (!q) return true;
      return [row.code, row.name, row.city, row.contact].join(' ').toLowerCase().includes(q);
    });
  });

  protected chipClasses(id: TypeFilter): string {
    return id === this.typeFilter() ? `${CHIP_BASE} ${CHIP_ACTIVE}` : `${CHIP_BASE} ${CHIP_DEFAULT}`;
  }

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
    this.query.set('');
    this.typeFilter.set('all');
  }

  protected cancelCreate(): void {
    this.formError.set(null);
    this.showCreateForm.set(false);
  }

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

  private toRow(p: Partner): PartnerRow {
    const primaryAddress = p.addresses.find((a) => a.isPrimary) ?? p.addresses[0];
    const primaryContact = p.contacts.find((c) => c.isPrimary) ?? p.contacts[0];
    return {
      code: p.code,
      name: p.name,
      partnerType: p.type,
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
