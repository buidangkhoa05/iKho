import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Button, DataPanel, DataTable, Icon, KpiCard, StatusBadge, StockStatus, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { OfficeLayoutState } from '../../../core/layout/office-layout-state';
import { ResolvedKpi, ResolvedTab } from '../../../core/mock-data/admin-screen.util';

export interface OfficeDetailPanel {
  eyebrow: string;
  title: string;
  code: string;
  status: StockStatus;
  statusLabel: string;
  fields: { label: string; value: string }[];
  action?: { label: string; onClick: () => void };
}

type StatusFilterId = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';

const STATUS_FILTERS: { id: StatusFilterId }[] = [
  { id: 'all' },
  { id: 'in-stock' },
  { id: 'low-stock' },
  { id: 'out-of-stock' },
];

const TAB_BASE =
  'min-h-11 border-none border-b-2 bg-transparent px-0.5 py-2.5 font-core text-sm font-semibold cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring';
const TAB_DEFAULT = 'border-b-transparent text-shade-50';
const TAB_ACTIVE = 'border-b-primary text-primary';

const CHIP_BASE =
  'min-h-8 cursor-pointer rounded-pill border px-3.5 py-[7px] font-core text-[13px] font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring';
const CHIP_DEFAULT = 'border-hairline-light bg-canvas-light text-shade-60';
const CHIP_ACTIVE = 'border-primary bg-primary text-on-primary';

@Component({
  selector: 'app-office-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DataPanel, DataTable, Icon, KpiCard, StatusBadge, TextInput],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
        <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
      </div>
      @if (primaryActionLabel(); as label) {
        <lib-button variant="primary" (click)="primaryAction.emit()">{{ label }}</lib-button>
      }
    </div>

    @if (tabs().length > 1) {
      <div class="-mt-1 flex gap-6 border-b border-hairline-light">
        @for (tab of tabs(); track tab.id) {
          <button
            type="button"
            [class]="tabClasses(tab.id)"
            [attr.aria-current]="tab.id === activeTabId() ? 'true' : null"
            (click)="selectTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        }
      </div>
    }

    @if (kpis().length > 0) {
      <div class="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        @for (k of kpis(); track k.label) {
          <lib-kpi-card [label]="k.label" [value]="k.value" [trend]="k.trend" [trendStatus]="k.trendStatus" [caption]="k.caption" />
        }
      </div>
    }

    @if (isDetailedActive()) {
      <div class="flex flex-wrap items-center gap-3">
        <div class="min-w-60 flex-1">
          <lib-text-input [placeholder]="searchPlaceholder()" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <div class="flex flex-wrap gap-2">
          @for (chip of statusFilters; track chip.id) {
            <button
              type="button"
              [class]="chipClasses(chip.id)"
              [attr.aria-pressed]="chip.id === statusFilter()"
              (click)="statusFilter.set(chip.id)"
            >
              {{ chipLabel(chip.id) }}
            </button>
          }
        </div>
        <span class="ml-auto font-core text-[13px] text-shade-50">{{ filteredRows().length }} {{ lang.pick(strings.results) }}</span>
      </div>
    }

    <div class="flex items-start gap-5">
      @if (activeTab(); as tab) {
        <div class="min-w-0 flex-1">
          <lib-data-panel [title]="tab.label" [subtitle]="tab.subtitle">
            <lib-data-table
              [columns]="tab.columns"
              [rows]="filteredRows()"
              [clickable]="isDetailedActive()"
              (rowClick)="onRowClick($event)"
            />
          </lib-data-panel>
        </div>
      }

      @if (detailPanel(); as d) {
        <aside class="flex w-80 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 flex-col gap-1">
              <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ d.eyebrow }}</span>
              <span class="font-core text-lg font-bold tracking-[-0.2px] text-ink">{{ d.title }}</span>
              <span class="font-mono text-[13px] text-primary">{{ d.code }}</span>
            </div>
            <button
              type="button"
              class="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent hover:bg-surface-elevated-light"
              [attr.aria-label]="lang.pick(strings.close)"
              (click)="selectedKey.set(null)"
            >
              <lib-icon name="x" [size]="18" color="var(--color-shade-50)" />
            </button>
          </div>
          <lib-status-badge [status]="d.status" [label]="d.statusLabel" />
          <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
            @for (f of d.fields; track f.label) {
              <div class="flex items-baseline justify-between gap-3">
                <span class="font-core text-[13px] text-shade-50">{{ f.label }}</span>
                <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ f.value }}</span>
              </div>
            }
          </div>
          @if (d.action; as action) {
            <lib-button variant="primary" [fullWidth]="true" (click)="action.onClick()">{{ action.label }}</lib-button>
          }
        </aside>
      }
    </div>
  `,
})
export class OfficeScreen {
  protected readonly lang = inject(LangService);
  protected readonly strings = UI_STRINGS;
  protected readonly statusFilters = STATUS_FILTERS;

  private readonly layoutState = inject(OfficeLayoutState);

  constructor() {
    effect(() => this.layoutState.setDetailPanelOpen(!!this.detailPanel()));
    inject(DestroyRef).onDestroy(() => this.layoutState.setDetailPanelOpen(false));
  }

  readonly title = input.required<string>();
  readonly meta = input('');
  readonly primaryActionLabel = input<string | undefined>(undefined);
  readonly kpis = input<ResolvedKpi[]>([]);
  readonly tabs = input<ResolvedTab[]>([]);
  readonly detailedTabId = input<string | undefined>(undefined);
  readonly searchPlaceholder = input('');
  readonly searchFields = input<string[]>([]);
  readonly rowKey = input<(row: Record<string, unknown>) => string>(() => '');
  readonly detail = input<(row: Record<string, unknown>) => OfficeDetailPanel | null>(() => null);

  readonly primaryAction = output<void>();

  protected readonly activeTabId = signal<string | null>(null);
  protected readonly query = signal('');
  protected readonly statusFilter = signal<StatusFilterId>('all');
  protected readonly selectedKey = signal<string | null>(null);

  protected readonly activeTab = computed<ResolvedTab | undefined>(() => {
    const id = this.activeTabId();
    const tabs = this.tabs();
    return tabs.find((t) => t.id === id) ?? tabs[0];
  });

  protected readonly isDetailedActive = computed(
    () => !!this.detailedTabId() && this.activeTab()?.id === this.detailedTabId(),
  );

  protected readonly filteredRows = computed(() => {
    const rows = this.activeTab()?.rows ?? [];
    if (!this.isDetailedActive()) return rows;

    const q = this.query().trim().toLowerCase();
    const status = this.statusFilter();
    const fields = this.searchFields();
    return rows.filter((row) => {
      const okStatus = status === 'all' || row['status'] === status;
      if (!okStatus) return false;
      if (!q) return true;
      const haystack = fields
        .map((f) => row[f])
        .filter((v) => v != null)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  });

  protected readonly selectedRow = computed(() => {
    const key = this.selectedKey();
    if (!key) return null;
    return this.filteredRows().find((row) => this.rowKey()(row) === key) ?? null;
  });

  protected readonly detailPanel = computed<OfficeDetailPanel | null>(() => {
    const row = this.selectedRow();
    return row ? this.detail()(row) : null;
  });

  selectTab(id: string): void {
    this.activeTabId.set(id);
    this.selectedKey.set(null);
  }

  onRowClick(row: Record<string, unknown>): void {
    if (!this.isDetailedActive()) return;
    this.selectedKey.set(this.rowKey()(row));
  }

  protected tabClasses(id: string): string {
    return id === this.activeTabId() ? `${TAB_BASE} ${TAB_ACTIVE}` : `${TAB_BASE} ${TAB_DEFAULT}`;
  }

  protected chipClasses(id: StatusFilterId): string {
    return id === this.statusFilter() ? `${CHIP_BASE} ${CHIP_ACTIVE}` : `${CHIP_BASE} ${CHIP_DEFAULT}`;
  }

  protected chipLabel(id: StatusFilterId): string {
    switch (id) {
      case 'all':
        return this.lang.pick(this.strings.all);
      case 'in-stock':
        return this.lang.pick(this.strings.inStock);
      case 'low-stock':
        return this.lang.pick(this.strings.lowStock);
      case 'out-of-stock':
        return this.lang.pick(this.strings.outOfStock);
    }
  }
}
