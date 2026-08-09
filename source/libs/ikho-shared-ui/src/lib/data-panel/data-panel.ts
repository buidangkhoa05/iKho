import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'lib-data-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="flex flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card"
    >
      @if (title(); as t) {
        <header class="flex items-start justify-between gap-4">
          <div>
            <div class="font-core text-heading-md text-ink">{{ t }}</div>
            @if (subtitle(); as s) {
              <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ s }}</div>
            }
          </div>
          <ng-content select="[panelToolbar]" />
        </header>
      }
      <ng-content />
    </section>
  `,
})
export class DataPanel {
  readonly title = input<string | undefined>(undefined);
  readonly subtitle = input<string | undefined>(undefined);
}
