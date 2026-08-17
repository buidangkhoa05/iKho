import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AccountMenu, AccountMenuLang, AccountMenuRole } from '../account-menu/account-menu';
import { Icon } from '../icon/icon';

@Component({
  selector: 'lib-operator-nav-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, AccountMenu],
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
      <div class="flex flex-none items-center gap-2">
        <lib-account-menu
          #menu="libAccountMenu"
          [role]="role()"
          [roleAdminLabel]="roleAdminLabel()"
          [roleOperatorLabel]="roleOperatorLabel()"
          [lang]="lang()"
          (roleChange)="roleChange.emit($event)"
          (langChange)="langChange.emit($event)"
        >
          <button
            trigger
            type="button"
            class="flex size-11 flex-none cursor-pointer items-center justify-center rounded-md border border-hairline-operator bg-transparent hover:bg-canvas-operator"
            aria-label="Account settings"
            [attr.aria-expanded]="menu.open()"
            aria-haspopup="menu"
            (click)="menu.toggle()"
          >
            <lib-icon name="settings" [size]="22" color="var(--color-on-primary)" />
          </button>
        </lib-account-menu>
        @if (onCancel()) {
          <button
            type="button"
            class="flex-none cursor-pointer rounded-md border border-hairline-operator bg-transparent px-5 py-3 font-core text-sm font-semibold text-on-primary hover:bg-canvas-operator"
            (click)="cancelClick.emit()"
          >
            {{ cancelLabel() }}
          </button>
        }
      </div>
    </header>
  `,
})
export class OperatorNavBar {
  readonly task = input.required<string>();
  readonly meta = input<string | undefined>(undefined);
  readonly cancelLabel = input('Cancel');
  /** Whether to show the cancel action at all. */
  readonly onCancel = input(true);
  readonly role = input.required<AccountMenuRole>();
  readonly roleAdminLabel = input('Admin');
  readonly roleOperatorLabel = input('Operator');
  readonly lang = input.required<AccountMenuLang>();

  readonly cancelClick = output<void>();
  readonly roleChange = output<AccountMenuRole>();
  readonly langChange = output<AccountMenuLang>();
}
