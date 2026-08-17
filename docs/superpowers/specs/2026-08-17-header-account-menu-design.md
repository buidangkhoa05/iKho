# De-prototype the header: remove dev top bar, relocate role/language switch

**Date:** 2026-08-17
**Status:** Approved
**Scope:** Frontend only (`source/apps/ikho-ui`, `source/libs/ikho-shared-ui`). No backend changes.

## Problem

`app.html` renders a global `<app-top-bar />` above every route. It's a dark bar
reading "iKho web app · One web app · features shown by role" with:
- Admin/Operator pills — these are real: they drive `RoleService` (the only role
  mechanism in the frontend; there is no auth system yet) and navigate between
  `/office/...` and `/operator/...`.
- EN/VI pills — real too: they drive `LangService`, a custom signal-based i18n
  system used throughout the app.

This reads as a demo/prototype harness sitting on top of the real product UI
(the actual header below it: workspace/company name, search, bell, avatar).
The goal is to remove the dev-bar framing while keeping both underlying
mechanisms (role switch, language switch) available from the real UI.

## Design

### 1. Remove `AppTopBar`
- Delete `<app-top-bar />` from `source/apps/ikho-ui/src/app/app.html`.
- Delete `source/apps/ikho-ui/src/app/shared/layouts/app-top-bar/app-top-bar.ts`.
- Remove the now-unused `roleHint` entry from
  `source/apps/ikho-ui/src/app/core/i18n/ui-strings.data.ts`.

### 2. New shared component: `AccountMenu`
Location: `source/libs/ikho-shared-ui/src/lib/account-menu/account-menu.ts`

Purely presentational, matching the existing pattern used by `OfficeNavBar` /
`OperatorNavBar` (inputs/outputs only, no service injection, caller passes
already-localized strings):

- Inputs: `role: AppRole`, `roleAdminLabel: string`, `roleOperatorLabel: string`,
  `lang: 'en' | 'vi'`
- Outputs: `roleChange: AppRole`, `langChange: 'en' | 'vi'`
- Trigger content is projected via `<ng-content select="[trigger]" />` so each
  nav bar supplies its own trigger visual.
- Clicking the trigger opens a panel beneath it containing a Role pill-group
  and a Language pill-group (EN/VI), visually similar to the current
  prototype-bar pills, just relocated. Closes on outside click and Escape.
- `role` and `roleChange` are typed as a local `'admin' | 'operator'` union
  defined in `account-menu.ts` — `shared-ui` stays app-agnostic and does not
  import the app layer's `RoleService`/`AppRole` type.

### 3. Wire into `OfficeNavBar`
`source/libs/ikho-shared-ui/src/lib/office-nav-bar/office-nav-bar.ts` — the
existing avatar+name block (current lines 40-54) becomes the `AccountMenu`
trigger content. New inputs added to `OfficeNavBar` to pass through:
`role`, `roleAdminLabel`, `roleOperatorLabel`, `lang`; outputs `roleChange`,
`langChange` bubble up from the nested `AccountMenu`.

### 4. Wire into `OperatorNavBar`
`source/libs/ikho-shared-ui/src/lib/operator-nav-bar/operator-nav-bar.ts` has
no avatar/user area today (task-focused floor UI). Add a small gear-icon
button next to the existing Cancel button as the `AccountMenu` trigger. Add a
new `settings` icon entry to
`source/libs/ikho-shared-ui/src/lib/icon/icon-paths.ts` (simple inline SVG
path, following the existing icon set's style — no new dependency). Same new
inputs/outputs as `OfficeNavBar`.

### 5. Shells own the behavior
- `source/apps/ikho-ui/src/app/shared/layouts/office-shell/office-shell.ts`
  and `.../operator-shell/operator-shell.ts` already inject `LangService`;
  both need `RoleService` injected too.
- Pass `[role]="role.role()"`, `[roleAdminLabel]`, `[roleOperatorLabel]`
  (via `lang.pick(strings.roleAdmin/roleOperator)`), `[lang]="lang.lang()"`
  down to the nav bar.
- On `(roleChange)`, replicate `AppTopBar`'s existing `setRole` logic in each
  shell: look up `equivalentScreen(currentScreen, target)` from
  `core/mock-data/screens.data.ts`, call `role.setRole(target)`, then
  `router.navigate(['/', target === 'admin' ? 'office' : 'operator', next])`.
  (Small duplication across the two shells — acceptable, they already
  duplicate similar url/activeScreen signal logic.)
- On `(langChange)`, call `lang.setLang($event)`.

## Out of scope
- Any backend/API wiring (explicitly deferred — frontend only, per user).
- The broader "make the whole app production-ready" audit (separate,
  report-only deliverable, tracked independently).
- Introducing real authentication/role resolution — `RoleService` remains the
  only role mechanism; this change only relocates its UI trigger.

## Testing
- Update/add specs for `AccountMenu`, `OfficeNavBar`, `OperatorNavBar` per
  existing `.spec.ts` conventions in `ikho-shared-ui`.
- Manually verify in the running app: role switch still navigates between
  Office/Operator shells; language switch still updates all localized strings;
  no visual regression in the real header/avatar area.
