import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LangService } from '../../../core/i18n/lang.service';
import { Localized } from '../../../core/i18n/localized.type';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { resolveKpis, resolveTabs } from '../../../core/mock-data/admin-screen.util';
import { ADMIN_SCREENS } from '../../../core/mock-data/admin-screens.data';
import { screenMeta, screenTitle, SCREENS } from '../../../core/mock-data/screens.data';
import { OfficeDetailPanel, OfficeScreen } from '../../../shared/components/office-screen/office-screen';

const DATA = ADMIN_SCREENS.inventory;

@Component({
  selector: 'app-office-inventory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OfficeScreen],
  template: `
    <app-office-screen
      [title]="title()"
      [meta]="meta()"
      [primaryActionLabel]="primaryActionLabel()"
      [kpis]="kpis()"
      [tabs]="tabs()"
      [detailedTabId]="'main'"
      [searchPlaceholder]="searchPlaceholder()"
      [searchFields]="searchFields"
      [rowKey]="rowKey"
      [detail]="detail()"
    />
  `,
})
export class OfficeInventory {
  private readonly lang = inject(LangService);

  protected readonly title = computed(() => screenTitle('inventory', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('inventory', 'admin', this.lang.lang()));
  protected readonly primaryActionLabel = computed(() => SCREENS.inventory.action[this.lang.lang()]);
  protected readonly kpis = computed(() => resolveKpis(DATA.kpis, this.lang.lang()));
  protected readonly tabs = computed(() => resolveTabs(DATA.tabs, this.lang.lang()));
  protected readonly searchPlaceholder = computed(() =>
    this.lang.lang() === 'en' ? 'Search SKU, bin, lot' : 'Tìm SKU, ô kệ, lô',
  );
  protected readonly searchFields = ['sku', 'bin', 'lot'];

  protected readonly rowKey = (row: Record<string, unknown>) => `${row['sku']}${row['bin']}`;

  protected readonly detail = computed(() => {
    const lang = this.lang.lang();
    const eyebrow = lang === 'en' ? 'Stock detail' : 'Chi tiết tồn kho';
    const balanceAt = lang === 'en' ? 'Balance at ' : 'Số dư tại ';
    return (row: Record<string, unknown>): OfficeDetailPanel => {
      const status = row['status'] as OfficeDetailPanel['status'];
      return {
        eyebrow,
        title: balanceAt + String(row['bin']),
        code: String(row['sku']),
        status,
        statusLabel: resolveStatusLabel({ status, label: row['label'] as Localized<string> | undefined }, lang),
        fields: [
          { label: lang === 'en' ? 'Bin' : 'Ô kệ', value: String(row['bin']) },
          { label: lang === 'en' ? 'Lot' : 'Lô', value: String(row['lot']) },
          { label: lang === 'en' ? 'On hand' : 'Tồn thực', value: String(row['onHand']) },
          { label: lang === 'en' ? 'Reserved' : 'Đã giữ', value: String(row['reserved']) },
          { label: lang === 'en' ? 'Available' : 'Khả dụng', value: String(row['available']) },
          { label: lang === 'en' ? 'Damaged' : 'Hư hỏng', value: String(row['damaged']) },
          { label: lang === 'en' ? 'Quarantine' : 'Cách ly', value: String(row['quarantine']) },
        ],
      };
    };
  });
}
