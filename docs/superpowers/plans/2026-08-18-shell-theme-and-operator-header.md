# Shell Theme and Operator Header Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Operator Mode's header structurally and visually match Office Console's (reusing `OfficeNavBar`, deleting `OperatorNavBar`), and add an app-wide light/dark theme toggle scoped to the shell chrome (both nav bars, both sidebars, the base canvas) via new `shell-*` design tokens — feature screens stay untouched and light-only.

**Architecture:** A new `ThemeService` (signal + localStorage, mirrors the existing `RoleService`/`LangService` pattern) drives a `data-theme` attribute on `<html>`. New `--color-shell-*` CSS custom properties in `tokens.css` default to today's light values and get a `[data-theme='dark']` override reusing the existing Operator dark palette verbatim. Only shell components (nav bars, sidebars, root canvas) switch to these tokens — feature-screen components keep using the original (non-`shell-*`) tokens, so they're structurally immune to the toggle. `AccountMenu` gains a Theme pill group and a Sign out row, threaded through `OfficeNavBar`, which is now reused by both `OfficeShell` and `OperatorShell`.

**Tech Stack:** Angular 19 standalone components, Signals, Tailwind CSS v4 (existing design tokens only), vitest-angular (`@angular/build:unit-test`).

## Global Constraints

- Frontend only — no backend/API changes.
- `ikho-shared-ui` components stay app-agnostic: no imports from `apps/ikho-ui/src/app/core/*`.
- Standalone components only, `OnPush` change detection, named exports.
- Styling: Tailwind utility classes against existing/new design tokens only — no new plain CSS beyond the `tokens.css` additions specified here.
- Test files colocated as `.spec.ts`, following existing style (`describe`/`it`, `TestBed.configureTestingModule`, `fixture.componentRef.setInput(...)`).
- Feature screens (dashboards, KPI cards, data tables, forms across all feature areas) are explicitly out of scope — do not touch any file under `src/app/features/`.
- **Token deviation from the committed design spec:** the spec (`docs/superpowers/specs/2026-08-18-shell-theme-and-operator-header-design.md`) mentions a `--color-shell-muted` token. This plan drops it: the existing `text-shade-40`/`text-shade-50` neutrals are already used directly on both light (Office) and dark (Operator's current hardcoded sidebar) surfaces elsewhere in this codebase with acceptable contrast, so no shell-aware variant is needed for them. Only actual surface colors (canvas backgrounds, hairlines, primary text) need theme-swapping via `shell-*` tokens — `shell-canvas`, `shell-canvas-elevated`, `shell-ink`, `shell-hairline`. Do not introduce `shell-muted`.
- No real authentication/sign-out logic — `signOutClick`/`onSignOut()` stay a documented no-op.
- No `prefers-color-scheme` auto-detection — explicit two-state toggle, defaults to `'light'`.

---

### Task 1: `ThemeService`

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/theme/theme.service.ts`
- Create: `source/apps/ikho-ui/src/app/core/theme/theme.service.spec.ts`

**Interfaces:**
- Produces: `ThemeService` (`providedIn: 'root'`), exported type `AppTheme = 'light' | 'dark'`. `readonly theme: Signal<AppTheme>`. `setTheme(theme: AppTheme): void` — updates the signal, persists to `localStorage['ikho.theme']`, and sets `data-theme` on `document.documentElement`.

- [ ] **Step 1: Write the service**

```typescript
// source/apps/ikho-ui/src/app/core/theme/theme.service.ts
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type AppTheme = 'light' | 'dark';

const STORAGE_KEY = 'ikho.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly theme = signal<AppTheme>(this.readInitial());

  setTheme(theme: AppTheme): void {
    this.theme.set(theme);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  private readInitial(): AppTheme {
    if (!this.isBrowser) {
      return 'light';
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    const theme: AppTheme = stored === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  }
}
```

- [ ] **Step 2: Write the spec**

```typescript
// source/apps/ikho-ui/src/app/core/theme/theme.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should default to light theme', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');
  });

  it('should update the signal and persist to localStorage when setTheme is called', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme('dark');
    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem('ikho.theme')).toBe('dark');
  });

  it('should set the data-theme attribute on the document element', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should read a previously stored theme on initialization', () => {
    localStorage.setItem('ikho.theme', 'dark');
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `pnpm nx test ikho-ui`
Expected: PASS, including all 4 new `ThemeService` tests.

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/theme
git commit -m "feat(ikho-ui): add ThemeService for app-wide light/dark theme"
```

---

### Task 2: Shell-only dark-mode tokens

**Files:**
- Modify: `source/apps/ikho-ui/src/styles/tokens.css`

**Interfaces:**
- Produces: New Tailwind utilities `bg-shell-canvas`, `bg-shell-canvas-elevated`, `text-shell-ink`, `border-shell-hairline` (light values by default; dark values under `[data-theme='dark']`).

No test framework covers CSS token files directly — this task is verified by a successful build (Tailwind must compile the new `@theme` entries without error) and consumed/exercised by later tasks.

- [ ] **Step 1: Add the new tokens to `@theme`**

In `source/apps/ikho-ui/src/styles/tokens.css`, find this block (part of the existing "Surfaces" section):

```css
  --color-hairline-light: #e2e8f0;
  --color-hairline-operator: #1f2937;

  /* Shade ladder */
```

Replace it with:

```css
  --color-hairline-light: #e2e8f0;
  --color-hairline-operator: #1f2937;

  /* Shell (nav bars, sidebars, root canvas) — theme-aware via [data-theme].
     Feature screens do NOT use these; they keep the surface tokens above. */
  --color-shell-canvas: var(--color-canvas-light);
  --color-shell-canvas-elevated: var(--color-surface-elevated-light);
  --color-shell-ink: var(--color-ink);
  --color-shell-hairline: var(--color-hairline-light);

  /* Shade ladder */
```

- [ ] **Step 2: Add the dark-theme override**

In the same file, find this block:

```css
/* Operator Mode canvas — applied on the operator shell root */
[data-track='operator'] {
  background: var(--color-canvas-operator);
  color: var(--color-on-primary);
}
[data-track='operator'] a {
  color: var(--color-accent-teal);
}
```

Replace it with:

```css
/* Operator Mode canvas — applied on the operator shell root */
[data-track='operator'] a {
  color: var(--color-accent-teal);
}

/* App-wide dark theme override for shell tokens only — reuses the existing
   Operator dark palette verbatim. Feature-screen tokens are untouched. */
[data-theme='dark'] {
  --color-shell-canvas: var(--color-canvas-operator);
  --color-shell-canvas-elevated: var(--color-canvas-operator-elevated);
  --color-shell-ink: var(--color-on-primary);
  --color-shell-hairline: var(--color-hairline-operator);
}
```

(The `background`/`color` declarations that used to live on `[data-track='operator']` are removed here because Task 6 moves that background onto a `bg-shell-canvas` utility class directly on the Operator shell's root element instead — keeping the token override centralized in one place.)

- [ ] **Step 3: Build to verify no compile errors**

Run: `pnpm nx build ikho-ui`
Expected: build succeeds with no CSS/Tailwind errors.

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/styles/tokens.css
git commit -m "feat(ikho-ui): add shell-scoped dark theme tokens"
```

---

### Task 3: `OfficeSidebar` — switch to shell tokens

**Files:**
- Modify: `source/libs/ikho-shared-ui/src/lib/office-sidebar/office-sidebar.ts`

**Interfaces:** No input/output changes — purely a class-string swap. Existing `office-sidebar.spec.ts` (creation + item-count checks) is unaffected and needs no changes.

- [ ] **Step 1: Replace the sidebar's surface classes**

Replace the full contents of `source/libs/ikho-shared-ui/src/lib/office-sidebar/office-sidebar.ts`:

```typescript
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

export interface OfficeSidebarItem {
  id: string;
  label: string;
  icon: string;
  count?: number;
}

@Component({
  selector: 'lib-office-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: 'block h-full' },
  template: `
    <nav [class]="navClasses()">
      <ul class="m-0 flex flex-col gap-0.5 p-0">
        @for (item of items(); track item.id) {
          <li class="list-none">
            <button
              type="button"
              [class]="itemClasses(item.id)"
              [title]="collapsed() ? item.label : ''"
              (click)="itemSelect.emit(item.id)"
            >
              <lib-icon [name]="item.icon" [size]="20" />
              @if (!collapsed()) {
                <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ item.label }}</span>
                @if (item.count !== undefined) {
                  <span class="font-core text-micro text-inherit opacity-70">{{ item.count }}</span>
                }
              }
            </button>
          </li>
        }
      </ul>
      <div class="flex-none">
        <ng-content />
      </div>
    </nav>
  `,
})
export class OfficeSidebar {
  readonly items = input.required<OfficeSidebarItem[]>();
  readonly active = input<string | undefined>(undefined);
  readonly collapsed = input(false);

  readonly itemSelect = output<string>();

  private static readonly ITEM_BASE =
    'flex min-h-[var(--tap-target-office)] w-full items-center gap-3 rounded-md border-none px-3 py-2.5 text-left font-core text-sm font-medium [transition:var(--transition-control)]';
  private static readonly ITEM_DEFAULT = 'bg-transparent text-shade-60 hover:bg-shell-canvas hover:text-shell-ink';
  private static readonly ITEM_ACTIVE = 'bg-primary text-on-primary';

  protected readonly navClasses = computed(() =>
    [
      'box-border flex h-full flex-col justify-between overflow-y-auto border-r border-shell-hairline bg-shell-canvas-elevated py-4 px-3 transition-[width] duration-[180ms] ease-standard',
      this.collapsed() ? 'w-[var(--sidebar-rail-width)]' : 'w-[var(--sidebar-width)]',
    ].join(' '),
  );

  protected itemClasses(id: string): string {
    const base = OfficeSidebar.ITEM_BASE;
    return id === this.active() ? `${base} ${OfficeSidebar.ITEM_ACTIVE}` : `${base} ${OfficeSidebar.ITEM_DEFAULT}`;
  }
}
```

- [ ] **Step 2: Run the tests to verify nothing broke**

Run: `pnpm nx test ikho-shared-ui`
Expected: PASS — existing `OfficeSidebar` tests are unaffected by the class-string swap.

- [ ] **Step 3: Commit**

```bash
git add source/libs/ikho-shared-ui/src/lib/office-sidebar/office-sidebar.ts
git commit -m "feat(ikho-shared-ui): make OfficeSidebar theme-aware"
```

---

### Task 4: `AccountMenu` — Theme pill group + Sign out row

**Files:**
- Modify: `source/libs/ikho-shared-ui/src/lib/account-menu/account-menu.ts`
- Modify: `source/libs/ikho-shared-ui/src/lib/account-menu/account-menu.spec.ts`

**Interfaces:**
- Produces: new exported type `AccountMenuTheme = 'light' | 'dark'`. New inputs on `AccountMenu`: `theme: input<AccountMenuTheme>('light')` (default `'light'` — see note below), `themeLightLabel` (default `'Light'`), `themeDarkLabel` (default `'Dark'`), `themeSectionLabel` (default `'Theme'`), `signOutLabel` (default `'Sign out'`). New outputs: `themeChange: output<AccountMenuTheme>()`, `signOutClick: output<void>()`. Panel order: Role, Theme, Language, then a Sign out row below Language.

**Correction discovered during execution:** the original plan draft made `theme` `input.required`, matching `role`/`lang`. Unlike `role`/`lang` (which were introduced alongside their first consumer in an earlier plan), `AccountMenu` already has two existing consumers — `OfficeNavBar` and `OperatorNavBar` — left over from that earlier, already-merged plan. Making `theme` required here means this task's `AccountMenu` change alone does not compile: `pnpm nx test ikho-shared-ui` fails with `NG8008: Required input 'theme' from component AccountMenu must be specified` at both existing call sites, because neither passes `[theme]` yet (that only happens in Task 5). `'light'` is `ThemeService`'s own default (see Task 1), so defaulting `theme` to `'light'` here is not a design compromise — it lets this task build and test in true isolation, and Task 5 still explicitly binds the real value once it lands.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `source/libs/ikho-shared-ui/src/lib/account-menu/account-menu.spec.ts`:

```typescript
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountMenu } from './account-menu';

@Component({
  imports: [AccountMenu],
  template: `
    <lib-account-menu
      #menu="libAccountMenu"
      [role]="role"
      [lang]="lang"
      [theme]="theme"
      (roleChange)="onRoleChange($event)"
      (langChange)="onLangChange($event)"
      (themeChange)="onThemeChange($event)"
      (signOutClick)="onSignOutClick()"
    >
      <button trigger type="button" (click)="menu.toggle()" [attr.aria-expanded]="menu.open()" aria-haspopup="menu">open</button>
    </lib-account-menu>
  `,
})
class HostComponent {
  role: 'admin' | 'operator' = 'admin';
  lang: 'en' | 'vi' = 'en';
  theme: 'light' | 'dark' = 'light';
  lastRole: 'admin' | 'operator' | undefined;
  lastLang: 'en' | 'vi' | undefined;
  lastTheme: 'light' | 'dark' | undefined;
  signOutClicked = false;

  onRoleChange(role: 'admin' | 'operator'): void {
    this.lastRole = role;
  }

  onLangChange(lang: 'en' | 'vi'): void {
    this.lastLang = lang;
  }

  onThemeChange(theme: 'light' | 'dark'): void {
    this.lastTheme = theme;
  }

  onSignOutClick(): void {
    this.signOutClicked = true;
  }
}

describe('AccountMenu', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('lib-account-menu')).toBeTruthy();
  });

  it('should not show the panel until the trigger is clicked', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[role="menu"]')).toBeNull();

    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();
    expect(compiled.querySelector('[role="menu"]')).toBeTruthy();
  });

  it('should emit roleChange and close the panel when a role pill is clicked', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();

    const operatorPill = Array.from(compiled.querySelectorAll('[role="group"][aria-label="Role"] button')).find(
      (el) => el.textContent?.trim() === 'Operator',
    ) as HTMLButtonElement;
    operatorPill.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.lastRole).toBe('operator');
    expect(compiled.querySelector('[role="menu"]')).toBeNull();
  });

  it('should emit langChange when a language pill is clicked', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();

    const viPill = Array.from(compiled.querySelectorAll('[role="group"][aria-label="Language"] button')).find(
      (el) => el.textContent?.trim() === 'VI',
    ) as HTMLButtonElement;
    viPill.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.lastLang).toBe('vi');
  });

  it('should emit themeChange and close the panel when a theme pill is clicked', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();

    const darkPill = Array.from(compiled.querySelectorAll('[role="group"][aria-label="Theme"] button')).find(
      (el) => el.textContent?.trim() === 'Dark',
    ) as HTMLButtonElement;
    darkPill.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.lastTheme).toBe('dark');
    expect(compiled.querySelector('[role="menu"]')).toBeNull();
  });

  it('should emit signOutClick and close the panel when the sign-out item is clicked', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();

    const signOutButton = Array.from(compiled.querySelectorAll('[role="menuitem"]')).find(
      (el) => el.textContent?.trim() === 'Sign out',
    ) as HTMLButtonElement;
    signOutButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.signOutClicked).toBe(true);
    expect(compiled.querySelector('[role="menu"]')).toBeNull();
  });

  it('should close the panel on an outside click', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();
    expect(compiled.querySelector('[role="menu"]')).toBeTruthy();

    document.body.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();
    expect(compiled.querySelector('[role="menu"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm nx test ikho-shared-ui`
Expected: FAIL — `theme` input, `themeChange`/`signOutClick` outputs, and the Theme/Sign-out DOM don't exist on `AccountMenu` yet.

- [ ] **Step 3: Update `AccountMenu`**

Replace the full contents of `source/libs/ikho-shared-ui/src/lib/account-menu/account-menu.ts`:

```typescript
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';

export type AccountMenuRole = 'admin' | 'operator';
export type AccountMenuLang = 'en' | 'vi';
export type AccountMenuTheme = 'light' | 'dark';

const PILL_BASE = 'rounded-md border-none bg-transparent px-3 py-1.5 font-core text-xs font-semibold text-shade-40 cursor-pointer';
const PILL_ACTIVE = 'bg-primary text-on-primary';

/**
 * Role/language/theme switcher dropdown, opened from a caller-supplied trigger element.
 *
 * The content projected via `[trigger]` is NOT wrapped in a button by this component
 * (deliberately, to avoid nesting a button inside a button). The consumer's own trigger
 * element must therefore be interactive itself: it must call `toggle()` via a
 * `#menu="libAccountMenu"` template reference, and it should bind
 * `[attr.aria-expanded]="menu.open()"` and set `aria-haspopup="menu"` itself.
 *
 * Usage:
 * ```html
 * <lib-account-menu
 *   #menu="libAccountMenu"
 *   [role]="role()"
 *   [lang]="lang()"
 *   [theme]="theme()"
 *   (roleChange)="onRoleChange($event)"
 *   (langChange)="onLangChange($event)"
 *   (themeChange)="onThemeChange($event)"
 *   (signOutClick)="onSignOut()"
 * >
 *   <button
 *     trigger
 *     type="button"
 *     [attr.aria-expanded]="menu.open()"
 *     aria-haspopup="menu"
 *     (click)="menu.toggle()"
 *   >
 *     Account
 *   </button>
 * </lib-account-menu>
 * ```
 */
@Component({
  selector: 'lib-account-menu',
  exportAs: 'libAccountMenu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-block' },
  template: `
    <ng-content select="[trigger]" />
    @if (open()) {
      <div
        class="absolute right-0 top-full z-10 mt-2 flex w-56 flex-col gap-3 rounded-lg border border-shell-hairline bg-shell-canvas p-3 shadow-modal"
        role="menu"
      >
        <div class="flex flex-col gap-1.5">
          <span class="font-core text-[11px] font-semibold tracking-wide text-shade-50 uppercase">{{ roleSectionLabel() }}</span>
          <div class="flex gap-0.5 rounded-lg bg-shell-canvas-elevated p-0.5" role="group" [attr.aria-label]="roleSectionLabel()">
            <button
              type="button"
              [class]="pillClasses(role() === 'admin')"
              role="menuitemradio"
              [attr.aria-checked]="role() === 'admin'"
              (click)="selectRole('admin')"
            >
              {{ roleAdminLabel() }}
            </button>
            <button
              type="button"
              [class]="pillClasses(role() === 'operator')"
              role="menuitemradio"
              [attr.aria-checked]="role() === 'operator'"
              (click)="selectRole('operator')"
            >
              {{ roleOperatorLabel() }}
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="font-core text-[11px] font-semibold tracking-wide text-shade-50 uppercase">{{ themeSectionLabel() }}</span>
          <div class="flex gap-0.5 rounded-lg bg-shell-canvas-elevated p-0.5" role="group" [attr.aria-label]="themeSectionLabel()">
            <button
              type="button"
              [class]="pillClasses(theme() === 'light')"
              role="menuitemradio"
              [attr.aria-checked]="theme() === 'light'"
              (click)="selectTheme('light')"
            >
              {{ themeLightLabel() }}
            </button>
            <button
              type="button"
              [class]="pillClasses(theme() === 'dark')"
              role="menuitemradio"
              [attr.aria-checked]="theme() === 'dark'"
              (click)="selectTheme('dark')"
            >
              {{ themeDarkLabel() }}
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="font-core text-[11px] font-semibold tracking-wide text-shade-50 uppercase">{{ langSectionLabel() }}</span>
          <div class="flex gap-0.5 rounded-lg bg-shell-canvas-elevated p-0.5" role="group" [attr.aria-label]="langSectionLabel()">
            <button type="button" [class]="pillClasses(lang() === 'en')" role="menuitemradio" [attr.aria-checked]="lang() === 'en'" (click)="selectLang('en')">
              EN
            </button>
            <button type="button" [class]="pillClasses(lang() === 'vi')" role="menuitemradio" [attr.aria-checked]="lang() === 'vi'" (click)="selectLang('vi')">
              VI
            </button>
          </div>
        </div>
        <button
          type="button"
          class="cursor-pointer rounded-md border-none bg-transparent px-3 py-1.5 text-left font-core text-xs font-semibold text-shade-40 hover:bg-shell-canvas-elevated"
          role="menuitem"
          (click)="onSignOutClick()"
        >
          {{ signOutLabel() }}
        </button>
      </div>
    }
  `,
})
export class AccountMenu {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly role = input.required<AccountMenuRole>();
  readonly roleAdminLabel = input('Admin');
  readonly roleOperatorLabel = input('Operator');
  readonly roleSectionLabel = input('Role');
  readonly lang = input.required<AccountMenuLang>();
  readonly langSectionLabel = input('Language');
  readonly theme = input<AccountMenuTheme>('light');
  readonly themeLightLabel = input('Light');
  readonly themeDarkLabel = input('Dark');
  readonly themeSectionLabel = input('Theme');
  readonly signOutLabel = input('Sign out');

  readonly roleChange = output<AccountMenuRole>();
  readonly langChange = output<AccountMenuLang>();
  readonly themeChange = output<AccountMenuTheme>();
  readonly signOutClick = output<void>();

  private readonly _open = signal(false);
  /** Public: consumers toggle this via a `#menu="libAccountMenu"` template reference on their trigger element. */
  readonly open = this._open.asReadonly();

  toggle(): void {
    this._open.set(!this.open());
  }

  selectRole(role: AccountMenuRole): void {
    this._open.set(false);
    this.roleChange.emit(role);
  }

  selectLang(lang: AccountMenuLang): void {
    this._open.set(false);
    this.langChange.emit(lang);
  }

  selectTheme(theme: AccountMenuTheme): void {
    this._open.set(false);
    this.themeChange.emit(theme);
  }

  onSignOutClick(): void {
    this._open.set(false);
    this.signOutClick.emit();
  }

  protected pillClasses(active: boolean): string {
    return active ? `${PILL_BASE} ${PILL_ACTIVE}` : PILL_BASE;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this._open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this._open.set(false);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm nx test ikho-shared-ui`
Expected: PASS, all `AccountMenu` tests green.

- [ ] **Step 5: Commit**

```bash
git add source/libs/ikho-shared-ui/src/lib/account-menu
git commit -m "feat(ikho-shared-ui): add Theme pill group and Sign out to AccountMenu"
```

---

### Task 5: `OfficeNavBar` — shell tokens + theme/sign-out passthrough

**Files:**
- Modify: `source/libs/ikho-shared-ui/src/lib/office-nav-bar/office-nav-bar.ts`
- Modify: `source/libs/ikho-shared-ui/src/lib/office-nav-bar/office-nav-bar.spec.ts`

**Interfaces:**
- Consumes: `AccountMenuTheme` from Task 4.
- Produces: `OfficeNavBar` gains inputs `theme: input<AccountMenuTheme>('light')`, `themeLightLabel` (default `'Light'`), `themeDarkLabel` (default `'Dark'`), `themeSectionLabel` (default `'Theme'`), `signOutLabel` (default `'Sign out'`); outputs `themeChange: output<AccountMenuTheme>()`, `signOutClick: output<void>()`.

**Same correction as Task 4:** `theme` defaults to `'light'` rather than being required. `OfficeShell`/`OperatorShell` (Task 7/6) don't bind `[theme]` to `<lib-office-nav-bar>` until they land — if this input were required, this task alone would break `ikho-ui`'s build the same way Task 4 broke `ikho-shared-ui`'s.

- [ ] **Step 1: Write the failing tests**

Add to `source/libs/ikho-shared-ui/src/lib/office-nav-bar/office-nav-bar.spec.ts` (after the existing `'should emit roleChange...'` test):

```typescript
  it('should emit themeChange when a theme is picked from the account menu', () => {
    const fixture = TestBed.createComponent(OfficeNavBar);
    fixture.componentRef.setInput('user', { name: 'Jane Doe', initials: 'JD' });
    fixture.componentRef.setInput('role', 'admin');
    fixture.componentRef.setInput('lang', 'en');
    fixture.componentRef.setInput('theme', 'light');
    let emitted: string | undefined;
    fixture.componentInstance.themeChange.subscribe((theme) => (emitted = theme));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();
    const darkPill = Array.from(compiled.querySelectorAll('[role="group"][aria-label="Theme"] button')).find(
      (el) => el.textContent?.trim() === 'Dark',
    ) as HTMLButtonElement;
    darkPill.click();

    expect(emitted).toBe('dark');
  });

  it('should emit signOutClick when the sign-out item is picked from the account menu', () => {
    const fixture = TestBed.createComponent(OfficeNavBar);
    fixture.componentRef.setInput('user', { name: 'Jane Doe', initials: 'JD' });
    fixture.componentRef.setInput('role', 'admin');
    fixture.componentRef.setInput('lang', 'en');
    fixture.componentRef.setInput('theme', 'light');
    let signOutEmitted = false;
    fixture.componentInstance.signOutClick.subscribe(() => (signOutEmitted = true));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();
    const signOutButton = Array.from(compiled.querySelectorAll('[role="menuitem"]')).find(
      (el) => el.textContent?.trim() === 'Sign out',
    ) as HTMLButtonElement;
    signOutButton.click();

    expect(signOutEmitted).toBe(true);
  });
```

Also update the two existing tests that call `fixture.detectChanges()` after setting `user`/`role`/`lang` — add `fixture.componentRef.setInput('theme', 'light');` alongside the existing `role`/`lang` lines in `'should render the signed-in user when provided'` and `'should emit roleChange...'`. `theme` now defaults to `'light'` so this isn't strictly required for compilation the way `role`/`lang` are, but set it explicitly anyway for clarity and consistency with the other state inputs on the same fixture.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm nx test ikho-shared-ui`
Expected: FAIL — `theme` input and `themeChange`/`signOutClick` outputs don't exist on `OfficeNavBar` yet.

- [ ] **Step 3: Update `OfficeNavBar`**

Replace the full contents of `source/libs/ikho-shared-ui/src/lib/office-nav-bar/office-nav-bar.ts`:

```typescript
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
      class="box-border flex h-16 items-center gap-4 border-b border-shell-hairline bg-shell-canvas px-6 py-3 shadow-card"
    >
      <div class="flex flex-none flex-col">
        <span class="font-core text-sm font-bold tracking-[-0.2px] text-shell-ink">{{ workspace() }}</span>
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
                <span class="font-core text-[13px] font-semibold text-shell-ink">{{ u.name }}</span>
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
  readonly theme = input<AccountMenuTheme>('light');
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm nx test ikho-shared-ui`
Expected: PASS, all `OfficeNavBar` and `AccountMenu` tests green.

- [ ] **Step 5: Commit**

```bash
git add source/libs/ikho-shared-ui/src/lib/office-nav-bar
git commit -m "feat(ikho-shared-ui): wire theme and sign-out through OfficeNavBar"
```

---

### Task 6: `OperatorShell` — reuse `OfficeNavBar`, move task title, theme the sidebar/canvas

**Files:**
- Modify: `source/apps/ikho-ui/src/app/core/i18n/ui-strings.data.ts`
- Modify: `source/apps/ikho-ui/src/app/shared/layouts/operator-shell/operator-shell.ts`

**Interfaces:**
- Consumes: `OfficeNavBar`, `OfficeNavBarUser` (already exported from `@ikho/shared-ui`), `ThemeService`/`AppTheme` from Task 1, `UI_STRINGS.searchOperator`/`UI_STRINGS.signOut` (already exist — do not duplicate).
- Produces: three new `UI_STRINGS` entries: `themeSection`, `themeLight`, `themeDark`.

No new unit-testable behavior beyond what `OfficeNavBar`/`AccountMenu`/`ThemeService` already cover — verified by a successful app build. No test step.

- [ ] **Step 1: Add the three new `UI_STRINGS` entries**

In `source/apps/ikho-ui/src/app/core/i18n/ui-strings.data.ts`, change:

```typescript
  roleSection: { en: 'Role', vi: 'Vai trò' },
  langSection: { en: 'Language', vi: 'Ngôn ngữ' },
```

to:

```typescript
  roleSection: { en: 'Role', vi: 'Vai trò' },
  langSection: { en: 'Language', vi: 'Ngôn ngữ' },
  themeSection: { en: 'Theme', vi: 'Chủ đề' },
  themeLight: { en: 'Light', vi: 'Sáng' },
  themeDark: { en: 'Dark', vi: 'Tối' },
```

- [ ] **Step 2: Rewrite `OperatorShell`**

Replace the full contents of `source/apps/ikho-ui/src/app/shared/layouts/operator-shell/operator-shell.ts`:

```typescript
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

const ITEM_BASE =
  'flex w-full items-center gap-3 rounded-[10px] border-l-[3px] px-3.5 py-0 min-h-14 cursor-pointer text-left font-core text-[15px] font-semibold';
const ITEM_DEFAULT = 'border-l-transparent bg-transparent text-shade-40';
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
              <span class="font-core text-sm text-shade-40">{{ m }}</span>
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
    // No real auth/session system exists yet — placeholder for future sign-out logic.
    return;
  }
}
```

Note: the inline sidebar's `ITEM_DEFAULT`/`ITEM_ACTIVE`/wordmark classes (`text-shade-40`, `border-l-accent-teal bg-accent-teal/14 text-on-primary`, `text-accent-teal`) are deliberately unchanged — see Global Constraints on which colors stay theme-agnostic. Only `bg-canvas-operator` → `bg-shell-canvas`, `border-hairline-operator` → `border-shell-hairline`, and `bg-canvas-operator-elevated` → `bg-shell-canvas-elevated` changed relative to the previous version.

- [ ] **Step 3: Build to verify no compile errors**

Run: `pnpm nx build ikho-ui`
Expected: build succeeds with no TypeScript errors (this also confirms `OfficeNavBar`'s now-required `theme` input is satisfied).

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/i18n/ui-strings.data.ts source/apps/ikho-ui/src/app/shared/layouts/operator-shell/operator-shell.ts
git commit -m "feat(ikho-ui): give Operator the Office header, move task title to content"
```

---

### Task 7: `OfficeShell` — wire theme + sign-out

**Files:**
- Modify: `source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.ts`

**Interfaces:**
- Consumes: `ThemeService` from Task 1, `UI_STRINGS.themeSection`/`themeLight`/`themeDark` from Task 6.

No new unit-testable behavior — verified by a successful app build.

- [ ] **Step 1: Update `OfficeShell`**

Change the import block from:

```typescript
import { Icon, OfficeNavBar, OfficeNavBarUser, OfficeSidebar, OfficeSidebarItem } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { ADMIN_ORDER, ScreenId, SCREENS, equivalentScreen, screenTitle } from '../../../core/mock-data/screens.data';
import { ViewportService } from '../../../core/layout/viewport.service';
import { AppRole, RoleService } from '../../../core/session/role.service';
```

to:

```typescript
import { Icon, OfficeNavBar, OfficeNavBarUser, OfficeSidebar, OfficeSidebarItem } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { ADMIN_ORDER, ScreenId, SCREENS, equivalentScreen, screenTitle } from '../../../core/mock-data/screens.data';
import { ViewportService } from '../../../core/layout/viewport.service';
import { AppRole, RoleService } from '../../../core/session/role.service';
import { ThemeService } from '../../../core/theme/theme.service';
```

Change the `<lib-office-nav-bar ... />` tag from:

```html
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
          (roleChange)="onRoleChange($event)"
          (langChange)="lang.setLang($event)"
        />
```

to:

```html
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
          [themeLightLabel]="lang.pick(strings.themeLight)"
          [themeDarkLabel]="lang.pick(strings.themeDark)"
          [themeSectionLabel]="lang.pick(strings.themeSection)"
          [signOutLabel]="lang.pick(strings.signOut)"
          (roleChange)="onRoleChange($event)"
          (langChange)="lang.setLang($event)"
          (themeChange)="theme.setTheme($event)"
          (signOutClick)="onSignOut()"
        />
```

Add `protected readonly theme = inject(ThemeService);` next to the existing `protected readonly role = inject(RoleService);` line, and add this method to the `OfficeShell` class (near `onRoleChange`):

```typescript
  onSignOut(): void {
    // No real auth/session system exists yet — placeholder for future sign-out logic.
    return;
  }
```

- [ ] **Step 2: Build to verify no compile errors**

Run: `pnpm nx build ikho-ui`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.ts
git commit -m "feat(ikho-ui): wire theme and sign-out through OfficeShell"
```

---

### Task 8: Delete `OperatorNavBar`

**Files:**
- Delete: `source/libs/ikho-shared-ui/src/lib/operator-nav-bar/operator-nav-bar.ts`
- Delete: `source/libs/ikho-shared-ui/src/lib/operator-nav-bar/operator-nav-bar.spec.ts`
- Modify: `source/libs/ikho-shared-ui/src/index.ts`

**Interfaces:** none — this task only removes the now-unused component. By this point (after Task 6), nothing imports `OperatorNavBar` anymore.

- [ ] **Step 1: Remove the barrel export**

In `source/libs/ikho-shared-ui/src/index.ts`, delete this line:

```typescript
export * from './lib/operator-nav-bar/operator-nav-bar';
```

- [ ] **Step 2: Delete the component and its spec**

```bash
git rm source/libs/ikho-shared-ui/src/lib/operator-nav-bar/operator-nav-bar.ts
git rm source/libs/ikho-shared-ui/src/lib/operator-nav-bar/operator-nav-bar.spec.ts
```

- [ ] **Step 3: Check for stray references**

Grep the whole `source/` tree for any remaining references to `OperatorNavBar` or `operator-nav-bar` that might have been missed — if any turn up outside what this task already removed, they need to be cleaned up too before continuing.

- [ ] **Step 4: Run the tests and build**

Run: `pnpm nx test ikho-shared-ui`
Expected: PASS (11 → 10 test files, since `operator-nav-bar.spec.ts` is gone).

Run: `pnpm nx build ikho-ui`
Expected: build succeeds — confirms nothing still references the deleted component.

- [ ] **Step 5: Commit**

```bash
git add source/libs/ikho-shared-ui/src/index.ts
git commit -m "refactor(ikho-shared-ui): remove OperatorNavBar, superseded by OfficeNavBar"
```

---

### Task 9: `DESIGN.md` update and end-to-end verification

**Files:**
- Modify: `source/apps/ikho-ui/DESIGN.md`

**Interfaces:** none — documentation only, plus final full-suite verification.

- [ ] **Step 1: Update the "Overview" section**

In `source/apps/ikho-ui/DESIGN.md`, find:

```markdown
Both tracks use **Inter Variable** as the only typeface — headings and body share the family, differing only in weight and size, which keeps the system light to ship and consistent across Angular components. A dedicated status-color vocabulary (`status-in-stock`, `status-low-stock`, `status-out-of-stock`, `status-inbound`, `status-outbound`, `status-returns`) is the system's signature: every stock, order, and movement state maps to exactly one color pair (10%-tint background + full-strength text/icon), reused identically across badges, table rows, KPI cards, and charts.

**Key Characteristics:**
```

Replace it with:

```markdown
Both tracks use **Inter Variable** as the only typeface — headings and body share the family, differing only in weight and size, which keeps the system light to ship and consistent across Angular components. A dedicated status-color vocabulary (`status-in-stock`, `status-low-stock`, `status-out-of-stock`, `status-inbound`, `status-outbound`, `status-returns`) is the system's signature: every stock, order, and movement state maps to exactly one color pair (10%-tint background + full-strength text/icon), reused identically across badges, table rows, KPI cards, and charts.

**Update (shell theming):** the light/dark canvas split described above now applies
to each track's *feature content area* only — dashboards, tables, cards, and forms
still render Office Console light and Operator Mode dark as documented. The
*shell chrome* (both nav bars, both sidebars, and the base app canvas) has since
converged on one shared structure and is driven by an explicit app-wide light/dark
theme toggle instead of by track — see `--color-shell-*` tokens in `tokens.css`.
Operator's sidebar keeps its teal active-item accent and Office's keeps its indigo
one regardless of the toggle; those are interaction colors, not surface colors.

**Key Characteristics:**
```

- [ ] **Step 2: Update the "Key Characteristics" bullets**

Find:

```markdown
- Two-canvas system by *context of use* (office vs. floor), not by page type — a single feature (e.g. Inbound) can render its dashboard on the light Office Console and its receiving/scan flow in dark Operator Mode.
```

Replace with:

```markdown
- Two-canvas system by *context of use* (office vs. floor) for feature content — a single feature (e.g. Inbound) can render its dashboard on the light Office Console and its receiving/scan flow in dark Operator Mode. The shell chrome (headers/sidebars) no longer follows this split; it follows the app-wide theme toggle instead.
```

Find:

```markdown
- Deep indigo (`{colors.primary}`) is the sole brand/action color on the Office Console; teal (`{colors.accent-teal}`) is reserved for primary actions in Operator Mode so the two tracks are never confused for each other even in a screenshot.
```

Replace with:

```markdown
- Deep indigo (`{colors.primary}`) is the primary brand/action color across the shell chrome and the Office Console's feature content; teal (`{colors.accent-teal}`) remains Operator Mode's signature — its sidebar's active-item accent and its feature content's primary actions — regardless of the active shell theme.
```

- [ ] **Step 3: Update the Accent Teal color entry**

Find:

```markdown
- **Accent Teal** (`{colors.accent-teal}` — `#0ea5a0`): Reserved exclusively for Operator Mode primary actions (scan, confirm, complete pick) — never appears on the Office Console.
```

Replace with:

```markdown
- **Accent Teal** (`{colors.accent-teal}` — `#0ea5a0`): Operator Mode's signature accent — its sidebar's active-item indicator and its feature content's primary actions (scan, confirm, complete pick). Does not appear in Office Console's feature content or in either track's shared shell chrome.
```

- [ ] **Step 4: Run the full frontend test suite**

Run: `pnpm nx test ikho-shared-ui`
Expected: PASS.

Run: `pnpm nx test ikho-ui`
Expected: PASS.

- [ ] **Step 5: Build**

Run: `pnpm nx build ikho-ui`
Expected: build succeeds.

- [ ] **Step 6: Manual verification in the running app**

Run: `pnpm nx serve ikho-ui`, open `http://localhost:4200`.

Verify:
- Operator's header (`/operator/dashboard`) now shows the same layout as Office's: workspace/company label, search bar (placeholder "Scan or search SKU, name, bin"), bell (no badge), avatar + name, all on a light background by default.
- The task title ("My tasks" / etc.) and its meta text now render at the top of the content area below the header, at their original size, not in the header.
- Opening the AccountMenu from either Office or Operator shows Role, Theme, Language pill groups (in that order) plus a Sign out row at the bottom.
- Picking "Dark" from the Theme pills immediately re-themes: both nav bars, both sidebars, and Operator's root canvas switch to the dark palette — instantly, without a page reload, from either shell.
- With Dark active, feature-screen content (e.g. the dashboard KPI cards, data tables) stays on its original light background — untouched by the toggle.
- Operator's sidebar keeps its teal active-item highlight in both Light and Dark; Office's sidebar keeps its indigo active-item highlight in both.
- Role switching (Admin/Operator) still correctly navigates between `/office/...` and `/operator/...` from the merged header on both tracks.
- Language switching (EN/VI) still updates every localized string, including the new Theme/Sign out labels.
- Clicking "Sign out" closes the menu and does nothing else (documented no-op) — no console errors.
- Reloading the page preserves the last-picked theme (persisted via localStorage), same as role/language already do.

- [ ] **Step 7: Commit**

```bash
git add source/apps/ikho-ui/DESIGN.md
git commit -m "docs(ikho-ui): update DESIGN.md for shell theming and header convergence"
```
