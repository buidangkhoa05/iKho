import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Icon, OfficeNavBar, OfficeNavBarUser } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { OPERATOR_ORDER, ScreenId, SCREENS, equivalentScreen, screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
import { AppRole, RoleService } from '../../../core/session/role.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { AuthService } from '../../../core/auth/auth.service';

const ITEM_BASE =
  'flex w-full items-center gap-3 rounded-[10px] border-l-[3px] px-3.5 py-0 min-h-14 cursor-pointer text-left font-core text-[15px] font-semibold';
const ITEM_DEFAULT = 'border-l-transparent bg-transparent text-shade-60';
const ITEM_ACTIVE = 'border-l-accent-teal bg-accent-teal/14 text-on-primary';

@Component({
  selector: 'app-operator-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Icon, OfficeNavBar],
  host: { class: 'flex flex-1 min-h-0' },
  template: `
    <div class="flex min-h-0 flex-1 bg-shell-canvas" data-track="operator">
      <nav class="flex w-[230px] flex-none flex-col gap-2.5 border-r border-shell-hairline bg-shell-canvas-elevated px-3 py-4">
        <div class="px-3 pt-2 pb-3.5 font-core text-lg font-bold tracking-[-0.2px] text-accent-teal">iKho</div>
        @for (item of navItems(); track item.id) {
          <button
            type="button"
            [class]="itemClasses(item.id)"
            [attr.aria-current]="item.id === activeScreen() ? 'page' : null"
            (click)="onSelect(item.id)"
          >
            <lib-icon [name]="item.icon" [size]="28" [color]="item.id === activeScreen() ? 'var(--color-accent-teal)' : 'var(--color-shade-50)'" />
            <span>{{ item.label }}</span>
          </button>
        }
      </nav>
      <main class="flex min-w-0 flex-1 flex-col overflow-auto">
        <lib-office-nav-bar
          workspace="iKho"
          [company]="lang.pick(strings.company)"
          [searchPlaceholder]="lang.pick(strings.searchOperator)"
          [notifications]="0"
          [user]="navUser()"
          [role]="role.role()"
          [roleAdminLabel]="lang.pick(strings.roleAdmin)"
          [roleOperatorLabel]="lang.pick(strings.roleOperator)"
          [roleSectionLabel]="lang.pick(strings.roleSection)"
          [lang]="lang.lang()"
          [langSectionLabel]="lang.pick(strings.langSection)"
          [theme]="theme.theme()"
          [themeLightLabel]="lang.pick(strings.themeLight)"
          [themeDarkLabel]="lang.pick(strings.themeDark)"
          [themeSectionLabel]="lang.pick(strings.themeSection)"
          [signOutLabel]="lang.pick(strings.signOut)"
          (roleChange)="onRoleChange($event)"
          (langChange)="lang.setLang($event)"
          (themeChange)="theme.setTheme($event)"
          (signOutClick)="onSignOut()"
        />
        <div class="flex max-w-[760px] flex-col gap-6 px-8 py-7">
          <div class="flex flex-col gap-1">
            <span class="font-core text-operator-xl tracking-[-0.2px] text-shell-ink">{{ screenTitleText() }}</span>
            @if (screenMetaText(); as m) {
              <span class="font-core text-sm text-shade-60">{{ m }}</span>
            }
          </div>
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class OperatorShell {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  protected readonly lang = inject(LangService);
  protected readonly role = inject(RoleService);
  protected readonly theme = inject(ThemeService);
  protected readonly strings = UI_STRINGS;
  private readonly auth = inject(AuthService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly activeScreen = computed<ScreenId>(() => {
    const segments = this.url().split('/').filter(Boolean);
    return (segments[1] as ScreenId) ?? 'dashboard';
  });

  protected readonly navItems = computed(() =>
    OPERATOR_ORDER.map((id) => ({ id, icon: SCREENS[id].icon, label: SCREENS[id].label[this.lang.lang()] })),
  );

  protected readonly screenTitleText = computed(() => screenTitle(this.activeScreen(), 'operator', this.lang.lang()));
  protected readonly screenMetaText = computed(() => screenMeta(this.activeScreen(), 'operator', this.lang.lang()));

  protected readonly navUser = computed<OfficeNavBarUser>(() => ({
    name: this.lang.pick(this.strings.adminUser),
    initials: 'MV',
  }));

  protected itemClasses(id: ScreenId): string {
    return id === this.activeScreen() ? `${ITEM_BASE} ${ITEM_ACTIVE}` : `${ITEM_BASE} ${ITEM_DEFAULT}`;
  }

  constructor() {
    effect(() => {
      this.title.setTitle(`${this.screenTitleText()} · iKho`);
    });
  }

  onSelect(id: ScreenId): void {
    this.router.navigate(['/operator', id]);
  }

  onRoleChange(target: AppRole): void {
    if (this.role.role() === target) return;
    const next = equivalentScreen(this.activeScreen(), target);
    this.role.setRole(target);
    this.router.navigate(['/', target === 'admin' ? 'office' : 'operator', next]);
  }

  onSignOut(): void {
    this.auth.signOut().then(() => this.router.navigateByUrl('/login'));
  }
}
