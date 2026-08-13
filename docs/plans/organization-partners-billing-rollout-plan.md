# Organization / Partners / Billing — UI Rollout Plan

Decomposed from the Warehouse Operations Console UI rollout's follow-up ("extend to Organization, Partners, and Billing"). Unlike the original 4-module rollout (Inbound/Outbound/Returns/Reporting — see [warehouse-ui-rollout-plan.md](warehouse-ui-rollout-plan.md)), these three are independent backend subsystems (`ikho-warehouse-organization`, `ikho-warehouse-partner`, `ikho-warehouse-billing`) with no Operator Mode counterpart — each gets its own design spec and implementation plan, built one at a time.

## Status

| # | Module | Design spec | Implementation plan | Status |
|---|--------|-------------|----------------------|--------|
| 1 | Partners | [2026-08-12-partners-ui-design.md](../superpowers/specs/2026-08-12-partners-ui-design.md) | [2026-08-12-partners-ui.md](../superpowers/plans/2026-08-12-partners-ui.md) | Implemented |
| 2 | Organization | — | — | Not started |
| 3 | Billing | — | — | Not started |

Update the table as each module's spec and plan land.
