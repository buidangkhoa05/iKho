import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, DataPanel, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { Localized } from '../../../core/i18n/localized.type';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { resolveKpis, resolveTabs } from '../../../core/mock-data/admin-screen.util';
import { ADMIN_SCREENS } from '../../../core/mock-data/admin-screens.data';
import { PRODUCTS } from '../../../core/mock-data/products.data';
import { screenMeta, screenTitle, SCREENS } from '../../../core/mock-data/screens.data';
import { OutboundStore } from '../../../core/state/outbound-store';
import { OfficeDetailPanel, OfficeScreen } from '../../../shared/components/office-screen/office-screen';

const DATA = ADMIN_SCREENS.outbound;

interface DraftLine {
  sku: string;
  qty: string;
}

@Component({
  selector: 'app-office-outbound',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DataPanel, OfficeScreen, TextInput],
  template: `
    @if (allocateError(); as err) {
      <div class="rounded-lg bg-status-out-of-stock-10 px-4 py-3 font-core text-sm text-status-out-of-stock">{{ err }}</div>
    }
    @if (showCreateForm()) {
      <lib-data-panel [title]="formTitle()" [subtitle]="formSubtitle()">
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-3 gap-4">
            <lib-text-input [label]="customerLabel()" [value]="formCustomer()" (valueChange)="formCustomer.set($event)" />
            <lib-text-input [label]="dockLabel()" [value]="formDock()" (valueChange)="formDock.set($event)" />
            <lib-text-input [label]="cutoffLabel()" [value]="formCutoff()" (valueChange)="formCutoff.set($event)" />
          </div>
          @for (line of formLines(); track $index; let i = $index) {
            <div class="flex items-end gap-3">
              <lib-text-input [label]="skuLabel()" [value]="line.sku" (valueChange)="updateLineSku(i, $event)" />
              <lib-text-input [label]="qtyLabel()" type="number" [value]="line.qty" (valueChange)="updateLineQty(i, $event)" />
              @if (formLines().length > 1) {
                <lib-button variant="ghost" (click)="removeLine(i)">{{ removeLabel() }}</lib-button>
              }
            </div>
          }
          @if (formError(); as err) {
            <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
          }
          <div class="flex gap-3">
            <lib-button variant="secondary" (click)="addLine()">{{ addLineLabel() }}</lib-button>
            <lib-button variant="primary" (click)="submitCreate()">{{ submitLabel() }}</lib-button>
            <lib-button variant="ghost" (click)="cancelCreate()">{{ cancelLabel() }}</lib-button>
          </div>
        </div>
      </lib-data-panel>
    }
    <app-office-screen
      [title]="title()"
      [meta]="meta()"
      [primaryActionLabel]="primaryActionLabel()"
      [kpis]="kpis()"
      [tabs]="tabs()"
      [detailedTabId]="'main'"
      [searchPlaceholder]="searchPlaceholder()"
      [searchFields]="searchFields"
      [rowKey]="rowKey"
      [detail]="detail()"
      (primaryAction)="showCreateForm.set(true)"
    />
  `,
})
export class OfficeOutbound {
  private readonly lang = inject(LangService);
  private readonly store = inject(OutboundStore);

  protected readonly title = computed(() => screenTitle('outbound', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('outbound', 'admin', this.lang.lang()));
  protected readonly primaryActionLabel = computed(() => SCREENS.outbound.action[this.lang.lang()]);
  protected readonly kpis = computed(() => resolveKpis(DATA.kpis, this.lang.lang()));

  protected readonly tabs = computed(() =>
    resolveTabs(
      [
        { ...DATA.tabs[0], rows: this.store.salesOrders() },
        { ...DATA.tabs[1], rows: this.store.allocations() },
        { ...DATA.tabs[2], rows: this.store.shipments() },
      ],
      this.lang.lang(),
    ),
  );

  protected readonly searchPlaceholder = computed(() =>
    this.lang.lang() === 'en' ? 'Search SO, customer' : 'Tìm đơn bán, khách hàng',
  );
  protected readonly searchFields = ['so', 'customer'];
  protected readonly rowKey = (row: Record<string, unknown>) => String(row['so']);

  protected readonly allocateError = signal<string | null>(null);

  protected readonly detail = computed(() => {
    const lang = this.lang.lang();
    const eyebrow = lang === 'en' ? 'Sales order detail' : 'Chi tiết đơn bán';
    const shipmentsLabel = lang === 'en' ? 'Shipments' : 'Lô xuất';
    const allocateLabel = lang === 'en' ? 'Allocate' : 'Phân bổ';
    return (row: Record<string, unknown>): OfficeDetailPanel => {
      const status = row['status'] as OfficeDetailPanel['status'];
      const soId = String(row['so']);
      const lines = row['lines'] as { sku: string; productName: Localized<string>; orderedQty: number; allocatedQty: number }[];
      const soShipments = this.store.shipments().filter((s) => s.so === soId);
      return {
        eyebrow,
        title: String(row['customer']),
        code: soId,
        status,
        statusLabel: resolveStatusLabel({ status, label: row['label'] as Localized<string> | undefined }, lang),
        fields: [
          { label: lang === 'en' ? 'Dock' : 'Cửa kho', value: String(row['dock']) },
          { label: lang === 'en' ? 'Cut-off' : 'Giờ chốt', value: String(row['cutoff']) },
          ...lines.map((l) => ({ label: l.productName[lang], value: `${l.allocatedQty} / ${l.orderedQty}` })),
          { label: shipmentsLabel, value: soShipments.length ? soShipments.map((s) => `${s.shipment} (${s.carrier})`).join(', ') : '—' },
        ],
        action: status === 'inbound' ? { label: allocateLabel, onClick: () => this.handleAllocate(soId) } : undefined,
      };
    };
  });

  protected handleAllocate(soId: string): void {
    const result = this.store.allocate(soId);
    this.allocateError.set(result.ok ? null : result.error);
  }

  protected readonly formTitle = computed(() => (this.lang.lang() === 'en' ? 'Create sales order' : 'Tạo đơn bán hàng'));
  protected readonly formSubtitle = computed(() =>
    this.lang.lang() === 'en' ? 'Customer, dock, cut-off and ordered lines' : 'Khách hàng, cửa kho, giờ chốt và dòng đặt hàng',
  );
  protected readonly customerLabel = computed(() => (this.lang.lang() === 'en' ? 'Customer' : 'Khách hàng'));
  protected readonly dockLabel = computed(() => (this.lang.lang() === 'en' ? 'Dock' : 'Cửa kho'));
  protected readonly cutoffLabel = computed(() => (this.lang.lang() === 'en' ? 'Cut-off' : 'Giờ chốt'));
  protected readonly skuLabel = computed(() => 'SKU');
  protected readonly qtyLabel = computed(() => (this.lang.lang() === 'en' ? 'Quantity' : 'Số lượng'));
  protected readonly addLineLabel = computed(() => (this.lang.lang() === 'en' ? 'Add line' : 'Thêm dòng'));
  protected readonly removeLabel = computed(() => (this.lang.lang() === 'en' ? 'Remove' : 'Xoá'));
  protected readonly submitLabel = computed(() => (this.lang.lang() === 'en' ? 'Create' : 'Tạo'));
  protected readonly cancelLabel = computed(() => (this.lang.lang() === 'en' ? 'Cancel' : 'Huỷ'));

  protected readonly showCreateForm = signal(false);
  protected readonly formCustomer = signal('');
  protected readonly formDock = signal('');
  protected readonly formCutoff = signal('');
  protected readonly formLines = signal<DraftLine[]>([{ sku: '', qty: '' }]);
  protected readonly formError = signal<string | null>(null);

  protected addLine(): void {
    this.formLines.update((lines) => [...lines, { sku: '', qty: '' }]);
  }

  protected removeLine(index: number): void {
    this.formLines.update((lines) => lines.filter((_, i) => i !== index));
  }

  protected updateLineSku(index: number, sku: string): void {
    this.formLines.update((lines) => lines.map((l, i) => (i === index ? { ...l, sku } : l)));
  }

  protected updateLineQty(index: number, qty: string): void {
    this.formLines.update((lines) => lines.map((l, i) => (i === index ? { ...l, qty } : l)));
  }

  protected submitCreate(): void {
    const customer = this.formCustomer().trim();
    const dock = this.formDock().trim();
    const cutoff = this.formCutoff().trim();
    const lang = this.lang.lang();

    if (!customer || !dock || !cutoff) {
      this.formError.set(lang === 'en' ? 'Customer, dock and cut-off are required.' : 'Cần nhập khách hàng, cửa kho và giờ chốt.');
      return;
    }

    const lines: { sku: string; qty: number }[] = [];
    for (const line of this.formLines()) {
      const sku = line.sku.trim();
      const qty = Number(line.qty);
      if (!sku || !PRODUCTS.some((p) => p.sku === sku)) {
        this.formError.set(lang === 'en' ? `Unknown SKU: ${sku || '(empty)'}` : `SKU không hợp lệ: ${sku || '(trống)'}`);
        return;
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        this.formError.set(lang === 'en' ? `Quantity for ${sku} must be greater than 0.` : `Số lượng của ${sku} phải lớn hơn 0.`);
        return;
      }
      lines.push({ sku, qty });
    }

    this.store.createSalesOrder({ customer, dock, cutoff, lines });
    this.formError.set(null);
    this.formCustomer.set('');
    this.formDock.set('');
    this.formCutoff.set('');
    this.formLines.set([{ sku: '', qty: '' }]);
    this.showCreateForm.set(false);
  }

  protected cancelCreate(): void {
    this.formError.set(null);
    this.showCreateForm.set(false);
  }
}
