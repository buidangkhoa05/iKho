import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Icon, StatusBadge } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { ReturnsStore } from '../../../core/state/returns-store';

@Component({
  selector: 'app-operator-returns-entry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusBadge],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <div class="flex flex-col gap-4">
      <span class="font-core text-sm font-semibold tracking-[0.5px] text-shade-40 uppercase">{{ toReceiveLabel() }}</span>
      <div class="flex flex-col gap-3.5">
        @for (o of toReceive(); track o.rma) {
          <div
            class="flex min-h-14 cursor-pointer items-center gap-[18px] rounded-lg bg-canvas-operator-elevated p-5"
            tabindex="0"
            role="button"
            (click)="openReceive(o.rma)"
            (keydown.enter)="openReceive(o.rma)"
          >
            <lib-icon name="undo-2" [size]="32" color="var(--color-accent-teal)" />
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <div class="flex items-center gap-2.5">
                <span class="font-mono text-xs text-shade-40">{{ o.rma }}</span>
                <lib-status-badge [status]="o.status" [label]="o.statusLabel" />
              </div>
              <span class="font-core text-xl font-bold text-on-primary">{{ o.partner }}</span>
              <span class="font-mono text-sm text-accent-teal">{{ o.sourceRef }} · {{ o.qty }} {{ unitsLabel() }}</span>
            </div>
            <lib-icon name="chevron-right" [size]="28" color="var(--color-shade-50)" />
          </div>
        } @empty {
          <div class="p-6 font-core text-[15px] text-shade-40">{{ emptyLabel() }}</div>
        }
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <span class="font-core text-sm font-semibold tracking-[0.5px] text-shade-40 uppercase">{{ toInspectLabel() }}</span>
      <div class="flex flex-col gap-3.5">
        @for (o of toInspect(); track o.rma) {
          <div
            class="flex min-h-14 cursor-pointer items-center gap-[18px] rounded-lg bg-canvas-operator-elevated p-5"
            tabindex="0"
            role="button"
            (click)="openInspect(o.rma)"
            (keydown.enter)="openInspect(o.rma)"
          >
            <lib-icon name="undo-2" [size]="32" color="var(--color-accent-teal)" />
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <div class="flex items-center gap-2.5">
                <span class="font-mono text-xs text-shade-40">{{ o.rma }}</span>
                <lib-status-badge [status]="o.status" [label]="o.statusLabel" />
              </div>
              <span class="font-core text-xl font-bold text-on-primary">{{ o.partner }}</span>
              <span class="font-mono text-sm text-accent-teal">{{ o.sourceRef }} · {{ o.qty }} {{ unitsLabel() }}</span>
            </div>
            <lib-icon name="chevron-right" [size]="28" color="var(--color-shade-50)" />
          </div>
        } @empty {
          <div class="p-6 font-core text-[15px] text-shade-40">{{ emptyLabel() }}</div>
        }
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <span class="font-core text-sm font-semibold tracking-[0.5px] text-shade-40 uppercase">{{ toDispositionLabel() }}</span>
      <div class="flex flex-col gap-3.5">
        @for (o of toDisposition(); track o.rma) {
          <div
            class="flex min-h-14 cursor-pointer items-center gap-[18px] rounded-lg bg-canvas-operator-elevated p-5"
            tabindex="0"
            role="button"
            (click)="openDisposition(o.rma)"
            (keydown.enter)="openDisposition(o.rma)"
          >
            <lib-icon name="undo-2" [size]="32" color="var(--color-accent-teal)" />
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <div class="flex items-center gap-2.5">
                <span class="font-mono text-xs text-shade-40">{{ o.rma }}</span>
                <lib-status-badge [status]="o.status" [label]="o.statusLabel" />
              </div>
              <span class="font-core text-xl font-bold text-on-primary">{{ o.partner }}</span>
              <span class="font-mono text-sm text-accent-teal">{{ o.sourceRef }} · {{ o.qty }} {{ unitsLabel() }}</span>
            </div>
            <lib-icon name="chevron-right" [size]="28" color="var(--color-shade-50)" />
          </div>
        } @empty {
          <div class="p-6 font-core text-[15px] text-shade-40">{{ emptyLabel() }}</div>
        }
      </div>
    </div>
  `,
})
export class OperatorReturnsEntry {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(ReturnsStore);

  protected readonly toReceive = computed(() => {
    const lang = this.lang.lang();
    return this.store.toReceive().map((o) => ({ ...o, statusLabel: resolveStatusLabel(o, lang) }));
  });
  protected readonly toInspect = computed(() => {
    const lang = this.lang.lang();
    return this.store.toInspect().map((o) => ({ ...o, statusLabel: resolveStatusLabel(o, lang) }));
  });
  protected readonly toDisposition = computed(() => {
    const lang = this.lang.lang();
    return this.store.toDisposition().map((o) => ({ ...o, statusLabel: resolveStatusLabel(o, lang) }));
  });

  protected readonly toReceiveLabel = computed(() => (this.lang.lang() === 'en' ? 'To receive' : 'Chờ nhận hàng'));
  protected readonly toInspectLabel = computed(() => (this.lang.lang() === 'en' ? 'To inspect' : 'Chờ kiểm tra'));
  protected readonly toDispositionLabel = computed(() => (this.lang.lang() === 'en' ? 'To disposition' : 'Chờ xử lý'));
  protected readonly unitsLabel = computed(() => (this.lang.lang() === 'en' ? 'units' : 'cái'));
  protected readonly emptyLabel = computed(() => (this.lang.lang() === 'en' ? 'Nothing here right now' : 'Hiện chưa có gì'));

  protected openReceive(rma: string): void {
    this.router.navigate(['/operator/returns/receive', rma]);
  }

  protected openInspect(rma: string): void {
    this.router.navigate(['/operator/returns/inspect', rma]);
  }

  protected openDisposition(rma: string): void {
    this.router.navigate(['/operator/returns/disposition', rma]);
  }
}
