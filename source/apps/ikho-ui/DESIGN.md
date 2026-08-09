---
version: alpha
name: iKho-design-system
description: iKho's design language for a warehouse and inventory operations platform. It runs two functional tracks rather than a marketing/commerce split — an Office Console (light, dense, data-forward) for back-office admins working across companies, warehouses, catalogues, and reporting, and an Operator Mode (dark, high-contrast, large-target) tuned for warehouse-floor tablets and handheld scanners used in dim aisles and loading docks. Both tracks share the same type system, spacing scale, and status-color vocabulary — the canvas polarity changes with the environment the user is standing in, not with the page's marketing intent.

colors:
  primary: "#14213D"
  primary-hover: "#0F1930"
  on-primary: "#ffffff"
  ink: "#0F172A"
  canvas-light: "#ffffff"
  canvas-cream: "#f8fafc"
  canvas-operator: "#0b1220"
  canvas-operator-elevated: "#121826"
  surface-elevated-light: "#f1f5f9"
  hairline-light: "#e2e8f0"
  hairline-operator: "#1f2937"
  shade-30: "#cbd5e1"
  shade-40: "#94a3b8"
  shade-50: "#64748b"
  shade-60: "#475569"
  shade-70: "#334155"
  accent-teal: "#0ea5a0"
  accent-teal-10: "#ccfbf1"
  status-in-stock: "#16a34a"
  status-in-stock-10: "#dcfce7"
  status-low-stock: "#f59e0b"
  status-low-stock-10: "#fef3c7"
  status-out-of-stock: "#dc2626"
  status-out-of-stock-10: "#fee2e2"
  status-inbound: "#2563eb"
  status-inbound-10: "#dbeafe"
  status-outbound: "#7c3aed"
  status-outbound-10: "#ede9fe"
  status-returns: "#db2777"
  status-returns-10: "#fce7f3"

typography:
  display-lg:
    fontFamily: "Inter Variable, Inter, Helvetica, Arial, sans-serif"
    fontSize: 40px
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: 0
  display-md:
    fontFamily: "Inter Variable, Inter, Helvetica, Arial, sans-serif"
    fontSize: 32px
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: 0
  heading-xl:
    fontFamily: "Inter Variable, Inter, Helvetica, Arial, sans-serif"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.28
    letterSpacing: 0
  heading-lg:
    fontFamily: "Inter Variable, Inter, Helvetica, Arial, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0
  heading-md:
    fontFamily: "Inter Variable, Inter, Helvetica, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  body-lg:
    fontFamily: "Inter Variable, Inter, Helvetica, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 450
    lineHeight: 1.5
    letterSpacing: 0
  body-md:
    fontFamily: "Inter Variable, Inter, Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 450
    lineHeight: 1.5
    letterSpacing: 0
  body-strong:
    fontFamily: "Inter Variable, Inter, Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 0
  caption:
    fontFamily: "Inter Variable, Inter, Helvetica, Arial, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.12px
  micro:
    fontFamily: "Inter Variable, Inter, Helvetica, Arial, sans-serif"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0.3px
  operator-xl:
    fontFamily: "Inter Variable, Inter, Helvetica, Arial, sans-serif"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0.2px

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  huge: 48px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 10px 16px
  button-primary-pressed:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 10px 16px
  button-secondary:
    backgroundColor: "{colors.canvas-light}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 10px 16px
  button-danger:
    backgroundColor: "{colors.status-out-of-stock}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 10px 16px
  button-operator:
    backgroundColor: "{colors.accent-teal}"
    textColor: "{colors.canvas-operator}"
    typography: "{typography.operator-xl}"
    rounded: "{rounded.lg}"
    padding: 20px 32px
  text-input:
    backgroundColor: "{colors.canvas-light}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  card-kpi:
    backgroundColor: "{colors.canvas-light}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 20px
  card-data-panel:
    backgroundColor: "{colors.canvas-light}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 24px
  card-operator:
    backgroundColor: "{colors.canvas-operator-elevated}"
    textColor: "{colors.on-primary}"
    typography: "{typography.operator-xl}"
    rounded: "{rounded.lg}"
    padding: 24px
  status-badge-in-stock:
    backgroundColor: "{colors.status-in-stock-10}"
    textColor: "{colors.status-in-stock}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 2px 10px
  status-badge-low-stock:
    backgroundColor: "{colors.status-low-stock-10}"
    textColor: "{colors.status-low-stock}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 2px 10px
  status-badge-out-of-stock:
    backgroundColor: "{colors.status-out-of-stock-10}"
    textColor: "{colors.status-out-of-stock}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 2px 10px
  status-badge-inbound:
    backgroundColor: "{colors.status-inbound-10}"
    textColor: "{colors.status-inbound}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 2px 10px
  status-badge-outbound:
    backgroundColor: "{colors.status-outbound-10}"
    textColor: "{colors.status-outbound}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 2px 10px
  status-badge-returns:
    backgroundColor: "{colors.status-returns-10}"
    textColor: "{colors.status-returns}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 2px 10px
  data-table:
    backgroundColor: "{colors.canvas-light}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 0px
  nav-bar-office:
    backgroundColor: "{colors.canvas-light}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xs}"
    padding: 12px 24px
  sidebar-office:
    backgroundColor: "{colors.surface-elevated-light}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xs}"
    padding: 16px 12px
  nav-bar-operator:
    backgroundColor: "{colors.canvas-operator}"
    textColor: "{colors.on-primary}"
    typography: "{typography.operator-xl}"
    rounded: "{rounded.xs}"
    padding: 16px 24px
  toast-alert:
    backgroundColor: "{colors.canvas-operator-elevated}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: 12px 16px
---

## Overview

iKho is a warehouse and inventory management platform, not a storefront — so the design system is organized around **who is using it and where**, not around marketing vs. transactional intent. Two tracks share the same typographic and spacing DNA but diverge in canvas polarity:

- **Office Console** — the light-canvas (`{colors.canvas-light}` / `{colors.canvas-cream}`) track for admins and planners working in `ikho-ui`'s dashboards: organization structure, catalogue, partners, inventory, inbound/outbound orders, billing, and reporting. Dense data tables, KPI cards, and filterable lists dominate.
- **Operator Mode** — the dark-canvas (`{colors.canvas-operator}`) track designed for tablets and handheld scanners used on the warehouse floor and loading dock, often in low ambient light. Large touch targets, high-contrast text, and a single primary action per screen (scan, confirm, next).

Both tracks use **Inter Variable** as the only typeface — headings and body share the family, differing only in weight and size, which keeps the system light to ship and consistent across Angular components. A dedicated status-color vocabulary (`status-in-stock`, `status-low-stock`, `status-out-of-stock`, `status-inbound`, `status-outbound`, `status-returns`) is the system's signature: every stock, order, and movement state maps to exactly one color pair (10%-tint background + full-strength text/icon), reused identically across badges, table rows, KPI cards, and charts.

**Key Characteristics:**
- Two-canvas system by *context of use* (office vs. floor), not by page type — a single feature (e.g. Inbound) can render its dashboard on the light Office Console and its receiving/scan flow in dark Operator Mode.
- One typeface (Inter Variable) across both tracks; hierarchy comes from weight/size, not family-switching.
- A fixed six-color status vocabulary is the brand's most important visual language — colors are never reused for anything other than their assigned state.
- Rounded rectangles (`{rounded.md}` / `{rounded.lg}`), not pills, are the default shape for buttons and cards — pill shape (`{rounded.pill}`) is reserved for status badges and chips only, so "pill" always reads as "status," never as "action."
- Operator Mode uses oversized type (`{typography.operator-xl}`) and generous padding so a warehouse worker wearing gloves can act on a tablet without missing a tap.
- Deep indigo (`{colors.primary}`) is the sole brand/action color on the Office Console; teal (`{colors.accent-teal}`) is reserved for primary actions in Operator Mode so the two tracks are never confused for each other even in a screenshot.

## Colors

> **Source areas:** `ikho-ui` dashboards (Office Console) and floor/scanner views (Operator Mode).

### Brand & Action
- **Primary** (`{colors.primary}` — `#14213D`): Deep indigo. Primary buttons, active nav state, links on the Office Console.
- **Primary Hover** (`{colors.primary-hover}` — `#0F1930`): Pressed/hover state of primary actions.
- **Accent Teal** (`{colors.accent-teal}` — `#0ea5a0`): Reserved exclusively for Operator Mode primary actions (scan, confirm, complete pick) — never appears on the Office Console.

### Status Vocabulary
- **In Stock** (`{colors.status-in-stock}` `#16a34a` / tint `{colors.status-in-stock-10}`): Healthy inventory levels, completed receipts.
- **Low Stock** (`{colors.status-low-stock}` `#f59e0b` / tint `{colors.status-low-stock-10}`): Reorder-point warnings, partial picks.
- **Out of Stock** (`{colors.status-out-of-stock}` `#dc2626` / tint `{colors.status-out-of-stock-10}`): Zero on-hand, failed scans, blocking errors.
- **Inbound** (`{colors.status-inbound}` `#2563eb` / tint `{colors.status-inbound-10}`): Purchase orders, receiving, ASNs.
- **Outbound** (`{colors.status-outbound}` `#7c3aed` / tint `{colors.status-outbound-10}`): Sales orders, picking, shipping.
- **Returns** (`{colors.status-returns}` `#db2777` / tint `{colors.status-returns-10}`): RMAs, reverse-logistics workflows.

### Surface
- **Canvas Light** (`{colors.canvas-light}` — `#ffffff`): Default Office Console background.
- **Canvas Cream** (`{colors.canvas-cream}` — `#f8fafc`): Page-level background behind light cards, subtly separates content from chrome.
- **Surface Elevated Light** (`{colors.surface-elevated-light}` — `#f1f5f9`): Sidebar and filter-panel background on the Office Console.
- **Canvas Operator** (`{colors.canvas-operator}` — `#0b1220`): Base background for Operator Mode screens.
- **Canvas Operator Elevated** (`{colors.canvas-operator-elevated}` — `#121826`): Cards and toasts on Operator Mode.
- **Hairline Light** (`{colors.hairline-light}` — `#e2e8f0`): Table dividers, card borders on light.
- **Hairline Operator** (`{colors.hairline-operator}` — `#1f2937`): Borders on the rare Operator Mode surface with visible chrome.

### Shade Ladder
- **Shade-30 → Shade-70**: Neutral text/border ramp (`#cbd5e1` → `#334155`) used for secondary/tertiary text, disabled states, and chip backgrounds on the Office Console.

### Text
- **Ink** (`{colors.ink}` — `#0F172A`): All text on light canvases.
- **On Primary** (`{colors.on-primary}` — `#ffffff`): All text on `{colors.primary}`, `{colors.canvas-operator}`, and filled dark surfaces.

## Typography

### Font Family

**Inter Variable** is the only typeface across the entire system — display, heading, body, and caption roles all pull from the same variable font, differing only in weight (450–700) and size. This keeps the Angular bundle lean (one font family, one network request) and ensures Office Console and Operator Mode never feel like different products wearing different fonts. Fall back to **Inter**, then system sans-serif.

**ui-monospace** is used only for SKUs, barcodes, location codes, and other scannable identifiers — anywhere a human or scanner needs unambiguous character shapes.

### Hierarchy

| Token | Size | Weight | Line Height | Use |
|---|---|---|---|---|
| `{typography.display-lg}` | 40px | 650 | 1.15 | Report/dashboard page title |
| `{typography.display-md}` | 32px | 650 | 1.2 | Section title on Office Console |
| `{typography.heading-xl}` | 24px | 600 | 1.28 | Card/panel title |
| `{typography.heading-lg}` | 20px | 600 | 1.3 | Modal title, table section header |
| `{typography.heading-md}` | 16px | 600 | 1.4 | Form section label |
| `{typography.body-lg}` | 16px | 450 | 1.5 | Lead body copy |
| `{typography.body-md}` | 14px | 450 | 1.5 | Default UI body, table cells, form fields |
| `{typography.body-strong}` | 14px | 600 | 1.5 | Emphasized body run, toast text |
| `{typography.caption}` | 12px | 500 | 1.4 | Status badges, helper text |
| `{typography.micro}` | 11px | 600 | 1.3 | All-caps table column headers |
| `{typography.operator-xl}` | 28px | 700 | 1.2 | Operator Mode primary label/button |
| `{typography.code}` | 13px | 500 | 1.5 | SKUs, barcodes, location codes |

### Principles
- **One family, many weights.** Never introduce a second typeface for "display" moments — scale and weight carry the hierarchy.
- **Operator Mode text is oversized on purpose.** `{typography.operator-xl}` (28px/700) is the floor-facing minimum — smaller text is not legible at arm's length on a mounted tablet.
- **Status color always pairs with a label**, never color alone — colorblind-safe by requiring the badge text (`In Stock`, `Low Stock`, etc.) to render alongside the tint.

## Layout

### Spacing System
- **Base unit**: 8px, with 4px sub-units for compact table rows and form fields.
- **Tokens**: `{spacing.xxs}` 2px · `{spacing.xs}` 4px · `{spacing.sm}` 8px · `{spacing.md}` 12px · `{spacing.lg}` 16px · `{spacing.xl}` 24px · `{spacing.xxl}` 32px · `{spacing.huge}` 48px.
- **Office Console density**: 12–16px vertical rhythm between table rows and filter controls — density is prioritized over air, since planners scan many rows at once.
- **Operator Mode spacing**: 24–32px minimum between tappable elements — the opposite priority, optimized for gloved fingers and one-handed tablet use.

### Grid & Container
- Office Console uses a persistent left `sidebar-office` (240px) + fluid content area with a 1280–1440px max-width for data tables and KPI grids.
- KPI cards lay out in a 4-up → 2-up → 1-up responsive grid matching dashboard breakpoints.
- Operator Mode is single-column, full-viewport, one primary task per screen — no sidebar, no competing navigation.

### Whitespace Philosophy
The Office Console treats whitespace as a budget to be spent carefully — every extra pixel of padding is pixels not spent showing another row of inventory or another order. Operator Mode inverts this: whitespace is safety margin against mis-taps, and screens intentionally show only what's needed for the current scan/confirm step.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 | Flat, no shadow | Default table/list surface |
| 1 | `0 1px 2px rgba(15,23,42,0.06)` | Sidebar/nav hairline separation |
| 2 | `0 1px 3px rgba(15,23,42,0.1), 0 1px 2px rgba(15,23,42,0.06)` | KPI cards, data panels on light |
| 3 | `0 4px 6px rgba(15,23,42,0.1), 0 2px 4px rgba(15,23,42,0.06)` | Dropdowns, popovers, open filter panels |
| 4 | `0 20px 25px rgba(0,0,0,0.35)` | Modals on light; toast alerts on Operator Mode |

### Decorative Depth
The Office Console keeps shadows subtle and functional — depth signals interactivity (a card that can be clicked, a dropdown that's open) rather than decoration. Operator Mode avoids shadows almost entirely in favor of flat, high-contrast fills; the one exception is the toast alert, which needs to visually "lift" above the current scan screen to confirm success or flag an error.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Nav bars, table header row |
| `{rounded.sm}` | 6px | Chips, small icon buttons |
| `{rounded.md}` | 8px | Buttons, form inputs, data tables |
| `{rounded.lg}` | 12px | KPI cards, data panels, operator cards |
| `{rounded.xl}` | 16px | Modal containers |
| `{rounded.pill}` | 9999px | Status badges only — never buttons |

### Iconography Geometry
Icons use a consistent 1.5px stroke weight at 20–24px on the Office Console and 28–32px in Operator Mode. Status badges always pair a small dot or icon with the label text, reinforcing the color-plus-label rule above.

## Components

### Buttons

**`button-primary`** — the dominant CTA on the Office Console.
- Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.body-md}`, padding `{spacing.sm}+2px {spacing.lg}` (10px 16px), rounded `{rounded.md}` 8px.
- Pressed state `button-primary-pressed`: background darkens to `{colors.primary-hover}`.

**`button-secondary`** — outline/ghost action on light surfaces.
- Background `{colors.canvas-light}`, 1px `{colors.hairline-light}` border, text `{colors.ink}`, same geometry as `button-primary`.

**`button-danger`** — destructive actions (delete SKU, cancel order, write-off stock).
- Background `{colors.status-out-of-stock}`, text `{colors.on-primary}`, same geometry.

**`button-operator`** — the single primary action on an Operator Mode screen.
- Background `{colors.accent-teal}`, text `{colors.canvas-operator}` (dark-on-teal for maximum contrast), type `{typography.operator-xl}`, padding `{spacing.xl} {spacing.xxl}` (20px 32px), rounded `{rounded.lg}` 12px.

### Cards & Panels

**`card-kpi`** — dashboard summary metric (e.g. "Units in stock", "Open inbound orders").
- Background `{colors.canvas-light}`, padding `{spacing.xl}`, rounded `{rounded.lg}`, 1px `{colors.hairline-light}` border. Metric value in `{typography.display-md}`, label in `{typography.caption}`, optional trend indicator using status colors.

**`card-data-panel`** — filterable list/table container on the Office Console.
- Background `{colors.canvas-light}`, padding `{spacing.xxl}`, rounded `{rounded.lg}`, houses a `data-table` plus a filter/toolbar row.

**`card-operator`** — the primary content card on an Operator Mode screen (item detail, scan confirmation).
- Background `{colors.canvas-operator-elevated}`, text `{colors.on-primary}`, type `{typography.operator-xl}`, padding `{spacing.xl}`, rounded `{rounded.lg}`.

### Data Display

**`data-table`** — the core Office Console primitive for orders, SKUs, partners, and movements.
- Background `{colors.canvas-light}`, rounded `{rounded.md}`, header row uses `{typography.micro}` (all-caps column labels), body rows use `{typography.body-md}` with `{colors.hairline-light}` row dividers. Status columns render a `status-badge-*` rather than raw text.

**`status-badge-*`** (in-stock / low-stock / out-of-stock / inbound / outbound / returns) — the system's signature component.
- 10%-tint background, full-strength text color, type `{typography.caption}`, padding `{spacing.xxs}+2px {spacing.md}` (2px 10px), rounded `{rounded.pill}`. Always includes the state label as text — color is reinforcement, not the sole signal.

### Inputs & Forms

**`text-input`** — standard filter/search/form field on the Office Console.
- Background `{colors.canvas-light}`, text `{colors.ink}`, type `{typography.body-md}`, padding `{spacing.sm} {spacing.md}` (8px 12px), rounded `{rounded.md}`, 1px `{colors.hairline-light}` border, focus ring in `{colors.primary}`.

### Navigation

**`nav-bar-office`** — top bar on the Office Console.
- Background `{colors.canvas-light}`, text `{colors.ink}`, padding `{spacing.md} {spacing.xl}`. Workspace/company switcher on the left, search center, user menu + notifications right.

**`sidebar-office`** — persistent left navigation across Organization, Catalogue, Partners, Inventory, Inbound, Outbound, Returns, Billing, and Reporting.
- Background `{colors.surface-elevated-light}`, active item uses `{colors.primary}` text with a left accent bar; padding `{spacing.lg} {spacing.md}`.

**`nav-bar-operator`** — minimal top bar on Operator Mode screens.
- Background `{colors.canvas-operator}`, text `{colors.on-primary}`, type `{typography.operator-xl}`, shows only the current task name and a large back/cancel affordance — no secondary navigation.

### Feedback

**`toast-alert`** — transient confirmation/error surface, shared by both tracks.
- Background `{colors.canvas-operator-elevated}`, text `{colors.on-primary}`, type `{typography.body-strong}`, padding `{spacing.md} {spacing.lg}`, rounded `{rounded.md}`. Leading icon/dot uses the relevant status color (green for success, red for error, amber for warning).

## Do's and Don'ts

### Do
- Pair every status color with its text label — never rely on color alone to communicate state.
- Use `{rounded.pill}` only for status badges/chips; use `{rounded.md}`/`{rounded.lg}` for every button and card.
- Keep Operator Mode single-task, single-primary-action per screen with `{typography.operator-xl}` and generous tap targets.
- Reserve `{colors.accent-teal}` for Operator Mode actions and `{colors.primary}` for Office Console actions — the two never swap.
- Use one typeface (Inter Variable) everywhere; differentiate hierarchy with weight and size only.

### Don't
- Don't introduce a second display typeface for dashboard headlines — this is a data tool, not a marketing site.
- Don't invent new status colors for one-off states — map new states onto the existing six (in-stock, low-stock, out-of-stock, inbound, outbound, returns) or extend the vocabulary deliberately, not ad hoc.
- Don't use pill-shaped buttons anywhere — pills are reserved for status communication.
- Don't cram Operator Mode screens with secondary navigation or dense tables — that content belongs on the Office Console.
- Don't drop shadows onto Operator Mode surfaces beyond the toast alert — flat, high-contrast fills stay legible in warehouse lighting.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Desktop | ≥ 1280px | Full Office Console: sidebar + 4-up KPI grid + wide data tables |
| Laptop | 1024–1279px | Sidebar collapses to icons-only; KPI grid drops to 2-up |
| Tablet | 768–1023px | Office Console tables become horizontally scrollable; Operator Mode is primary target at this size |
| Mobile | < 768px | Office Console read-only summary view; full-screen single-column layout |

### Touch Targets
- Operator Mode buttons hit ≥ 56×56px (exceeds WCAG AAA) to remain reliable with gloves or in motion.
- Office Console interactive elements (buttons, table row actions) stay at the 44×44px minimum.

### Collapsing Strategy
- Office Console KPI grid steps 4-up → 2-up → 1-up; data tables switch to horizontal scroll before stacking.
- Sidebar collapses to icon rail below 1280px, full overlay drawer below 768px.
- Operator Mode is designed mobile/tablet-first and does not need to "collapse" — it is already the single-column, high-contrast baseline the other breakpoints build up from.

## Iteration Guide

1. Focus on ONE component at a time.
2. Reference tokens directly (`{colors.status-low-stock}`, `{button-primary}-pressed`, `{rounded.lg}`).
3. When adding a new domain concept (e.g. a new order state), map it to the existing status-color vocabulary before introducing a new color.
4. Add new variants as separate entries rather than overloading an existing component.
5. Default body to `{typography.body-md}`; reserve `{typography.body-lg}` for lead copy in report summaries.
6. Keep the two tracks separated by *context of use* — when designing a new screen, decide whether it's an Office Console view or an Operator Mode flow before picking colors.
7. Status badges are always pill-shaped and always carry a text label — this pairing is non-negotiable.

## Implementation Notes (`ikho-ui`)

The tokens on this page are the source of truth; `src/styles/tokens.css` is their CSS transcription and the only place they're defined in code. Components consume them as **Tailwind CSS v4 utility classes**, not hand-written CSS.

### How tokens become utilities
`tokens.css` declares colors, font sizes, radii, shadows, and spacing inside an `@theme` block using Tailwind's namespace convention, so each token doubles as a utility class:

| Token namespace | Example token | Generated utility |
|---|---|---|
| `--color-*` | `--color-primary` | `bg-primary`, `text-primary`, `border-primary` |
| `--color-status-*` | `--color-status-in-stock` | `bg-status-in-stock`, `text-status-in-stock` |
| `--radius-*` | `--radius-card` | `rounded-card` |
| `--shadow-*` | `--shadow-card` | `shadow-card` |
| `--text-*` (+ `--text-*--line-height` / `--font-weight`) | `--text-heading-md` | `text-heading-md` (sets size, line-height, and weight together) |
| `--font-*` | `--font-core`, `--font-mono` | `font-core`, `font-mono` |
| `--spacing-*` | `--spacing-lg` | `p-lg`, `gap-lg`, etc. (alongside Tailwind's default numeric scale) |

Composite/layout tokens that aren't a single Tailwind-scale value (`--sidebar-width`, `--transition-control`, `--duration-*`) stay as plain `:root` custom properties and are consumed via arbitrary-value classes, e.g. `w-[var(--sidebar-width)]`, `[transition:var(--transition-control)]`.

### Rules for new components
- No `styles:` block in `@Component` metadata — express everything as classes on the template elements. Use `host: { class: '...' }` for host-element styling instead of a `:host { }` rule.
- Prefer the generated token utilities (`bg-primary`, `rounded-card`) over arbitrary values (`bg-[#14213d]`) — if a value needs a new named utility, add it to `tokens.css`'s `@theme` block rather than hardcoding it in a component.
- For an element whose classes differ by state (active/inactive tab, selected chip, nav item), build the complete class string per state in a component method (see `office-sidebar.ts`'s `itemClasses()` for the pattern) rather than layering two `[class.x]` bindings that both touch the same CSS property — Tailwind's compiled rule order depends on class discovery order across the whole build, not template order, so conflicting same-property utilities on one element can silently resolve backwards.
- Six-status vocabulary, pill-only badges, Office/Operator canvas separation, and every other rule on this page still apply — Tailwind is the authoring mechanism, not a license to introduce new colors or shapes ad hoc.
