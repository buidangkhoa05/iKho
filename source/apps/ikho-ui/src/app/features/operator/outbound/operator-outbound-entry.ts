import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Icon, StatusBadge } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { OutboundStore } from '../../../core/state/outbound-store';

@Component({
  selector: 'app-operator-outbound-entry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusBadge],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <div class="flex flex-col gap-3.5">
      @for (so of dispatchReady(); track so.so) {
        <div
          class="flex min-h-14 cursor-pointer items-center gap-[18px] rounded-lg bg-canvas-operator-elevated p-5"
          tabindex="0"
          role="button"
          (click)="openDispatch(so.so)"
          (keydown.enter)="openDispatch(so.so)"
        >
          <lib-icon name="package-check" [size]="32" color="var(--color-accent-teal)" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <div class="flex items-center gap-2.5">
              <span class="font-mono text-xs text-shade-40">{{ so.so }}</span>
              <lib-status-badge [status]="so.status" [label]="so.statusLabel" />
            </div>
            <span class="font-core text-xl font-bold text-on-primary">{{ so.customer }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ so.dock }} · {{ so.cutoff }}</span>
          </div>
          <lib-icon name="chevron-right" [size]="28" color="var(--color-shade-50)" />
        </div>
      } @empty {
        <div class="p-6 font-core text-[15px] text-shade-40">{{ emptyLabel() }}</div>
      }
    </div>
  `,
})
export class OperatorOutboundEntry {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(OutboundStore);

  protected readonly dispatchReady = computed(() => {
    const lang = this.lang.lang();
    return this.store.dispatchReady().map((so) => ({ ...so, statusLabel: resolveStatusLabel(so, lang) }));
  });

  protected readonly emptyLabel = computed(() => (this.lang.lang() === 'en' ? 'Nothing here right now' : 'Hiện chưa có gì'));

  protected openDispatch(soId: string): void {
    this.router.navigate(['/operator/outbound/dispatch', soId]);
  }
}
