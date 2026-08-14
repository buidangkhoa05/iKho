import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Button, DataPanel, DataTable, DataTableColumn, KpiCard, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { Warehouse } from '../../../core/mock-data/organization.data';
import { screenMeta, screenTitle, SCREENS } from '../../../core/mock-data/screens.data';
import { OrganizationStore, WarehouseRef } from '../../../core/state/organization-store';
import { WarehouseDetailPanel } from './warehouse-detail-panel';

interface WarehouseRow extends Record<string, unknown> {
  code: string;
  companyCode: string;
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
  imports: [DataPanel, DataTable, KpiCard, TextInput, Button, WarehouseDetailPanel],
  template: `
    <div class="flex flex-col gap-6">
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
                <label class="flex flex-col gap-2">
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
                </label>
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

      <div class="flex items-start gap-5">
        <div class="min-w-0 flex-1">
          <lib-data-panel [title]="t().panelTitle">
            <lib-data-table [columns]="columns()" [rows]="filteredRows()" [emptyLabel]="t().noResults" [clickable]="true" (rowClick)="onRowClick($event)" />
          </lib-data-panel>
        </div>
        @if (selectedWarehouse(); as sw) {
          <app-warehouse-detail-panel
            #detailPanel
            [warehouse]="sw"
            [companyName]="selectedCompanyName()"
            (closePanel)="selectedRef.set(null)"
            (toggleStatus)="onToggleStatus()"
            (saveDetails)="onSaveDetails($event)"
            (addZone)="onAddZone($event)"
            (toggleZoneStatus)="onToggleZoneStatus($event)"
            (addDock)="onAddDock($event)"
            (toggleDockStatus)="onToggleDockStatus($event)"
          />
        }
      </div>
    </div>
  `,
})
export class OfficeOrganization {
  protected readonly lang = inject(LangService);
  protected readonly store = inject(OrganizationStore);
  protected readonly strings = UI_STRINGS;

  protected readonly title = computed(() => screenTitle('organization', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('organization', 'admin', this.lang.lang()));
  protected readonly addWarehouseLabel = computed(() => SCREENS.organization.action[this.lang.lang()]);

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
      createTitle: en ? 'Add warehouse' : 'Thêm kho',
      createSubtitle: en ? 'Code, name, and company' : 'Mã, tên và công ty',
      code: en ? 'Code' : 'Mã',
      name: en ? 'Name' : 'Tên',
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
      zoneDuplicateError: (code: string) => (en ? `Zone code '${code}' is already in use in this warehouse.` : `Mã khu '${code}' đã được sử dụng trong kho này.`),
      dockDuplicateError: (code: string) => (en ? `Dock code '${code}' is already in use in this warehouse.` : `Mã cửa kho '${code}' đã được sử dụng trong kho này.`),
      warehouseNotFoundError: en ? 'This warehouse could not be found. It may have been removed.' : 'Không tìm thấy kho này. Có thể đã bị xoá.',
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

  protected readonly selectedRef = signal<WarehouseRef | null>(null);
  protected readonly detailPanel = viewChild<WarehouseDetailPanel>('detailPanel');

  protected readonly selectedWarehouse = computed<Warehouse | null>(() => {
    const ref = this.selectedRef();
    if (!ref) return null;
    return this.store.warehouses().find((w) => w.code === ref.code && w.companyCode === ref.companyCode) ?? null;
  });

  protected readonly selectedCompanyName = computed<string>(() => {
    const w = this.selectedWarehouse();
    if (!w) return '';
    return this.store.companies().find((c) => c.code === w.companyCode)?.name ?? '—';
  });

  protected readonly showCreateForm = signal(false);
  protected readonly formCode = signal('');
  protected readonly formName = signal('');
  protected readonly formCompanyCode = signal('');
  protected readonly showNewCompanyForm = signal(false);
  protected readonly newCompanyCode = signal('');
  protected readonly newCompanyName = signal('');
  protected readonly formError = signal<string | null>(null);

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
      companyCode: w.companyCode,
      name: w.name,
      companyName,
      zonesCount: w.zones.length,
      docksCount: w.docks.length,
      status: w.isActive ? 'in-stock' : 'out-of-stock',
      statusLabel: w.isActive ? this.t().active : this.t().inactive,
    };
  }

  protected onRowClick(row: Record<string, unknown>): void {
    this.selectedRef.set({ companyCode: String(row['companyCode']), code: String(row['code']) });
  }

  private refOf(w: Warehouse): WarehouseRef {
    return { companyCode: w.companyCode, code: w.code };
  }

  protected onToggleStatus(): void {
    const w = this.selectedWarehouse();
    if (!w) return;
    this.store.setWarehouseStatus(this.refOf(w), !w.isActive);
  }

  protected onSaveDetails(input: { name: string }): void {
    const w = this.selectedWarehouse();
    if (!w) return;
    const outcome = this.store.updateWarehouse(this.refOf(w), input);
    if (outcome === 'not-found') {
      this.detailPanel()?.setDetailsError(this.t().warehouseNotFoundError);
    }
  }

  protected onAddZone(zone: { code: string; name: string }): void {
    const w = this.selectedWarehouse();
    if (!w) return;
    const outcome = this.store.addZone(this.refOf(w), zone);
    if (outcome === 'duplicate-code') {
      this.detailPanel()?.setZoneError(this.t().zoneDuplicateError(zone.code));
    } else if (outcome === 'not-found') {
      this.detailPanel()?.setZoneError(this.t().warehouseNotFoundError);
    }
  }

  protected onToggleZoneStatus(event: { zoneCode: string; isActive: boolean }): void {
    const w = this.selectedWarehouse();
    if (!w) return;
    this.store.setZoneStatus(this.refOf(w), event.zoneCode, event.isActive);
  }

  protected onAddDock(dock: { code: string; name: string }): void {
    const w = this.selectedWarehouse();
    if (!w) return;
    const outcome = this.store.addDock(this.refOf(w), dock);
    if (outcome === 'duplicate-code') {
      this.detailPanel()?.setDockError(this.t().dockDuplicateError(dock.code));
    } else if (outcome === 'not-found') {
      this.detailPanel()?.setDockError(this.t().warehouseNotFoundError);
    }
  }

  protected onToggleDockStatus(event: { dockCode: string; isActive: boolean }): void {
    const w = this.selectedWarehouse();
    if (!w) return;
    this.store.setDockStatus(this.refOf(w), event.dockCode, event.isActive);
  }

  protected submitCreate(): void {
    const code = this.formCode().trim();
    const name = this.formName().trim();
    let companyCode = this.formCompanyCode();

    if (this.showNewCompanyForm()) {
      const newCode = this.newCompanyCode().trim();
      const newName = this.newCompanyName().trim();
      if (!newCode || !newName) {
        this.formError.set(this.t().companyRequiredError);
        return;
      }
      // Validate the warehouse fields *before* creating the company, so a bad
      // warehouse code/name doesn't leave an orphaned company behind on retry.
      if (!code || !name) {
        this.formError.set(this.t().requiredError);
        return;
      }

      const companyOutcome = this.store.addCompany({ code: newCode, name: newName });
      if (companyOutcome === 'duplicate-code') {
        this.formError.set(this.t().companyDuplicateError(newCode));
        return;
      }
      if (companyOutcome === 'invalid') {
        this.formError.set(this.t().companyRequiredError);
        return;
      }
      companyCode = newCode;
    }

    const outcome = this.store.addWarehouse({ code, companyCode, name });

    if (outcome === 'invalid' || outcome === 'company-not-found') {
      this.formError.set(this.t().requiredError);
      return;
    }
    if (outcome === 'duplicate-code') {
      this.formError.set(this.t().duplicateError(code));
      return;
    }

    this.resetCreateForm();
  }

  protected cancelCreate(): void {
    this.resetCreateForm();
  }

  private resetCreateForm(): void {
    this.formError.set(null);
    this.formCode.set('');
    this.formName.set('');
    this.formCompanyCode.set('');
    this.showNewCompanyForm.set(false);
    this.newCompanyCode.set('');
    this.newCompanyName.set('');
    this.showCreateForm.set(false);
  }
}
