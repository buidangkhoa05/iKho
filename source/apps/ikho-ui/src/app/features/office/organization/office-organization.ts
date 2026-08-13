import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DataPanel, DataTable, DataTableColumn, KpiCard, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { Warehouse } from '../../../core/mock-data/organization.data';
import { screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
import { OrganizationStore } from '../../../core/state/organization-store';
import { WarehouseDetailPanel } from './warehouse-detail-panel';

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
  imports: [DataPanel, DataTable, KpiCard, TextInput, WarehouseDetailPanel],
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
}
