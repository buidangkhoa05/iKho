import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '@ikho/shared-ui';

@Component({
  selector: 'app-operator-outlined-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: 'block' },
  template: `
    <div class="flex flex-col gap-3.5 rounded-lg bg-canvas-operator-elevated p-6">
      <span class="font-core text-xl font-bold text-on-primary">{{ title() }}</span>
      @for (bullet of bullets(); track bullet) {
        <div class="flex items-start gap-2.5">
          <lib-icon name="check" [size]="22" color="var(--color-accent-teal)" />
          <span class="font-core text-[15px] text-shade-40">{{ bullet }}</span>
        </div>
      }
    </div>
  `,
})
export class OperatorOutlinedScreen {
  readonly title = input.required<string>();
  readonly bullets = input.required<string[]>();
}
