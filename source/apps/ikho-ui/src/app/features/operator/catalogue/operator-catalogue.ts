import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Icon, StatusBadge, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { PRODUCTS } from '../../../core/mock-data/products.data';

@Component({
  selector: 'app-operator-catalogue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusBadge, TextInput],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <lib-text-input [placeholder]="lang.pick(strings.searchOperator)" type="search" [value]="query()" (valueChange)="query.set($event)" />
    <div class="flex flex-col gap-3.5">
      @for (p of results(); track p.sku) {
        <div class="flex items-start gap-4 rounded-lg bg-canvas-operator-elevated p-[18px]">
          <lib-icon name="package" [size]="28" color="var(--color-accent-teal)" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <div class="flex flex-wrap items-center gap-2.5">
              <span class="font-mono text-xs text-shade-40">{{ p.sku }}</span>
              <lib-status-badge [status]="p.status" [label]="p.statusLabel" />
            </div>
            <span class="font-core text-lg font-bold text-on-primary">{{ p.name }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ p.bin }} · {{ p.qty }} {{ lang.pick(strings.onHand) }}</span>
          </div>
        </div>
      } @empty {
        <div class="p-6 font-core text-[15px] text-shade-40">{{ lang.pick(strings.noResults) }}</div>
      }
    </div>
  `,
})
export class OperatorCatalogue {
  protected readonly lang = inject(LangService);
  protected readonly strings = UI_STRINGS;

  protected readonly query = signal('');

  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    const lang = this.lang.lang();
    return PRODUCTS.filter(
      (p) => !q || p.sku.toLowerCase().includes(q) || p.name[lang].toLowerCase().includes(q) || p.bin.toLowerCase().includes(q),
    ).map((p) => ({
      sku: p.sku,
      status: p.status,
      bin: p.bin,
      qty: p.qty,
      name: p.name[lang],
      statusLabel: resolveStatusLabel(p, lang),
    }));
  });
}
