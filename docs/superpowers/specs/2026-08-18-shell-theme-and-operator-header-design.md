# Operator header convergence + app-wide light/dark shell theme

**Date:** 2026-08-18
**Status:** Approved
**Scope:** Frontend only (`source/apps/ikho-ui`, `source/libs/ikho-shared-ui`). No backend changes.

## Problem

Operator Mode's header (`OperatorNavBar`) is visually and structurally distinct from
Office Console's header (`OfficeNavBar`) — dark canvas, task-title-only content, a
dead "Sign out" button — because `apps/ikho-ui/DESIGN.md` originally specified Office
and Operator as two deliberately different visual tracks (light vs. dark canvas,
by context of use). The user wants Operator's header to visually and structurally
match Office's, and wants a real light/dark theme toggle available app-wide.

This is a deliberate departure from `DESIGN.md`'s current "two-track by context of
use" framing for the *header/sidebar chrome* specifically — `DESIGN.md` will be
updated as part of this work (see "Out of scope / doc updates" below). Feature
screens (dashboards, tables, forms) are unaffected and keep their light-only
Office/Operator distinction as documented today.

## Design

### 1. `ThemeService`

New file: `source/apps/ikho-ui/src/app/core/theme/theme.service.ts`

Mirrors `RoleService`/`LangService` exactly:

```typescript
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

No `prefers-color-scheme` auto-detection — explicit two-state toggle, defaults to
`'light'`.

### 2. Shell-only dark-mode tokens

Modify `source/apps/ikho-ui/src/styles/tokens.css`. Add new tokens to the `@theme`
block (so Tailwind generates `bg-shell-canvas`, `text-shell-ink`, etc.) and a
`[data-theme='dark']` override block. These are **new, additional** tokens —
existing tokens (`--color-canvas-light`, `--color-ink`, etc.) are untouched, so
feature screens that reference them are structurally unaffected by the toggle.

Add inside `@theme { ... }`, after the existing "Surfaces" block:

```css
  /* Shell (nav bars, sidebars) — theme-aware; feature screens don't use these */
  --color-shell-canvas: var(--color-canvas-light);
  --color-shell-canvas-elevated: var(--color-surface-elevated-light);
  --color-shell-ink: var(--color-ink);
  --color-shell-hairline: var(--color-hairline-light);
  --color-shell-muted: var(--color-shade-50);
```

Add a new block after the existing `[data-track='operator']` block:

```css
[data-theme='dark'] {
  --color-shell-canvas: var(--color-canvas-operator);
  --color-shell-canvas-elevated: var(--color-canvas-operator-elevated);
  --color-shell-ink: var(--color-on-primary);
  --color-shell-hairline: var(--color-hairline-operator);
  --color-shell-muted: var(--color-shade-40);
}
```

Dark mode reuses the existing Operator dark palette values verbatim — no new
colors invented.

### 3. `OfficeNavBar` — switch to shell tokens, add Theme + Sign out

`source/libs/ikho-shared-ui/src/lib/office-nav-bar/office-nav-bar.ts` — replace
every light-only class with its `shell-*` equivalent:
- `bg-canvas-light` → `bg-shell-canvas`
- `text-ink` → `text-shell-ink`
- `border-hairline-light` → `border-shell-hairline`
- `text-shade-50` → `text-shell-muted`

Add new inputs/outputs, passed through to `AccountMenu`: `theme`,
`themeLightLabel` (default `'Light'`), `themeDarkLabel` (default `'Dark'`),
`themeSectionLabel` (default `'Theme'`), `signOutLabel` (default `'Sign out'`);
outputs `themeChange`, `signOutClick`.

### 4. `AccountMenu` — Theme pills + Sign out row

`source/libs/ikho-shared-ui/src/lib/account-menu/account-menu.ts`:

- New exported type `AccountMenuTheme = 'light' | 'dark'`.
- New inputs: `theme: input.required<AccountMenuTheme>()`, `themeLightLabel`
  (default `'Light'`), `themeDarkLabel` (default `'Dark'`), `themeSectionLabel`
  (default `'Theme'`), `signOutLabel` (default `'Sign out'`).
- New outputs: `themeChange: output<AccountMenuTheme>()`, `signOutClick: output<void>()`.
- New "Theme" pill group in the panel, same structure/markup as the existing
  Role/Language groups (`role="group"`, two `role="menuitemradio"` pills), placed
  between Role and Language.
- New plain menu item below the Language group: a single button, `role="menuitem"`,
  full-width, left-aligned text, same pill hover/focus treatment as the existing
  buttons but not part of a pill-group pair. `(click)` closes the panel (same as
  `selectRole`/`selectLang`) and emits `signOutClick`.
- The panel's own chrome (`bg-canvas-light`, `border-hairline-light`, etc. on the
  popover `<div>`) switches to the `shell-*` tokens too, so the dropdown itself is
  theme-aware.

### 5. Delete `OperatorNavBar`, reuse `OfficeNavBar` in `OperatorShell`

- Delete `source/libs/ikho-shared-ui/src/lib/operator-nav-bar/operator-nav-bar.ts`
  and its spec.
- Remove `OperatorNavBar` from `source/libs/ikho-shared-ui/src/index.ts`.
- `source/apps/ikho-ui/src/app/shared/layouts/operator-shell/operator-shell.ts`:
  replace `<lib-operator-nav-bar>` with `<lib-office-nav-bar>`, passing the same
  props `OfficeShell` already passes (`workspace`, `company`, `searchPlaceholder`,
  `notifications`, `user`, `role`/`lang`/`theme` + their labels, `roleChange`/
  `langChange`/`themeChange`, `signOutLabel`/`signOutClick`) — reusing the exact
  same computed values pattern `OfficeShell` uses (`navUser()`, etc.), sourced from
  `UI_STRINGS`.
- The task title + meta text (`screenTitleText()`, `screenMetaText()` — unchanged
  computeds) move out of the header and render as a new block directly above
  `<router-outlet>` inside `OperatorShell`'s `<main>`, styled with the existing
  `ik-operator-xl` / body-md classes the header used to apply, so the visual size
  or Operator's task heading doesn't shrink.
- `OperatorShell`'s `onRoleChange` method is unchanged; add an analogous
  `onThemeChange`-style pass-through (`(themeChange)="theme.setTheme($event)"`,
  no custom method needed since `setTheme` takes the emitted value directly) and
  `(signOutClick)="onSignOut()"` where `onSignOut(): void {}` is a documented no-op
  (see rationale in Section 2 discussion — no auth system exists yet).
- Mirror the same three bindings (`theme`, `themeChange`, `signOutClick`, and a
  matching `onSignOut()` no-op) into `OfficeShell`.
- `OfficeNavBar` keeps its name despite now being used by both shells — renaming
  it (e.g. to `AppNavBar`) is a bigger, purely-cosmetic diff across both shells,
  the barrel export, and every existing spec/import; not worth it for this change.
  A future rename can happen independently if the name keeps causing confusion.

### 6. Sidebar theming

- `source/libs/ikho-shared-ui/src/lib/office-sidebar/office-sidebar.ts`: switch
  its background/text/hairline classes to the `shell-*` tokens (its active-item
  indigo `primary` color is untouched — that's an interaction color, not a
  surface color, and stays as `OfficeSidebar`'s permanent signature regardless of
  theme).
- `OperatorShell`'s inline sidebar markup (`operator-shell.ts` lines ~24-37):
  switch `bg-canvas-operator-elevated` → `bg-shell-canvas-elevated`,
  `border-hairline-operator` → `border-shell-hairline`,
  `ITEM_DEFAULT`'s `text-shade-40` → `text-shell-muted`. The teal active-item
  accent (`ITEM_ACTIVE`, `border-l-accent-teal bg-accent-teal/14`) and the "iKho"
  wordmark's `text-accent-teal` are untouched — Operator's sidebar keeps its teal
  identity regardless of theme, same as Office's sidebar keeps its indigo.
- The `[data-track='operator']` background/color rule on `OperatorShell`'s root
  (`operator-shell.ts` line 23, currently `bg-canvas-operator` hardcoded) switches
  to `bg-shell-canvas` so the base canvas responds to the toggle too.

### 7. `UI_STRINGS` additions

`source/apps/ikho-ui/src/app/core/i18n/ui-strings.data.ts` — add localized
`{en, vi}` pairs for: theme section label ("Theme" / "Chủ đề"), light label
("Light" / "Sáng"), dark label ("Dark" / "Tối"), sign-out label ("Sign out" /
"Đăng xuất" — reuse the existing `signOut` string already used by the old
`OperatorNavBar`'s `cancelLabel`, do not duplicate it).

## Out of scope / doc updates

- Feature screens (dashboards, KPI cards, data tables, forms across Organization,
  Catalogue, Partners, Inventory, Inbound, Outbound, Returns, Billing, Reporting,
  and Operator's task screens) are **not** touched — they keep using the original
  (non-`shell-*`) tokens and remain light-only regardless of the theme toggle.
  Retrofitting them is explicitly deferred to a future, separately-scoped plan.
- `apps/ikho-ui/DESIGN.md` gets a small update (not a rewrite): the "two-track by
  context of use" framing is amended to clarify it now describes the *feature
  content area* only, not the header/sidebar chrome, which is theme-driven
  (light/dark) rather than role-driven (Office/Operator) as of this change. The
  "teal reserved exclusively for Operator Mode" rule is narrowed to "teal is
  Operator sidebar's permanent active-item accent," since teal no longer implies
  a dark canvas.
- No real authentication/sign-out logic — `signOutClick` stays a documented no-op
  until a real session system exists.
- No `prefers-color-scheme` auto-detection.

## Testing

- Update/add specs for `AccountMenu` (Theme pill group, Sign out row),
  `OfficeNavBar` (new inputs/outputs threaded to `AccountMenu`), `OfficeSidebar`
  and `OperatorShell`'s inline sidebar (still theme-aware after the token swap —
  verify via computed class strings, not visual diffing).
- New `ThemeService` spec: default value, `setTheme` persists to localStorage and
  sets the `data-theme` attribute, matching `RoleService`'s existing test shape.
- Manual verification in the running app: toggling Light/Dark from either
  Office's or Operator's `AccountMenu` re-themes both nav bars, both sidebars,
  and the Operator root canvas immediately; feature-screen content (e.g. the
  dashboard KPI cards) stays light regardless of the toggle; Operator's task
  title still renders correctly in the content area at its original size;
  role-switching still works from the merged header on both tracks.
