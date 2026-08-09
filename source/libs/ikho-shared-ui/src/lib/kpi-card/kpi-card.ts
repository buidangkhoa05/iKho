import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { StockStatus } from '../status-badge/status-badge';

const TREND_CLASS: Partial<Record<StockStatus, string>> = {
  'in-stock': 'text-status-in-stock',
  'low-stock': 'text-status-low-stock',
  'out-of-stock': 'text-status-out-of-stock',
};

@Component({
  selector: 'lib-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: 'block h-full' },
  template: `
    <div
      class="flex h-full flex-col gap-2 rounded-lg border border-hairline-light bg-canvas-light p-5 shadow-card"
    >
      <div class="flex items-center justify-between">
        <span class="font-core text-micro tracking-[0.3px] text-shade-50 uppercase">{{ label() }}</span>
        @if (icon(); as name) {
          <lib-icon [name]="name" [size]="18" color="var(--color-shade-40)" />
        }
      </div>
      <div class="font-core text-[32px] leading-[1.2] font-[650] tracking-[-0.4px] text-ink">
        {{ value() }}
        @if (unit(); as u) {
          <span class="ml-1 font-core text-body-md text-shade-50">{{ u }}</span>
        }
      </div>
      <div class="mt-auto flex items-baseline gap-2">
        @if (trend(); as t) {
          <span class="font-core text-[13px] font-semibold" [class]="trendClass()">{{ t }}</span>
        }
        @if (caption(); as c) {
          <span class="font-core text-[13px] text-shade-50">{{ c }}</span>
        }
      </div>
    </div>
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly unit = input<string | undefined>(undefined);
  readonly trend = input<string | undefined>(undefined);
  readonly trendStatus = input<StockStatus | undefined>(undefined);
  readonly caption = input<string | undefined>(undefined);
  readonly icon = input<string | undefined>(undefined);

  readonly trendClass = computed(() => {
    const status = this.trendStatus();
    return (status && TREND_CLASS[status]) ?? 'text-shade-50';
  });
}
