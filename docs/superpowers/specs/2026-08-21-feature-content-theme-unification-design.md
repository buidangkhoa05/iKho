# Feature-content theme unification (app-wide dark/light beyond shell chrome)

**Date:** 2026-08-21
**Status:** Approved
**Scope:** Frontend only (`source/apps/ikho-ui`, `source/libs/ikho-shared-ui`). No backend changes.
**Builds on:** [[2026-08-18-shell-theme-and-operator-header-design]] (which introduced `ThemeService` and made shell chrome — both nav bars, both sidebars, the root canvas — theme-aware, but explicitly deferred feature content).

## Problem

The app-wide light/dark toggle only re-skins shell chrome today. Every feature
surface ignores it:

- `office-shell.ts`'s `<main>` — where every Office feature page renders — is
  hardcoded `bg-canvas-cream`, so even the page background behind Office
  screens ignores the toggle.
- `operator-outlined-screen.ts` hardcodes `bg-canvas-operator-elevated`,
  overriding the theme-aware root canvas `OperatorShell` already sits on.
- Every shared-ui component that isn't shell chrome — `Button` (`secondary`/
  `ghost` variants), `DataPanel`, `DataTable`, `TextInput`, `KpiCard` — hardcodes
  light-only tokens (`bg-canvas-light`, `text-ink`, `border-hairline-light`,
  `hover:bg-surface-elevated-light`). None of it reacts to `[data-theme]`.
- `StatusBadge`'s tint backgrounds (`bg-status-in-stock-10`, etc.) are flat
  light pastels — wrong on a dark card once one exists.

The user's expectation, confirmed during brainstorming: the toggle should
recolor everything, including Operator's floor/scanner screens (which today
are permanently dark by design, per `DESIGN.md`). Track identity (Office vs.
Operator) moves entirely to accent color (indigo vs. teal) and type/spacing
scale (compact vs. oversized touch targets) — it no longer implies a fixed
canvas polarity.

This spec covers the **foundation** only: `tokens.css`, every component in
`libs/ikho-shared-ui`, and the two shell/screen wrapper files that render
feature content (`office-shell.ts`, `office-screen.ts`, `operator-shell.ts`,
`operator-outlined-screen.ts`). Migrating the ~40 individual feature screens
under `features/office/*` and `features/operator/*` is a separate, deferred
follow-up (see "Out of scope").

## Design

### 1. Token architecture — generalize `--color-shell-*` into surface/text tokens

Modify `source/apps/ikho-ui/src/styles/tokens.css`. The existing shell-only
tokens get renamed (not aliased — direct rename, all consumers updated) and
one new token (`--color-surface-card`) and one new alias
(`--color-text-muted`) are added, so the same four-tier surface system now
serves shell chrome *and* feature content:

Replace the current "Shell" block in `@theme { ... }`:

```css
  /* Shell (nav bars, sidebars, root canvas) — theme-aware via [data-theme].
     Feature screens do NOT use these; they keep the surface tokens above. */
  --color-shell-canvas: var(--color-canvas-light);
  --color-shell-canvas-elevated: var(--color-surface-elevated-light);
  --color-shell-ink: var(--color-ink);
  --color-shell-hairline: var(--color-hairline-light);
  --color-shell-focus-ring: var(--color-focus-ring);
```

with a general surface/text block usable by shell chrome *and* feature
content alike:

```css
  /* Theme-aware surfaces — driven by [data-theme], consumed by shell chrome
     AND feature content. Track identity (Office/Operator) no longer implies
     canvas polarity; it's expressed only via accent color + type/spacing scale. */
  --color-surface-page: var(--color-canvas-cream);
  --color-surface-header: var(--color-canvas-light);
  --color-surface-recessed: var(--color-surface-elevated-light);
  --color-surface-card: var(--color-canvas-light);
  --color-text-body: var(--color-ink);
  --color-text-muted: var(--color-shade-50);
  --color-hairline: var(--color-hairline-light);
```

`--color-focus-ring` (defined in the existing "Semantic aliases" block,
`--color-focus-ring: var(--color-primary);`) is untouched in `@theme` — its
light-mode value stays `--color-primary`. What changes is its dark-mode
behavior: today only the shell-scoped `--color-shell-focus-ring` was
overridden under `[data-theme='dark']`, so `--color-focus-ring` itself was
never theme-aware. Since feature content (e.g. `office-screen.ts`'s tabs/chips,
which already use `outline-focus-ring`) now needs a focus ring that works in
both themes, `--color-focus-ring` itself gets a `[data-theme='dark']` override
instead — see below.

Replace the `[data-theme='dark']` override block:

```css
[data-theme='dark'] {
  --color-shell-canvas: var(--color-canvas-operator);
  --color-shell-canvas-elevated: var(--color-canvas-operator-elevated);
  --color-shell-ink: var(--color-on-primary);
  --color-shell-hairline: var(--color-hairline-operator);
  --color-shell-focus-ring: var(--color-on-primary);
}
```

with:

```css
[data-theme='dark'] {
  --color-surface-page: var(--color-canvas-operator);
  --color-surface-header: var(--color-canvas-operator);
  --color-surface-recessed: var(--color-canvas-operator-elevated);
  --color-surface-card: var(--color-canvas-operator-elevated);
  --color-text-body: var(--color-on-primary);
  --color-text-muted: var(--color-shade-40);
  --color-hairline: var(--color-hairline-operator);
  --color-focus-ring: var(--color-on-primary);

  /* Status tint backgrounds — same hues, mixed to a low-alpha tint instead of
     the flat light pastel, so they read correctly on a dark card. */
  --color-status-in-stock-10: color-mix(in srgb, var(--color-status-in-stock) 18%, transparent);
  --color-status-low-stock-10: color-mix(in srgb, var(--color-status-low-stock) 18%, transparent);
  --color-status-out-of-stock-10: color-mix(in srgb, var(--color-status-out-of-stock) 18%, transparent);
  --color-status-inbound-10: color-mix(in srgb, var(--color-status-inbound) 18%, transparent);
  --color-status-outbound-10: color-mix(in srgb, var(--color-status-outbound) 18%, transparent);
  --color-status-returns-10: color-mix(in srgb, var(--color-status-returns) 18%, transparent);
}
```

Dark mode reuses the existing Operator dark palette verbatim for surfaces/text
(no new colors invented) and derives status tints from the existing status
hues via `color-mix` (no new hex values to hand-pick or get wrong).

Note `--color-surface-header` and `--color-surface-page` coincide in dark mode
(both `canvas-operator`) — that's intentional, matching Operator's existing
two-tier palette; light mode keeps three distinct tiers (`cream` / `light` /
`elevated-light`) as today.

### 2. Rename shell-token consumers to the new names

Every file currently using `bg-shell-canvas` / `bg-shell-canvas-elevated` /
`text-shell-ink` / `border-shell-hairline` / `outline-shell-focus-ring`
switches to the new general names (`bg-surface-header` /
`bg-surface-recessed` / `text-body` / `border-hairline` /
`outline-focus-ring`) — pure rename, no visual change since the values are
identical:

- `source/libs/ikho-shared-ui/src/lib/office-nav-bar/office-nav-bar.ts`
- `source/libs/ikho-shared-ui/src/lib/office-sidebar/office-sidebar.ts`
- `source/libs/ikho-shared-ui/src/lib/account-menu/account-menu.ts`
- `source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.ts`
- `source/apps/ikho-ui/src/app/shared/layouts/operator-shell/operator-shell.ts`
- `source/apps/ikho-ui/src/app/features/auth/login/login.ts`
- `source/apps/ikho-ui/src/app/features/auth/signup/signup.ts`

`office-shell.ts`'s `<main>` also changes its background from the hardcoded
`bg-canvas-cream` to `bg-surface-page` — this is the actual bug fix that
makes the Office page background follow the toggle.

`operator-shell.ts`'s root `data-track="operator"` div keeps
`bg-surface-header` (its current `bg-shell-canvas`, renamed) — matches
Operator's existing two-tier palette where page and header coincide.

### 3. Shared-ui component migration

Swap every fixed light-only class for its theme-aware equivalent. No
component-side logic changes — these are all straight class-string edits.

| Component | File | Change |
|---|---|---|
| `Button` | `libs/ikho-shared-ui/src/lib/button/button.ts` | `secondary`: `border-hairline-light bg-canvas-light text-ink hover:bg-surface-elevated-light` → `border-hairline bg-surface-card text-body hover:bg-surface-recessed`. `ghost`: `border-transparent bg-transparent text-ink hover:bg-surface-elevated-light` → `border-transparent bg-transparent text-body hover:bg-surface-recessed`. `primary`/`danger`/`operator` unchanged (already accent-based). |
| `DataPanel` | `libs/ikho-shared-ui/src/lib/data-panel/data-panel.ts` | `border-hairline-light bg-canvas-light` → `border-hairline bg-surface-card`; `text-ink` → `text-body`. |
| `KpiCard` | `libs/ikho-shared-ui/src/lib/kpi-card/kpi-card.ts` | same swap: `border-hairline-light bg-canvas-light` → `border-hairline bg-surface-card`; `text-ink` → `text-body`. |
| `TextInput` | `libs/ikho-shared-ui/src/lib/text-input/text-input.ts` | label `text-ink` → `text-body`; field `bg-canvas-light` → `bg-surface-card`; `border-hairline-light` → `border-hairline`. |
| `DataTable` | `libs/ikho-shared-ui/src/lib/data-table/data-table.ts` | wrapper + sticky header: `border-hairline-light bg-canvas-light` → `border-hairline bg-surface-card`; row `border-b border-hairline-light` → `border-b border-hairline`; row `group-hover:bg-surface-elevated-light` → `group-hover:bg-surface-recessed`; row text `text-text-body` stays (already a semantic alias — verify it now resolves through the new `--color-text-body`, no class change needed). |
| `StatusBadge` | `libs/ikho-shared-ui/src/lib/status-badge/status-badge.ts` | no class changes — it already only references `bg-status-*-10`/`text-status-*` tokens, which become theme-aware automatically via the `tokens.css` change in Section 1. |
| `Icon` | `libs/ikho-shared-ui/src/lib/icon/icon.ts` | no change (already `currentColor`/prop-driven). |
| `AccountMenu`, `OfficeNavBar`, `OfficeSidebar` | (listed in Section 2) | rename only, covered above. |

### 4. App shell wrapper migration

- `source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.ts`:
  - `TAB_DEFAULT`'s `text-shade-50` → `text-muted`.
  - `CHIP_DEFAULT`: `border-hairline-light bg-canvas-light text-shade-60` →
    `border-hairline bg-surface-card text-muted` (drops the raw `shade-60` —
    it's the same semantic role as the other muted labels on this screen,
    just previously inconsistent).
  - Detail-panel `aside`: `border-hairline-light bg-canvas-light` →
    `border-hairline bg-surface-card`; `text-ink` → `text-body`;
    `hover:bg-surface-elevated-light` → `hover:bg-surface-recessed`;
    remaining `text-shade-50` instances (eyebrow/meta labels) → `text-muted`.
- `source/apps/ikho-ui/src/app/shared/components/operator-outlined-screen/operator-outlined-screen.ts`:
  `bg-canvas-operator-elevated` → `bg-surface-card`; `text-shade-40` →
  `text-muted` (keeps identical dark-mode appearance, now theme-driven
  instead of track-hardcoded).

### 5. `DESIGN.md` update

Replace the "Update (shell theming)" paragraph (lines 256–271 of
`apps/ikho-ui/DESIGN.md`) — the "two-canvas by context of use" framing is now
fully superseded, not just for shell chrome:

> **Update (theme unification):** the light/dark canvas split is no longer
> tied to track (Office vs. Operator). Both tracks — shell chrome and feature
> content alike — render from the same theme-aware surface tokens
> (`--color-surface-*`, `--color-text-*`, `--color-hairline`) and follow the
> app-wide light/dark toggle. Track identity is expressed only through accent
> color (indigo for Office, teal for Operator — sidebar active-item and
> feature-content primary actions) and through type/spacing scale (Office's
> compact data-dense sizing vs. Operator's oversized touch targets). A single
> feature (e.g. Inbound) still renders its Office dashboard with compact
> indigo-accented UI and its Operator receiving/scan flow with oversized
> teal-accented UI — but both now honor the same toggle rather than one being
> permanently light and the other permanently dark.

The "Key Characteristics" bullet list (lines 265–271) gets the "Two-canvas
system" and final "regardless of the active shell theme" bullets updated to
match — canvas polarity is dropped from the track description entirely,
leaving accent color and type/spacing scale as the only track differentiators.

## Out of scope

- **Individual feature screens** (`features/office/*`, `features/operator/*`
  — Dashboard, Catalogue, Organization, Partners, Inventory, Inbound,
  Outbound, Returns, Billing, Reporting for Office; Dashboard, Catalogue,
  Inventory, Inbound, Outbound, Returns for Operator) are not touched here.
  Once this foundation lands they mostly inherit correct theming for free
  wherever they consume the shared-ui components above, but each needs a
  pass to catch screen-local hardcoded classes. **Known, already-confirmed
  risk for that pass:** dozens of feature files hardcode `text-shade-50` for
  Office meta/label text and `text-shade-40` for Operator meta/label text
  (e.g. `office-catalogue.ts`, `invoice-detail-panel.ts`,
  `operator-dashboard.ts`, `operator-inbound-entry.ts`) — a track-hardcoded
  convention that will read as low-contrast or invisible once a track's
  canvas can flip theme. The follow-up plan should budget for a `text-shade-*`
  → `text-body`/`text-muted` sweep across every feature file, not just a
  surface/background pass.
- **Toast/notification component.** Doesn't exist anywhere in the codebase
  today (only a `--shadow-toast` token). Nothing to migrate. This foundation
  defines the surface/text tokens (`surface-card`, `text-body`, `text-muted`)
  a future toast component should build on, but building the component itself
  is a separate, future-scoped effort.
- **`prefers-color-scheme` auto-detection.** `ThemeService` stays an explicit
  two-state toggle, unchanged from the prior spec.
- **Renaming `--color-canvas-light`/`--color-canvas-operator`/etc. themselves
  or the shade ladder.** Those stay as the underlying palette values the new
  semantic tokens resolve to — no palette changes, only how components
  reference them.

## Testing

- Update specs that assert on class strings: `button.spec.ts`,
  `office-screen.spec.ts` (already asserts `focus-visible:outline-focus-ring`
  — unaffected; add assertions for the renamed `text-muted`/`bg-surface-card`
  classes on the chip/detail-panel), `office-shell.spec.ts`.
- No new unit-test framework or snapshot testing — this repo doesn't use
  either; matching existing conventions.
- Manual verification in the running app (`pnpm nx serve ikho-ui`): toggle
  Light/Dark from the account menu on both tracks and confirm:
  - Office: dashboard, and one data-table-heavy screen (Inventory) — page
    background, `DataPanel`/`KpiCard` cards, `Button` secondary/ghost
    variants, `DataTable` rows, and `StatusBadge` tints all react to the
    toggle and stay legible in both themes.
  - Operator: dashboard, and one scan/receiving screen — same checks, plus
    confirm `OperatorOutlinedScreen`'s card follows the toggle instead of
    staying permanently dark.
  - Confirm Office's indigo accent and Operator's teal accent are unchanged
    by the toggle in both directions (track identity intact).
- `pnpm nx affected -t test` and `pnpm nx affected -t build` for `ikho-ui` and
  `ikho-shared-ui`.
