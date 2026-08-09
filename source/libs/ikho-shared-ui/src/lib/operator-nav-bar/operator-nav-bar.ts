import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'lib-operator-nav-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <header
      class="box-border flex h-[88px] items-center justify-between gap-4 border-b border-hairline-operator bg-canvas-operator-elevated px-8 py-4"
    >
      <div class="flex min-w-0 flex-col gap-1">
        <span class="font-core text-operator-xl tracking-[-0.2px] text-on-primary">{{ task() }}</span>
        @if (meta(); as m) {
          <span class="font-core text-sm text-shade-40">{{ m }}</span>
        }
      </div>
      @if (onCancel()) {
        <button
          type="button"
          class="flex-none cursor-pointer rounded-md border border-hairline-operator bg-transparent px-5 py-3 font-core text-sm font-semibold text-on-primary hover:bg-canvas-operator"
          (click)="cancelClick.emit()"
        >
          {{ cancelLabel() }}
        </button>
      }
    </header>
  `,
})
export class OperatorNavBar {
  readonly task = input.required<string>();
  readonly meta = input<string | undefined>(undefined);
  readonly cancelLabel = input('Cancel');
  /** Whether to show the cancel action at all. */
  readonly onCancel = input(true);

  readonly cancelClick = output<void>();
}
