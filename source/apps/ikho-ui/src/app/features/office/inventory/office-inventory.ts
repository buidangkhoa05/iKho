import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DataPanel, DataTable, DataTableColumn, KpiCard, TextInput } from '@ikho/shared-ui';
import { Button } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { StockItem, StockReservation } from '../../../core/mock-data/inventory.data';
import { screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
import { CatalogStore } from '../../../core/state/catalogue-store';
import { InventoryStore } from '../../../core/state/inventory-store';
import { OrganizationStore } from '../../../core/state/organization-store';

type InventorySection = 'stock-positions' | 'reservations';

interface StockPositionRow extends Record<string, unknown> {
  id: string;
  sku: string;
  productName: string;
  warehouseName: string;
  bin: string;
  lotOrSerial: string;
  onHand: number;
  reserved: number;
  available: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  statusLabel: string;
}

interface ReservationRow extends Record<string, unknown> {
  id: string;
  sku: string;
  productName: string;
  warehouseName: string;
  quantity: number;
  status: 'in-stock' | 'out-of-stock' | 'outbound';
  statusLabel: string;
  reference: string;
}

@Component({
  selector: 'app-office-inventory',
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

      <div class="flex flex-wrap gap-2">
        <lib-button [variant]="activeSection() === 'stock-positions' ? 'primary' : 'secondary'" (click)="selectSection('stock-positions')">{{ t().stockPositionsTab }}</lib-button>
        <lib-button [variant]="activeSection() === 'reservations' ? 'primary' : 'secondary'" (click)="selectSection('reservations')">{{ t().reservationsTab }}</lib-button>
      </div>

      @if (activeSection() === 'stock-positions') {
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchStockPlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <lib-data-panel [title]="t().stockPositionsPanelTitle">
          <lib-data-table [columns]="stockPositionColumns()" [rows]="filteredStockPositionRows()" [emptyLabel]="t().noStockPositions" />
        </lib-data-panel>
        <!-- STOCK_POSITIONS_EXTRA -->
      } @else {
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchReservationsPlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <lib-data-panel [title]="t().reservationsPanelTitle">
          <lib-data-table [columns]="reservationColumns()" [rows]="filteredReservationRows()" [emptyLabel]="t().noReservations" />
        </lib-data-panel>
        <!-- RESERVATIONS_EXTRA -->
      }
    </div>
  `,
})
export class OfficeInventory {
  protected readonly lang = inject(LangService);
  protected readonly store = inject(InventoryStore);
  protected readonly catalog = inject(CatalogStore);
  protected readonly organization = inject(OrganizationStore);

  protected readonly title = computed(() => screenTitle('inventory', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('inventory', 'admin', this.lang.lang()));

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      stockPositionsTab: en ? 'Stock Positions' : 'Vị trí tồn kho',
      reservationsTab: en ? 'Reservations' : 'Đã giữ hàng',
      stockPositionsPanelTitle: en ? 'Stock Positions' : 'Vị trí tồn kho',
      reservationsPanelTitle: en ? 'Reservations' : 'Đã giữ hàng',
      searchStockPlaceholder: en ? 'Search SKU, name, bin, lot, or serial' : 'Tìm SKU, tên, ô kệ, lô hoặc serial',
      searchReservationsPlaceholder: en ? 'Search SKU or name' : 'Tìm SKU hoặc tên',
      noStockPositions: en ? 'No stock positions match' : 'Không có vị trí tồn kho phù hợp',
      noReservations: en ? 'No reservations match' : 'Không có giữ hàng phù hợp',
      totalOnHand: en ? 'Total on hand' : 'Tổng tồn thực',
      totalAvailable: en ? 'Total available' : 'Tổng khả dụng',
      totalReserved: en ? 'Total reserved' : 'Tổng đã giữ',
      activeReservations: en ? 'Active reservations' : 'Đang giữ hàng',
      colSku: en ? 'SKU' : 'SKU',
      colProduct: en ? 'Product' : 'Sản phẩm',
      colWarehouse: en ? 'Warehouse' : 'Kho',
      colBin: en ? 'Bin' : 'Ô kệ',
      colLotSerial: en ? 'Lot / Serial' : 'Lô / Serial',
      colOnHand: en ? 'On hand' : 'Tồn thực',
      colReserved: en ? 'Reserved' : 'Đã giữ',
      colAvailable: en ? 'Available' : 'Khả dụng',
      colStatus: en ? 'Status' : 'Trạng thái',
      colQuantity: en ? 'Quantity' : 'Số lượng',
      colReference: en ? 'Reference' : 'Tham chiếu',
      active: en ? 'Active' : 'Đang giữ',
      released: en ? 'Released' : 'Đã nhả',
      fulfilled: en ? 'Fulfilled' : 'Đã hoàn tất',
      none: en ? '—' : '—',
    };
  });

  protected readonly activeSection = signal<InventorySection>('stock-positions');
  protected readonly query = signal('');

  protected selectSection(section: InventorySection): void {
    this.activeSection.set(section);
    this.query.set('');
  }

  protected readonly kpis = computed(() => {
    const items = this.store.stockItems();
    const totalOnHand = items.reduce((sum, i) => sum + i.onHand, 0);
    const totalAvailable = items.reduce((sum, i) => sum + (i.onHand - i.reserved - i.damaged - i.quarantine), 0);
    const totalReserved = items.reduce((sum, i) => sum + i.reserved, 0);
    const activeReservations = this.store.reservations().filter((r) => r.status === 'active').length;
    return [
      { label: this.t().totalOnHand, value: totalOnHand },
      { label: this.t().totalAvailable, value: totalAvailable },
      { label: this.t().totalReserved, value: totalReserved },
      { label: this.t().activeReservations, value: activeReservations },
    ];
  });

  protected readonly stockPositionColumns = computed<DataTableColumn[]>(() => {
    const t = this.t();
    return [
      { key: 'sku', label: t.colSku, mono: true },
      { key: 'productName', label: t.colProduct },
      { key: 'warehouseName', label: t.colWarehouse },
      { key: 'bin', label: t.colBin, mono: true },
      { key: 'lotOrSerial', label: t.colLotSerial, mono: true },
      { key: 'onHand', label: t.colOnHand, align: 'right' },
      { key: 'reserved', label: t.colReserved, align: 'right' },
      { key: 'available', label: t.colAvailable, align: 'right' },
      { key: 'status', label: t.colStatus, status: true, statusLabelKey: 'statusLabel' },
    ];
  });

  protected readonly reservationColumns = computed<DataTableColumn[]>(() => {
    const t = this.t();
    return [
      { key: 'sku', label: t.colSku, mono: true },
      { key: 'productName', label: t.colProduct },
      { key: 'warehouseName', label: t.colWarehouse },
      { key: 'quantity', label: t.colQuantity, align: 'right' },
      { key: 'status', label: t.colStatus, status: true, statusLabelKey: 'statusLabel' },
      { key: 'reference', label: t.colReference },
    ];
  });

  protected nameOfProduct(sku: string): string {
    return this.catalog.products().find((p) => p.sku === sku)?.name ?? sku;
  }

  protected nameOfWarehouse(code: string): string {
    return this.organization.warehouses().find((w) => w.code === code)?.name ?? code;
  }

  private toStockPositionRow(item: StockItem): StockPositionRow {
    return {
      id: item.id,
      sku: item.sku,
      productName: this.nameOfProduct(item.sku),
      warehouseName: this.nameOfWarehouse(item.warehouseCode),
      bin: item.bin,
      lotOrSerial: item.lot?.lotNumber ?? item.serial?.serialValue ?? this.t().none,
      onHand: item.onHand,
      reserved: item.reserved,
      available: item.onHand - item.reserved - item.damaged - item.quarantine,
      status: item.status,
      statusLabel: resolveStatusLabel({ status: item.status }, this.lang.lang()),
    };
  }

  private reservationStatusBadge(status: StockReservation['status']): { status: 'in-stock' | 'out-of-stock' | 'outbound'; label: string } {
    const t = this.t();
    if (status === 'active') return { status: 'in-stock', label: t.active };
    if (status === 'fulfilled') return { status: 'outbound', label: t.fulfilled };
    return { status: 'out-of-stock', label: t.released };
  }

  private toReservationRow(r: StockReservation): ReservationRow {
    const badge = this.reservationStatusBadge(r.status);
    return {
      id: r.id,
      sku: r.sku,
      productName: this.nameOfProduct(r.sku),
      warehouseName: this.nameOfWarehouse(r.warehouseCode),
      quantity: r.quantity,
      status: badge.status,
      statusLabel: badge.label,
      reference: r.referenceType && r.referenceId ? `${r.referenceType} ${r.referenceId}` : this.t().none,
    };
  }

  protected readonly stockPositionRows = computed<StockPositionRow[]>(() => this.store.stockItems().map((i) => this.toStockPositionRow(i)));
  protected readonly reservationRows = computed<ReservationRow[]>(() => this.store.reservations().map((r) => this.toReservationRow(r)));

  protected readonly filteredStockPositionRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.stockPositionRows();
    return this.stockPositionRows().filter((row) =>
      [row.sku, row.productName, row.bin, row.lotOrSerial].join(' ').toLowerCase().includes(q),
    );
  });

  protected readonly filteredReservationRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.reservationRows();
    return this.reservationRows().filter((row) => [row.sku, row.productName].join(' ').toLowerCase().includes(q));
  });
}
