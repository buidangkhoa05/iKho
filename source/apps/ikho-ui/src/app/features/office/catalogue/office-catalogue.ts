import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LangService } from '../../../core/i18n/lang.service';
import { Localized } from '../../../core/i18n/localized.type';
import { resolveKpis, resolveTabs } from '../../../core/mock-data/admin-screen.util';
import { ADMIN_SCREENS } from '../../../core/mock-data/admin-screens.data';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { screenMeta, screenTitle, SCREENS } from '../../../core/mock-data/screens.data';
import { OfficeDetailPanel, OfficeScreen } from '../../../shared/components/office-screen/office-screen';

const DATA = ADMIN_SCREENS.catalogue;

@Component({
  selector: 'app-office-catalogue',
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
export class OfficeCatalogue {
  private readonly lang = inject(LangService);

  protected readonly title = computed(() => screenTitle('catalogue', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('catalogue', 'admin', this.lang.lang()));
  protected readonly primaryActionLabel = computed(() => SCREENS.catalogue.action[this.lang.lang()]);
  protected readonly kpis = computed(() => resolveKpis(DATA.kpis, this.lang.lang()));
  protected readonly tabs = computed(() => resolveTabs(DATA.tabs, this.lang.lang()));
  protected readonly searchPlaceholder = computed(() =>
    this.lang.lang() === 'en' ? 'Search SKU, name, brand' : 'Tìm SKU, tên, thương hiệu',
  );
  protected readonly searchFields = ['sku', 'name', 'brand', 'bin'];

  protected readonly rowKey = (row: Record<string, unknown>) => String(row['sku']);

  protected readonly detail = computed(() => {
    const lang = this.lang.lang();
    const eyebrow = lang === 'en' ? 'Product detail' : 'Chi tiết sản phẩm';
    return (row: Record<string, unknown>): OfficeDetailPanel => {
      const tracking = row['tracking'] as { en: string; vi: string };
      const status = row['status'] as OfficeDetailPanel['status'];
      return {
        eyebrow,
        title: String(row['name']),
        code: String(row['sku']),
        status,
        statusLabel: resolveStatusLabel({ status, label: row['label'] as Localized<string> | undefined }, lang),
        fields: [
          { label: lang === 'en' ? 'Barcode' : 'Mã vạch', value: String(row['barcode']) },
          { label: lang === 'en' ? 'Category' : 'Nhóm', value: String(row['category']) },
          { label: lang === 'en' ? 'Brand' : 'Thương hiệu', value: String(row['brand']) },
          { label: lang === 'en' ? 'Unit of measure' : 'Đơn vị tính', value: String(row['uom']) },
          { label: lang === 'en' ? 'Tracking' : 'Theo dõi', value: tracking[lang] },
          { label: lang === 'en' ? 'Reorder point' : 'Điểm đặt lại', value: String(row['reorder']) },
          { label: lang === 'en' ? 'On hand' : 'Tồn', value: String(row['qty']) },
          { label: lang === 'en' ? 'Primary bin' : 'Ô kệ chính', value: String(row['bin']) },
        ],
      };
    };
  });
}
