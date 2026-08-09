import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'operator';

const BASE_CLASSES =
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap border font-core [transition:var(--transition-control)] disabled:cursor-not-allowed disabled:opacity-50';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border-hairline-light bg-canvas-light text-ink hover:bg-surface-elevated-light',
  danger: 'border-transparent bg-status-out-of-stock text-on-primary hover:bg-status-out-of-stock-hover',
  ghost: 'border-transparent bg-transparent text-ink hover:bg-surface-elevated-light',
  operator: 'border-transparent bg-accent-teal text-canvas-operator hover:bg-accent-teal-hover',
};

const OPERATOR_SIZE_CLASSES = 'rounded-lg px-8 py-5 text-xl font-bold';
const OFFICE_SIZE_CLASSES = 'rounded-button px-4 py-2.5 text-sm font-semibold';

@Component({
  selector: 'lib-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: 'inline-block' },
  template: `
    <button [type]="type()" [disabled]="disabled()" [class]="buttonClasses()">
      @if (icon(); as name) {
        <lib-icon [name]="name" [size]="iconSize()" />
      }
      <ng-content />
      @if (iconRight(); as name) {
        <lib-icon [name]="name" [size]="iconSize()" />
      }
    </button>
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly icon = input<string | undefined>(undefined);
  readonly iconRight = input<string | undefined>(undefined);
  readonly fullWidth = input(false);
  readonly disabled = input(false);
  readonly type = input<'button' | 'submit'>('button');

  private readonly isOperator = computed(() => this.variant() === 'operator');
  protected readonly iconSize = computed(() => (this.isOperator() ? 22 : 16));

  protected readonly buttonClasses = computed(() =>
    [
      BASE_CLASSES,
      VARIANT_CLASSES[this.variant()],
      this.isOperator() ? OPERATOR_SIZE_CLASSES : OFFICE_SIZE_CLASSES,
      this.fullWidth() ? 'w-full' : 'w-auto',
    ].join(' '),
  );
}
