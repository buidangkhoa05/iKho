import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

@Component({
  selector: 'lib-text-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <label class="flex w-full flex-col gap-1.5">
      @if (label(); as l) {
        <span class="font-core text-[13px] font-semibold text-ink">{{ l }}</span>
      }
      <span
        class="flex items-center gap-2 rounded-input border bg-canvas-light px-3 py-2 [transition:var(--transition-control)] focus-within:border-primary"
        [class]="error() ? 'border-status-out-of-stock' : 'border-hairline-light'"
      >
        @if (prefix(); as p) {
          <span class="font-core text-body-md text-shade-50">{{ p }}</span>
        }
        <input
          [type]="type()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [value]="value()"
          (input)="value.set($any($event.target).value)"
          [class.font-mono]="mono()"
          class="min-w-0 flex-1 border-none bg-transparent font-core text-body-md text-text-body outline-none"
          [attr.aria-label]="label() ? null : (ariaLabel() ?? placeholder())"
        />
        @if (suffix(); as s) {
          <span class="font-core text-body-md text-shade-50">{{ s }}</span>
        }
      </span>
      @if (error(); as e) {
        <span class="font-core text-xs text-status-out-of-stock">{{ e }}</span>
      } @else if (hint(); as h) {
        <span class="font-core text-xs text-shade-50">{{ h }}</span>
      }
    </label>
  `,
})
export class TextInput {
  readonly label = input<string | undefined>(undefined);
  /** Accessible name used when no visible `label` is set (falls back to `placeholder` if omitted). */
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly hint = input<string | undefined>(undefined);
  readonly error = input<string | undefined>(undefined);
  readonly prefix = input<string | undefined>(undefined);
  readonly suffix = input<string | undefined>(undefined);
  readonly mono = input(false);
  readonly type = input<'text' | 'search' | 'email' | 'number'>('text');
  readonly placeholder = input('');
  readonly disabled = input(false);

  readonly value = model('');
}
