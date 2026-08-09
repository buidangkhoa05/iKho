import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, DataPanel, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { Localized } from '../../../core/i18n/localized.type';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { resolveKpis, resolveTabs } from '../../../core/mock-data/admin-screen.util';
import { ADMIN_SCREENS } from '../../../core/mock-data/admin-screens.data';
import { PRODUCTS } from '../../../core/mock-data/products.data';
import { screenMeta, screenTitle, SCREENS } from '../../../core/mock-data/screens.data';
import { InboundStore } from '../../../core/state/inbound-store';
import { OfficeDetailPanel, OfficeScreen } from '../../../shared/components/office-screen/office-screen';

const DATA = ADMIN_SCREENS.inbound;

interface DraftLine {
  sku: string;
  qty: string;
}

@Component({
  selector: 'app-office-inbound',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DataPanel, OfficeScreen, TextInput],
  template: `
    @if (showCreateForm()) {
      <lib-data-panel [title]="formTitle()" [subtitle]="formSubtitle()">
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-2 gap-4">
            <lib-text-input [label]="supplierLabel()" [value]="formSupplier()" (valueChange)="formSupplier.set($event)" />
            <lib-text-input [label]="dockLabel()" [value]="formDock()" (valueChange)="formDock.set($event)" />
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
export class OfficeInbound {
  private readonly lang = inject(LangService);
  private readonly store = inject(InboundStore);

  protected readonly title = computed(() => screenTitle('inbound', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('inbound', 'admin', this.lang.lang()));
  protected readonly primaryActionLabel = computed(() => SCREENS.inbound.action[this.lang.lang()]);
  protected readonly kpis = computed(() => resolveKpis(DATA.kpis, this.lang.lang()));

  protected readonly tabs = computed(() =>
    resolveTabs(
      [
        { ...DATA.tabs[0], rows: this.store.purchaseOrders() },
        { ...DATA.tabs[1], rows: this.store.receipts() },
        { ...DATA.tabs[2], rows: this.store.putawayTasks() },
      ],
      this.lang.lang(),
    ),
  );

  protected readonly searchPlaceholder = computed(() =>
    this.lang.lang() === 'en' ? 'Search PO, supplier' : 'Tìm đơn mua, nhà cung cấp',
  );
  protected readonly searchFields = ['po', 'supplier'];
  protected readonly rowKey = (row: Record<string, unknown>) => String(row['po']);

  protected readonly detail = computed(() => {
    const lang = this.lang.lang();
    const eyebrow = lang === 'en' ? 'Purchase order detail' : 'Chi tiết đơn mua';
    const receiptsLabel = lang === 'en' ? 'Receipts' : 'Phiếu nhập';
    return (row: Record<string, unknown>): OfficeDetailPanel => {
      const status = row['status'] as OfficeDetailPanel['status'];
      const lines = row['lines'] as { sku: string; productName: Localized<string>; expectedQty: number; receivedQty: number }[];
      const poReceipts = this.store.receipts().filter((r) => r.po === row['po']);
      return {
        eyebrow,
        title: String(row['supplier']),
        code: String(row['po']),
        status,
        statusLabel: resolveStatusLabel({ status, label: row['label'] as Localized<string> | undefined }, lang),
        fields: [
          { label: lang === 'en' ? 'Dock' : 'Cửa kho', value: String(row['dock']) },
          { label: lang === 'en' ? 'ETA' : 'Giờ đến', value: String(row['eta']) },
          ...lines.map((l) => ({ label: l.productName[lang], value: `${l.receivedQty} / ${l.expectedQty}` })),
          { label: receiptsLabel, value: poReceipts.length ? poReceipts.map((r) => `${r.id} (${r.lines})`).join(', ') : '—' },
        ],
      };
    };
  });

  protected readonly formTitle = computed(() => (this.lang.lang() === 'en' ? 'Create purchase order' : 'Tạo đơn mua hàng'));
  protected readonly formSubtitle = computed(() =>
    this.lang.lang() === 'en' ? 'Supplier, dock and expected lines' : 'Nhà cung cấp, cửa kho và dòng dự kiến',
  );
  protected readonly supplierLabel = computed(() => (this.lang.lang() === 'en' ? 'Supplier' : 'Nhà cung cấp'));
  protected readonly dockLabel = computed(() => (this.lang.lang() === 'en' ? 'Dock' : 'Cửa kho'));
  protected readonly skuLabel = computed(() => 'SKU');
  protected readonly qtyLabel = computed(() => (this.lang.lang() === 'en' ? 'Quantity' : 'Số lượng'));
  protected readonly addLineLabel = computed(() => (this.lang.lang() === 'en' ? 'Add line' : 'Thêm dòng'));
  protected readonly removeLabel = computed(() => (this.lang.lang() === 'en' ? 'Remove' : 'Xoá'));
  protected readonly submitLabel = computed(() => (this.lang.lang() === 'en' ? 'Create' : 'Tạo'));
  protected readonly cancelLabel = computed(() => (this.lang.lang() === 'en' ? 'Cancel' : 'Huỷ'));

  protected readonly showCreateForm = signal(false);
  protected readonly formSupplier = signal('');
  protected readonly formDock = signal('');
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
    const supplier = this.formSupplier().trim();
    const dock = this.formDock().trim();
    const lang = this.lang.lang();

    if (!supplier || !dock) {
      this.formError.set(lang === 'en' ? 'Supplier and dock are required.' : 'Cần nhập nhà cung cấp và cửa kho.');
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

    this.store.createPurchaseOrder({ supplier, dock, lines });
    this.formError.set(null);
    this.formSupplier.set('');
    this.formDock.set('');
    this.formLines.set([{ sku: '', qty: '' }]);
    this.showCreateForm.set(false);
  }

  protected cancelCreate(): void {
    this.formError.set(null);
    this.showCreateForm.set(false);
  }
}
