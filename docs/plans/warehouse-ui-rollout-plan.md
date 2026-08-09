# Warehouse Operations Console — UI Rollout Plan

This document is the master planning reference for closing the gap between the warehouse backend services (fully built across Organization, Catalog, Partner, Inventory, Inbound, Outbound, Returns, Billing, Reporting) and the `ikho-ui` frontend, which currently only covers dashboard/catalogue/inventory screens.

Each entry below becomes its own design spec (`docs/superpowers/specs/`) and implementation plan, brainstormed and built one at a time. This file tracks status and links only — the specs are the source of truth for scope and detail.

## Scope

Four sub-projects, each spanning both frontend tracks where the workflow is split between planning (Office Console) and execution (Operator Mode):

1. **Inbound** (receiving) — office manages purchase orders; operator scans and confirms receipts at the dock.
2. **Outbound** (picking/packing/shipping) — office plans sales orders & allocations; operator executes pick lists, packs, and confirms shipments.
3. **Returns** — office reviews return orders & dispositions; operator inspects and processes physical returns.
4. **Reporting/dashboards** — surfaces `FulfillmentKpis`, `InventoryPosition`, `InboundStatus`, `OutboundStatus` as real dashboard views, primarily office-facing.

## Execution order

Inbound → Outbound → Returns → Reporting. Each module leans on data and UI patterns the previous one establishes (receiving puts stock in the warehouse before it can be picked; returns reuse inspection/receiving patterns from Inbound; reporting has more to show once the other three exist).

## Status

| # | Module | Design spec | Implementation plan | Status |
|---|--------|-------------|----------------------|--------|
| 1 | Inbound | [2026-08-09-inbound-office-operator-ui-design.md](../superpowers/specs/2026-08-09-inbound-office-operator-ui-design.md) | [2026-08-09-inbound-office-operator-ui.md](../superpowers/plans/2026-08-09-inbound-office-operator-ui.md) | Implemented |
| 2 | Outbound | _pending_ | _pending_ | Not started |
| 3 | Returns | _pending_ | _pending_ | Not started |
| 4 | Reporting/dashboards | _pending_ | _pending_ | Not started |

Update the table as each module's spec and plan land.
