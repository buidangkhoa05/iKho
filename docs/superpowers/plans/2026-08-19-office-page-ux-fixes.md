# Office Page UI/UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the four P0/P1 issues from the Office console UI/UX review: a WCAG contrast failure on the low-stock status color, missing focus-visible rings on three interactive controls, an unbounded content-width column on wide viewports, and a data table that gets squeezed when a detail panel is open next to a full-width sidebar.

**Architecture:** Four independent, additive changes: (1) a single design-token value change, (2) `focus-visible` utility classes added to two existing base-class constants, (3) a `max-width` wrapper `<div>` added to `OfficeShell`'s content area, (4) a new tiny root-provided `OfficeLayoutState` signal service that lets the routed `OfficeScreen` component tell the parent `OfficeShell` layout "a detail panel is open," which `OfficeShell` combines with its existing `ViewportService.isSidebarRail()` check to decide whether to collapse the sidebar to its icon rail. No existing public API changes; no new routes; no backend changes.

**Tech Stack:** Angular 19 (standalone components, Signals), Tailwind CSS v4 (utility classes against `@theme` tokens in `tokens.css`), vitest-angular (`@angular/build:unit-test` / `@nx/angular:unit-test`).

## Global Constraints

- `--color-status-low-stock` changes from `#f59e0b` to `#b45309` exactly — no other status token changes (verified: ≈5.0:1 contrast on white, ≈4.5:1 on `--color-status-low-stock-10`, both pass WCAG AA for normal text).
- New `focus-visible` classes must be exactly `focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring` — matches the existing pattern in `DataTable.rowClasses()` (`data-table.ts`) verbatim, no new convention.
- Content-width fix uses the existing `--content-max: 1440px` token from `tokens.css` only. `--content-max-narrow` (1280px) stays unused — explicit non-goal.
- `operator-shell.ts` gets **no changes** — its content already sits in a `max-w-[760px]` container, well under 1440px.
- `OfficeLayoutState` must be `@Injectable({ providedIn: 'root' })`, same shape as `RoleService`/`ThemeService`/`ViewportService` (a plain writable `signal` + one setter method).
- The detail-panel-open signal must be driven from `OfficeScreen`'s `detailPanel()` computed (what's actually rendered), not the raw `selectedKey` signal — avoids inheriting an existing stale-key edge case.
- Sidebar auto-collapse logic must be gated by `!viewport.isMobile()` — on mobile the sidebar is already a fixed overlay drawer, unaffected by detail-panel state.
- P2 items (KPI grid stretch on low-KPI-count pages, the `-mt-1` tab-offset hack) and mobile-width detail-panel stacking are explicitly **out of scope** for this plan.

---

### Task 1: Contrast fix — low-stock status color token

**Files:**
- Modify: `source/apps/ikho-ui/src/styles/tokens.css:19`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — `StatusBadge` (`source/libs/ikho-shared-ui/src/lib/status-badge/status-badge.ts`) and `KpiCard` (`source/libs/ikho-shared-ui/src/lib/kpi-card/kpi-card.ts`) already reference `--color-status-low-stock`/`text-status-low-stock` by token name, not hex, so no consumer code changes.

- [ ] **Step 1: Change the token value**

In `source/apps/ikho-ui/src/styles/tokens.css`, line 19:

```css
  --color-status-low-stock: #b45309;
```

(was `#f59e0b`). Leave `--color-status-low-stock-10: #fef3c7;` on the line below unchanged.

- [ ] **Step 2: Run the frontend test suite to confirm no regression**

Run: `pnpm nx test ikho-ui` and `pnpm nx test ikho-shared-ui`
Expected: PASS — existing specs assert on Tailwind class names (e.g. `text-status-low-stock`), not hex values, so none should break.

- [ ] **Step 3: Commit**

```bash
git add source/apps/ikho-ui/src/styles/tokens.css
git commit -m "fix(ikho-ui): darken low-stock status color to pass WCAG AA contrast"
```

---

### Task 2: Focus-visible ring — OfficeSidebar items

**Files:**
- Modify: `source/libs/ikho-shared-ui/src/lib/office-sidebar/office-sidebar.ts`
- Test: `source/libs/ikho-shared-ui/src/lib/office-sidebar/office-sidebar.spec.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — internal class-string change only, `OfficeSidebar`'s public `items`/`active`/`collapsed` inputs and `itemSelect` output are unchanged.

- [ ] **Step 1: Write the failing test**

Add to `source/libs/ikho-shared-ui/src/lib/office-sidebar/office-sidebar.spec.ts`:

```typescript
  it('renders sidebar items with a visible focus-visible ring', () => {
    const fixture = TestBed.createComponent(OfficeSidebar);
    fixture.componentRef.setInput('items', [{ id: 'dashboard', label: 'Dashboard', icon: 'boxes' }]);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    expect(button.className).toContain('focus-visible:outline-2');
    expect(button.className).toContain('focus-visible:outline-focus-ring');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-shared-ui`
Expected: FAIL — `button.className` does not contain `focus-visible:outline-2`.

- [ ] **Step 3: Add the focus-visible classes**

In `source/libs/ikho-shared-ui/src/lib/office-sidebar/office-sidebar.ts`, change:

```typescript
  private static readonly ITEM_BASE =
    'flex min-h-[var(--tap-target-office)] w-full items-center gap-3 rounded-md border-none px-3 py-2.5 text-left font-core text-sm font-medium [transition:var(--transition-control)]';
```

to:

```typescript
  private static readonly ITEM_BASE =
    'flex min-h-[var(--tap-target-office)] w-full items-center gap-3 rounded-md border-none px-3 py-2.5 text-left font-core text-sm font-medium [transition:var(--transition-control)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-shared-ui`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/libs/ikho-shared-ui/src/lib/office-sidebar/office-sidebar.ts source/libs/ikho-shared-ui/src/lib/office-sidebar/office-sidebar.spec.ts
git commit -m "fix(ikho-shared-ui): add focus-visible ring to office sidebar items"
```

---

### Task 3: Focus-visible ring — OfficeScreen tabs and status-filter chips

**Files:**
- Modify: `source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.ts`
- Test: `source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.spec.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — internal class-string change only.

- [ ] **Step 1: Write the failing test**

Add to `source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.spec.ts`:

```typescript
  it('renders tab and status-filter chip buttons with a visible focus-visible ring', () => {
    const fixture = TestBed.createComponent(OfficeScreen);
    fixture.componentRef.setInput('title', 'Inventory');
    fixture.componentRef.setInput('detailedTabId', 'stock');
    fixture.componentRef.setInput('rowKey', (row: Record<string, unknown>) => String(row['id']));
    fixture.componentRef.setInput('tabs', [
      { id: 'stock', label: 'Stock', columns: [], rows: [] },
      { id: 'reservations', label: 'Reservations', columns: [], rows: [] },
    ]);
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const tabButton = buttons.find((b) => b.textContent?.trim() === 'Stock') as HTMLButtonElement;
    const chipButton = buttons.find((b) => b.textContent?.trim() === 'All') as HTMLButtonElement;

    expect(tabButton.className).toContain('focus-visible:outline-2');
    expect(chipButton.className).toContain('focus-visible:outline-2');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui`
Expected: FAIL — neither button's class list contains `focus-visible:outline-2`.

- [ ] **Step 3: Add the focus-visible classes**

In `source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.ts`, change:

```typescript
const TAB_BASE = 'min-h-11 border-none border-b-2 bg-transparent px-0.5 py-2.5 font-core text-sm font-semibold cursor-pointer';
```
to:
```typescript
const TAB_BASE =
  'min-h-11 border-none border-b-2 bg-transparent px-0.5 py-2.5 font-core text-sm font-semibold cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring';
```

and change:
```typescript
const CHIP_BASE = 'min-h-8 cursor-pointer rounded-pill border px-3.5 py-[7px] font-core text-[13px] font-semibold';
```
to:
```typescript
const CHIP_BASE =
  'min-h-8 cursor-pointer rounded-pill border px-3.5 py-[7px] font-core text-[13px] font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.ts source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.spec.ts
git commit -m "fix(ikho-ui): add focus-visible ring to office screen tabs and status chips"
```

---

### Task 4: Content max-width on OfficeShell

**Files:**
- Modify: `source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.ts`
- Test (new): `source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.spec.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — purely a template wrapper `<div>` around the existing `<router-outlet />`. `office-shell.spec.ts` is a new file that Task 7 extends later.

- [ ] **Step 1: Write the failing test (new spec file)**

Create `source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.spec.ts`:

```typescript
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OfficeShell } from './office-shell';

describe('OfficeShell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeShell],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OfficeShell);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('wraps the routed content in a centered column capped at --content-max', () => {
    const fixture = TestBed.createComponent(OfficeShell);
    fixture.detectChanges();
    const wrapper = (fixture.nativeElement as HTMLElement).querySelector('main > div');
    expect(wrapper?.className).toContain('max-w-[var(--content-max)]');
    expect(wrapper?.className).toContain('mx-auto');
  });
});
```

- [ ] **Step 2: Run test to verify the second test fails**

Run: `pnpm nx test ikho-ui`
Expected: `should create` PASSES; `wraps the routed content...` FAILS (`wrapper` is `null` — `main`'s only child today is `<router-outlet>`, not a `<div>`).

- [ ] **Step 3: Add the max-width wrapper**

In `source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.ts`, change:

```html
        <main class="flex min-w-0 flex-1 flex-col gap-6 overflow-auto bg-canvas-cream p-8">
          <router-outlet />
        </main>
```

to:

```html
        <main class="flex min-w-0 flex-1 flex-col gap-6 overflow-auto bg-canvas-cream p-8">
          <div class="mx-auto w-full max-w-[var(--content-max)]">
            <router-outlet />
          </div>
        </main>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui`
Expected: PASS (both tests)

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.ts source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.spec.ts
git commit -m "fix(ikho-ui): cap office shell content width at --content-max"
```

---

### Task 5: OfficeLayoutState service

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/layout/office-layout-state.ts`
- Test: `source/apps/ikho-ui/src/app/core/layout/office-layout-state.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `OfficeLayoutState` class, `@Injectable({ providedIn: 'root' })`, with:
  - `readonly detailPanelOpen: WritableSignal<boolean>` (readable as `detailPanelOpen()`)
  - `setDetailPanelOpen(open: boolean): void`
  Task 6 (`OfficeScreen`) and Task 7 (`OfficeShell`) both inject this by class reference: `inject(OfficeLayoutState)`.

- [ ] **Step 1: Write the failing test**

Create `source/apps/ikho-ui/src/app/core/layout/office-layout-state.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { OfficeLayoutState } from './office-layout-state';

describe('OfficeLayoutState', () => {
  it('defaults detailPanelOpen to false', () => {
    const service = TestBed.inject(OfficeLayoutState);
    expect(service.detailPanelOpen()).toBe(false);
  });

  it('updates detailPanelOpen when setDetailPanelOpen is called', () => {
    const service = TestBed.inject(OfficeLayoutState);
    service.setDetailPanelOpen(true);
    expect(service.detailPanelOpen()).toBe(true);
    service.setDetailPanelOpen(false);
    expect(service.detailPanelOpen()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui`
Expected: FAIL with a module-not-found error for `./office-layout-state`.

- [ ] **Step 3: Write the implementation**

Create `source/apps/ikho-ui/src/app/core/layout/office-layout-state.ts`:

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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/layout/office-layout-state.ts source/apps/ikho-ui/src/app/core/layout/office-layout-state.spec.ts
git commit -m "feat(ikho-ui): add OfficeLayoutState service for shell/screen layout coordination"
```

---

### Task 6: OfficeScreen reports detail-panel-open state

**Files:**
- Modify: `source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.ts`
- Test: `source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.spec.ts`

**Interfaces:**
- Consumes: `OfficeLayoutState` from Task 5 (`detailPanelOpen` signal, `setDetailPanelOpen(open: boolean): void`).
- Produces: nothing new for other consumers — this task only makes `OfficeScreen` a producer for `OfficeLayoutState.detailPanelOpen`, which Task 7 reads.

- [ ] **Step 1: Write the failing tests**

Add to `source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.spec.ts`. First add the import at the top of the file (alongside the existing imports):

```typescript
import { OfficeLayoutState } from '../../../core/layout/office-layout-state';
```

Then add:

```typescript
  it('opens and closes OfficeLayoutState.detailPanelOpen as the detail panel is shown and hidden', () => {
    const fixture = TestBed.createComponent(OfficeScreen);
    fixture.componentRef.setInput('title', 'Inventory');
    fixture.componentRef.setInput('detailedTabId', 'stock');
    fixture.componentRef.setInput('rowKey', (row: Record<string, unknown>) => String(row['id']));
    fixture.componentRef.setInput('detail', () => ({
      eyebrow: 'Detail',
      title: 'Row title',
      code: 'ROW-1',
      status: 'in-stock' as const,
      statusLabel: 'In stock',
      fields: [],
    }));
    fixture.componentRef.setInput('tabs', [
      { id: 'stock', label: 'Stock', columns: [{ key: 'id', label: 'ID' }], rows: [{ id: 'ROW-1' }] },
    ]);
    fixture.detectChanges();

    const layoutState = TestBed.inject(OfficeLayoutState);
    expect(layoutState.detailPanelOpen()).toBe(false);

    fixture.componentInstance.onRowClick({ id: 'ROW-1' });
    fixture.detectChanges();
    expect(layoutState.detailPanelOpen()).toBe(true);

    const closeButton = (fixture.nativeElement as HTMLElement).querySelector('aside button') as HTMLButtonElement;
    closeButton.click();
    fixture.detectChanges();
    expect(layoutState.detailPanelOpen()).toBe(false);
  });

  it('resets OfficeLayoutState.detailPanelOpen to false when the component is destroyed with a panel open', () => {
    const fixture = TestBed.createComponent(OfficeScreen);
    fixture.componentRef.setInput('title', 'Inventory');
    fixture.componentRef.setInput('detailedTabId', 'stock');
    fixture.componentRef.setInput('rowKey', (row: Record<string, unknown>) => String(row['id']));
    fixture.componentRef.setInput('detail', () => ({
      eyebrow: 'Detail',
      title: 'Row title',
      code: 'ROW-1',
      status: 'in-stock' as const,
      statusLabel: 'In stock',
      fields: [],
    }));
    fixture.componentRef.setInput('tabs', [
      { id: 'stock', label: 'Stock', columns: [{ key: 'id', label: 'ID' }], rows: [{ id: 'ROW-1' }] },
    ]);
    fixture.detectChanges();
    fixture.componentInstance.onRowClick({ id: 'ROW-1' });
    fixture.detectChanges();

    const layoutState = TestBed.inject(OfficeLayoutState);
    expect(layoutState.detailPanelOpen()).toBe(true);

    fixture.destroy();
    expect(layoutState.detailPanelOpen()).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm nx test ikho-ui`
Expected: FAIL — `layoutState.detailPanelOpen()` stays `false` after `onRowClick`, since nothing wires `OfficeScreen` to `OfficeLayoutState` yet.

- [ ] **Step 3: Wire OfficeScreen to OfficeLayoutState**

In `source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.ts`, change the import line:

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
```
to:
```typescript
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
```

Add a new import below the existing `UI_STRINGS` import:

```typescript
import { OfficeLayoutState } from '../../../core/layout/office-layout-state';
```

Inside the `OfficeScreen` class, after the existing `protected readonly strings = UI_STRINGS;` line, add:

```typescript
  private readonly layoutState = inject(OfficeLayoutState);

  constructor() {
    effect(() => this.layoutState.setDetailPanelOpen(!!this.detailPanel()));
    inject(DestroyRef).onDestroy(() => this.layoutState.setDetailPanelOpen(false));
  }
```

(Place the constructor after the `detailPanel` computed is declared further down, or above it — Angular resolves the `effect()` callback lazily, so declaration order relative to `detailPanel` doesn't matter as long as both are class members.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm nx test ikho-ui`
Expected: PASS (all tests in the file, including the two new ones)

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.ts source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.spec.ts
git commit -m "feat(ikho-ui): report detail-panel-open state to OfficeLayoutState"
```

---

### Task 7: OfficeShell collapses the sidebar when a detail panel is open

**Files:**
- Modify: `source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.ts`
- Test: `source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.spec.ts` (created in Task 4)

**Interfaces:**
- Consumes: `OfficeLayoutState.detailPanelOpen` (Task 5), `ViewportService.isSidebarRail()` / `.isMobile()` / `.width` (existing, `source/apps/ikho-ui/src/app/core/layout/viewport.service.ts`).
- Produces: nothing new for other consumers — terminal task in this plan.

- [ ] **Step 1: Write the failing tests**

Add to `source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.spec.ts`. First add these imports at the top of the file (alongside the existing ones):

```typescript
import { ViewportService } from '../../../core/layout/viewport.service';
import { OfficeLayoutState } from '../../../core/layout/office-layout-state';
```

Then add:

```typescript
  it('collapses the sidebar to a rail when a detail panel is open on a wide, non-mobile viewport', () => {
    const fixture = TestBed.createComponent(OfficeShell);
    fixture.detectChanges();
    const viewport = TestBed.inject(ViewportService);
    const layoutState = TestBed.inject(OfficeLayoutState);

    viewport.width.set(1440);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('nav')?.className).toContain('w-[var(--sidebar-width)]');

    layoutState.setDetailPanelOpen(true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('nav')?.className).toContain('w-[var(--sidebar-rail-width)]');
  });

  it('does not collapse the sidebar for an open detail panel on a mobile viewport', () => {
    const fixture = TestBed.createComponent(OfficeShell);
    fixture.detectChanges();
    const viewport = TestBed.inject(ViewportService);
    const layoutState = TestBed.inject(OfficeLayoutState);

    viewport.width.set(500);
    layoutState.setDetailPanelOpen(true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('nav')?.className).toContain('w-[var(--sidebar-width)]');
  });
```

- [ ] **Step 2: Run tests to verify the wide-viewport case fails**

Run: `pnpm nx test ikho-ui`
Expected: in the first new test, the initial "full width" assertion PASSES, but the assertion after `setDetailPanelOpen(true)` FAILS (`nav` still has `w-[var(--sidebar-width)]`, not the rail class) — `OfficeShell` doesn't read `OfficeLayoutState` yet. The mobile test already PASSES (non-regression guard for a case that doesn't need to change).

- [ ] **Step 3: Add the sidebar-collapse computed and wire it in**

In `source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.ts`, add a new import below the existing `AuthService` import:

```typescript
import { OfficeLayoutState } from '../../../core/layout/office-layout-state';
```

After the existing `private readonly auth = inject(AuthService);` line, add:

```typescript
  private readonly layoutState = inject(OfficeLayoutState);
```

After the existing `sidebarWrapperClasses` computed, add:

```typescript
  protected readonly sidebarCollapsed = computed(
    () => this.viewport.isSidebarRail() || (this.layoutState.detailPanelOpen() && !this.viewport.isMobile()),
  );
```

Change the sidebar's `collapsed` binding in the template from:

```html
            [collapsed]="viewport.isSidebarRail()"
```

to:

```html
            [collapsed]="sidebarCollapsed()"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm nx test ikho-ui`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.ts source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.spec.ts
git commit -m "feat(ikho-ui): collapse office sidebar to rail when a detail panel is open"
```

---

## Manual verification (after all tasks)

Run `pnpm nx serve ikho-ui`, sign in, and in the browser:

1. Open Inventory (or any screen with a detailed tab), resize to ~1300px and ~1440px, click a row to open the detail panel — confirm the sidebar collapses to its icon rail and the table gets more room; closing the panel restores the full sidebar.
2. Resize past 1440px — confirm the content column stops growing and centers with equal whitespace on both sides, on both `/office/*` and `/operator/*`.
3. Tab through sidebar items, screen tabs, and status-filter chips — confirm a visible focus ring on each.
4. Visually confirm the low-stock badge/trend color still reads as "amber/warning," not shifted toward orange/brown.
