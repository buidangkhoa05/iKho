# Office page UI/UX fixes (contrast, content width, detail-panel squeeze)

**Date:** 2026-08-19
**Status:** Approved
**Scope:** Frontend only (`source/apps/ikho-ui`, `source/libs/ikho-shared-ui`). No backend changes.

## Problem

A UI/UX review of the Office console — covering `office-shell.ts`, the shared
`office-screen.ts` used by all nine Office feature pages, and the
`ikho-shared-ui` primitives it composes — found four concrete, verified
issues, prioritized P0 (accessibility bugs) and P1 (layout robustness):

1. **Contrast failure.** `--color-status-low-stock: #f59e0b` (amber), used as
   text in `StatusBadge` (on its `-10` tint background) and in `KpiCard`'s
   trend text (on white), measures ≈1.9:1 and ≈2.15:1 contrast — both well
   under the WCAG AA 4.5:1 minimum for normal-size text. Every other status
   color in the same token block passes; amber is the one outlier.
2. **Unclear focus-visible state.** `OfficeSidebar`, `OfficeScreen`'s tab
   buttons, and its status-filter chips all set `border-none` with no
   explicit `focus-visible:outline*`, unlike `DataTable`'s clickable rows
   which already declare one. Needs verification and, if missing, a fix.
3. **Unbounded content width.** `tokens.css` defines `--content-max: 1440px`
   and `--content-max-narrow: 1280px`, but neither is referenced anywhere in
   the app. `OfficeShell`'s main content column has no width cap, so on wide
   monitors the KPI grid and data tables stretch edge-to-edge.
4. **Detail-panel squeeze.** `OfficeScreen`'s detail panel (`w-80`, 320px)
   sits inline next to the data table via plain `flex gap-5`. Once
   `ViewportService.isSidebarRail()`'s 768–1280px rail range is accounted
   for, the actual squeeze band is **viewport width ≥1280px** (where the
   sidebar returns to its full 240px) — narrowest right around 1280–1440px,
   before item 3's max-width cap keeps the proportions stable above 1440px.

P2 polish items from the same review (KPI grid stretch on low-KPI-count
pages, a `-mt-1` tab-offset hack) are explicitly **not** part of this spec —
tracked as a separate fast-follow.

## Design

### 1. Contrast token fix

`source/apps/ikho-ui/src/styles/tokens.css` — change:

```css
--color-status-low-stock: #f59e0b;
```
to:
```css
--color-status-low-stock: #b45309;
```

Verified contrast: ≈5.0:1 on white (`KpiCard` trend text), ≈4.5:1 on
`--color-status-low-stock-10` (`StatusBadge`) — both pass WCAG AA for
normal-size text. `--color-status-low-stock-10` is untouched; only the
foreground darkens. No component changes needed — both consumers already
reference the token, not a hardcoded hex.

### 2. Focus-visible audit

Manually verify (Tab key, in-browser) that `OfficeSidebar` items
(`office-sidebar.ts`, `ITEM_BASE`), `OfficeScreen`'s tab buttons and
status-filter chips (`office-screen.ts`, `TAB_BASE`/`CHIP_BASE`) show a
visible focus ring. If any don't, add:

```
focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring
```

to that element's base class — the same pattern `DataTable`'s clickable rows
already use (`data-table.ts`, `rowClasses()`), so no new convention is
introduced.

### 3. Content max-width

`source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.ts` —
wrap the `<router-outlet>` inside the existing `<main class="... p-8">`:

```html
<main class="flex min-w-0 flex-1 flex-col gap-6 overflow-auto bg-canvas-cream p-8">
  <div class="mx-auto w-full max-w-[var(--content-max)]">
    <router-outlet />
  </div>
</main>
```

Uses the existing `--content-max: 1440px` token (`tokens.css`) — no new
token. `p-8` stays on `main` so narrower viewports are unaffected; above
1440px the column centers with equal whitespace on both sides.

`source/apps/ikho-ui/src/app/shared/layouts/operator-shell/operator-shell.ts`
needs **no change**: its content lives in a `<div class="flex max-w-[760px]
... ">`, a narrower, content-driven width for single-column task-flow
readability that's already well under 1440px. Confirmed it's the only
content container in that shell, so the goal (bounded content width) is
already satisfied there by construction.

### 4. Detail-panel / sidebar coordination

**New service** —
`source/apps/ikho-ui/src/app/core/layout/office-layout-state.ts`:

```typescript
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OfficeLayoutState {
  readonly detailPanelOpen = signal(false);

  setDetailPanelOpen(open: boolean): void {
    this.detailPanelOpen.set(open);
  }
}
```

Same shape as the existing `RoleService`/`ThemeService`/`ViewportService`
root services — no new pattern.

**`office-screen.ts`** — inject `OfficeLayoutState`; sync it from the
`detailPanel()` computed (the thing that actually renders the `@if
(detailPanel(); as d)` aside), not from the raw `selectedKey` signal:

```typescript
constructor() {
  effect(() => this.layoutState.setDetailPanelOpen(!!this.detailPanel()));
  inject(DestroyRef).onDestroy(() => this.layoutState.setDetailPanelOpen(false));
}
```

Driving off `detailPanel()` rather than `selectedKey()` sidesteps an
existing latent inconsistency: if a search/filter change drops the
currently-selected row out of `filteredRows()`, `selectedRow`/`detailPanel`
correctly go `null` but the raw `selectedKey` signal is never reset. Tying
the new coupling to the rendered-panel computed avoids inheriting that bug.
The `DestroyRef` cleanup resets state on navigation away from the screen, so
the sidebar doesn't stay wrongly collapsed after leaving a screen with a
panel open.

**`office-shell.ts`** — inject `OfficeLayoutState`; change the sidebar's
`collapsed` input (currently `[collapsed]="viewport.isSidebarRail()"`) to:

```html
[collapsed]="viewport.isSidebarRail() || (layoutState.detailPanelOpen() && !viewport.isMobile())"
```

`!viewport.isMobile()` matters because on mobile the sidebar is already a
fixed-position overlay drawer (`sidebarWrapperClasses`), not an inline
column — detail-panel state is irrelevant there.

**Documented trade-off:** this collapses the sidebar whenever any detail
panel is open and the sidebar isn't already rail/mobile, including on very
wide monitors where there'd have been room without collapsing. Chosen over
adding a second width threshold for simplicity and predictability; the cost
is unused whitespace on large screens, not a broken layout.

## Out of scope

- P2 items from the review (KPI grid stretch on low-KPI-count pages, the
  `-mt-1` tab-offset hack in `office-screen.ts`) — separate fast-follow.
- Mobile-width stacking of the detail panel: `office-screen.ts`'s
  `flex items-start gap-5` row doesn't stack the aside below the table on
  narrow/phone viewports. Not one of the reviewed findings and touches
  different code than this fix; called out here so it isn't silently
  dropped, tracked separately.
- `--content-max-narrow` (1280px) — unused by this spec; only `--content-max`
  (1440px) is wired up, per explicit decision during design.
- Any visual/hex change to `--color-status-low-stock-10` or any other status
  color — only the low-stock foreground token changes.

## Testing

- New `office-layout-state.spec.ts`: default `false`; `setDetailPanelOpen`
  updates the signal.
- Extend `office-screen.spec.ts`: `OfficeLayoutState.detailPanelOpen()` flips
  `true` on a detailed-tab row click, `false` on the close button and on
  component destroy.
- Extend `office-shell.spec.ts`: `lib-office-sidebar`'s `collapsed` input is
  `true` when `OfficeLayoutState.detailPanelOpen()` is true and
  `viewport.isSidebarRail()` is false; unaffected when `viewport.isMobile()`
  is true.
- Manual, in-browser:
  - Resize to ~1300px and ~1440px; open a detail panel on a detailed-tab
    screen (e.g. Inventory); confirm the sidebar collapses to rail and the
    table gets more room.
  - Resize past 1440px; confirm the content column stops growing and
    centers with whitespace on both sides, on both `/office/*` and
    `/operator/*`.
  - Tab through sidebar items, screen tabs, and status-filter chips; confirm
    a visible focus ring on each.
  - Visually confirm the low-stock badge/trend color still reads as
    "amber/warning," not shifted to orange/brown.
