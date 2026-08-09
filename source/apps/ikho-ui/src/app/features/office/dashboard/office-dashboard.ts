import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LangService } from '../../../core/i18n/lang.service';
import { AdminTab } from '../../../core/mock-data/admin-screens.data';
import { resolveKpis, resolveTabs } from '../../../core/mock-data/admin-screen.util';
import { DASHBOARD_KPIS, INBOUND_TODAY_SUBTITLE, INBOUND_TODAY_TITLE, RECEIPT_COLUMNS } from '../../../core/mock-data/dashboard.data';
import { screenMeta, screenTitle, SCREENS } from '../../../core/mock-data/screens.data';
import { InboundStore } from '../../../core/state/inbound-store';
import { OfficeScreen } from '../../../shared/components/office-screen/office-screen';

@Component({
  selector: 'app-office-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OfficeScreen],
  template: `
    <app-office-screen
      [title]="title()"
      [meta]="meta()"
      [primaryActionLabel]="primaryActionLabel()"
      [kpis]="kpis()"
      [tabs]="tabs()"
    />
  `,
})
export class OfficeDashboard {
  private readonly lang = inject(LangService);
  private readonly store = inject(InboundStore);

  protected readonly title = computed(() => screenTitle('dashboard', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('dashboard', 'admin', this.lang.lang()));
  protected readonly primaryActionLabel = computed(() => SCREENS.dashboard.action[this.lang.lang()]);
  protected readonly kpis = computed(() => resolveKpis(DASHBOARD_KPIS, this.lang.lang()));

  private readonly receiptsTab = computed<AdminTab>(() => ({
    id: 'main',
    label: INBOUND_TODAY_TITLE,
    subtitle: INBOUND_TODAY_SUBTITLE,
    columns: RECEIPT_COLUMNS,
    rows: this.store.receipts(),
  }));

  protected readonly tabs = computed(() => resolveTabs([this.receiptsTab()], this.lang.lang()));
}
