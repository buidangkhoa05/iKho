import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Icon, OperatorNavBar } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { OPERATOR_ORDER, ScreenId, SCREENS, screenMeta, screenTitle } from '../../../core/mock-data/screens.data';

const ITEM_BASE =
  'flex w-full items-center gap-3 rounded-[10px] border-l-[3px] px-3.5 py-0 min-h-14 cursor-pointer text-left font-core text-[15px] font-semibold';
const ITEM_DEFAULT = 'border-l-transparent bg-transparent text-shade-40';
const ITEM_ACTIVE = 'border-l-accent-teal bg-accent-teal/14 text-on-primary';

@Component({
  selector: 'app-operator-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Icon, OperatorNavBar],
  host: { class: 'flex flex-1 min-h-0' },
  template: `
    <div class="flex min-h-0 flex-1 bg-canvas-operator" data-track="operator">
      <nav class="flex w-[230px] flex-none flex-col gap-2.5 border-r border-hairline-operator bg-canvas-operator-elevated px-3 py-4">
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
        <lib-operator-nav-bar
          [task]="screenTitleText()"
          [meta]="screenMetaText()"
          [cancelLabel]="lang.pick(strings.signOut)"
        />
        <div class="flex max-w-[760px] flex-col gap-6 px-8 py-7">
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
  protected readonly strings = UI_STRINGS;

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
}
