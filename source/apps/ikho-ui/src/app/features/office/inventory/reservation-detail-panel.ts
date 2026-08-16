import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Button, Icon, StatusBadge } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { StockReservation } from '../../../core/mock-data/inventory.data';

@Component({
  selector: 'app-reservation-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, StatusBadge],
  host: { class: 'block' },
  template: `
    <aside class="flex w-96 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ t().eyebrow }}</span>
          <span class="font-mono text-[13px] text-primary">{{ reservation().sku }}</span>
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

      <lib-status-badge [status]="statusBadge().status" [label]="statusBadge().label" />

      <div class="flex flex-col gap-1.5 border-t border-hairline-light pt-4">
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().warehouse }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ warehouseName() }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().quantity }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ reservation().quantity }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().reference }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ referenceText() }}</span>
        </div>
      </div>

      @if (reservation().status === 'active') {
        <lib-button variant="primary" [fullWidth]="true" (click)="release.emit()">{{ t().release }}</lib-button>
      }
      @if (releaseError(); as err) {
        <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
      }
    </aside>
  `,
})
export class ReservationDetailPanel {
  protected readonly lang = inject(LangService);

  readonly reservation = input.required<StockReservation>();
  readonly productName = input.required<string>();
  readonly warehouseName = input.required<string>();

  readonly closePanel = output<void>();
  readonly release = output<void>();

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      eyebrow: en ? 'Reservation detail' : 'Chi tiết giữ hàng',
      close: en ? 'Close' : 'Đóng',
      warehouse: en ? 'Warehouse' : 'Kho',
      quantity: en ? 'Quantity' : 'Số lượng',
      reference: en ? 'Reference' : 'Tham chiếu',
      active: en ? 'Active' : 'Đang giữ',
      released: en ? 'Released' : 'Đã nhả',
      fulfilled: en ? 'Fulfilled' : 'Đã hoàn tất',
      none: en ? '—' : '—',
      release: en ? 'Release' : 'Nhả giữ',
    };
  });

  protected readonly referenceText = computed(() => {
    const r = this.reservation();
    return r.referenceType && r.referenceId ? `${r.referenceType} ${r.referenceId}` : this.t().none;
  });

  protected readonly statusBadge = computed(() => {
    const status = this.reservation().status;
    const t = this.t();
    if (status === 'active') return { status: 'in-stock' as const, label: t.active };
    if (status === 'fulfilled') return { status: 'outbound' as const, label: t.fulfilled };
    return { status: 'out-of-stock' as const, label: t.released };
  });

  protected readonly releaseError = signal<string | null>(null);

  constructor() {
    // Resets state whenever the selected reservation changes AND after any successful release for it —
    // the store's immutable updates give reservation() a new object identity on every mutation, so a
    // release "closes" its own error state as a side effect.
    effect(() => {
      this.reservation();
      this.releaseError.set(null);
    });
  }

  /** Lets the parent surface a store-side outcome (e.g. not-found, not-active) for this reservation. */
  setReleaseError(message: string): void {
    this.releaseError.set(message);
  }
}
