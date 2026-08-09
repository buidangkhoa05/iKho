import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Icon, StatusBadge } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { OPERATOR_STATS, TASK_QUEUE_LABEL } from '../../../core/mock-data/dashboard.data';
import { TASKS } from '../../../core/mock-data/tasks.data';

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
        <div class="flex min-h-14 items-center gap-[18px] rounded-lg bg-canvas-operator-elevated p-5">
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
  private readonly lang = inject(LangService);

  protected readonly stats = computed(() =>
    OPERATOR_STATS.map((s) => ({ label: s.label[this.lang.lang()], value: s.value })),
  );
  protected readonly queueLabel = computed(() => this.lang.pick(TASK_QUEUE_LABEL));
  protected readonly tasks = computed(() =>
    TASKS.map((t) => ({
      ...t,
      kind: t.kind[this.lang.lang()],
      title: t.title[this.lang.lang()],
      qty: t.qty[this.lang.lang()],
    })),
  );
}
