import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { equivalentScreen, ScreenId } from '../../../core/mock-data/screens.data';
import { AppRole, RoleService } from '../../../core/session/role.service';

const PILL_BASE = 'rounded-md border-none bg-transparent px-3 py-1.5 font-core text-xs font-semibold text-shade-40 cursor-pointer';
const PILL_ACTIVE = 'bg-canvas-cream text-ink';

@Component({
  selector: 'app-top-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <header class="flex flex-wrap items-center justify-between gap-4 bg-ink px-6 py-2.5 text-on-primary">
      <div class="flex items-center gap-3.5">
        <span class="font-core text-sm font-bold tracking-[-0.2px]">iKho web app</span>
        <span class="font-core text-xs text-shade-40">{{ lang.pick(strings.roleHint) }}</span>
      </div>
      <div class="flex items-center gap-2.5">
        <div class="flex gap-0.5 rounded-lg bg-surface-inverse-elevated p-0.5" role="group" aria-label="Role">
          <button type="button" [class]="pillClasses(role.role() === 'admin')" [attr.aria-pressed]="role.role() === 'admin'" (click)="setRole('admin')">
            {{ lang.pick(strings.roleAdmin) }}
          </button>
          <button type="button" [class]="pillClasses(role.role() === 'operator')" [attr.aria-pressed]="role.role() === 'operator'" (click)="setRole('operator')">
            {{ lang.pick(strings.roleOperator) }}
          </button>
        </div>
        <div class="flex gap-0.5 rounded-lg bg-surface-inverse-elevated p-0.5" role="group" aria-label="Language">
          <button type="button" [class]="pillClasses(lang.lang() === 'en')" [attr.aria-pressed]="lang.lang() === 'en'" (click)="lang.setLang('en')">
            EN
          </button>
          <button type="button" [class]="pillClasses(lang.lang() === 'vi')" [attr.aria-pressed]="lang.lang() === 'vi'" (click)="lang.setLang('vi')">
            VI
          </button>
        </div>
      </div>
    </header>
  `,
})
export class AppTopBar {
  private readonly router = inject(Router);
  protected readonly role = inject(RoleService);
  protected readonly lang = inject(LangService);
  protected readonly strings = UI_STRINGS;

  setRole(target: AppRole): void {
    if (this.role.role() === target) return;
    const current = this.currentScreen();
    const next = equivalentScreen(current, target);
    this.role.setRole(target);
    this.router.navigate(['/', target === 'admin' ? 'office' : 'operator', next]);
  }

  protected pillClasses(active: boolean): string {
    return active ? `${PILL_BASE} ${PILL_ACTIVE}` : PILL_BASE;
  }

  private currentScreen(): ScreenId {
    const segments = this.router.url.split('/').filter(Boolean);
    return (segments[1] as ScreenId) ?? 'dashboard';
  }
}
