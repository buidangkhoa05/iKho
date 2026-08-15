# Catalogue / Inventory — UI Rollout Plan

The last two screens still on the old placeholder pattern. Every other Office Console screen (Organization, Partners, Billing, Inbound, Outbound, Returns, Reporting) has already graduated off `<app-office-screen>` + static `ADMIN_SCREENS` data into a real, interactive screen backed by its own mock store — see [warehouse-ui-rollout-plan.md](warehouse-ui-rollout-plan.md) and [organization-partners-billing-rollout-plan.md](organization-partners-billing-rollout-plan.md). Catalogue and Inventory are the two that never got their own rollout cycle.

Unlike Organization/Partners/Billing, both of these have an Operator Mode counterpart (matching the original 4-module rollout's shape):
- **Catalogue**: Office Console is still the static placeholder (`office-catalogue.ts`, wraps `OfficeScreen` + `ADMIN_SCREENS.catalogue`). Operator Mode already has a real, built screen (`operator-catalogue.ts` — live search over `PRODUCTS`) — that side needs no rework, just confirmation it stays consistent with whatever mock product store Office Catalogue introduces.
- **Inventory**: both sides are unbuilt. Office Console is the static placeholder (`office-inventory.ts`). Operator Mode is still the literal "not yet designed" `outlinedScreen('inventory')` route, showing only the `bullets` preview copy from `screens.data.ts`.

## Execution order

Catalogue → Inventory. Inventory's stock ledger (on-hand/reserved/damaged/quarantine per bin, lot/serial tracking) is naturally expressed as movements against Catalogue's product master data — building Catalogue first gives Inventory a real product store to reference, the same way Organization's Warehouse directory came before modules that needed to reference a warehouse.

## Status

| # | Module | Design spec | Implementation plan | Status |
|---|--------|-------------|----------------------|--------|
| 1 | Catalogue | [2026-08-15-catalogue-ui-design.md](../superpowers/specs/2026-08-15-catalogue-ui-design.md) | [2026-08-15-catalogue-ui.md](../superpowers/plans/2026-08-15-catalogue-ui.md) | Implemented |
| 2 | Inventory | — | — | Not started |

Update the table as each module's spec and plan land.
