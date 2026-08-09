import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Icon, StatusBadge } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { InboundStore } from '../../../core/state/inbound-store';

type InboundView = 'receiving' | 'putaway';

@Component({
  selector: 'app-operator-inbound-entry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusBadge],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <div class="flex gap-2.5">
      <button type="button" [class]="tabClasses('receiving')" (click)="view.set('receiving')">{{ receivingLabel() }}</button>
      <button type="button" [class]="tabClasses('putaway')" (click)="view.set('putaway')">{{ putawayLabel() }}</button>
    </div>

    @if (view() === 'receiving') {
      <div class="flex flex-col gap-3.5">
        @for (po of openOrders(); track po.po) {
          <div
            class="flex min-h-14 cursor-pointer items-center gap-[18px] rounded-lg bg-canvas-operator-elevated p-5"
            tabindex="0"
            role="button"
            (click)="openReceive(po.po)"
            (keydown.enter)="openReceive(po.po)"
          >
            <lib-icon name="truck" [size]="32" color="var(--color-accent-teal)" />
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <div class="flex items-center gap-2.5">
                <span class="font-mono text-xs text-shade-40">{{ po.po }}</span>
                <lib-status-badge [status]="po.status" [label]="po.statusLabel" />
              </div>
              <span class="font-core text-xl font-bold text-on-primary">{{ po.supplier }}</span>
              <span class="font-mono text-sm text-accent-teal">{{ po.dock }} · {{ po.received }} / {{ po.expected }}</span>
            </div>
            <lib-icon name="chevron-right" [size]="28" color="var(--color-shade-50)" />
          </div>
        } @empty {
          <div class="p-6 font-core text-[15px] text-shade-40">{{ emptyLabel() }}</div>
        }
      </div>
    } @else {
      <div class="flex flex-col gap-3.5">
        @for (task of activePutaway(); track task.id) {
          <div
            class="flex min-h-14 cursor-pointer items-center gap-[18px] rounded-lg bg-canvas-operator-elevated p-5"
            tabindex="0"
            role="button"
            (click)="openPutaway(task.id)"
            (keydown.enter)="openPutaway(task.id)"
          >
            <lib-icon name="truck" [size]="32" color="var(--color-accent-teal)" />
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <div class="flex items-center gap-2.5">
                <span class="font-mono text-xs text-shade-40">{{ task.id }}</span>
                <lib-status-badge [status]="task.status" [label]="task.statusLabel" />
              </div>
              <span class="font-core text-xl font-bold text-on-primary">{{ task.productNameText }}</span>
              <span class="font-mono text-sm text-accent-teal">{{ task.fromDock }} → {{ task.toBin }} · {{ task.qty }}</span>
            </div>
            <lib-icon name="chevron-right" [size]="28" color="var(--color-shade-50)" />
          </div>
        } @empty {
          <div class="p-6 font-core text-[15px] text-shade-40">{{ emptyLabel() }}</div>
        }
      </div>
    }
  `,
})
export class OperatorInboundEntry {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(InboundStore);

  protected readonly view = signal<InboundView>('receiving');

  protected readonly openOrders = computed(() => {
    const lang = this.lang.lang();
    return this.store
      .purchaseOrders()
      .filter((po) => po.status !== 'in-stock')
      .map((po) => ({ ...po, statusLabel: resolveStatusLabel(po, lang) }));
  });

  protected readonly activePutaway = computed(() => {
    const lang = this.lang.lang();
    return this.store
      .putawayTasks()
      .filter((t) => t.status !== 'in-stock')
      .map((t) => ({ ...t, statusLabel: resolveStatusLabel(t, lang), productNameText: t.productName[lang] }));
  });

  protected readonly receivingLabel = computed(() => (this.lang.lang() === 'en' ? 'Receiving' : 'Đang nhận'));
  protected readonly putawayLabel = computed(() => (this.lang.lang() === 'en' ? 'Putaway' : 'Cất kho'));
  protected readonly emptyLabel = computed(() => (this.lang.lang() === 'en' ? 'Nothing here right now' : 'Hiện chưa có gì'));

  protected tabClasses(id: InboundView): string {
    const base = 'min-h-11 cursor-pointer rounded-pill border px-4 py-2 font-core text-sm font-semibold';
    return id === this.view()
      ? `${base} border-accent-teal bg-accent-teal/14 text-on-primary`
      : `${base} border-hairline-operator bg-transparent text-shade-40`;
  }

  protected openReceive(poId: string): void {
    this.router.navigate(['/operator/inbound/receive', poId]);
  }

  protected openPutaway(taskId: string): void {
    this.router.navigate(['/operator/inbound/putaway', taskId]);
  }
}
