import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Icon, StatusBadge, StockStatus } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { OPERATOR_STATS, TASK_QUEUE_LABEL } from '../../../core/mock-data/dashboard.data';
import { STATIC_TASKS } from '../../../core/mock-data/tasks.data';
import { InboundStore } from '../../../core/state/inbound-store';

interface QueueCard {
  id: string;
  status: StockStatus;
  icon: string;
  kind: string;
  title: string;
  route: string;
  qty: string;
  clickable: boolean;
  taskId?: string;
}

@Component({
  selector: 'app-operator-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusBadge],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <div class="grid grid-cols-3 gap-3.5">
      @for (s of stats(); track s.label) {
        <div class="flex flex-col gap-1.5 rounded-lg bg-canvas-operator-elevated p-[18px]">
          <span class="font-core text-[32px] font-bold text-accent-teal">{{ s.value }}</span>
          <span class="font-core text-micro tracking-[0.4px] text-shade-40 uppercase">{{ s.label }}</span>
        </div>
      }
    </div>

    <div class="flex flex-col gap-4">
      <span class="font-core text-sm font-semibold tracking-[0.5px] text-shade-40 uppercase">{{ queueLabel() }}</span>
      @for (task of tasks(); track task.id) {
        <div
          class="flex min-h-14 items-center gap-[18px] rounded-lg bg-canvas-operator-elevated p-5"
          [class.cursor-pointer]="task.clickable"
          [attr.tabindex]="task.clickable ? 0 : null"
          [attr.role]="task.clickable ? 'button' : null"
          (click)="onTaskClick(task)"
          (keydown.enter)="onTaskClick(task)"
        >
          <lib-icon [name]="task.icon" [size]="32" color="var(--color-accent-teal)" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <div class="flex items-center gap-2.5">
              <span class="font-mono text-xs text-shade-40">{{ task.id }}</span>
              <lib-status-badge [status]="task.status" [label]="task.kind" />
            </div>
            <span class="font-core text-xl font-bold text-on-primary">{{ task.title }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ task.route }} · {{ task.qty }}</span>
          </div>
          <lib-icon name="chevron-right" [size]="28" color="var(--color-shade-50)" />
        </div>
      }
    </div>
  `,
})
export class OperatorDashboard {
  private readonly router = inject(Router);
  private readonly lang = inject(LangService);
  private readonly store = inject(InboundStore);

  protected readonly stats = computed(() =>
    OPERATOR_STATS.map((s) => ({ label: s.label[this.lang.lang()], value: s.value })),
  );
  protected readonly queueLabel = computed(() => this.lang.pick(TASK_QUEUE_LABEL));

  protected readonly tasks = computed<QueueCard[]>(() => {
    const lang = this.lang.lang();

    const putaway: QueueCard[] = this.store
      .putawayTasks()
      .filter((t) => t.status !== 'in-stock')
      .map((t) => ({
        id: t.id,
        status: t.status,
        icon: 'truck',
        kind: lang === 'en' ? 'Putaway' : 'Cất kho',
        title: t.productName[lang],
        route: `${t.fromDock} → ${t.toBin}`,
        qty: `${t.qty} ${lang === 'en' ? 'units' : 'cái'}`,
        clickable: true,
        taskId: t.id,
      }));

    const staticTasks: QueueCard[] = STATIC_TASKS.map((t) => ({
      id: t.id,
      status: t.status,
      icon: t.icon,
      kind: t.kind[lang],
      title: t.title[lang],
      route: t.route,
      qty: t.qty[lang],
      clickable: false,
    }));

    return [...putaway, ...staticTasks];
  });

  protected onTaskClick(task: QueueCard): void {
    if (task.clickable && task.taskId) {
      this.router.navigate(['/operator/inbound/putaway', task.taskId]);
    }
  }
}
