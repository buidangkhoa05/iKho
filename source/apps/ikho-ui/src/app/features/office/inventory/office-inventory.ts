import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { DataPanel, DataTable, DataTableColumn, KpiCard, TextInput } from '@ikho/shared-ui';
import { Button } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { StockItem, StockReservation } from '../../../core/mock-data/inventory.data';
import { screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
import { CatalogStore } from '../../../core/state/catalogue-store';
import { InventoryStore } from '../../../core/state/inventory-store';
import { OrganizationStore } from '../../../core/state/organization-store';
import { ReservationDetailPanel } from './reservation-detail-panel';
import { StockItemDetailPanel } from './stock-item-detail-panel';

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
  imports: [Button, DataPanel, DataTable, KpiCard, ReservationDetailPanel, StockItemDetailPanel, TextInput],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
          <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
        </div>
        @if (activeSection() === 'stock-positions') {
          <lib-button variant="primary" (click)="showReceiveForm.set(!showReceiveForm())">{{ t().receiveStock }}</lib-button>
        }
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
        @if (showReceiveForm()) {
          <lib-data-panel [title]="t().receiveStock">
            <div class="flex flex-col gap-3">
              <label class="flex flex-col gap-1.5">
                <span class="font-core text-[13px] font-semibold text-ink">{{ t().product }}</span>
                <select
                  class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
                  [value]="receiveSku()"
                  (change)="receiveSku.set($any($event.target).value)"
                >
                  <option value="">{{ t().selectProduct }}</option>
                  @for (p of catalog.products(); track p.sku) {
                    @if (p.isActive) {
                      <option [value]="p.sku">{{ p.sku }} — {{ p.name }}</option>
                    }
                  }
                </select>
              </label>
              <label class="flex flex-col gap-1.5">
                <span class="font-core text-[13px] font-semibold text-ink">{{ t().warehouse }}</span>
                <select
                  class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
                  [value]="receiveWarehouseCode()"
                  (change)="receiveWarehouseCode.set($any($event.target).value)"
                >
                  <option value="">{{ t().selectWarehouse }}</option>
                  @for (w of organization.warehouses(); track w.code) {
                    @if (w.isActive) {
                      <option [value]="w.code">{{ w.name }}</option>
                    }
                  }
                </select>
              </label>
              <lib-text-input [label]="t().bin" [value]="receiveBin()" (valueChange)="receiveBin.set($event)" />
              <lib-text-input [label]="t().quantity" type="number" [value]="receiveQuantity()" (valueChange)="receiveQuantity.set($event)" />
              @if (receiveProductIsLotControlled(); as isLot) {
                @if (isLot) {
                  <lib-text-input [label]="t().lotNumber" [value]="receiveLotNumber()" (valueChange)="receiveLotNumber.set($event)" />
                  <lib-text-input [label]="t().expirationDate" type="text" [placeholder]="t().expirationDatePlaceholder" [value]="receiveExpirationDate()" (valueChange)="receiveExpirationDate.set($event)" />
                }
              }
              @if (receiveProductIsSerialControlled(); as isSerial) {
                @if (isSerial) {
                  <lib-text-input [label]="t().serialNumbers" [hint]="t().serialNumbersHint" [value]="receiveSerialNumbers()" (valueChange)="receiveSerialNumbers.set($event)" />
                }
              }
              @if (receiveError(); as err) {
                <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
              }
              <div class="flex gap-2">
                <lib-button variant="primary" (click)="submitReceive()">{{ t().save }}</lib-button>
                <lib-button variant="ghost" (click)="cancelReceive()">{{ t().cancel }}</lib-button>
              </div>
            </div>
          </lib-data-panel>
        }
        <div class="flex items-start gap-5">
          <div class="min-w-0 flex-1">
            <lib-data-panel [title]="t().stockPositionsPanelTitle">
              <lib-data-table [columns]="stockPositionColumns()" [rows]="filteredStockPositionRows()" [emptyLabel]="t().noStockPositions" [clickable]="true" (rowClick)="onStockPositionRowClick($event)" />
            </lib-data-panel>
          </div>
          @if (selectedStockItem(); as item) {
            <app-stock-item-detail-panel
              #stockItemDetailPanel
              [stockItem]="item"
              [productName]="nameOfProduct(item.sku)"
              [warehouseName]="nameOfWarehouse(item.warehouseCode)"
              [ledgerEntries]="selectedStockItemLedger()"
              (closePanel)="selectedStockItemId.set(null)"
              (saveAdjustment)="onSaveAdjustment($event)"
            />
          }
        </div>
      } @else {
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchReservationsPlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <div class="flex items-start gap-5">
          <div class="min-w-0 flex-1">
            <lib-data-panel [title]="t().reservationsPanelTitle">
              <lib-data-table [columns]="reservationColumns()" [rows]="filteredReservationRows()" [emptyLabel]="t().noReservations" [clickable]="true" (rowClick)="onReservationRowClick($event)" />
            </lib-data-panel>
          </div>
          @if (selectedReservation(); as r) {
            <app-reservation-detail-panel
              #reservationDetailPanel
              [reservation]="r"
              [productName]="nameOfProduct(r.sku)"
              [warehouseName]="nameOfWarehouse(r.warehouseCode)"
              (closePanel)="selectedReservationId.set(null)"
              (release)="onReleaseReservation()"
            />
          }
        </div>
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
      receiveStock: en ? 'Receive stock' : 'Nhập kho',
      product: en ? 'Product' : 'Sản phẩm',
      selectProduct: en ? 'Select a product' : 'Chọn sản phẩm',
      warehouse: en ? 'Warehouse' : 'Kho',
      selectWarehouse: en ? 'Select a warehouse' : 'Chọn kho',
      bin: en ? 'Bin' : 'Ô kệ',
      quantity: en ? 'Quantity' : 'Số lượng',
      lotNumber: en ? 'Lot number' : 'Số lô',
      expirationDate: en ? 'Expiration date (optional)' : 'Ngày hết hạn (tuỳ chọn)',
      expirationDatePlaceholder: en ? 'YYYY-MM-DD' : 'YYYY-MM-DD',
      serialNumbers: en ? 'Serial numbers' : 'Số serial',
      serialNumbersHint: en ? 'Comma-separated, one per unit.' : 'Cách nhau bởi dấu phẩy, mỗi giá trị một đơn vị.',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      receiveInvalidError: en ? 'Select a product and warehouse, enter a bin, and a quantity greater than zero.' : 'Chọn sản phẩm, kho, nhập ô kệ và số lượng lớn hơn 0.',
      productNotFoundError: en ? 'This product could not be found or is inactive.' : 'Không tìm thấy sản phẩm này hoặc đã ngừng hoạt động.',
      lotRequiredError: en ? 'This product is lot-controlled; a lot number is required.' : 'Sản phẩm này theo lô; cần nhập số lô.',
      serialRequiredError: en ? 'This product is serial-controlled; serial numbers are required.' : 'Sản phẩm này theo serial; cần nhập số serial.',
      serialCountMismatchError: en ? 'The number of serial numbers must equal the quantity.' : 'Số lượng serial phải bằng số lượng nhập.',
      duplicateSerialError: en ? 'Serial numbers must not contain duplicates.' : 'Số serial không được trùng lặp.',
      stockItemNotFoundError: en ? 'This stock item could not be found. It may have changed.' : 'Không tìm thấy vị trí tồn kho này. Có thể đã thay đổi.',
      wouldGoNegativeError: en ? 'This change would leave on-hand quantity negative.' : 'Thay đổi này sẽ khiến tồn thực âm.',
      reservationNotFoundError: en ? 'This reservation could not be found. It may have changed.' : 'Không tìm thấy giữ hàng này. Có thể đã thay đổi.',
      reservationNotActiveError: en ? 'This reservation is no longer active.' : 'Giữ hàng này không còn hiệu lực.',
    };
  });

  protected readonly activeSection = signal<InventorySection>('stock-positions');
  protected readonly query = signal('');

  protected readonly selectedStockItemId = signal<string | null>(null);
  protected readonly stockItemDetailPanel = viewChild<StockItemDetailPanel>('stockItemDetailPanel');

  protected readonly selectedStockItem = computed<StockItem | null>(() => {
    const id = this.selectedStockItemId();
    if (!id) return null;
    return this.store.stockItems().find((i) => i.id === id) ?? null;
  });

  protected readonly selectedStockItemLedger = computed(() => {
    const id = this.selectedStockItemId();
    if (!id) return [];
    return this.store.ledger().filter((e) => e.stockItemId === id);
  });

  protected readonly selectedReservationId = signal<string | null>(null);
  protected readonly reservationDetailPanel = viewChild<ReservationDetailPanel>('reservationDetailPanel');

  protected readonly selectedReservation = computed<StockReservation | null>(() => {
    const id = this.selectedReservationId();
    if (!id) return null;
    return this.store.reservations().find((r) => r.id === id) ?? null;
  });

  protected readonly showReceiveForm = signal(false);
  protected readonly receiveSku = signal('');
  protected readonly receiveWarehouseCode = signal('');
  protected readonly receiveBin = signal('');
  protected readonly receiveQuantity = signal('');
  protected readonly receiveLotNumber = signal('');
  protected readonly receiveExpirationDate = signal('');
  protected readonly receiveSerialNumbers = signal('');
  protected readonly receiveError = signal<string | null>(null);

  protected readonly receiveProductIsLotControlled = computed(() => this.catalog.products().find((p) => p.sku === this.receiveSku())?.isLotControlled ?? false);
  protected readonly receiveProductIsSerialControlled = computed(() => this.catalog.products().find((p) => p.sku === this.receiveSku())?.isSerialControlled ?? false);

  protected selectSection(section: InventorySection): void {
    this.activeSection.set(section);
    this.query.set('');
    this.selectedStockItemId.set(null);
    this.selectedReservationId.set(null);
    this.cancelReceive();
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

  protected onStockPositionRowClick(row: Record<string, unknown>): void {
    this.selectedStockItemId.set(String(row['id']));
  }

  protected onSaveAdjustment(input: { quantityDelta: number; reasonCode: string; notes: string }): void {
    const item = this.selectedStockItem();
    if (!item) return;
    const outcome = this.store.adjustStock(item.id, input);
    if (outcome === 'not-found') {
      this.stockItemDetailPanel()?.setAdjustError(this.t().stockItemNotFoundError);
    } else if (outcome === 'would-go-negative') {
      this.stockItemDetailPanel()?.setAdjustError(this.t().wouldGoNegativeError);
    }
  }

  protected submitReceive(): void {
    const quantity = Number(this.receiveQuantity());
    if (!this.receiveSku() || !this.receiveWarehouseCode() || !this.receiveBin().trim() || !quantity || quantity <= 0) {
      this.receiveError.set(this.t().receiveInvalidError);
      return;
    }

    const serialNumbers = this.receiveSerialNumbers()
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const outcome = this.store.receiveStock({
      sku: this.receiveSku(),
      warehouseCode: this.receiveWarehouseCode(),
      bin: this.receiveBin().trim(),
      quantity,
      lotNumber: this.receiveLotNumber().trim() || undefined,
      expirationDateUtc: this.receiveExpirationDate().trim() || undefined,
      serialNumbers: serialNumbers.length > 0 ? serialNumbers : undefined,
    });

    if (outcome === 'ok') {
      this.cancelReceive();
      return;
    }
    if (outcome === 'invalid') this.receiveError.set(this.t().receiveInvalidError);
    else if (outcome === 'product-not-found') this.receiveError.set(this.t().productNotFoundError);
    else if (outcome === 'lot-required') this.receiveError.set(this.t().lotRequiredError);
    else if (outcome === 'serial-required') this.receiveError.set(this.t().serialRequiredError);
    else if (outcome === 'serial-count-mismatch') this.receiveError.set(this.t().serialCountMismatchError);
    else if (outcome === 'duplicate-serial') this.receiveError.set(this.t().duplicateSerialError);
  }

  protected cancelReceive(): void {
    this.showReceiveForm.set(false);
    this.receiveSku.set('');
    this.receiveWarehouseCode.set('');
    this.receiveBin.set('');
    this.receiveQuantity.set('');
    this.receiveLotNumber.set('');
    this.receiveExpirationDate.set('');
    this.receiveSerialNumbers.set('');
    this.receiveError.set(null);
  }

  protected onReservationRowClick(row: Record<string, unknown>): void {
    this.selectedReservationId.set(String(row['id']));
  }

  protected onReleaseReservation(): void {
    const r = this.selectedReservation();
    if (!r) return;
    const outcome = this.store.releaseReservation(r.id);
    if (outcome === 'not-found') {
      this.reservationDetailPanel()?.setReleaseError(this.t().reservationNotFoundError);
    } else if (outcome === 'not-active') {
      this.reservationDetailPanel()?.setReleaseError(this.t().reservationNotActiveError);
    }
  }
}
