# Feature-Content Theme Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app-wide light/dark theme toggle (`ThemeService`, `[data-theme]`) recolor feature content — not just shell chrome — across both the Office and Operator tracks, by generalizing the existing `--color-shell-*` token pattern into an app-wide semantic surface/text token layer and migrating every `ikho-shared-ui` component and shell wrapper onto it.

**Architecture:** `tokens.css` gains four new theme-aware surface tokens (`--color-surface-page/header/recessed/card`), two text tokens (`--color-text-body/muted`), a general `--color-hairline`, and a theme-aware `--color-focus-ring`, replacing the shell-only `--color-shell-*` set. Every component that currently hardcodes light-only classes (`bg-canvas-light`, `text-ink`, `border-hairline-light`, `hover:bg-surface-elevated-light`) switches to the new names. Track identity (Office indigo / Operator teal) is untouched — only surface/text colors become theme-driven.

**Tech Stack:** Angular 19 (standalone, signals), Tailwind CSS v4 (`@theme` tokens in `tokens.css`), `vitest-angular` via `@angular/build:unit-test`, Nx 23.

## Global Constraints

- No `styles:` block in any `@Component` — express everything as template classes (existing repo rule, `apps/ikho-ui/DESIGN.md` → "Rules for new components").
- Prefer generated token utilities (`bg-surface-card`, `text-text-body`) over arbitrary values — never hardcode a new hex color.
- **Tailwind v4 naming quirk:** a `@theme` custom property `--color-text-body` compiles to the utility class `text-text-body` (the "color-" prefix is stripped, the rest of the name — `text-body` — becomes the utility suffix verbatim). This repo already has one example of this (`--color-text-body` → `text-text-body`, used in `DataTable`). Every task below uses `text-text-body`/`text-text-muted`, not `text-body`/`text-muted` — do not "clean up" the doubled name, it's correct.
- Dark mode reuses the existing Operator dark palette verbatim (`--color-canvas-operator`, `--color-canvas-operator-elevated`, `--color-hairline-operator`, `--color-on-primary`, `--color-shade-40`) — no new colors invented, except the `color-mix()` status-tint derivations specified in Task 1.
- Standalone components only, `OnPush` change detection, named class exports — matches every file touched in this plan already.
- **Out of scope, do not touch:** individual feature screens under `source/apps/ikho-ui/src/app/features/office/*` and `source/apps/ikho-ui/src/app/features/operator/*` (deferred to a follow-up plan per the spec). No `prefers-color-scheme` auto-detection. No toast/notification component (doesn't exist yet).
- Spec: `docs/superpowers/specs/2026-08-21-feature-content-theme-unification-design.md` — consult it for the "why" behind any task if a step seems ambiguous.

---

### Task 1: `tokens.css` — generalize shell tokens into app-wide surface/text tokens

**Files:**
- Modify: `source/apps/ikho-ui/src/styles/tokens.css`

**Interfaces:**
- Consumes: existing raw palette tokens already in `tokens.css` (`--color-canvas-light`, `--color-canvas-cream`, `--color-surface-elevated-light`, `--color-canvas-operator`, `--color-canvas-operator-elevated`, `--color-hairline-light`, `--color-hairline-operator`, `--color-ink`, `--color-on-primary`, `--color-shade-40`, `--color-shade-50`, `--color-primary`, `--color-status-*`).
- Produces (new/renamed Tailwind utility classes every later task consumes): `bg-surface-page`, `bg-surface-header`, `bg-surface-recessed`, `bg-surface-card`, `text-text-body`, `text-text-muted`, `border-hairline`, `outline-focus-ring` (via `--color-focus-ring`, name unchanged). Removes: `bg-shell-canvas`, `bg-shell-canvas-elevated`, `text-shell-ink`, `border-shell-hairline`, `outline-shell-focus-ring`.
- Note: `--color-text-body` and `--color-surface-page` already exist today in the "Semantic aliases" block (`--color-text-body: var(--color-ink);` and `--color-surface-page: var(--color-canvas-cream);`) — not yet theme-aware, and already consumed as `text-text-body` by `DataTable`. Step 1 below removes them from that block and redefines them, theme-aware, in the new block — no duplicate declarations left behind.

This task has no dedicated component test (it's pure CSS token declarations) — verified by `pnpm nx build ikho-ui` succeeding, and indirectly by every subsequent task's spec assertions.

- [ ] **Step 1: Replace the "Shell" block in `@theme { ... }`**

In `source/apps/ikho-ui/src/styles/tokens.css`, find:

```css
  /* Shell (nav bars, sidebars, root canvas) — theme-aware via [data-theme].
     Feature screens do NOT use these; they keep the surface tokens above. */
  --color-shell-canvas: var(--color-canvas-light);
  --color-shell-canvas-elevated: var(--color-surface-elevated-light);
  --color-shell-ink: var(--color-ink);
  --color-shell-hairline: var(--color-hairline-light);
  --color-shell-focus-ring: var(--color-focus-ring);
```

Replace it with:

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

Leave the existing `--color-focus-ring: var(--color-primary);` line (in the
"Semantic aliases used across components" block, a few lines below) exactly
as-is — do not delete or move it.

- [ ] **Step 2: Remove the now-duplicate aliases from "Semantic aliases used across components"**

A few lines below the block edited in Step 1, find:

```css
  /* Semantic aliases used across components */
  --color-text-body: var(--color-ink);
  --color-surface-page: var(--color-canvas-cream);
  --color-action-primary: var(--color-primary);
  --color-action-primary-hover: var(--color-primary-hover);
  --color-focus-ring: var(--color-primary);
```

Replace it with (dropping the two lines now defined in Step 1's new block —
leaving them here too would be a harmless but confusing duplicate
declaration of the same custom property within `@theme`):

```css
  /* Semantic aliases used across components */
  --color-action-primary: var(--color-primary);
  --color-action-primary-hover: var(--color-primary-hover);
  --color-focus-ring: var(--color-primary);
```

- [ ] **Step 3: Replace the `[data-theme='dark']` override block**

Find:

```css
[data-theme='dark'] {
  --color-shell-canvas: var(--color-canvas-operator);
  --color-shell-canvas-elevated: var(--color-canvas-operator-elevated);
  --color-shell-ink: var(--color-on-primary);
  --color-shell-hairline: var(--color-hairline-operator);
  --color-shell-focus-ring: var(--color-on-primary);
}
```

Replace it with:

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

- [ ] **Step 4: Build to verify Tailwind compiles the new tokens cleanly**

Run: `cd source && pnpm nx build ikho-ui`
Expected: build succeeds (no CSS syntax errors, no missing-variable warnings).

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/styles/tokens.css
git commit -m "feat(ikho-ui): generalize shell tokens into app-wide surface/text tokens"
```

---

### Task 2: Migrate `Button` (`secondary`/`ghost` variants)

**Files:**
- Modify: `source/libs/ikho-shared-ui/src/lib/button/button.ts`
- Test: `source/libs/ikho-shared-ui/src/lib/button/button.spec.ts`

**Interfaces:**
- Consumes: `bg-surface-card`, `text-text-body`, `hover:bg-surface-recessed`, `border-hairline` from Task 1.
- Produces: no change to `Button`'s public API (`variant`, `icon`, `iconRight`, `fullWidth`, `disabled`, `type` inputs unchanged).

- [ ] **Step 1: Write the failing test**

Add to `source/libs/ikho-shared-ui/src/lib/button/button.spec.ts` (inside the existing `describe('Button', ...)` block):

```typescript
  it('uses theme-aware surface tokens for the secondary variant', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.componentRef.setInput('variant', 'secondary');
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    expect(button.className).toContain('bg-surface-card');
    expect(button.className).toContain('text-text-body');
    expect(button.className).toContain('hover:bg-surface-recessed');
    expect(button.className).not.toContain('bg-canvas-light');
  });

  it('uses theme-aware text and hover tokens for the ghost variant', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.componentRef.setInput('variant', 'ghost');
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    expect(button.className).toContain('text-text-body');
    expect(button.className).toContain('hover:bg-surface-recessed');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd source && pnpm nx test ikho-shared-ui`
Expected: FAIL — `button.className` still contains `bg-canvas-light`/`text-ink`/`hover:bg-surface-elevated-light`, not the new classes.

- [ ] **Step 3: Update `VARIANT_CLASSES`**

In `source/libs/ikho-shared-ui/src/lib/button/button.ts`, replace:

```typescript
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border-hairline-light bg-canvas-light text-ink hover:bg-surface-elevated-light',
  danger: 'border-transparent bg-status-out-of-stock text-on-primary hover:bg-status-out-of-stock-hover',
  ghost: 'border-transparent bg-transparent text-ink hover:bg-surface-elevated-light',
  operator: 'border-transparent bg-accent-teal text-canvas-operator hover:bg-accent-teal-hover',
};
```

with:

```typescript
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border-hairline bg-surface-card text-text-body hover:bg-surface-recessed',
  danger: 'border-transparent bg-status-out-of-stock text-on-primary hover:bg-status-out-of-stock-hover',
  ghost: 'border-transparent bg-transparent text-text-body hover:bg-surface-recessed',
  operator: 'border-transparent bg-accent-teal text-canvas-operator hover:bg-accent-teal-hover',
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd source && pnpm nx test ikho-shared-ui`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/libs/ikho-shared-ui/src/lib/button/button.ts source/libs/ikho-shared-ui/src/lib/button/button.spec.ts
git commit -m "feat(ikho-shared-ui): make Button secondary/ghost variants theme-aware"
```

---

### Task 3: Migrate `DataPanel`

**Files:**
- Modify: `source/libs/ikho-shared-ui/src/lib/data-panel/data-panel.ts`
- Test: `source/libs/ikho-shared-ui/src/lib/data-panel/data-panel.spec.ts`

**Interfaces:**
- Consumes: `bg-surface-card`, `text-text-body`, `border-hairline` from Task 1.
- Produces: no change to `DataPanel`'s public API (`title`, `subtitle` inputs unchanged).

- [ ] **Step 1: Read the existing spec to match its style**

Run: `cat source/libs/ikho-shared-ui/src/lib/data-panel/data-panel.spec.ts` and add the new test using the same `TestBed`/`fixture` pattern already in that file.

- [ ] **Step 2: Write the failing test**

Add to `data-panel.spec.ts`:

```typescript
  it('uses theme-aware surface tokens for the card and title', () => {
    const fixture = TestBed.createComponent(DataPanel);
    fixture.componentRef.setInput('title', 'Inventory');
    fixture.detectChanges();
    const section = (fixture.nativeElement as HTMLElement).querySelector('section') as HTMLElement;
    const titleEl = (fixture.nativeElement as HTMLElement).querySelector('.text-text-body') as HTMLElement;
    expect(section.className).toContain('bg-surface-card');
    expect(section.className).toContain('border-hairline');
    expect(section.className).not.toContain('bg-canvas-light');
    expect(titleEl).toBeTruthy();
  });
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd source && pnpm nx test ikho-shared-ui`
Expected: FAIL — section still has `bg-canvas-light`/`border-hairline-light`, title still has `text-ink` not `text-text-body`.

- [ ] **Step 4: Update the template**

In `source/libs/ikho-shared-ui/src/lib/data-panel/data-panel.ts`, replace:

```typescript
      class="flex flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card"
```

with:

```typescript
      class="flex flex-col gap-4 rounded-card border border-hairline bg-surface-card p-6 shadow-card"
```

and replace:

```typescript
            <div class="font-core text-heading-md text-ink">{{ t }}</div>
```

with:

```typescript
            <div class="font-core text-heading-md text-text-body">{{ t }}</div>
```

(leave the subtitle's `text-shade-50` untouched — it's a muted secondary label, not covered by this pass; see Task 12's note on the deferred `text-shade-*` sweep.)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd source && pnpm nx test ikho-shared-ui`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add source/libs/ikho-shared-ui/src/lib/data-panel/data-panel.ts source/libs/ikho-shared-ui/src/lib/data-panel/data-panel.spec.ts
git commit -m "feat(ikho-shared-ui): make DataPanel theme-aware"
```

---

### Task 4: Migrate `KpiCard`

**Files:**
- Modify: `source/libs/ikho-shared-ui/src/lib/kpi-card/kpi-card.ts`
- Test: `source/libs/ikho-shared-ui/src/lib/kpi-card/kpi-card.spec.ts`

**Interfaces:**
- Consumes: `bg-surface-card`, `text-text-body`, `border-hairline` from Task 1.
- Produces: no change to `KpiCard`'s public API.

- [ ] **Step 1: Write the failing test**

Add to `kpi-card.spec.ts`:

```typescript
  it('uses theme-aware surface tokens for the card', () => {
    const fixture = TestBed.createComponent(KpiCard);
    fixture.componentRef.setInput('label', 'On hand');
    fixture.componentRef.setInput('value', '1,204');
    fixture.detectChanges();
    const card = (fixture.nativeElement as HTMLElement).querySelector('div') as HTMLElement;
    expect(card.className).toContain('bg-surface-card');
    expect(card.className).toContain('border-hairline');
    expect(card.className).not.toContain('bg-canvas-light');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd source && pnpm nx test ikho-shared-ui`
Expected: FAIL

- [ ] **Step 3: Update the template**

In `source/libs/ikho-shared-ui/src/lib/kpi-card/kpi-card.ts`, replace:

```typescript
      class="flex h-full flex-col gap-2 rounded-lg border border-hairline-light bg-canvas-light p-5 shadow-card"
```

with:

```typescript
      class="flex h-full flex-col gap-2 rounded-lg border border-hairline bg-surface-card p-5 shadow-card"
```

and replace:

```typescript
      <div class="font-core text-[32px] leading-[1.2] font-[650] tracking-[-0.4px] text-ink">
```

with:

```typescript
      <div class="font-core text-[32px] leading-[1.2] font-[650] tracking-[-0.4px] text-text-body">
```

(the `text-shade-50` uses for label/unit/caption and the `TREND_CLASS` fallback stay untouched — same deferred-sweep note as Task 3.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd source && pnpm nx test ikho-shared-ui`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/libs/ikho-shared-ui/src/lib/kpi-card/kpi-card.ts source/libs/ikho-shared-ui/src/lib/kpi-card/kpi-card.spec.ts
git commit -m "feat(ikho-shared-ui): make KpiCard theme-aware"
```

---

### Task 5: Migrate `TextInput`

**Files:**
- Modify: `source/libs/ikho-shared-ui/src/lib/text-input/text-input.ts`
- Test: `source/libs/ikho-shared-ui/src/lib/text-input/text-input.spec.ts`

**Interfaces:**
- Consumes: `bg-surface-card`, `text-text-body`, `border-hairline` from Task 1.
- Produces: no change to `TextInput`'s public API (`value` model, other inputs unchanged).

- [ ] **Step 1: Write the failing test**

Add to `text-input.spec.ts`:

```typescript
  it('uses theme-aware surface tokens for the field and label', () => {
    const fixture = TestBed.createComponent(TextInput);
    fixture.componentRef.setInput('label', 'SKU');
    fixture.detectChanges();
    const field = (fixture.nativeElement as HTMLElement).querySelector('.rounded-input') as HTMLElement;
    expect(field.className).toContain('bg-surface-card');
    expect(field.className).not.toContain('bg-canvas-light');
    const labelEl = (fixture.nativeElement as HTMLElement).querySelector('label > span:first-child') as HTMLElement;
    expect(labelEl.className).toContain('text-text-body');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd source && pnpm nx test ikho-shared-ui`
Expected: FAIL

- [ ] **Step 3: Update the template**

In `source/libs/ikho-shared-ui/src/lib/text-input/text-input.ts`, replace:

```typescript
        <span class="font-core text-[13px] font-semibold text-ink">{{ l }}</span>
      }
      <span
        class="flex items-center gap-2 rounded-input border bg-canvas-light px-3 py-2 [transition:var(--transition-control)] focus-within:border-primary"
        [class]="error() ? 'border-status-out-of-stock' : 'border-hairline-light'"
```

with:

```typescript
        <span class="font-core text-[13px] font-semibold text-text-body">{{ l }}</span>
      }
      <span
        class="flex items-center gap-2 rounded-input border bg-surface-card px-3 py-2 [transition:var(--transition-control)] focus-within:border-primary"
        [class]="error() ? 'border-status-out-of-stock' : 'border-hairline'"
```

(the input element's own `text-text-body` class is already a semantic alias resolving through `--color-text-body` — no change needed there; prefix/suffix/hint `text-shade-50` stay untouched.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd source && pnpm nx test ikho-shared-ui`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/libs/ikho-shared-ui/src/lib/text-input/text-input.ts source/libs/ikho-shared-ui/src/lib/text-input/text-input.spec.ts
git commit -m "feat(ikho-shared-ui): make TextInput theme-aware"
```

---

### Task 6: Migrate `DataTable`

**Files:**
- Modify: `source/libs/ikho-shared-ui/src/lib/data-table/data-table.ts`
- Test: `source/libs/ikho-shared-ui/src/lib/data-table/data-table.spec.ts`

**Interfaces:**
- Consumes: `bg-surface-card`, `border-hairline`, `hover:bg-surface-recessed` from Task 1.
- Produces: no change to `DataTable`'s public API (`columns`, `rows`, `emptyLabel`, `clickable` inputs, `rowClick` output unchanged).

- [ ] **Step 1: Write the failing test**

Add to `data-table.spec.ts`, matching the file's existing `columns`/`rows` setup pattern (see its `should render one row per item` test):

```typescript
  it('uses theme-aware surface tokens for the wrapper and header', () => {
    const fixture = TestBed.createComponent(DataTable);
    fixture.componentRef.setInput('columns', [{ key: 'name', label: 'Name' }]);
    fixture.componentRef.setInput('rows', [{ name: 'Widget' }]);
    fixture.detectChanges();
    const wrapper = (fixture.nativeElement as HTMLElement).querySelector('div') as HTMLElement;
    const th = (fixture.nativeElement as HTMLElement).querySelector('th') as HTMLElement;
    expect(wrapper.className).toContain('bg-surface-card');
    expect(wrapper.className).toContain('border-hairline');
    expect(wrapper.className).not.toContain('bg-canvas-light');
    expect(th.className).toContain('bg-surface-card');
    expect(th.className).toContain('border-hairline');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd source && pnpm nx test ikho-shared-ui`
Expected: FAIL

- [ ] **Step 3: Update the template**

In `source/libs/ikho-shared-ui/src/lib/data-table/data-table.ts`, replace:

```typescript
    <div class="w-full overflow-x-auto rounded-md border border-hairline-light bg-canvas-light">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            @for (col of columns(); track col.key) {
              <th
                [style.text-align]="col.align ?? 'left'"
                class="sticky top-0 border-b border-hairline-light bg-canvas-light px-4 py-2.5 font-core text-micro tracking-[0.3px] whitespace-nowrap text-shade-50 uppercase"
              >
```

with:

```typescript
    <div class="w-full overflow-x-auto rounded-md border border-hairline bg-surface-card">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            @for (col of columns(); track col.key) {
              <th
                [style.text-align]="col.align ?? 'left'"
                class="sticky top-0 border-b border-hairline bg-surface-card px-4 py-2.5 font-core text-micro tracking-[0.3px] whitespace-nowrap text-shade-50 uppercase"
              >
```

and replace the row `<td>` class:

```typescript
                  class="h-[var(--row-height-office)] border-b border-hairline-light px-4 font-core text-body-md whitespace-nowrap text-text-body group-last:border-b-0 group-hover:bg-surface-elevated-light"
```

with:

```typescript
                  class="h-[var(--row-height-office)] border-b border-hairline px-4 font-core text-body-md whitespace-nowrap text-text-body group-last:border-b-0 group-hover:bg-surface-recessed"
```

(`text-text-body` is already a semantic alias through `--color-text-body` — unchanged; the `@empty` row's `text-shade-50` stays untouched.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd source && pnpm nx test ikho-shared-ui`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/libs/ikho-shared-ui/src/lib/data-table/data-table.ts source/libs/ikho-shared-ui/src/lib/data-table/data-table.spec.ts
git commit -m "feat(ikho-shared-ui): make DataTable theme-aware"
```

---

### Task 7: Rename shell-token consumers — `OfficeNavBar`, `OfficeSidebar`, `AccountMenu`

**Files:**
- Modify: `source/libs/ikho-shared-ui/src/lib/office-nav-bar/office-nav-bar.ts`
- Modify: `source/libs/ikho-shared-ui/src/lib/office-sidebar/office-sidebar.ts`
- Modify: `source/libs/ikho-shared-ui/src/lib/account-menu/account-menu.ts`
- Test: `source/libs/ikho-shared-ui/src/lib/office-sidebar/office-sidebar.spec.ts`

**Interfaces:**
- Consumes: `bg-surface-header`, `bg-surface-recessed`, `text-text-body`, `border-hairline`, `outline-focus-ring` from Task 1.
- Produces: no change to any component's public API — this is a pure rename (identical resolved colors), since `--color-surface-header`/`--color-surface-recessed`/`--color-text-body`/`--color-hairline` resolve to the exact same values `--color-shell-canvas`/`--color-shell-canvas-elevated`/`--color-shell-ink`/`--color-shell-hairline` used to.

- [ ] **Step 1: Update the failing assertion in `office-sidebar.spec.ts`**

Find:

```typescript
    expect(button.className).toContain('focus-visible:outline-shell-focus-ring');
```

Replace with:

```typescript
    expect(button.className).toContain('focus-visible:outline-focus-ring');
```

- [ ] **Step 2: Run test to verify it now fails against the unmodified component**

Run: `cd source && pnpm nx test ikho-shared-ui`
Expected: FAIL — `office-sidebar.ts` still emits `outline-shell-focus-ring`.

- [ ] **Step 3: Rename classes in `office-nav-bar.ts`**

In `source/libs/ikho-shared-ui/src/lib/office-nav-bar/office-nav-bar.ts`, apply these exact replacements:
- `border-b border-shell-hairline bg-shell-canvas px-6 py-3 shadow-card` → `border-b border-hairline bg-surface-header px-6 py-3 shadow-card`
- `text-shell-ink">{{ workspace() }}` → `text-text-body">{{ workspace() }}`
- `text-shell-ink">{{ u.name }}` → `text-text-body">{{ u.name }}`

- [ ] **Step 4: Rename classes in `office-sidebar.ts`**

In `source/libs/ikho-shared-ui/src/lib/office-sidebar/office-sidebar.ts`, replace:

```typescript
  private static readonly ITEM_DEFAULT =
    'bg-transparent text-shade-40 hover:bg-shell-canvas hover:text-shell-ink focus-visible:outline-shell-focus-ring';
```

with:

```typescript
  private static readonly ITEM_DEFAULT =
    'bg-transparent text-shade-40 hover:bg-surface-header hover:text-text-body focus-visible:outline-focus-ring';
```

and replace:

```typescript
      'box-border flex h-full flex-col justify-between overflow-y-auto border-r border-shell-hairline bg-shell-canvas-elevated py-4 px-3 transition-[width] duration-[180ms] ease-standard',
```

with:

```typescript
      'box-border flex h-full flex-col justify-between overflow-y-auto border-r border-hairline bg-surface-recessed py-4 px-3 transition-[width] duration-[180ms] ease-standard',
```

- [ ] **Step 5: Rename classes in `account-menu.ts`**

In `source/libs/ikho-shared-ui/src/lib/account-menu/account-menu.ts`, replace:

```typescript
        class="absolute right-0 top-full z-10 mt-2 flex w-56 flex-col gap-3 rounded-lg border border-shell-hairline bg-shell-canvas p-3 shadow-modal"
```

with:

```typescript
        class="absolute right-0 top-full z-10 mt-2 flex w-56 flex-col gap-3 rounded-lg border border-hairline bg-surface-header p-3 shadow-modal"
```

and replace both occurrences of `bg-shell-canvas-elevated` (the two `role="group"` pill-track divs) with `bg-surface-recessed`, and the sign-out button's `hover:bg-shell-canvas-elevated` with `hover:bg-surface-recessed`.

- [ ] **Step 6: Run tests to verify everything passes**

Run: `cd source && pnpm nx test ikho-shared-ui`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add source/libs/ikho-shared-ui/src/lib/office-nav-bar/office-nav-bar.ts source/libs/ikho-shared-ui/src/lib/office-sidebar/office-sidebar.ts source/libs/ikho-shared-ui/src/lib/office-sidebar/office-sidebar.spec.ts source/libs/ikho-shared-ui/src/lib/account-menu/account-menu.ts
git commit -m "refactor(ikho-shared-ui): rename shell-* tokens to general surface/text tokens"
```

---

### Task 8: Rename shell-token consumers in shells — `office-shell.ts`, `operator-shell.ts`

**Files:**
- Modify: `source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.ts`
- Modify: `source/apps/ikho-ui/src/app/shared/layouts/operator-shell/operator-shell.ts`
- Test: `source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.spec.ts`

**Interfaces:**
- Consumes: `bg-surface-header`, `bg-surface-recessed`, `bg-surface-page`, `text-text-body` from Task 1.
- Produces: no change to either shell's public API. This is where the actual bug fix lands — Office's `<main>` page background switches from a permanently-light hardcoded class to the theme-aware one.

- [ ] **Step 1: Write the failing test**

Add to `office-shell.spec.ts` (inside the existing `describe('OfficeShell', ...)` block, following the file's established `querySelector` + `className` pattern):

```typescript
  it('renders the routed content area on the theme-aware page surface', () => {
    const fixture = TestBed.createComponent(OfficeShell);
    fixture.detectChanges();
    const main = (fixture.nativeElement as HTMLElement).querySelector('main') as HTMLElement;
    expect(main.className).toContain('bg-surface-page');
    expect(main.className).not.toContain('bg-canvas-cream');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd source && pnpm nx test ikho-ui`
Expected: FAIL — `<main>` still has `bg-canvas-cream`.

- [ ] **Step 3: Update `office-shell.ts`**

Replace:

```typescript
            class="flex w-14 flex-none cursor-pointer items-center justify-center border-none border-r border-shell-hairline bg-shell-canvas"
```

with:

```typescript
            class="flex w-14 flex-none cursor-pointer items-center justify-center border-none border-r border-hairline bg-surface-header"
```

Replace:

```typescript
            <lib-icon name="menu" [size]="22" color="var(--color-shell-ink)" />
```

with:

```typescript
            <lib-icon name="menu" [size]="22" color="var(--color-text-body)" />
```

Replace:

```typescript
        <main class="flex min-w-0 flex-1 flex-col gap-6 overflow-auto bg-canvas-cream p-8">
```

with:

```typescript
        <main class="flex min-w-0 flex-1 flex-col gap-6 overflow-auto bg-surface-page p-8">
```

- [ ] **Step 4: Update `operator-shell.ts`**

Replace:

```typescript
    <div class="flex min-h-0 flex-1 bg-shell-canvas" data-track="operator">
      <nav class="flex w-[230px] flex-none flex-col gap-2.5 border-r border-shell-hairline bg-shell-canvas-elevated px-3 py-4">
```

with:

```typescript
    <div class="flex min-h-0 flex-1 bg-surface-header" data-track="operator">
      <nav class="flex w-[230px] flex-none flex-col gap-2.5 border-r border-hairline bg-surface-recessed px-3 py-4">
```

Replace:

```typescript
            <span class="font-core text-operator-xl tracking-[-0.2px] text-shell-ink">{{ screenTitleText() }}</span>
```

with:

```typescript
            <span class="font-core text-operator-xl tracking-[-0.2px] text-text-body">{{ screenTitleText() }}</span>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd source && pnpm nx test ikho-ui`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.ts source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.spec.ts source/apps/ikho-ui/src/app/shared/layouts/operator-shell/operator-shell.ts
git commit -m "fix(ikho-ui): make Office page background and Operator root canvas follow the theme toggle"
```

---

### Task 9: Rename shell-token consumers in auth pages — `login.ts`, `signup.ts`

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/auth/login/login.ts`
- Modify: `source/apps/ikho-ui/src/app/features/auth/signup/signup.ts`

**Interfaces:**
- Consumes: `bg-surface-header` from Task 1.
- Produces: no change to either component's public API.

- [ ] **Step 1: Update `login.ts`**

Replace:

```typescript
  host: { class: 'flex min-h-screen items-center justify-center bg-shell-canvas' },
```

with:

```typescript
  host: { class: 'flex min-h-screen items-center justify-center bg-surface-header' },
```

- [ ] **Step 2: Update `signup.ts`**

Apply the identical replacement in `source/apps/ikho-ui/src/app/features/auth/signup/signup.ts`.

- [ ] **Step 3: Run tests to verify nothing broke**

Run: `cd source && pnpm nx test ikho-ui`
Expected: PASS (existing `login.spec.ts`/`signup.spec.ts` don't assert on this class, per repo grep — this step just guards against an unrelated regression).

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/auth/login/login.ts source/apps/ikho-ui/src/app/features/auth/signup/signup.ts
git commit -m "refactor(ikho-ui): rename login/signup host background to general surface token"
```

---

### Task 10: Migrate `office-screen.ts` (tabs, chips, detail panel)

**Files:**
- Modify: `source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.ts`
- Test: `source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.spec.ts`

**Interfaces:**
- Consumes: `bg-surface-card`, `text-text-body`, `text-text-muted`, `border-hairline`, `hover:bg-surface-recessed` from Task 1.
- Produces: no change to `OfficeScreen`'s public API (`title`, `meta`, `primaryActionLabel`, `kpis`, `tabs`, `detailedTabId`, `searchPlaceholder`, `searchFields`, `rowKey`, `detail` inputs and `primaryAction` output unchanged).

- [ ] **Step 1: Write the failing test**

Add to `office-screen.spec.ts` (following the file's existing `TestBed.createComponent(OfficeScreen)` + `componentRef.setInput` pattern):

```typescript
  it('renders the title on the theme-aware text token', () => {
    const fixture = TestBed.createComponent(OfficeScreen);
    fixture.componentRef.setInput('title', 'Inbound');
    fixture.detectChanges();
    const titleEl = (fixture.nativeElement as HTMLElement).querySelector('.text-2xl') as HTMLElement;
    expect(titleEl.className).toContain('text-text-body');
    expect(titleEl.className).not.toContain('text-ink');
  });

  it('renders inactive status-filter chips on the theme-aware card surface', () => {
    const fixture = TestBed.createComponent(OfficeScreen);
    fixture.componentRef.setInput('title', 'Inbound');
    fixture.componentRef.setInput('detailedTabId', 'orders');
    fixture.componentRef.setInput('tabs', [{ id: 'orders', label: 'Orders', columns: [], rows: [] }]);
    fixture.detectChanges();
    const chip = (fixture.nativeElement as HTMLElement).querySelector('[aria-pressed="false"]') as HTMLElement;
    expect(chip.className).toContain('bg-surface-card');
    expect(chip.className).toContain('border-hairline');
    expect(chip.className).not.toContain('bg-canvas-light');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd source && pnpm nx test ikho-ui`
Expected: FAIL

- [ ] **Step 3: Update the constants and template**

In `source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.ts`, replace:

```typescript
const TAB_DEFAULT = 'border-b-transparent text-shade-50';
```

with:

```typescript
const TAB_DEFAULT = 'border-b-transparent text-text-muted';
```

Replace:

```typescript
const CHIP_DEFAULT = 'border-hairline-light bg-canvas-light text-shade-60 focus-visible:outline-focus-ring';
```

with:

```typescript
const CHIP_DEFAULT = 'border-hairline bg-surface-card text-text-muted focus-visible:outline-focus-ring';
```

Replace:

```typescript
        <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
        <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
```

with:

```typescript
        <div class="font-core text-2xl font-bold tracking-[-0.4px] text-text-body">{{ title() }}</div>
        <div class="mt-0.5 font-core text-[13px] text-text-muted">{{ meta() }}</div>
```

Replace:

```typescript
      <div class="-mt-1 flex gap-6 border-b border-hairline-light">
```

with:

```typescript
      <div class="-mt-1 flex gap-6 border-b border-hairline">
```

Replace:

```typescript
        <span class="ml-auto font-core text-[13px] text-shade-50">{{ filteredRows().length }} {{ lang.pick(strings.results) }}</span>
```

with:

```typescript
        <span class="ml-auto font-core text-[13px] text-text-muted">{{ filteredRows().length }} {{ lang.pick(strings.results) }}</span>
```

Replace the detail-panel block:

```typescript
        <aside class="flex w-80 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 flex-col gap-1">
              <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ d.eyebrow }}</span>
              <span class="font-core text-lg font-bold tracking-[-0.2px] text-ink">{{ d.title }}</span>
              <span class="font-mono text-[13px] text-primary">{{ d.code }}</span>
            </div>
            <button
              type="button"
              class="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent hover:bg-surface-elevated-light"
              [attr.aria-label]="lang.pick(strings.close)"
              (click)="selectedKey.set(null)"
            >
              <lib-icon name="x" [size]="18" color="var(--color-shade-50)" />
            </button>
          </div>
          <lib-status-badge [status]="d.status" [label]="d.statusLabel" />
          <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
            @for (f of d.fields; track f.label) {
              <div class="flex items-baseline justify-between gap-3">
                <span class="font-core text-[13px] text-shade-50">{{ f.label }}</span>
```

with:

```typescript
        <aside class="flex w-80 flex-none flex-col gap-4 rounded-card border border-hairline bg-surface-card p-6 shadow-card">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 flex-col gap-1">
              <span class="font-core text-[11px] font-bold tracking-[0.5px] text-text-muted uppercase">{{ d.eyebrow }}</span>
              <span class="font-core text-lg font-bold tracking-[-0.2px] text-text-body">{{ d.title }}</span>
              <span class="font-mono text-[13px] text-primary">{{ d.code }}</span>
            </div>
            <button
              type="button"
              class="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent hover:bg-surface-recessed"
              [attr.aria-label]="lang.pick(strings.close)"
              (click)="selectedKey.set(null)"
            >
              <lib-icon name="x" [size]="18" color="var(--color-text-muted)" />
            </button>
          </div>
          <lib-status-badge [status]="d.status" [label]="d.statusLabel" />
          <div class="flex flex-col gap-2.5 border-t border-hairline pt-4">
            @for (f of d.fields; track f.label) {
              <div class="flex items-baseline justify-between gap-3">
                <span class="font-core text-[13px] text-text-muted">{{ f.label }}</span>
```

(the field value's `text-text-body` class is already the semantic alias — unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd source && pnpm nx test ikho-ui`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.ts source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.spec.ts
git commit -m "feat(ikho-ui): make OfficeScreen tabs, chips, and detail panel theme-aware"
```

---

### Task 11: Migrate `operator-outlined-screen.ts`

**Files:**
- Modify: `source/apps/ikho-ui/src/app/shared/components/operator-outlined-screen/operator-outlined-screen.ts`
- Test (new): `source/apps/ikho-ui/src/app/shared/components/operator-outlined-screen/operator-outlined-screen.spec.ts`

**Interfaces:**
- Consumes: `bg-surface-card`, `text-text-muted` from Task 1.
- Produces: no change to `OperatorOutlinedScreen`'s public API (`title`, `bullets` inputs unchanged).

No spec file exists yet for this component — create a minimal one matching the style of `data-panel.spec.ts` (`TestBed.configureTestingModule({ imports: [OperatorOutlinedScreen] })`).

- [ ] **Step 1: Write the failing test (new file)**

Create `source/apps/ikho-ui/src/app/shared/components/operator-outlined-screen/operator-outlined-screen.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { OperatorOutlinedScreen } from './operator-outlined-screen';

describe('OperatorOutlinedScreen', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperatorOutlinedScreen],
    }).compileComponents();
  });

  it('uses the theme-aware card surface instead of a hardcoded dark canvas', () => {
    const fixture = TestBed.createComponent(OperatorOutlinedScreen);
    fixture.componentRef.setInput('title', 'Receiving');
    fixture.componentRef.setInput('bullets', ['Scan the ASN barcode']);
    fixture.detectChanges();
    const card = (fixture.nativeElement as HTMLElement).querySelector('div') as HTMLElement;
    expect(card.className).toContain('bg-surface-card');
    expect(card.className).not.toContain('bg-canvas-operator-elevated');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd source && pnpm nx test ikho-ui`
Expected: FAIL — component still renders `bg-canvas-operator-elevated`.

- [ ] **Step 3: Update the template**

In `source/apps/ikho-ui/src/app/shared/components/operator-outlined-screen/operator-outlined-screen.ts`, replace:

```typescript
    <div class="flex flex-col gap-3.5 rounded-lg bg-canvas-operator-elevated p-6">
```

with:

```typescript
    <div class="flex flex-col gap-3.5 rounded-lg bg-surface-card p-6">
```

Replace:

```typescript
          <span class="font-core text-[15px] text-shade-40">{{ bullet }}</span>
```

with:

```typescript
          <span class="font-core text-[15px] text-text-muted">{{ bullet }}</span>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd source && pnpm nx test ikho-ui`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/shared/components/operator-outlined-screen/operator-outlined-screen.ts source/apps/ikho-ui/src/app/shared/components/operator-outlined-screen/operator-outlined-screen.spec.ts
git commit -m "feat(ikho-ui): make OperatorOutlinedScreen theme-aware"
```

---

### Task 12: Update `DESIGN.md`

**Files:**
- Modify: `source/apps/ikho-ui/DESIGN.md`

**Interfaces:**
- Consumes: nothing (documentation only).
- Produces: nothing later tasks depend on — this is the last content task before final verification.

- [ ] **Step 1: Replace the "Update (shell theming)" paragraph**

In `source/apps/ikho-ui/DESIGN.md`, find (around line 256):

```markdown
**Update (shell theming):** the light/dark canvas split described above now applies
to each track's *feature content area* only — dashboards, tables, cards, and forms
still render Office Console light and Operator Mode dark as documented. The
*shell chrome* (both nav bars, both sidebars, and the base app canvas) has since
converged on one shared structure and is driven by an explicit app-wide light/dark
theme toggle instead of by track — see `--color-shell-*` tokens in `tokens.css`.
Operator's sidebar keeps its teal active-item accent and Office's keeps its indigo
one regardless of the toggle; those are interaction colors, not surface colors.
```

Replace with:

```markdown
**Update (theme unification):** the light/dark canvas split is no longer tied to
track (Office vs. Operator). Both tracks — shell chrome and feature content alike —
render from the same theme-aware surface tokens (`--color-surface-*`,
`--color-text-*`, `--color-hairline` in `tokens.css`) and follow the app-wide
light/dark toggle. Track identity is expressed only through accent color (indigo
for Office, teal for Operator — sidebar active-item and feature-content primary
actions) and through type/spacing scale (Office's compact data-dense sizing vs.
Operator's oversized touch targets). A single feature (e.g. Inbound) still renders
its Office dashboard with compact indigo-accented UI and its Operator
receiving/scan flow with oversized teal-accented UI — but both now honor the same
toggle rather than one being permanently light and the other permanently dark.
```

- [ ] **Step 2: Update the "Key Characteristics" bullet list**

Find (around line 265):

```markdown
- Two-canvas system by *context of use* (office vs. floor) for feature content — a single feature (e.g. Inbound) can render its dashboard on the light Office Console and its receiving/scan flow in dark Operator Mode. The shell chrome (headers/sidebars) no longer follows this split; it follows the app-wide theme toggle instead.
```

Replace with:

```markdown
- Two tracks by *context of use* (office vs. floor), differentiated by accent color and type/spacing scale, not by a fixed canvas — both tracks (shell chrome and feature content alike) follow the app-wide light/dark theme toggle.
```

Find the last bullet in that list:

```markdown
- Deep indigo (`{colors.primary}`) is the primary brand/action color across the shell chrome and the Office Console's feature content; teal (`{colors.accent-teal}`) remains Operator Mode's signature — its sidebar's active-item accent and its feature content's primary actions — regardless of the active shell theme.
```

Replace with:

```markdown
- Deep indigo (`{colors.primary}`) is the primary brand/action color across the shell chrome and the Office Console's feature content; teal (`{colors.accent-teal}`) remains Operator Mode's signature — its sidebar's active-item accent and its feature content's primary actions — regardless of the active light/dark theme.
```

- [ ] **Step 3: Commit**

```bash
git add source/apps/ikho-ui/DESIGN.md
git commit -m "docs(ikho-ui): update DESIGN.md for theme unification beyond shell chrome"
```

---

### Task 13: Final verification — affected build/test + manual browser check

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Run affected tests**

Run: `cd source && pnpm nx affected -t test`
Expected: all pass (base comparison is against `main`; if this branches from `main` directly, this covers every task's changes in this plan).

- [ ] **Step 2: Run affected builds**

Run: `cd source && pnpm nx affected -t build`
Expected: `ikho-ui` and `ikho-shared-ui` build succeed with no errors.

- [ ] **Step 3: Manual verification in the running app**

Run: `cd source && pnpm nx serve ikho-ui` (proxies `/api` to `:5143` — not required for this UI-only check, ignore any API errors in the console).

In the browser:
1. Open the Office Console (`/office/dashboard`). Confirm it renders exactly as before (light).
2. Open the account menu, switch Theme to Dark. Confirm: the page background, `KpiCard`s, `DataPanel`/`DataTable` on `/office/inventory`, and `Button` secondary/ghost variants all switch to the dark palette. Confirm `StatusBadge` tints stay legible (not a flat light pastel on a dark card).
3. Switch Theme back to Light. Confirm everything reverts.
4. Switch Role to Operator (`/operator/dashboard`). Confirm the Operator dashboard renders in dark (Theme should currently read Dark from the toggle set in step 2/3 — whichever it's on, Operator should match it, not be forced dark).
5. Toggle Theme to Light while on Operator. Confirm `OperatorOutlinedScreen`'s card (visible on a receiving/scan screen, e.g. `/operator/inbound`) switches to the light `bg-surface-card` instead of staying permanently dark.
6. Confirm Office's indigo primary-button color and Operator's teal accent are unchanged by the toggle in both directions.

- [ ] **Step 4: Report results**

If all checks in Step 3 pass, this plan is complete. If any check fails, note which screen/component and re-open the relevant task above rather than patching ad hoc.
