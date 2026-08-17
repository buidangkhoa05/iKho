# Header Account Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the dev-only `AppTopBar` (dark "iKho web app" prototype bar) and relocate its Admin/Operator role switch and EN/VI language switch into a new shared `AccountMenu` dropdown, wired into both the Office and Operator nav bars.

**Architecture:** A new purely-presentational `AccountMenu` component (inputs/outputs only, no service injection) lives in `ikho-shared-ui` and is used as a dropdown wrapper via content projection — `OfficeNavBar` projects the existing avatar block as its trigger, `OperatorNavBar` projects a new gear-icon button. `OfficeShell` and `OperatorShell` (the only places that may inject app-level services) own `RoleService`/`LangService` and translate `AccountMenu`'s `roleChange`/`langChange` events into real navigation/state changes, replicating `AppTopBar`'s existing `setRole` logic.

**Tech Stack:** Angular 19 standalone components, Signals, Tailwind CSS v4 (existing design tokens only), vitest-angular (`@angular/build:unit-test`).

## Global Constraints

- Frontend only — no backend/API changes (per user, this task is scoped to `source/apps/ikho-ui` and `source/libs/ikho-shared-ui`).
- `ikho-shared-ui` components stay app-agnostic: no imports from `apps/ikho-ui/src/app/core/*` (no `RoleService`, no `LangService`, no `UI_STRINGS`). `AccountMenu` defines its own local `'admin' | 'operator'` / `'en' | 'vi'` types.
- Standalone components only, `OnPush` change detection, named exports — per `CLAUDE.md` Angular conventions.
- Styling: Tailwind utility classes against existing design tokens only (`bg-primary`, `text-on-primary`, `bg-canvas-light`, `bg-canvas-cream`, `text-ink`, `text-shade-40`, `text-shade-50`, `border-hairline-light`, `shadow-modal`, `rounded-md`, `rounded-lg`) — no new plain CSS, no new tokens.
- Test files colocated as `.spec.ts`, following existing style (`describe`/`it`, `TestBed.configureTestingModule`, `fixture.componentRef.setInput(...)`).
- `AccountMenu`'s dropdown panel styling is intentionally the same in both Office and Operator contexts (light-theme chrome) rather than theme-matching each host shell — keeps the component simple; this is a deliberate scope boundary, not a gap to fill later.

---

### Task 1: `AccountMenu` shared component

**Files:**
- Create: `source/libs/ikho-shared-ui/src/lib/account-menu/account-menu.ts`
- Create: `source/libs/ikho-shared-ui/src/lib/account-menu/account-menu.spec.ts`
- Modify: `source/libs/ikho-shared-ui/src/index.ts`

**Interfaces:**
- Produces: `AccountMenu` component, selector `lib-account-menu`, `exportAs: 'libAccountMenu'`. Inputs: `role: input.required<AccountMenuRole>()`, `roleAdminLabel: input<string>()` (default `'Admin'`), `roleOperatorLabel: input<string>()` (default `'Operator'`), `lang: input.required<AccountMenuLang>()`. Outputs: `roleChange: output<AccountMenuRole>()`, `langChange: output<AccountMenuLang>()`. Public members `open: Signal<boolean>` and `toggle(): void`. Trigger content is projected via `<ng-content select="[trigger]" />` — **the trigger element itself is not wrapped in a button by `AccountMenu`** (nesting a `<button>` inside another `<button>` is invalid HTML). The consumer's own trigger element must be interactive (e.g. a `<button>`), must call `toggle()` itself, and reads open state itself. This requires a template reference variable on the `<lib-account-menu>` element: `<lib-account-menu #menu="libAccountMenu" ...><button trigger (click)="menu.toggle()" [attr.aria-expanded]="menu.open()" aria-haspopup="menu">...</button></lib-account-menu>`.

- [ ] **Step 1: Write the component**

```typescript
// source/libs/ikho-shared-ui/src/lib/account-menu/account-menu.ts
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';

export type AccountMenuRole = 'admin' | 'operator';
export type AccountMenuLang = 'en' | 'vi';

const PILL_BASE = 'rounded-md border-none bg-transparent px-3 py-1.5 font-core text-xs font-semibold text-shade-40 cursor-pointer';
const PILL_ACTIVE = 'bg-primary text-on-primary';

@Component({
  selector: 'lib-account-menu',
  exportAs: 'libAccountMenu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-block' },
  template: `
    <ng-content select="[trigger]" />
    @if (open()) {
      <div
        class="absolute right-0 top-full z-10 mt-2 flex w-56 flex-col gap-3 rounded-lg border border-hairline-light bg-canvas-light p-3 shadow-modal"
        role="menu"
      >
        <div class="flex flex-col gap-1.5">
          <span class="font-core text-[11px] font-semibold tracking-wide text-shade-50 uppercase">Role</span>
          <div class="flex gap-0.5 rounded-lg bg-canvas-cream p-0.5" role="group" aria-label="Role">
            <button
              type="button"
              [class]="pillClasses(role() === 'admin')"
              [attr.aria-pressed]="role() === 'admin'"
              (click)="selectRole('admin')"
            >
              {{ roleAdminLabel() }}
            </button>
            <button
              type="button"
              [class]="pillClasses(role() === 'operator')"
              [attr.aria-pressed]="role() === 'operator'"
              (click)="selectRole('operator')"
            >
              {{ roleOperatorLabel() }}
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="font-core text-[11px] font-semibold tracking-wide text-shade-50 uppercase">Language</span>
          <div class="flex gap-0.5 rounded-lg bg-canvas-cream p-0.5" role="group" aria-label="Language">
            <button type="button" [class]="pillClasses(lang() === 'en')" [attr.aria-pressed]="lang() === 'en'" (click)="selectLang('en')">
              EN
            </button>
            <button type="button" [class]="pillClasses(lang() === 'vi')" [attr.aria-pressed]="lang() === 'vi'" (click)="selectLang('vi')">
              VI
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AccountMenu {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly role = input.required<AccountMenuRole>();
  readonly roleAdminLabel = input('Admin');
  readonly roleOperatorLabel = input('Operator');
  readonly lang = input.required<AccountMenuLang>();

  readonly roleChange = output<AccountMenuRole>();
  readonly langChange = output<AccountMenuLang>();

  /** Public: consumers toggle this via a `#menu="libAccountMenu"` template reference on their trigger element. */
  readonly open = signal(false);

  toggle(): void {
    this.open.set(!this.open());
  }

  selectRole(role: AccountMenuRole): void {
    this.open.set(false);
    this.roleChange.emit(role);
  }

  selectLang(lang: AccountMenuLang): void {
    this.open.set(false);
    this.langChange.emit(lang);
  }

  protected pillClasses(active: boolean): string {
    return active ? `${PILL_BASE} ${PILL_ACTIVE}` : PILL_BASE;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }
}
```

- [ ] **Step 2: Write the spec**

```typescript
// source/libs/ikho-shared-ui/src/lib/account-menu/account-menu.spec.ts
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
      (roleChange)="onRoleChange($event)"
      (langChange)="onLangChange($event)"
    >
      <button trigger type="button" (click)="menu.toggle()" [attr.aria-expanded]="menu.open()" aria-haspopup="menu">open</button>
    </lib-account-menu>
  `,
})
class HostComponent {
  role: 'admin' | 'operator' = 'admin';
  lang: 'en' | 'vi' = 'en';
  lastRole: 'admin' | 'operator' | undefined;
  lastLang: 'en' | 'vi' | undefined;

  onRoleChange(role: 'admin' | 'operator'): void {
    this.lastRole = role;
  }

  onLangChange(lang: 'en' | 'vi'): void {
    this.lastLang = lang;
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

- [ ] **Step 3: Export from the library barrel**

Add to `source/libs/ikho-shared-ui/src/index.ts`:

```typescript
export * from './lib/account-menu/account-menu';
```

- [ ] **Step 4: Run the tests**

Run: `pnpm nx test ikho-shared-ui`
Expected: PASS, including all new `AccountMenu` tests.

- [ ] **Step 5: Commit**

```bash
git add source/libs/ikho-shared-ui/src/lib/account-menu source/libs/ikho-shared-ui/src/index.ts
git commit -m "feat(ikho-shared-ui): add AccountMenu dropdown component"
```

---

### Task 2: Wire `AccountMenu` into `OfficeNavBar`

**Files:**
- Modify: `source/libs/ikho-shared-ui/src/lib/office-nav-bar/office-nav-bar.ts`
- Modify: `source/libs/ikho-shared-ui/src/lib/office-nav-bar/office-nav-bar.spec.ts`

**Interfaces:**
- Consumes: `AccountMenu` (selector `lib-account-menu`), `AccountMenuRole`, `AccountMenuLang` from `../account-menu/account-menu` (Task 1).
- Produces: `OfficeNavBar` gains inputs `role: input.required<AccountMenuRole>()`, `roleAdminLabel: input<string>()` (default `'Admin'`), `roleOperatorLabel: input<string>()` (default `'Operator'`), `lang: input.required<AccountMenuLang>()`, and outputs `roleChange: output<AccountMenuRole>()`, `langChange: output<AccountMenuLang>()`.

- [ ] **Step 1: Write the failing test**

Add to `source/libs/ikho-shared-ui/src/lib/office-nav-bar/office-nav-bar.spec.ts` (after the existing `'should render the signed-in user'` test):

```typescript
  it('should emit roleChange when a role is picked from the account menu', () => {
    const fixture = TestBed.createComponent(OfficeNavBar);
    fixture.componentRef.setInput('user', { name: 'Jane Doe', initials: 'JD' });
    fixture.componentRef.setInput('role', 'admin');
    fixture.componentRef.setInput('lang', 'en');
    let emitted: string | undefined;
    fixture.componentInstance.roleChange.subscribe((role) => (emitted = role));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();
    const operatorPill = Array.from(compiled.querySelectorAll('[role="group"][aria-label="Role"] button')).find(
      (el) => el.textContent?.trim() === 'Operator',
    ) as HTMLButtonElement;
    operatorPill.click();

    expect(emitted).toBe('operator');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm nx test ikho-shared-ui`
Expected: FAIL — `role`/`lang` inputs and `roleChange` output don't exist on `OfficeNavBar` yet.

- [ ] **Step 3: Update `OfficeNavBar`**

Replace the full contents of `source/libs/ikho-shared-ui/src/lib/office-nav-bar/office-nav-bar.ts`:

```typescript
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AccountMenu, AccountMenuLang, AccountMenuRole } from '../account-menu/account-menu';
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
            [lang]="lang()"
            (roleChange)="roleChange.emit($event)"
            (langChange)="langChange.emit($event)"
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
              <div class="flex flex-col leading-tight">
                <span class="font-core text-[13px] font-semibold text-ink">{{ u.name }}</span>
                @if (u.role) {
                  <span class="font-core text-[11px] text-shade-50">{{ u.role }}</span>
                }
              </div>
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
  readonly lang = input.required<AccountMenuLang>();

  readonly searchChange = output<string>();
  readonly roleChange = output<AccountMenuRole>();
  readonly langChange = output<AccountMenuLang>();
}
```

- [ ] **Step 4: Update the two existing tests to set the now-required inputs**

In `office-nav-bar.spec.ts`, both existing `it(...)` blocks create a fixture and call `fixture.detectChanges()`. Since `role`/`lang` are `input.required` but are only read inside the `@if (user(); as u)` block, the `'should create'` test (which never sets `user`) still passes unmodified. Update only the `'should render the signed-in user'` test to also set `role`/`lang` before `detectChanges()`:

```typescript
  it('should render the signed-in user when provided', () => {
    const fixture = TestBed.createComponent(OfficeNavBar);
    fixture.componentRef.setInput('user', { name: 'Jane Doe', initials: 'JD' });
    fixture.componentRef.setInput('role', 'admin');
    fixture.componentRef.setInput('lang', 'en');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Jane Doe');
  });
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm nx test ikho-shared-ui`
Expected: PASS, all `OfficeNavBar` and `AccountMenu` tests green.

- [ ] **Step 6: Commit**

```bash
git add source/libs/ikho-shared-ui/src/lib/office-nav-bar
git commit -m "feat(ikho-shared-ui): wire AccountMenu into OfficeNavBar"
```

---

### Task 3: Add `settings` icon and wire `AccountMenu` into `OperatorNavBar`

**Files:**
- Modify: `source/libs/ikho-shared-ui/src/lib/icon/icon-paths.ts`
- Modify: `source/libs/ikho-shared-ui/src/lib/operator-nav-bar/operator-nav-bar.ts`
- Modify: `source/libs/ikho-shared-ui/src/lib/operator-nav-bar/operator-nav-bar.spec.ts`

**Interfaces:**
- Consumes: `AccountMenu`, `AccountMenuRole`, `AccountMenuLang` from Task 1; `Icon` (already exists, selector `lib-icon`).
- Produces: `OperatorNavBar` gains the same inputs/outputs as `OfficeNavBar` in Task 2: `role`, `roleAdminLabel`, `roleOperatorLabel`, `lang`, `roleChange`, `langChange`.

- [ ] **Step 1: Add the `settings` icon**

In `source/libs/ikho-shared-ui/src/lib/icon/icon-paths.ts`, add to the `ICONS` map (after the `menu` entry):

```typescript
  settings: [
    circle(12, 12, 3),
    path(
      'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
    ),
  ],
```

- [ ] **Step 2: Write the failing test**

Add to `source/libs/ikho-shared-ui/src/lib/operator-nav-bar/operator-nav-bar.spec.ts`:

```typescript
  it('should emit langChange when a language is picked from the account menu', () => {
    const fixture = TestBed.createComponent(OperatorNavBar);
    fixture.componentRef.setInput('task', 'My tasks');
    fixture.componentRef.setInput('role', 'operator');
    fixture.componentRef.setInput('lang', 'en');
    let emitted: string | undefined;
    fixture.componentInstance.langChange.subscribe((lang) => (emitted = lang));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector('button[aria-haspopup="menu"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();
    const viPill = Array.from(compiled.querySelectorAll('[role="group"][aria-label="Language"] button')).find(
      (el) => el.textContent?.trim() === 'VI',
    ) as HTMLButtonElement;
    viPill.click();

    expect(emitted).toBe('vi');
  });
```

(If `operator-nav-bar.spec.ts` doesn't already import `TestBed`/the component the way `office-nav-bar.spec.ts` does, mirror that same file's imports.)

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm nx test ikho-shared-ui`
Expected: FAIL — `role`/`lang` inputs, `langChange` output, and the account-menu trigger button don't exist on `OperatorNavBar` yet.

- [ ] **Step 4: Update `OperatorNavBar`**

Replace the full contents of `source/libs/ikho-shared-ui/src/lib/operator-nav-bar/operator-nav-bar.ts`:

```typescript
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm nx test ikho-shared-ui`
Expected: PASS, all tests green including the new one.

- [ ] **Step 6: Commit**

```bash
git add source/libs/ikho-shared-ui/src/lib/icon source/libs/ikho-shared-ui/src/lib/operator-nav-bar
git commit -m "feat(ikho-shared-ui): wire AccountMenu into OperatorNavBar"
```

---

### Task 4: Wire `RoleService`/`LangService` through `OfficeShell` and `OperatorShell`

**Files:**
- Modify: `source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.ts`
- Modify: `source/apps/ikho-ui/src/app/shared/layouts/operator-shell/operator-shell.ts`

**Interfaces:**
- Consumes: `RoleService` (`source/apps/ikho-ui/src/app/core/session/role.service.ts` — `role: Signal<AppRole>`, `setRole(role: AppRole): void`), `equivalentScreen(current: ScreenId, targetRole: AppRole): ScreenId` (`source/apps/ikho-ui/src/app/core/mock-data/screens.data.ts`), `OfficeNavBar`/`OperatorNavBar`'s new `role`/`lang`/`roleAdminLabel`/`roleOperatorLabel` inputs and `roleChange`/`langChange` outputs (Tasks 2–3), `UI_STRINGS.roleAdmin`/`UI_STRINGS.roleOperator` (already exist in `ui-strings.data.ts`).
- Produces: no new public interface — this task only wires existing pieces together.

There are no new unit-testable behaviors here beyond what `AccountMenu`/`OfficeNavBar`/`OperatorNavBar` already cover — this task is verified by the app-level build and manual check in Task 5. No test step.

- [ ] **Step 1: Update `OfficeShell`**

In `source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.ts`:

Add `RoleService` and `equivalentScreen` imports, inject `RoleService`, add a `setRole` method mirroring `AppTopBar`'s old logic, and pass the new inputs/outputs to `<lib-office-nav-bar>`.

Change the import block (top of file) from:

```typescript
import { Icon, OfficeNavBar, OfficeNavBarUser, OfficeSidebar, OfficeSidebarItem } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { ADMIN_ORDER, ScreenId, SCREENS, screenTitle } from '../../../core/mock-data/screens.data';
import { ViewportService } from '../../../core/layout/viewport.service';
```

to:

```typescript
import { Icon, OfficeNavBar, OfficeNavBarUser, OfficeSidebar, OfficeSidebarItem } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { ADMIN_ORDER, ScreenId, SCREENS, equivalentScreen, screenTitle } from '../../../core/mock-data/screens.data';
import { ViewportService } from '../../../core/layout/viewport.service';
import { AppRole, RoleService } from '../../../core/session/role.service';
```

Change the `<lib-office-nav-bar ... />` tag from:

```html
        <lib-office-nav-bar
          workspace="iKho"
          [company]="lang.pick(strings.company)"
          [searchPlaceholder]="lang.pick(strings.searchOffice)"
          [notifications]="4"
          [user]="navUser()"
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
          [lang]="lang.lang()"
          (roleChange)="onRoleChange($event)"
          (langChange)="lang.setLang($event)"
        />
```

Add `protected readonly role = inject(RoleService);` next to the existing `protected readonly viewport = inject(ViewportService);` line, and add this method to the `OfficeShell` class (near `onSelect`):

```typescript
  onRoleChange(target: AppRole): void {
    if (this.role.role() === target) return;
    const next = equivalentScreen(this.activeScreen(), target);
    this.role.setRole(target);
    this.router.navigate(['/', target === 'admin' ? 'office' : 'operator', next]);
  }
```

- [ ] **Step 2: Update `OperatorShell`**

In `source/apps/ikho-ui/src/app/shared/layouts/operator-shell/operator-shell.ts`:

Change the import block from:

```typescript
import { Icon, OperatorNavBar } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { OPERATOR_ORDER, ScreenId, SCREENS, screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
```

to:

```typescript
import { Icon, OperatorNavBar } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { OPERATOR_ORDER, ScreenId, SCREENS, equivalentScreen, screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
import { AppRole, RoleService } from '../../../core/session/role.service';
```

Change the `<lib-operator-nav-bar ... />` tag from:

```html
        <lib-operator-nav-bar
          [task]="screenTitleText()"
          [meta]="screenMetaText()"
          [cancelLabel]="lang.pick(strings.signOut)"
        />
```

to:

```html
        <lib-operator-nav-bar
          [task]="screenTitleText()"
          [meta]="screenMetaText()"
          [cancelLabel]="lang.pick(strings.signOut)"
          [role]="role.role()"
          [roleAdminLabel]="lang.pick(strings.roleAdmin)"
          [roleOperatorLabel]="lang.pick(strings.roleOperator)"
          [lang]="lang.lang()"
          (roleChange)="onRoleChange($event)"
          (langChange)="lang.setLang($event)"
        />
```

Add `protected readonly role = inject(RoleService);` next to `protected readonly lang = inject(LangService);`, and add this method to the `OperatorShell` class (near `onSelect`):

```typescript
  onRoleChange(target: AppRole): void {
    if (this.role.role() === target) return;
    const next = equivalentScreen(this.activeScreen(), target);
    this.role.setRole(target);
    this.router.navigate(['/', target === 'admin' ? 'office' : 'operator', next]);
  }
```

- [ ] **Step 3: Build to verify no compile errors**

Run: `pnpm nx build ikho-ui`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/shared/layouts/office-shell source/apps/ikho-ui/src/app/shared/layouts/operator-shell
git commit -m "feat(ikho-ui): drive role/language switching from the shell headers"
```

---

### Task 5: Remove `AppTopBar` and verify end-to-end

**Files:**
- Delete: `source/apps/ikho-ui/src/app/shared/layouts/app-top-bar/app-top-bar.ts`
- Modify: `source/apps/ikho-ui/src/app/app.ts`
- Modify: `source/apps/ikho-ui/src/app/app.html`
- Modify: `source/apps/ikho-ui/src/app/app.spec.ts`
- Modify: `source/apps/ikho-ui/src/app/core/i18n/ui-strings.data.ts`

**Interfaces:** none — this task only removes the now-unused component and its last string.

- [ ] **Step 1: Update `app.spec.ts`**

Remove the `'should render the top bar'` test from `source/apps/ikho-ui/src/app/app.spec.ts`, leaving:

```typescript
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
```

- [ ] **Step 2: Update `app.ts`**

Replace `source/apps/ikho-ui/src/app/app.ts` with:

```typescript
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
```

- [ ] **Step 3: Update `app.html`**

Replace `source/apps/ikho-ui/src/app/app.html` with:

```html
<router-outlet />
```

- [ ] **Step 4: Delete `app-top-bar.ts`**

```bash
git rm source/apps/ikho-ui/src/app/shared/layouts/app-top-bar/app-top-bar.ts
```

- [ ] **Step 5: Remove the unused `roleHint` string**

In `source/apps/ikho-ui/src/app/core/i18n/ui-strings.data.ts`, delete this line (it was only used by `AppTopBar`):

```typescript
  roleHint: { en: 'One web app · features shown by role', vi: 'Một ứng dụng web · chức năng hiển thị theo vai trò' },
```

- [ ] **Step 6: Run the full frontend test suite**

Run: `pnpm nx test ikho-ui`
Expected: PASS.

Run: `pnpm nx test ikho-shared-ui`
Expected: PASS.

- [ ] **Step 7: Build**

Run: `pnpm nx build ikho-ui`
Expected: build succeeds, no unused-import or missing-string errors.

- [ ] **Step 8: Manual verification in the running app**

Run: `pnpm nx serve ikho-ui`, open `http://localhost:4200`.

Verify:
- The dark "iKho web app" bar is gone; only the real header (workspace/company, search, bell, avatar) shows.
- Clicking the avatar (Office) opens a dropdown with Role and Language pill groups.
- On the Operator route (`/operator/...`), a gear-icon button next to Cancel opens the same dropdown.
- Picking "Operator" navigates from `/office/...` to the equivalent `/operator/...` screen (and vice versa from the Operator dropdown), matching the old top-bar behavior.
- Picking "VI" updates all visible localized strings across the header, sidebar, and page content; state persists across a page reload (localStorage-backed, unchanged from before).
- Clicking outside the dropdown, or pressing Escape, closes it.

- [ ] **Step 9: Commit**

```bash
git add source/apps/ikho-ui/src/app
git commit -m "refactor(ikho-ui): remove the dev-only AppTopBar"
```
