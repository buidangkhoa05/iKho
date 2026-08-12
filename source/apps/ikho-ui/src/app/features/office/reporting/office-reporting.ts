import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DataPanel, DataTable, KpiCard } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveTabs } from '../../../core/mock-data/admin-screen.util';
import { ADMIN_SCREENS } from '../../../core/mock-data/admin-screens.data';
import { screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
import { ReportingStore } from '../../../core/state/reporting-store';
import { FulfillmentTrendChart } from './fulfillment-trend-chart';

const DATA = ADMIN_SCREENS.reporting;

@Component({
  selector: 'app-office-reporting',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataPanel, DataTable, FulfillmentTrendChart, KpiCard],
  template: `
    <div class="flex flex-col gap-6">
      <div>
        <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
        <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
      </div>

      <div class="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        @for (k of kpis(); track k.label) {
          <lib-kpi-card [label]="k.label" [value]="k.value" />
        }
      </div>

      <app-fulfillment-trend-chart [data]="store.fulfillmentKpis()" />

      @for (tab of tabs(); track tab.id) {
        <lib-data-panel [title]="tab.label" [subtitle]="tab.subtitle">
          <lib-data-table [columns]="tab.columns" [rows]="tab.rows" />
        </lib-data-panel>
      }
    </div>
  `,
})
export class OfficeReporting {
  private readonly lang = inject(LangService);
  protected readonly store = inject(ReportingStore);

  protected readonly title = computed(() => screenTitle('reporting', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('reporting', 'admin', this.lang.lang()));

  protected readonly kpis = computed(() => {
    const lang = this.lang.lang();
    const days = this.store.fulfillmentKpis();
    const today = days[days.length - 1];
    const zeroAvailable = this.store.inventoryPositions().filter((p) => p.available <= 0).length;

    return [
      { label: lang === 'en' ? 'Receipts today' : 'Đã nhận hôm nay', value: today.receipts },
      { label: lang === 'en' ? 'Shipments today' : 'Đã xuất hôm nay', value: today.shipments },
      { label: lang === 'en' ? 'Allocations today' : 'Đã phân bổ hôm nay', value: today.allocations },
      { label: lang === 'en' ? 'SKUs at zero available' : 'SKU hết khả dụng', value: zeroAvailable },
    ];
  });

  protected readonly tabs = computed(() =>
    resolveTabs(
      [
        { ...DATA.tabs[0], rows: this.store.inventoryPositions() },
        { ...DATA.tabs[1], rows: this.store.inboundStatuses() },
        { ...DATA.tabs[2], rows: this.store.outboundStatuses() },
      ],
      this.lang.lang(),
    ),
  );
}
