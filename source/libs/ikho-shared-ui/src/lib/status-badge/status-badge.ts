import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock' | 'inbound' | 'outbound' | 'returns';

const STATUS_CLASSES: Record<StockStatus, string> = {
  'in-stock': 'bg-status-in-stock-10 text-status-in-stock',
  'low-stock': 'bg-status-low-stock-10 text-status-low-stock',
  'out-of-stock': 'bg-status-out-of-stock-10 text-status-out-of-stock',
  inbound: 'bg-status-inbound-10 text-status-inbound',
  outbound: 'bg-status-outbound-10 text-status-outbound',
  returns: 'bg-status-returns-10 text-status-returns',
};

const DEFAULT_LABEL: Record<StockStatus, string> = {
  'in-stock': 'In stock',
  'low-stock': 'Low stock',
  'out-of-stock': 'Out of stock',
  inbound: 'Inbound',
  outbound: 'Outbound',
  returns: 'Returns',
};

@Component({
  selector: 'lib-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <span
      class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-badge px-2.5 py-0.5 font-core text-caption tracking-[0.12px]"
      [class]="colorClasses()"
    >
      @if (dot()) {
        <span class="size-1.5 flex-none rounded-full bg-current"></span>
      }
      {{ label() ?? defaultLabel() }}
    </span>
  `,
})
export class StatusBadge {
  readonly status = input.required<StockStatus>();
  readonly label = input<string | undefined>(undefined);
  readonly dot = input(true);

  readonly colorClasses = computed(() => STATUS_CLASSES[this.status()]);
  readonly defaultLabel = computed(() => DEFAULT_LABEL[this.status()]);
}
