import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DataPanel, DataTable, DataTableColumn } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { FulfillmentKpiDay } from '../../../core/mock-data/fulfillment-kpis.data';

type SeriesKey = 'receipts' | 'shipments' | 'allocations';

interface Bar {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  value: number;
  series: SeriesKey;
}

interface Group {
  label: string;
  centerX: number;
}

const SERIES: { key: SeriesKey; color: string }[] = [
  { key: 'receipts', color: '#2563eb' },
  { key: 'shipments', color: '#7c3aed' },
  { key: 'allocations', color: '#0ea5a0' },
];

const CHART_WIDTH = 700;
const CHART_HEIGHT = 200;
const CHART_TOP_PADDING = 24;
const CHART_BOTTOM_PADDING = 36;
const BAR_WIDTH = 16;
const BAR_GAP = 4;

@Component({
  selector: 'app-fulfillment-trend-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataPanel, DataTable],
  template: `
    <lib-data-panel [title]="chartTitle()" [subtitle]="chartSubtitle()">
      <div class="flex flex-col gap-4">
        <div class="flex gap-4">
          @for (s of legendItems(); track s.key) {
            <div class="flex items-center gap-1.5">
              <span class="inline-block size-2.5 rounded-full" [style.background]="s.color"></span>
              <span class="font-core text-[13px] text-shade-60">{{ s.label }}</span>
            </div>
          }
        </div>
        <svg [attr.viewBox]="'0 0 ' + chartWidth + ' ' + chartHeight" class="w-full" role="img" [attr.aria-label]="chartTitle()">
          <line [attr.x1]="0" [attr.y1]="baselineY()" [attr.x2]="chartWidth" [attr.y2]="baselineY()" stroke="var(--color-hairline-light)" stroke-width="1" />
          @for (bar of bars(); track bar.x + '-' + bar.series) {
            <rect
              class="chart-bar"
              [attr.data-series]="bar.series"
              [attr.x]="bar.x"
              [attr.y]="bar.y"
              [attr.width]="bar.width"
              [attr.height]="bar.height"
              [attr.fill]="bar.color"
              rx="2"
              (mouseenter)="hoveredBar.set(bar)"
              (mouseleave)="hoveredBar.set(null)"
            />
          }
          @for (bar of bars(); track bar.x + '-' + bar.series + '-label') {
            <text
              [attr.x]="bar.x + bar.width / 2"
              [attr.y]="bar.y - 4"
              text-anchor="middle"
              class="font-core chart-bar-label"
              font-size="10"
              fill="var(--color-shade-60)"
            >{{ bar.value }}</text>
          }
          @for (group of groups(); track group.label) {
            <text [attr.x]="group.centerX" [attr.y]="chartHeight - 10" text-anchor="middle" class="font-core" font-size="11" fill="var(--color-shade-50)">{{ group.label }}</text>
          }
        </svg>
        <div class="font-core text-[13px] text-ink">
          @if (hoveredBar(); as bar) {
            {{ tooltipText(bar) }}
          }
        </div>
        <lib-data-table [columns]="tableColumns()" [rows]="data()" />
      </div>
    </lib-data-panel>
  `,
})
export class FulfillmentTrendChart {
  protected readonly lang = inject(LangService);

  readonly data = input.required<FulfillmentKpiDay[]>();

  protected readonly chartWidth = CHART_WIDTH;
  protected readonly chartHeight = CHART_HEIGHT;

  protected readonly hoveredBar = signal<Bar | null>(null);

  protected readonly chartTitle = computed(() => (this.lang.lang() === 'en' ? 'Fulfillment trend' : 'Xu hướng hoàn thành'));
  protected readonly chartSubtitle = computed(() =>
    this.lang.lang() === 'en' ? 'Receipts, shipments and allocations, last 7 days' : 'Nhận hàng, xuất hàng và phân bổ, 7 ngày qua',
  );

  protected readonly legendItems = computed(() =>
    SERIES.map((s) => ({ key: s.key, color: s.color, label: this.seriesLabel(s.key) })),
  );

  protected readonly tableColumns = computed<DataTableColumn[]>(() => {
    const lang = this.lang.lang();
    return [
      { key: 'date', label: lang === 'en' ? 'Date' : 'Ngày' },
      { key: 'receipts', label: lang === 'en' ? 'Receipts' : 'Nhận hàng', align: 'right', mono: true },
      { key: 'shipments', label: lang === 'en' ? 'Shipments' : 'Xuất hàng', align: 'right', mono: true },
      { key: 'allocations', label: lang === 'en' ? 'Allocations' : 'Phân bổ', align: 'right', mono: true },
    ];
  });

  private readonly maxValue = computed(() => {
    const values = this.data().flatMap((d) => [d.receipts, d.shipments, d.allocations] as number[]);
    return Math.max(1, ...values);
  });

  protected readonly baselineY = computed(() => this.chartHeight - CHART_BOTTOM_PADDING);

  protected readonly groups = computed<Group[]>(() => {
    const days = this.data();
    const groupWidth = this.chartWidth / days.length;
    return days.map((d, i) => ({ label: d.date, centerX: groupWidth * i + groupWidth / 2 }));
  });

  protected readonly bars = computed<Bar[]>(() => {
    const days = this.data();
    const groupWidth = this.chartWidth / days.length;
    const barsContentWidth = SERIES.length * BAR_WIDTH + (SERIES.length - 1) * BAR_GAP;
    const usableHeight = this.baselineY() - CHART_TOP_PADDING;
    const max = this.maxValue();

    return days.flatMap((d, i) => {
      const groupStart = groupWidth * i + (groupWidth - barsContentWidth) / 2;
      return SERIES.map((s, j) => {
        const value = d[s.key] as number;
        const height = (value / max) * usableHeight;
        return {
          x: groupStart + j * (BAR_WIDTH + BAR_GAP),
          y: this.baselineY() - height,
          width: BAR_WIDTH,
          height,
          color: s.color,
          value,
          series: s.key,
        };
      });
    });
  });

  protected seriesLabel(key: SeriesKey): string {
    const lang = this.lang.lang();
    if (key === 'receipts') return lang === 'en' ? 'Receipts' : 'Nhận hàng';
    if (key === 'shipments') return lang === 'en' ? 'Shipments' : 'Xuất hàng';
    return lang === 'en' ? 'Allocations' : 'Phân bổ';
  }

  protected tooltipText(bar: Bar): string {
    return `${this.seriesLabel(bar.series)}: ${bar.value}`;
  }
}
