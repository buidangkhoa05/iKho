import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { OutboundStore } from '../../../core/state/outbound-store';

@Component({
  selector: 'app-operator-outbound-dispatch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @if (!order()) {
      <div class="p-6 font-core text-[15px] text-shade-40">{{ notFoundLabel() }}</div>
    } @else {
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-1 rounded-lg bg-canvas-operator-elevated p-6">
          <span class="font-mono text-xs text-shade-40">{{ order()!.so }}</span>
          <span class="font-core text-2xl font-bold text-on-primary">{{ order()!.customer }}</span>
          <span class="font-mono text-sm text-accent-teal">{{ order()!.dock }} · {{ cutoffLabel() }} {{ order()!.cutoff }}</span>
        </div>
        @for (line of order()!.lines; track line.sku) {
          <div class="flex flex-col gap-1 rounded-lg bg-canvas-operator-elevated p-5">
            <span class="font-core text-lg font-bold text-on-primary">{{ line.productName[lang.lang()] }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ line.sku }} · {{ line.allocatedQty }} {{ unitsLabel() }}</span>
          </div>
        }
        @if (dispatchError(); as err) {
          <span class="font-core text-sm text-status-out-of-stock">{{ err }}</span>
        }
        @if (order()!.status !== 'outbound') {
          <span class="font-core text-sm text-shade-40">{{ alreadyDispatchedLabel() }}</span>
        } @else {
          <lib-button variant="operator" [fullWidth]="true" (click)="confirm()">{{ confirmLabel() }}</lib-button>
        }
      </div>
    }
  `,
})
export class OperatorOutboundDispatch {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(OutboundStore);

  readonly soId = input.required<string>();

  protected readonly order = computed(() => this.store.salesOrders().find((o) => o.so === this.soId()));
  protected readonly dispatchError = signal<string | null>(null);

  protected readonly notFoundLabel = computed(() => (this.lang.lang() === 'en' ? 'Sales order not found' : 'Không tìm thấy đơn bán'));
  protected readonly cutoffLabel = computed(() => (this.lang.lang() === 'en' ? 'Cut-off:' : 'Giờ chốt:'));
  protected readonly unitsLabel = computed(() => (this.lang.lang() === 'en' ? 'units' : 'cái'));
  protected readonly confirmLabel = computed(() => (this.lang.lang() === 'en' ? 'Confirm dispatch' : 'Xác nhận xuất kho'));
  protected readonly alreadyDispatchedLabel = computed(() =>
    this.lang.lang() === 'en' ? 'This order has already been dispatched' : 'Đơn hàng này đã được xuất kho',
  );

  protected confirm(): void {
    const result = this.store.dispatch(this.soId());
    if (!result.ok) {
      this.dispatchError.set(result.error);
      return;
    }
    this.dispatchError.set(null);
    this.router.navigate(['/operator/outbound']);
  }
}
