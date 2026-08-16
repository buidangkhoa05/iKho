import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Button, Icon, StatusBadge, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { StockItem, StockLedgerEntry } from '../../../core/mock-data/inventory.data';
import { availableOf } from './inventory-format.util';

const MOVEMENT_LABEL: Record<StockLedgerEntry['movementType'], { en: string; vi: string }> = {
  receipt: { en: 'Receipt', vi: 'Nhập kho' },
  adjustment: { en: 'Adjustment', vi: 'Điều chỉnh' },
  reservation: { en: 'Reservation', vi: 'Giữ hàng' },
  release: { en: 'Release', vi: 'Nhả giữ' },
  shipment: { en: 'Shipment', vi: 'Xuất kho' },
  'quarantine-receipt': { en: 'Quarantine receipt', vi: 'Nhập cách ly' },
};

const REASON_CODES = ['CYCLE_COUNT', 'DAMAGE', 'SHRINKAGE', 'FOUND'] as const;

@Component({
  selector: 'app-stock-item-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, StatusBadge, TextInput],
  host: { class: 'block' },
  template: `
    <aside class="flex w-96 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ t().eyebrow }}</span>
          <span class="font-mono text-[13px] text-primary">{{ stockItem().sku }}</span>
          <span class="font-core text-lg font-bold tracking-[-0.2px] text-ink">{{ productName() }}</span>
        </div>
        <button
          type="button"
          class="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent hover:bg-surface-elevated-light"
          [attr.aria-label]="t().close"
          (click)="closePanel.emit()"
        >
          <lib-icon name="x" [size]="18" color="var(--color-shade-50)" />
        </button>
      </div>

      <lib-status-badge [status]="stockItem().status" [label]="statusLabel()" />

      <div class="flex flex-col gap-1.5 border-t border-hairline-light pt-4">
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().warehouse }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ warehouseName() }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().bin }}</span>
          <span class="text-right font-mono text-[13px] font-semibold text-text-body">{{ stockItem().bin }}</span>
        </div>
        @if (stockItem().lot; as lot) {
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().lot }}</span>
            <span class="text-right font-mono text-[13px] font-semibold text-text-body">{{ lot.lotNumber }}</span>
          </div>
        }
        @if (stockItem().serial; as serial) {
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().serial }}</span>
            <span class="text-right font-mono text-[13px] font-semibold text-text-body">{{ serial.serialValue }}</span>
          </div>
        }
      </div>

      <div class="flex flex-col gap-1.5 border-t border-hairline-light pt-4">
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().onHand }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ stockItem().onHand }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().reserved }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ stockItem().reserved }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().damaged }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ stockItem().damaged }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().quarantine }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ stockItem().quarantine }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] font-semibold text-ink">{{ t().available }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-ink">{{ available() }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
        @if (adjusting()) {
          <lib-text-input [label]="t().quantityDelta" type="number" [value]="adjustDelta()" (valueChange)="adjustDelta.set($event)" />
          <label class="flex flex-col gap-1.5">
            <span class="font-core text-[13px] font-semibold text-ink">{{ t().reasonCode }}</span>
            <select
              class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
              [value]="adjustReasonCode()"
              (change)="adjustReasonCode.set($any($event.target).value)"
            >
              <option value="">{{ t().selectReason }}</option>
              @for (code of reasonCodes; track code) {
                <option [value]="code">{{ reasonLabel(code) }}</option>
              }
            </select>
          </label>
          <lib-text-input [label]="t().notes" [value]="adjustNotes()" (valueChange)="adjustNotes.set($event)" />
          @if (adjustError(); as err) {
            <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
          }
          <div class="flex gap-2">
            <lib-button variant="primary" (click)="submitAdjustment()">{{ t().save }}</lib-button>
            <lib-button variant="ghost" (click)="cancelAdjustment()">{{ t().cancel }}</lib-button>
          </div>
        } @else {
          <lib-button variant="secondary" (click)="startAdjust()">{{ t().adjust }}</lib-button>
        }
      </div>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().ledger }}</span>
        @for (entry of ledgerEntries(); track entry.id) {
          <div class="flex flex-col gap-0.5 rounded-md border border-hairline-light p-2.5">
            <div class="flex items-center justify-between gap-2">
              <span class="font-core text-[13px] font-semibold text-text-body">{{ movementLabel(entry.movementType) }}</span>
              <span class="font-mono text-[13px]" [class]="entry.quantityDelta < 0 ? 'text-status-out-of-stock' : 'text-status-in-stock'">
                {{ entry.quantityDelta > 0 ? '+' : '' }}{{ entry.quantityDelta }}
              </span>
            </div>
            <span class="font-core text-xs text-shade-50">{{ entry.occurredOnUtc.slice(0, 10) }}@if (entry.reasonCode) { · {{ entry.reasonCode }} }</span>
          </div>
        } @empty {
          <span class="font-core text-[13px] text-shade-50">{{ t().noLedgerEntries }}</span>
        }
      </div>
    </aside>
  `,
})
export class StockItemDetailPanel {
  protected readonly lang = inject(LangService);
  protected readonly reasonCodes = REASON_CODES;

  readonly stockItem = input.required<StockItem>();
  readonly productName = input.required<string>();
  readonly warehouseName = input.required<string>();
  readonly ledgerEntries = input.required<StockLedgerEntry[]>();

  readonly closePanel = output<void>();
  readonly saveAdjustment = output<{ quantityDelta: number; reasonCode: string; notes: string }>();

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      eyebrow: en ? 'Stock detail' : 'Chi tiết tồn kho',
      close: en ? 'Close' : 'Đóng',
      warehouse: en ? 'Warehouse' : 'Kho',
      bin: en ? 'Bin' : 'Ô kệ',
      lot: en ? 'Lot' : 'Lô',
      serial: en ? 'Serial' : 'Serial',
      onHand: en ? 'On hand' : 'Tồn thực',
      reserved: en ? 'Reserved' : 'Đã giữ',
      damaged: en ? 'Damaged' : 'Hư hỏng',
      quarantine: en ? 'Quarantine' : 'Cách ly',
      available: en ? 'Available' : 'Khả dụng',
      adjust: en ? 'Adjust' : 'Điều chỉnh',
      quantityDelta: en ? 'Quantity change' : 'Thay đổi số lượng',
      reasonCode: en ? 'Reason' : 'Lý do',
      selectReason: en ? 'Select a reason' : 'Chọn lý do',
      notes: en ? 'Notes' : 'Ghi chú',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      adjustRequired: en ? 'A reason and a non-zero quantity change are required.' : 'Cần nhập lý do và số lượng thay đổi khác 0.',
      wouldGoNegative: en ? 'This change would leave on-hand quantity negative.' : 'Thay đổi này sẽ khiến tồn thực âm.',
      ledger: en ? 'Ledger' : 'Sổ cái',
      noLedgerEntries: en ? 'No history yet.' : 'Chưa có lịch sử.',
    };
  });

  protected readonly statusLabel = computed(() => resolveStatusLabel({ status: this.stockItem().status }, this.lang.lang()));
  protected readonly available = computed(() => availableOf(this.stockItem()));

  protected readonly adjusting = signal(false);
  protected readonly adjustDelta = signal('');
  protected readonly adjustReasonCode = signal('');
  protected readonly adjustNotes = signal('');
  protected readonly adjustError = signal<string | null>(null);

  constructor() {
    // Resets state whenever the selected stock item changes AND after any successful save for it —
    // the store's immutable updates give stockItem() a new object identity on every mutation, so a
    // save "closes" its own adjust form as a side effect.
    effect(() => {
      this.stockItem();
      this.adjusting.set(false);
      this.adjustError.set(null);
      this.adjustDelta.set('');
      this.adjustReasonCode.set('');
      this.adjustNotes.set('');
    });
  }

  protected reasonLabel(code: (typeof REASON_CODES)[number]): string {
    const labels: Record<(typeof REASON_CODES)[number], { en: string; vi: string }> = {
      CYCLE_COUNT: { en: 'Cycle count', vi: 'Kiểm kê' },
      DAMAGE: { en: 'Damage', vi: 'Hư hỏng' },
      SHRINKAGE: { en: 'Shrinkage', vi: 'Hao hụt' },
      FOUND: { en: 'Found', vi: 'Tìm thấy' },
    };
    return labels[code][this.lang.lang()];
  }

  protected movementLabel(type: StockLedgerEntry['movementType']): string {
    return MOVEMENT_LABEL[type][this.lang.lang()];
  }

  protected startAdjust(): void {
    this.adjustError.set(null);
    this.adjusting.set(true);
  }

  protected submitAdjustment(): void {
    const delta = Number(this.adjustDelta());
    const reasonCode = this.adjustReasonCode().trim();
    if (!reasonCode || Number.isNaN(delta) || delta === 0) {
      this.adjustError.set(this.t().adjustRequired);
      return;
    }
    if (this.stockItem().onHand + delta < 0) {
      this.adjustError.set(this.t().wouldGoNegative);
      return;
    }
    this.saveAdjustment.emit({ quantityDelta: delta, reasonCode, notes: this.adjustNotes().trim() });
  }

  protected cancelAdjustment(): void {
    this.adjusting.set(false);
    this.adjustDelta.set('');
    this.adjustReasonCode.set('');
    this.adjustNotes.set('');
    this.adjustError.set(null);
  }

  /** Lets the parent surface a store-side outcome (e.g. not-found) for the open adjust form. */
  setAdjustError(message: string): void {
    this.adjustError.set(message);
  }
}
