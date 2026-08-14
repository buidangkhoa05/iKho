import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Icon, StatusBadge } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { CreditNote } from '../../../core/mock-data/billing.data';
import { formatCurrency } from './billing-format.util';

@Component({
  selector: 'app-credit-note-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusBadge],
  host: { class: 'block' },
  template: `
    <aside class="flex w-96 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ t().eyebrow }}</span>
          <span class="font-mono text-[13px] text-primary">{{ creditNote().code }}</span>
          <span class="font-core text-lg font-bold tracking-[-0.2px] text-ink">{{ customerName() }}</span>
        </div>
        <button
          type="button"
          class="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent hover:bg-surface-elevated-light"
          [attr.aria-label]="lang.pick(strings.close)"
          (click)="closePanel.emit()"
        >
          <lib-icon name="x" [size]="18" color="var(--color-shade-50)" />
        </button>
      </div>

      <lib-status-badge [status]="creditNote().status === 'void' ? 'out-of-stock' : 'inbound'" [label]="statusLabel()" />

      <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().issued }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ creditNote().issuedOnUtc.slice(0, 10) }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().total }}</span>
          <span class="text-right font-mono text-[13px] font-semibold text-text-body">{{ formatCurrency(creditNote().totalAmount) }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().lines }}</span>
        @for (l of creditNote().lines; track l.id) {
          <div class="flex items-center justify-between gap-2 rounded-md border border-hairline-light p-2.5">
            <div class="flex flex-col gap-0.5">
              <span class="font-core text-[13px] text-text-body">{{ l.productName }}</span>
              <span class="font-mono text-[11px] text-shade-50">{{ l.productCode }} · {{ l.quantity }} × {{ formatCurrency(l.unitPrice) }}</span>
            </div>
            <span class="font-mono text-[13px] font-semibold text-text-body">{{ formatCurrency(l.lineTotal) }}</span>
          </div>
        }
      </div>
    </aside>
  `,
})
export class CreditNoteDetailPanel {
  protected readonly lang = inject(LangService);
  protected readonly strings = UI_STRINGS;
  protected readonly formatCurrency = formatCurrency;

  readonly creditNote = input.required<CreditNote>();
  readonly customerName = input.required<string>();

  readonly closePanel = output<void>();

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      eyebrow: en ? 'Credit note detail' : 'Chi tiết giấy báo có',
      issued: en ? 'Issued' : 'Ngày phát hành',
      total: en ? 'Total' : 'Tổng cộng',
      lines: en ? 'Lines' : 'Dòng giấy báo có',
      statusIssued: en ? 'Issued' : 'Đã phát hành',
      statusVoid: en ? 'Void' : 'Đã huỷ',
    };
  });

  protected readonly statusLabel = computed(() => (this.creditNote().status === 'void' ? this.t().statusVoid : this.t().statusIssued));
}
