import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { PRODUCTS } from '../../../core/mock-data/products.data';
import { DISPOSITION_OUTCOME_LABELS, DispositionOutcome, INSPECTION_RESULT_LABELS } from '../../../core/mock-data/return-orders.data';
import { DISPOSITION_RULE, OUTCOMES_REQUIRING_BIN, ReturnsStore } from '../../../core/state/returns-store';

@Component({
  selector: 'app-operator-returns-disposition',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, TextInput],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @if (!order()) {
      <div class="p-6 font-core text-[15px] text-shade-40">{{ notFoundLabel() }}</div>
    } @else {
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-1 rounded-lg bg-canvas-operator-elevated p-6">
          <span class="font-mono text-xs text-shade-40">{{ order()!.rma }}</span>
          <span class="font-core text-2xl font-bold text-on-primary">{{ order()!.partner }}</span>
          <span class="font-mono text-sm text-accent-teal">{{ order()!.sourceRef }} · {{ resultLabel() }}</span>
        </div>
        @for (line of order()!.lines; track line.sku) {
          <div class="flex flex-col gap-1 rounded-lg bg-canvas-operator-elevated p-5">
            <span class="font-core text-lg font-bold text-on-primary">{{ line.productName[lang.lang()] }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ line.sku }} · {{ line.qty }} {{ unitsLabel() }}</span>
          </div>
        }
        @if (dispositionError(); as err) {
          <span class="font-core text-sm text-status-out-of-stock">{{ err }}</span>
        }
        @if (order()!.stage !== 'inspected') {
          <span class="font-core text-sm text-shade-40">{{ alreadyDispositionedLabel() }}</span>
        } @else {
          @if (needsBin()) {
            <lib-text-input [label]="binLabel()" [value]="binInput()" (valueChange)="binInput.set($event)" />
          }
          <div class="flex flex-col gap-3">
            @for (outcome of allowedOutcomes(); track outcome) {
              <lib-button variant="operator" [fullWidth]="true" (click)="submit(outcome)">{{ outcomeLabel(outcome) }}</lib-button>
            }
          </div>
        }
      </div>
    }
  `,
})
export class OperatorReturnsDisposition {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(ReturnsStore);

  readonly rma = input.required<string>();

  protected readonly order = computed(() => this.store.returnOrders().find((o) => o.rma === this.rma()));
  protected readonly dispositionError = signal<string | null>(null);

  protected readonly allowedOutcomes = computed(() => {
    const result = this.order()?.inspectionResult;
    return result ? DISPOSITION_RULE[result] : [];
  });

  /**
   * Shown whenever any currently-offered outcome could need a bin (Restock or Quarantine).
   * Each outcome is a single tap with no intermediate "select outcome, then confirm" step, so
   * the bin has to be visible and fillable before that tap for outcomes that require it — a
   * value entered here is only actually used by the store when the tapped outcome needs one.
   */
  protected readonly needsBin = computed(() => this.allowedOutcomes().some((o) => OUTCOMES_REQUIRING_BIN.includes(o)));
  protected readonly binInput = linkedSignal(() => {
    const sku = this.order()?.lines[0]?.sku;
    return sku ? (PRODUCTS.find((p) => p.sku === sku)?.bin ?? '') : '';
  });

  protected readonly notFoundLabel = computed(() => (this.lang.lang() === 'en' ? 'Return order not found' : 'Không tìm thấy đơn trả hàng'));
  protected readonly unitsLabel = computed(() => (this.lang.lang() === 'en' ? 'units' : 'cái'));
  protected readonly binLabel = computed(() => (this.lang.lang() === 'en' ? 'Disposition bin' : 'Ô kệ xử lý'));
  protected readonly resultLabel = computed(() => {
    const result = this.order()?.inspectionResult;
    return result ? INSPECTION_RESULT_LABELS[result][this.lang.lang()] : '';
  });
  protected readonly alreadyDispositionedLabel = computed(() =>
    this.lang.lang() === 'en' ? 'This order has already been dispositioned' : 'Đơn hàng này đã được xử lý',
  );

  protected outcomeLabel(outcome: DispositionOutcome): string {
    return DISPOSITION_OUTCOME_LABELS[outcome][this.lang.lang()];
  }

  protected submit(outcome: DispositionOutcome): void {
    const result = this.store.disposition(this.rma(), outcome, this.binInput());
    if (!result.ok) {
      this.dispositionError.set(result.error);
      return;
    }
    this.dispositionError.set(null);
    this.router.navigate(['/operator/returns']);
  }
}
