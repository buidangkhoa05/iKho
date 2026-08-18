import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AccountMenu, AccountMenuLang, AccountMenuRole, AccountMenuTheme } from '../account-menu/account-menu';
import { Icon } from '../icon/icon';
import { TextInput } from '../text-input/text-input';

export interface OfficeNavBarUser {
  name: string;
  role?: string;
  initials: string;
}

@Component({
  selector: 'lib-office-nav-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, TextInput, AccountMenu],
  host: { class: 'block' },
  template: `
    <header
      class="box-border flex h-16 items-center gap-4 border-b border-hairline-light bg-canvas-light px-6 py-3 shadow-card"
    >
      <div class="flex flex-none flex-col">
        <span class="font-core text-sm font-bold tracking-[-0.2px] text-ink">{{ workspace() }}</span>
        <span class="font-core text-xs text-shade-50">{{ company() }}</span>
      </div>

      <div class="max-w-[420px] flex-1">
        <lib-text-input [placeholder]="searchPlaceholder()" type="search" (valueChange)="searchChange.emit($event)" />
      </div>

      <div class="ml-auto flex items-center gap-4">
        <div class="relative flex w-5 items-center justify-center text-shade-50">
          <lib-icon name="bell" [size]="20" color="var(--color-shade-50)" />
          @if (notifications() > 0) {
            <span
              class="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-pill bg-status-out-of-stock px-1 font-core text-[10px] font-semibold text-on-primary"
            >
              {{ notifications() }}
            </span>
          }
        </div>
        @if (user(); as u) {
          <lib-account-menu
            #menu="libAccountMenu"
            [role]="role()"
            [roleAdminLabel]="roleAdminLabel()"
            [roleOperatorLabel]="roleOperatorLabel()"
            [roleSectionLabel]="roleSectionLabel()"
            [lang]="lang()"
            [langSectionLabel]="langSectionLabel()"
            [theme]="theme()"
            [themeLightLabel]="themeLightLabel()"
            [themeDarkLabel]="themeDarkLabel()"
            [themeSectionLabel]="themeSectionLabel()"
            [signOutLabel]="signOutLabel()"
            (roleChange)="roleChange.emit($event)"
            (langChange)="langChange.emit($event)"
            (themeChange)="themeChange.emit($event)"
            (signOutClick)="signOutClick.emit()"
          >
            <button
              trigger
              type="button"
              class="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0"
              [attr.aria-expanded]="menu.open()"
              aria-haspopup="menu"
              (click)="menu.toggle()"
            >
              <span
                class="flex size-8 flex-none items-center justify-center rounded-full bg-primary font-core text-xs font-semibold text-on-primary"
              >
                {{ u.initials }}
              </span>
              <span class="flex flex-col leading-tight">
                <span class="font-core text-[13px] font-semibold text-ink">{{ u.name }}</span>
                @if (u.role) {
                  <span class="font-core text-[11px] text-shade-50">{{ u.role }}</span>
                }
              </span>
            </button>
          </lib-account-menu>
        }
      </div>
    </header>
  `,
})
export class OfficeNavBar {
  readonly workspace = input('iKho');
  readonly company = input('');
  readonly searchPlaceholder = input('Search');
  readonly notifications = input(0);
  readonly user = input<OfficeNavBarUser | undefined>(undefined);
  readonly role = input.required<AccountMenuRole>();
  readonly roleAdminLabel = input('Admin');
  readonly roleOperatorLabel = input('Operator');
  readonly roleSectionLabel = input('Role');
  readonly lang = input.required<AccountMenuLang>();
  readonly langSectionLabel = input('Language');
  readonly theme = input.required<AccountMenuTheme>();
  readonly themeLightLabel = input('Light');
  readonly themeDarkLabel = input('Dark');
  readonly themeSectionLabel = input('Theme');
  readonly signOutLabel = input('Sign out');

  readonly searchChange = output<string>();
  readonly roleChange = output<AccountMenuRole>();
  readonly langChange = output<AccountMenuLang>();
  readonly themeChange = output<AccountMenuTheme>();
  readonly signOutClick = output<void>();
}
