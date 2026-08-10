import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, DataPanel, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { Localized } from '../../../core/i18n/localized.type';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { resolveKpis, resolveTabs } from '../../../core/mock-data/admin-screen.util';
import { ADMIN_SCREENS } from '../../../core/mock-data/admin-screens.data';
import { PRODUCTS } from '../../../core/mock-data/products.data';
import {
  DISPOSITION_OUTCOME_LABELS,
  DispositionOutcome,
  INSPECTION_RESULT_LABELS,
  InspectionResult,
  REASON_LABELS,
  ReturnOrderLine,
  ReturnReasonCode,
} from '../../../core/mock-data/return-orders.data';
import { screenMeta, screenTitle, SCREENS } from '../../../core/mock-data/screens.data';
import { ReturnsStore } from '../../../core/state/returns-store';
import { OfficeDetailPanel, OfficeScreen } from '../../../shared/components/office-screen/office-screen';

const DATA = ADMIN_SCREENS.returns;
const REASON_CODES: ReturnReasonCode[] = ['Damaged', 'WrongItem', 'Defective', 'CustomerCancelled', 'NoLongerNeeded'];

interface DraftLine {
  sku: string;
  qty: string;
  reasonCode: ReturnReasonCode;
}

@Component({
  selector: 'app-office-returns',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DataPanel, OfficeScreen, TextInput],
  template: `
    @if (showCreateForm()) {
      <lib-data-panel [title]="formTitle()" [subtitle]="formSubtitle()">
        <div class="flex flex-col gap-4">
          <div class="flex gap-3">
            <lib-button [variant]="formType() === 'customer' ? 'primary' : 'secondary'" (click)="formType.set('customer')">{{ customerTypeLabel() }}</lib-button>
            <lib-button [variant]="formType() === 'supplier' ? 'primary' : 'secondary'" (click)="formType.set('supplier')">{{ supplierTypeLabel() }}</lib-button>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <lib-text-input [label]="partnerLabel()" [value]="formPartner()" (valueChange)="formPartner.set($event)" />
            <lib-text-input [label]="sourceRefLabel()" [value]="formSourceRef()" (valueChange)="formSourceRef.set($event)" />
          </div>
          @for (line of formLines(); track $index; let i = $index) {
            <div class="flex items-end gap-3">
              <lib-text-input [label]="skuLabel()" [value]="line.sku" (valueChange)="updateLineSku(i, $event)" />
              <lib-text-input [label]="qtyLabel()" type="number" [value]="line.qty" (valueChange)="updateLineQty(i, $event)" />
              <label class="flex w-full flex-col gap-1.5">
                <span class="font-core text-[13px] font-semibold text-ink">{{ reasonLabel() }}</span>
                <select
                  class="rounded-input border border-hairline-light bg-canvas-light px-3 py-2 font-core text-body-md text-text-body outline-none focus:border-primary"
                  [value]="line.reasonCode"
                  (change)="updateLineReason(i, $any($event.target).value)"
                >
                  @for (code of reasonCodes; track code) {
                    <option [value]="code">{{ reasonCodeLabel(code) }}</option>
                  }
                </select>
              </label>
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
export class OfficeReturns {
  private readonly lang = inject(LangService);
  private readonly store = inject(ReturnsStore);

  protected readonly reasonCodes = REASON_CODES;

  protected readonly title = computed(() => screenTitle('returns', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('returns', 'admin', this.lang.lang()));
  protected readonly primaryActionLabel = computed(() => SCREENS.returns.action[this.lang.lang()]);
  protected readonly kpis = computed(() => resolveKpis(DATA.kpis, this.lang.lang()));

  protected readonly tabs = computed(() =>
    resolveTabs(
      [
        { ...DATA.tabs[0], rows: this.store.returnOrders() },
        { ...DATA.tabs[1], rows: this.store.inspections() },
        { ...DATA.tabs[2], rows: this.store.dispositions() },
      ],
      this.lang.lang(),
    ),
  );

  protected readonly searchPlaceholder = computed(() =>
    this.lang.lang() === 'en' ? 'Search RMA, partner' : 'Tìm phiếu trả, đối tác',
  );
  protected readonly searchFields = ['rma', 'partner'];
  protected readonly rowKey = (row: Record<string, unknown>) => String(row['rma']);

  protected readonly detail = computed(() => {
    const lang = this.lang.lang();
    const eyebrow = lang === 'en' ? 'Return order detail' : 'Chi tiết đơn trả hàng';
    const typeLabel = lang === 'en' ? 'Type' : 'Loại';
    const sourceRefLabel = lang === 'en' ? 'Source' : 'Nguồn gốc';
    const inspectionLabel = lang === 'en' ? 'Inspection' : 'Kiểm tra';
    const dispositionLabel = lang === 'en' ? 'Disposition' : 'Xử lý';
    const customerTypeValueLabel = lang === 'en' ? 'Customer return' : 'Trả từ khách hàng';
    const supplierTypeValueLabel = lang === 'en' ? 'Supplier return' : 'Trả cho NCC';
    return (row: Record<string, unknown>): OfficeDetailPanel => {
      const status = row['status'] as OfficeDetailPanel['status'];
      const lines = row['lines'] as ReturnOrderLine[];
      const inspectionResult = row['inspectionResult'] as InspectionResult | undefined;
      const dispositionOutcome = row['dispositionOutcome'] as DispositionOutcome | undefined;
      const dispositionBin = row['dispositionBin'] as string | undefined;
      return {
        eyebrow,
        title: String(row['partner']),
        code: String(row['rma']),
        status,
        statusLabel: resolveStatusLabel({ status, label: row['label'] as Localized<string> | undefined }, lang),
        fields: [
          { label: typeLabel, value: row['type'] === 'customer' ? customerTypeValueLabel : supplierTypeValueLabel },
          { label: sourceRefLabel, value: String(row['sourceRef']) },
          ...lines.map((l) => ({ label: l.productName[lang], value: `${l.qty} · ${REASON_LABELS[l.reasonCode][lang]}` })),
          { label: inspectionLabel, value: inspectionResult ? INSPECTION_RESULT_LABELS[inspectionResult][lang] : '—' },
          {
            label: dispositionLabel,
            value: dispositionOutcome
              ? `${DISPOSITION_OUTCOME_LABELS[dispositionOutcome][lang]}${dispositionBin ? ` (${dispositionBin})` : ''}`
              : '—',
          },
        ],
      };
    };
  });

  protected readonly formTitle = computed(() => (this.lang.lang() === 'en' ? 'Log return' : 'Ghi nhận trả hàng'));
  protected readonly formSubtitle = computed(() =>
    this.lang.lang() === 'en' ? 'Type, partner, source reference and returned lines' : 'Loại, đối tác, chứng từ gốc và dòng trả hàng',
  );
  protected readonly customerTypeLabel = computed(() => (this.lang.lang() === 'en' ? 'Customer return' : 'Trả từ khách hàng'));
  protected readonly supplierTypeLabel = computed(() => (this.lang.lang() === 'en' ? 'Supplier return' : 'Trả cho NCC'));
  protected readonly partnerLabel = computed(() =>
    this.formType() === 'customer'
      ? this.lang.lang() === 'en' ? 'Customer' : 'Khách hàng'
      : this.lang.lang() === 'en' ? 'Supplier' : 'Nhà cung cấp',
  );
  protected readonly sourceRefLabel = computed(() =>
    this.formType() === 'customer'
      ? this.lang.lang() === 'en' ? 'Original SO' : 'Đơn bán gốc'
      : this.lang.lang() === 'en' ? 'Original PO' : 'Đơn mua gốc',
  );
  protected readonly reasonLabel = computed(() => (this.lang.lang() === 'en' ? 'Reason' : 'Lý do'));
  protected readonly skuLabel = computed(() => 'SKU');
  protected readonly qtyLabel = computed(() => (this.lang.lang() === 'en' ? 'Quantity' : 'Số lượng'));
  protected readonly addLineLabel = computed(() => (this.lang.lang() === 'en' ? 'Add line' : 'Thêm dòng'));
  protected readonly removeLabel = computed(() => (this.lang.lang() === 'en' ? 'Remove' : 'Xoá'));
  protected readonly submitLabel = computed(() => (this.lang.lang() === 'en' ? 'Create' : 'Tạo'));
  protected readonly cancelLabel = computed(() => (this.lang.lang() === 'en' ? 'Cancel' : 'Huỷ'));

  protected readonly showCreateForm = signal(false);
  protected readonly formType = signal<'customer' | 'supplier'>('customer');
  protected readonly formPartner = signal('');
  protected readonly formSourceRef = signal('');
  protected readonly formLines = signal<DraftLine[]>([{ sku: '', qty: '', reasonCode: 'Damaged' }]);
  protected readonly formError = signal<string | null>(null);

  protected reasonCodeLabel(code: ReturnReasonCode): string {
    return REASON_LABELS[code][this.lang.lang()];
  }

  protected addLine(): void {
    this.formLines.update((lines) => [...lines, { sku: '', qty: '', reasonCode: 'Damaged' }]);
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

  protected updateLineReason(index: number, reasonCode: string): void {
    this.formLines.update((lines) => lines.map((l, i) => (i === index ? { ...l, reasonCode: reasonCode as ReturnReasonCode } : l)));
  }

  protected submitCreate(): void {
    const partner = this.formPartner().trim();
    const sourceRef = this.formSourceRef().trim();
    const lang = this.lang.lang();

    if (!partner || !sourceRef) {
      this.formError.set(lang === 'en' ? 'Partner and source reference are required.' : 'Cần nhập đối tác và chứng từ gốc.');
      return;
    }

    const lines: { sku: string; qty: number; reasonCode: ReturnReasonCode }[] = [];
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
      lines.push({ sku, qty, reasonCode: line.reasonCode });
    }

    this.store.createReturnOrder({ type: this.formType(), partner, sourceRef, lines });
    this.formError.set(null);
    this.formPartner.set('');
    this.formSourceRef.set('');
    this.formLines.set([{ sku: '', qty: '', reasonCode: 'Damaged' }]);
    this.showCreateForm.set(false);
  }

  protected cancelCreate(): void {
    this.formError.set(null);
    this.showCreateForm.set(false);
  }
}
