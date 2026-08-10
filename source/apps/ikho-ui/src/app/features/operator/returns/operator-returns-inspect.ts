import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { INSPECTION_RESULT_LABELS, InspectionResult, REASON_LABELS, ReturnReasonCode } from '../../../core/mock-data/return-orders.data';
import { ReturnsStore } from '../../../core/state/returns-store';

@Component({
  selector: 'app-operator-returns-inspect',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @if (!order()) {
      <div class="p-6 font-core text-[15px] text-shade-40">{{ notFoundLabel() }}</div>
    } @else {
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-1 rounded-lg bg-canvas-operator-elevated p-6">
          <span class="font-mono text-xs text-shade-40">{{ order()!.rma }}</span>
          <span class="font-core text-2xl font-bold text-on-primary">{{ order()!.partner }}</span>
          <span class="font-mono text-sm text-accent-teal">{{ order()!.sourceRef }}</span>
        </div>
        @for (line of order()!.lines; track line.sku) {
          <div class="flex flex-col gap-1 rounded-lg bg-canvas-operator-elevated p-5">
            <span class="font-core text-lg font-bold text-on-primary">{{ line.productName[lang.lang()] }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ line.sku }} · {{ line.qty }} {{ unitsLabel() }} · {{ reasonLabel(line.reasonCode) }}</span>
          </div>
        }
        @if (inspectError(); as err) {
          <span class="font-core text-sm text-status-out-of-stock">{{ err }}</span>
        }
        @if (order()!.stage !== 'received') {
          <span class="font-core text-sm text-shade-40">{{ alreadyInspectedLabel() }}</span>
        } @else {
          <div class="flex flex-col gap-3">
            <lib-button variant="operator" [fullWidth]="true" (click)="submit('Good')">{{ goodLabel() }}</lib-button>
            <lib-button variant="operator" [fullWidth]="true" (click)="submit('Damaged')">{{ damagedLabel() }}</lib-button>
            <lib-button variant="operator" [fullWidth]="true" (click)="submit('Defective')">{{ defectiveLabel() }}</lib-button>
          </div>
        }
      </div>
    }
  `,
})
export class OperatorReturnsInspect {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(ReturnsStore);

  readonly rma = input.required<string>();

  protected readonly order = computed(() => this.store.returnOrders().find((o) => o.rma === this.rma()));
  protected readonly inspectError = signal<string | null>(null);

  protected readonly notFoundLabel = computed(() => (this.lang.lang() === 'en' ? 'Return order not found' : 'Không tìm thấy đơn trả hàng'));
  protected readonly unitsLabel = computed(() => (this.lang.lang() === 'en' ? 'units' : 'cái'));
  protected readonly goodLabel = computed(() => INSPECTION_RESULT_LABELS.Good[this.lang.lang()]);
  protected readonly damagedLabel = computed(() => INSPECTION_RESULT_LABELS.Damaged[this.lang.lang()]);
  protected readonly defectiveLabel = computed(() => INSPECTION_RESULT_LABELS.Defective[this.lang.lang()]);
  protected readonly alreadyInspectedLabel = computed(() =>
    this.lang.lang() === 'en' ? 'This order has already been inspected' : 'Đơn hàng này đã được kiểm tra',
  );

  protected reasonLabel(code: ReturnReasonCode): string {
    return REASON_LABELS[code][this.lang.lang()];
  }

  protected submit(result: InspectionResult): void {
    const outcome = this.store.inspect(this.rma(), result);
    if (!outcome.ok) {
      this.inspectError.set(outcome.error);
      return;
    }
    this.inspectError.set(null);
    this.router.navigate(['/operator/returns']);
  }
}
