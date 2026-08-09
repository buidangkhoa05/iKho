import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { PRODUCTS } from '../../../core/mock-data/products.data';
import { DockReceiptLineInput, InboundStore } from '../../../core/state/inbound-store';

interface ConfirmedLine {
  sku: string;
  productName: string;
  qty: number;
  exceptionReason?: string;
  lotNumber?: string;
  expirationDate?: string;
  serialNumbers?: string[];
}

@Component({
  selector: 'app-operator-inbound-receive',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, TextInput],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @if (!order()) {
      <div class="p-6 font-core text-[15px] text-shade-40">{{ notFoundLabel() }}</div>
    } @else if (view() === 'summary') {
      <div class="flex flex-col gap-4">
        <span class="font-core text-xl font-bold text-on-primary">{{ summaryTitle() }}</span>
        @for (line of confirmed(); track line.sku) {
          <div class="flex flex-col gap-1 rounded-lg bg-canvas-operator-elevated p-5">
            <span class="font-core text-lg font-bold text-on-primary">{{ line.productName }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ line.qty }} {{ unitsLabel() }}</span>
            @if (line.exceptionReason) {
              <span class="font-core text-sm text-status-low-stock">{{ line.exceptionReason }}</span>
            }
          </div>
        }
        <lib-button variant="operator" [fullWidth]="true" (click)="complete()">{{ completeLabel() }}</lib-button>
      </div>
    } @else if (currentLine(); as line) {
      <div class="flex flex-col gap-5">
        <div>
          <span class="font-mono text-xs text-shade-40">{{ order()!.po }} · {{ lineProgressLabel() }}</span>
          <div class="font-core text-2xl font-bold text-on-primary">{{ line.productName[lang.lang()] }}</div>
          <span class="font-mono text-sm text-accent-teal">{{ line.sku }} · {{ expectedLabel() }} {{ remainingQty() }}</span>
        </div>

        <lib-text-input [label]="qtyLabel()" type="number" [value]="qtyInput()" (valueChange)="qtyInput.set($event)" />

        @if (needsLot()) {
          <lib-text-input [label]="lotLabel()" [value]="lotInput()" (valueChange)="lotInput.set($event)" />
          <lib-text-input [label]="expirationLabel()" [value]="expirationInput()" (valueChange)="expirationInput.set($event)" />
        }
        @if (needsSerial()) {
          <lib-text-input [label]="serialLabel()" [value]="serialInput()" (valueChange)="serialInput.set($event)" [hint]="serialHint()" />
        }

        @if (hasMismatch()) {
          <div class="flex flex-col gap-2 rounded-lg bg-status-low-stock-10 p-4">
            <span class="font-core text-sm font-semibold text-status-low-stock">{{ mismatchLabel() }}</span>
            <lib-text-input [label]="reasonLabel()" [value]="reasonInput()" (valueChange)="reasonInput.set($event)" />
          </div>
        }

        <lib-button variant="operator" [fullWidth]="true" [disabled]="!canConfirmLine()" (click)="confirmLine()">{{ confirmLabel() }}</lib-button>
      </div>
    }
  `,
})
export class OperatorInboundReceive {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(InboundStore);

  readonly poId = input.required<string>();

  protected readonly order = computed(() => this.store.purchaseOrders().find((po) => po.po === this.poId()));

  protected readonly lineIndex = signal(0);
  protected readonly view = signal<'lines' | 'summary'>('lines');
  protected readonly confirmed = signal<ConfirmedLine[]>([]);

  protected readonly qtyInput = signal('');
  protected readonly lotInput = signal('');
  protected readonly expirationInput = signal('');
  protected readonly serialInput = signal('');
  protected readonly reasonInput = signal('');

  protected readonly currentLine = computed(() => this.order()?.lines[this.lineIndex()]);

  protected readonly remainingQty = computed(() => {
    const line = this.currentLine();
    return line ? Math.max(0, line.expectedQty - line.receivedQty) : 0;
  });

  protected readonly product = computed(() => PRODUCTS.find((p) => p.sku === this.currentLine()?.sku));
  protected readonly needsLot = computed(() => this.product()?.tracking.en === 'Lot-controlled');
  protected readonly needsSerial = computed(() => this.product()?.tracking.en === 'Serial-controlled');

  protected readonly hasMismatch = computed(() => {
    const qty = Number(this.qtyInput());
    return this.qtyInput() !== '' && Number.isFinite(qty) && qty !== this.remainingQty();
  });

  protected readonly canConfirmLine = computed(() => {
    const qty = Number(this.qtyInput());
    if (this.qtyInput() === '' || !Number.isFinite(qty) || qty < 0) return false;
    return !this.hasMismatch() || this.reasonInput().trim().length > 0;
  });

  protected readonly lineProgressLabel = computed(() => {
    const total = this.order()?.lines.length ?? 0;
    return this.lang.lang() === 'en' ? `Line ${this.lineIndex() + 1} of ${total}` : `Dòng ${this.lineIndex() + 1}/${total}`;
  });

  protected readonly notFoundLabel = computed(() => (this.lang.lang() === 'en' ? 'Purchase order not found' : 'Không tìm thấy đơn mua'));
  protected readonly expectedLabel = computed(() => (this.lang.lang() === 'en' ? 'Remaining:' : 'Còn lại:'));
  protected readonly qtyLabel = computed(() => (this.lang.lang() === 'en' ? 'Quantity received' : 'Số lượng nhận'));
  protected readonly lotLabel = computed(() => (this.lang.lang() === 'en' ? 'Lot number' : 'Số lô'));
  protected readonly expirationLabel = computed(() => (this.lang.lang() === 'en' ? 'Expiration date' : 'Hạn sử dụng'));
  protected readonly serialLabel = computed(() => (this.lang.lang() === 'en' ? 'Serial numbers' : 'Số serial'));
  protected readonly serialHint = computed(() => (this.lang.lang() === 'en' ? 'Comma-separated' : 'Cách nhau bằng dấu phẩy'));
  protected readonly mismatchLabel = computed(() =>
    this.lang.lang() === 'en' ? 'Quantity differs from expected — a reason is required.' : 'Số lượng khác dự kiến — cần nhập lý do.',
  );
  protected readonly reasonLabel = computed(() => (this.lang.lang() === 'en' ? 'Reason' : 'Lý do'));
  protected readonly confirmLabel = computed(() => (this.lang.lang() === 'en' ? 'Confirm line' : 'Xác nhận dòng'));
  protected readonly summaryTitle = computed(() => (this.lang.lang() === 'en' ? 'Review and complete' : 'Xem lại và hoàn tất'));
  protected readonly unitsLabel = computed(() => (this.lang.lang() === 'en' ? 'units' : 'cái'));
  protected readonly completeLabel = computed(() => (this.lang.lang() === 'en' ? 'Complete receiving' : 'Hoàn tất nhận hàng'));

  protected confirmLine(): void {
    const line = this.currentLine();
    const order = this.order();
    if (!line || !order) return;

    const qty = Number(this.qtyInput());
    const mismatch = this.hasMismatch();
    this.confirmed.update((lines) => [
      ...lines,
      {
        sku: line.sku,
        productName: line.productName[this.lang.lang()],
        qty,
        exceptionReason: mismatch ? this.reasonInput().trim() : undefined,
        lotNumber: this.needsLot() ? this.lotInput().trim() || undefined : undefined,
        expirationDate: this.needsLot() ? this.expirationInput().trim() || undefined : undefined,
        serialNumbers: this.needsSerial()
          ? this.serialInput()
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      },
    ]);

    this.qtyInput.set('');
    this.lotInput.set('');
    this.expirationInput.set('');
    this.serialInput.set('');
    this.reasonInput.set('');

    if (this.lineIndex() + 1 < order.lines.length) {
      this.lineIndex.update((i) => i + 1);
    } else {
      this.view.set('summary');
    }
  }

  protected complete(): void {
    const lines: DockReceiptLineInput[] = this.confirmed().map((c) => ({
      sku: c.sku,
      qty: c.qty,
      exceptionReason: c.exceptionReason ? { en: c.exceptionReason, vi: c.exceptionReason } : undefined,
      lotNumber: c.lotNumber,
      expirationDate: c.expirationDate,
      serialNumbers: c.serialNumbers,
    }));
    this.store.recordDockReceipt(this.poId(), lines);
    this.router.navigate(['/operator/inbound']);
  }
}
