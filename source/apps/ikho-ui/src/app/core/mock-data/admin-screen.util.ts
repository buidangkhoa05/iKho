import { DataTableColumn, StockStatus } from '@ikho/shared-ui';
import { AppLang, Localized } from '../i18n/localized.type';
import { resolveStatusLabel } from '../i18n/status-label.util';
import { AdminKpi, AdminTab } from './admin-screens.data';

export interface ResolvedKpi {
  label: string;
  value: string | number;
  trend?: string;
  trendStatus?: StockStatus;
  caption?: string;
}

export function resolveKpis(kpis: AdminKpi[], lang: AppLang): ResolvedKpi[] {
  return kpis.map((k) => ({
    label: k.label[lang],
    value: k.value,
    trend: k.trend?.[lang],
    trendStatus: k.trendStatus,
    caption: k.caption?.[lang],
  }));
}

export interface ResolvedTab {
  id: string;
  label: string;
  subtitle?: string;
  columns: DataTableColumn[];
  rows: Record<string, unknown>[];
}

export function resolveTab(tab: AdminTab, lang: AppLang): ResolvedTab {
  const statusColumn = tab.columns.find((c) => c.status);
  const columns: DataTableColumn[] = tab.columns.map((c) => ({
    key: c.key,
    label: c.label[lang],
    align: c.align,
    mono: c.mono,
    status: c.status,
    statusLabelKey: c.status ? '_statusLabel' : undefined,
  }));

  const rows = tab.rows.map((row) => {
    const resolved: Record<string, unknown> = { ...row };
    for (const c of tab.columns) {
      if (c.localized) {
        resolved[c.key] = (row[c.key] as Localized<string>)[lang];
      }
    }
    if (statusColumn) {
      resolved['_statusLabel'] = resolveStatusLabel(
        { status: row[statusColumn.key] as StockStatus, label: row['label'] as Localized<string> | undefined },
        lang,
      );
    }
    return resolved;
  });

  return { id: tab.id, label: tab.label[lang], subtitle: tab.subtitle?.[lang], columns, rows };
}

export function resolveTabs(tabs: AdminTab[], lang: AppLang): ResolvedTab[] {
  return tabs.map((t) => resolveTab(t, lang));
}
