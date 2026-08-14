import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Button, Icon, StatusBadge, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { Invoice, InvoiceStatus } from '../../../core/mock-data/billing.data';
import { formatCurrency } from './billing-format.util';

function statusBadgeOf(status: InvoiceStatus): 'in-stock' | 'low-stock' | 'inbound' | 'out-of-stock' {
  switch (status) {
    case 'paid':
      return 'in-stock';
    case 'partially-paid':
      return 'low-stock';
    case 'void':
      return 'out-of-stock';
    default:
      return 'inbound';
  }
}

@Component({
  selector: 'app-invoice-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, StatusBadge, TextInput],
  host: { class: 'block' },
  template: `
    <aside class="flex w-96 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ t().eyebrow }}</span>
          <span class="font-mono text-[13px] text-primary">{{ invoice().code }}</span>
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

      <lib-status-badge [status]="statusBadge()" [label]="statusLabel()" />

      <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().warehouse }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ warehouseName() }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().issued }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ invoice().issuedOnUtc.slice(0, 10) }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().total }}</span>
          <span class="text-right font-mono text-[13px] font-semibold text-text-body">{{ formatCurrency(invoice().totalAmount) }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().lines }}</span>
        @for (l of invoice().lines; track l.id) {
          <div class="flex items-center justify-between gap-2 rounded-md border border-hairline-light p-2.5">
            <div class="flex flex-col gap-0.5">
              <span class="font-core text-[13px] text-text-body">{{ l.productName }}</span>
              <span class="font-mono text-[11px] text-shade-50">{{ l.productCode }} · {{ l.quantity }} × {{ formatCurrency(l.unitPrice) }}</span>
            </div>
            <span class="font-mono text-[13px] font-semibold text-text-body">{{ formatCurrency(l.lineTotal) }}</span>
          </div>
        }
      </div>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().payments }}</span>
        @for (p of invoice().payments; track p.id) {
          <div class="flex items-center justify-between gap-2 rounded-md border border-hairline-light p-2.5">
            <div class="flex flex-col gap-0.5">
              <span class="font-core text-[13px] text-text-body">{{ p.method }}</span>
              <span class="font-mono text-[11px] text-shade-50">{{ p.paidOnUtc.slice(0, 10) }}</span>
            </div>
            <span class="font-mono text-[13px] font-semibold text-text-body">{{ formatCurrency(p.amount) }}</span>
          </div>
        } @empty {
          <span class="font-core text-[13px] text-shade-50">{{ t().noPayments }}</span>
        }
        @if (showPaymentForm()) {
          <div class="flex flex-col gap-2 rounded-md border border-hairline-light p-2.5">
            <lib-text-input [label]="t().amount" type="number" [value]="paymentAmount()" (valueChange)="paymentAmount.set($event)" />
            <lib-text-input [label]="t().method" [value]="paymentMethod()" (valueChange)="paymentMethod.set($event)" />
            <lib-text-input [label]="t().referenceNote" [value]="paymentReferenceNote()" (valueChange)="paymentReferenceNote.set($event)" />
            @if (paymentError(); as err) {
              <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
            }
            <div class="flex gap-2">
              <lib-button variant="primary" (click)="submitPayment()">{{ t().savePayment }}</lib-button>
              <lib-button variant="ghost" (click)="cancelPayment()">{{ t().cancel }}</lib-button>
            </div>
          </div>
        } @else {
          <lib-button variant="secondary" (click)="showPaymentForm.set(true)">{{ t().recordPaymentAction }}</lib-button>
        }
      </div>
    </aside>
  `,
})
export class InvoiceDetailPanel {
  protected readonly lang = inject(LangService);
  protected readonly strings = UI_STRINGS;
  protected readonly formatCurrency = formatCurrency;

  readonly invoice = input.required<Invoice>();
  readonly customerName = input.required<string>();
  readonly warehouseName = input.required<string>();

  readonly closePanel = output<void>();
  readonly recordPayment = output<{ amount: number; method: string; referenceNote?: string }>();

  protected readonly statusBadge = computed(() => statusBadgeOf(this.invoice().status));
  protected readonly statusLabel = computed(() => {
    const t = this.t();
    switch (this.invoice().status) {
      case 'paid':
        return t.statusPaid;
      case 'partially-paid':
        return t.statusPartiallyPaid;
      case 'void':
        return t.statusVoid;
      default:
        return t.statusIssued;
    }
  });

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      eyebrow: en ? 'Invoice detail' : 'Chi tiết hoá đơn',
      warehouse: en ? 'Warehouse' : 'Kho',
      issued: en ? 'Issued' : 'Ngày phát hành',
      total: en ? 'Total' : 'Tổng cộng',
      lines: en ? 'Lines' : 'Dòng hoá đơn',
      payments: en ? 'Payments' : 'Thanh toán',
      noPayments: en ? 'No payments yet.' : 'Chưa có thanh toán.',
      recordPaymentAction: en ? 'Record payment' : 'Ghi nhận thanh toán',
      savePayment: en ? 'Save payment' : 'Lưu thanh toán',
      cancel: en ? 'Cancel' : 'Huỷ',
      amount: en ? 'Amount' : 'Số tiền',
      method: en ? 'Method' : 'Hình thức',
      referenceNote: en ? 'Reference note' : 'Ghi chú',
      paymentRequired: en ? 'Amount and Method are required.' : 'Cần nhập số tiền và hình thức.',
      statusIssued: en ? 'Issued' : 'Đã phát hành',
      statusPartiallyPaid: en ? 'Partially paid' : 'Thanh toán một phần',
      statusPaid: en ? 'Paid' : 'Đã thanh toán',
      statusVoid: en ? 'Void' : 'Đã huỷ',
    };
  });

  protected readonly showPaymentForm = signal(false);
  protected readonly paymentAmount = signal('');
  protected readonly paymentMethod = signal('');
  protected readonly paymentReferenceNote = signal('');
  protected readonly paymentError = signal<string | null>(null);

  constructor() {
    // Resets the payment form whenever the selected invoice changes AND after any successful
    // payment for this invoice — the store's immutable updates give invoice() a new object
    // identity on every mutation, so recording a payment "closes" its own form as a side effect.
    effect(() => {
      this.invoice();
      this.showPaymentForm.set(false);
      this.paymentAmount.set('');
      this.paymentMethod.set('');
      this.paymentReferenceNote.set('');
      this.paymentError.set(null);
    });
  }

  protected submitPayment(): void {
    const amount = Number(this.paymentAmount());
    const method = this.paymentMethod().trim();
    if (!amount || amount <= 0 || !method) {
      this.paymentError.set(this.t().paymentRequired);
      return;
    }
    this.recordPayment.emit({ amount, method, referenceNote: this.paymentReferenceNote().trim() || undefined });
  }

  protected cancelPayment(): void {
    this.showPaymentForm.set(false);
    this.paymentAmount.set('');
    this.paymentMethod.set('');
    this.paymentReferenceNote.set('');
    this.paymentError.set(null);
  }

  /** Lets the parent surface a store-side outcome (e.g. exceeds-total) for the open payment form. */
  setPaymentError(message: string): void {
    this.paymentError.set(message);
  }
}
