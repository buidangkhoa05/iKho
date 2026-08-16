import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Icon, StatusBadge, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { CatalogStore } from '../../../core/state/catalogue-store';
import { InventoryStore } from '../../../core/state/inventory-store';
import { OrganizationStore } from '../../../core/state/organization-store';

@Component({
  selector: 'app-operator-inventory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusBadge, TextInput],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <lib-text-input [placeholder]="lang.pick(strings.searchOperator)" type="search" [value]="query()" (valueChange)="query.set($event)" />
    <div class="flex flex-col gap-3.5">
      @for (item of results(); track item.id) {
        <div class="flex items-start gap-4 rounded-lg bg-canvas-operator-elevated p-[18px]">
          <lib-icon name="boxes" [size]="28" color="var(--color-accent-teal)" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <div class="flex flex-wrap items-center gap-2.5">
              <span class="font-mono text-xs text-shade-40">{{ item.sku }}</span>
              <lib-status-badge [status]="item.status" [label]="item.statusLabel" />
            </div>
            <span class="font-core text-lg font-bold text-on-primary">{{ item.productName }}</span>
            <span class="font-mono text-sm text-shade-60">{{ item.warehouseName }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ item.bin }}@if (item.lotOrSerial) { · {{ item.lotOrSerial }} } · {{ item.onHand }} {{ lang.pick(strings.onHand) }}</span>
          </div>
        </div>
      } @empty {
        <div class="p-6 font-core text-[15px] text-shade-40">{{ lang.pick(strings.noResults) }}</div>
      }
    </div>
  `,
})
export class OperatorInventory {
  protected readonly lang = inject(LangService);
  protected readonly strings = UI_STRINGS;
  private readonly store = inject(InventoryStore);
  private readonly catalog = inject(CatalogStore);
  private readonly organization = inject(OrganizationStore);

  protected readonly query = signal('');

  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    const lang = this.lang.lang();
    return this.store
      .stockItems()
      .map((item) => ({
        id: item.id,
        sku: item.sku,
        productName: this.catalog.products().find((p) => p.sku === item.sku)?.name ?? item.sku,
        warehouseName: this.organization.warehouses().find((w) => w.code === item.warehouseCode)?.name ?? item.warehouseCode,
        bin: item.bin,
        lotOrSerial: item.lot?.lotNumber ?? item.serial?.serialValue ?? '',
        onHand: item.onHand,
        status: item.status,
        statusLabel: resolveStatusLabel({ status: item.status }, lang),
      }))
      .filter((row) => !q || [row.sku, row.productName, row.bin].join(' ').toLowerCase().includes(q));
  });
}
