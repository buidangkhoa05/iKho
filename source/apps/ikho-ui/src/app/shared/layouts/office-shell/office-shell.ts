import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Icon, OfficeNavBar, OfficeNavBarUser, OfficeSidebar, OfficeSidebarItem } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { ADMIN_ORDER, ScreenId, SCREENS, equivalentScreen, screenTitle } from '../../../core/mock-data/screens.data';
import { ViewportService } from '../../../core/layout/viewport.service';
import { AppRole, RoleService } from '../../../core/session/role.service';
import { ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'app-office-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, OfficeNavBar, OfficeSidebar, Icon],
  host: { class: 'flex flex-1 min-h-0' },
  template: `
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="flex items-stretch [&>lib-office-nav-bar]:min-w-0 [&>lib-office-nav-bar]:flex-1">
        @if (viewport.isMobile()) {
          <button
            type="button"
            class="flex w-14 flex-none cursor-pointer items-center justify-center border-none border-r border-hairline-light bg-canvas-light"
            [attr.aria-expanded]="mobileNavOpen()"
            aria-label="Toggle navigation"
            (click)="mobileNavOpen.set(!mobileNavOpen())"
          >
            <lib-icon name="menu" [size]="22" color="var(--color-ink)" />
          </button>
        }
        <lib-office-nav-bar
          workspace="iKho"
          [company]="lang.pick(strings.company)"
          [searchPlaceholder]="lang.pick(strings.searchOffice)"
          [notifications]="4"
          [user]="navUser()"
          [role]="role.role()"
          [roleAdminLabel]="lang.pick(strings.roleAdmin)"
          [roleOperatorLabel]="lang.pick(strings.roleOperator)"
          [roleSectionLabel]="lang.pick(strings.roleSection)"
          [lang]="lang.lang()"
          [langSectionLabel]="lang.pick(strings.langSection)"
          [theme]="theme.theme()"
          (roleChange)="onRoleChange($event)"
          (langChange)="lang.setLang($event)"
          (themeChange)="theme.setTheme($event)"
        />
      </div>
      <div class="relative flex min-h-0 flex-1">
        @if (viewport.isMobile() && mobileNavOpen()) {
          <button
            type="button"
            class="fixed inset-0 z-20 cursor-default border-none bg-ink/50"
            aria-label="Close navigation"
            (click)="mobileNavOpen.set(false)"
          ></button>
        }
        <div [class]="sidebarWrapperClasses()">
          <lib-office-sidebar
            [items]="sidebarItems()"
            [active]="activeScreen()"
            [collapsed]="viewport.isSidebarRail()"
            (itemSelect)="onSelect($event)"
          />
        </div>
        <main class="flex min-w-0 flex-1 flex-col gap-6 overflow-auto bg-canvas-cream p-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class OfficeShell {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  protected readonly lang = inject(LangService);
  protected readonly theme = inject(ThemeService);
  protected readonly strings = UI_STRINGS;
  protected readonly viewport = inject(ViewportService);
  protected readonly role = inject(RoleService);

  protected readonly mobileNavOpen = signal(false);

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

  protected readonly sidebarItems = computed<OfficeSidebarItem[]>(() =>
    ADMIN_ORDER.map((id) => ({ id, label: SCREENS[id].label[this.lang.lang()], icon: SCREENS[id].icon })),
  );

  protected readonly navUser = computed<OfficeNavBarUser>(() => ({
    name: this.lang.pick(this.strings.adminUser),
    initials: 'MV',
  }));

  protected readonly sidebarWrapperClasses = computed(() => {
    if (!this.viewport.isMobile()) return '';
    const base = 'fixed top-0 bottom-0 left-0 z-30 w-[var(--sidebar-width)] shadow-modal transition-transform duration-[180ms] ease-standard';
    return this.mobileNavOpen() ? `${base} translate-x-0` : `${base} -translate-x-full`;
  });

  constructor() {
    effect(() => {
      this.title.setTitle(`${screenTitle(this.activeScreen(), 'admin', this.lang.lang())} · iKho`);
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.mobileNavOpen.set(false);
  }

  onSelect(id: string): void {
    this.router.navigate(['/office', id]);
    this.mobileNavOpen.set(false);
  }

  onRoleChange(target: AppRole): void {
    if (this.role.role() === target) return;
    const next = equivalentScreen(this.activeScreen(), target);
    this.role.setRole(target);
    this.router.navigate(['/', target === 'admin' ? 'office' : 'operator', next]);
  }
}
