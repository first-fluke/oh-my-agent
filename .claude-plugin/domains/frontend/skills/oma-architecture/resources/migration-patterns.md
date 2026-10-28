# Architecture Migration - Transition Plan Patterns

> Use when a chosen target architecture requires restructuring a **live system**. `api-evolution.md` covers evolving published API contracts; this file covers the structural transition itself. Output: a Transition Plan section appended to the recommendation or ADR.

## When this file applies
- The recommendation implies moving between architectures: monolith → service extraction, synchronous → event-driven, datastore split or replacement
- The system must keep serving traffic during the change
- A "big bang" cutover is being proposed and needs a safer alternative

## Core tension
The safest migration is many small reversible steps, but every coexistence mechanism (facade, flag, dual write) is temporary complexity that costs money while it lives. A transition plan must name both the increment safety story and the exit date for the scaffolding — half-finished migrations are the most expensive architecture of all.

## Patterns
| Pattern | Move | Choose when |
|---------|------|-------------|
| Strangler Fig | Route traffic incrementally from old to new behind a stable facade; retire old paths as coverage grows | Large legacy replacement; increments must be independently shippable and reversible |
| Branch by Abstraction | Introduce an abstraction over the old implementation, build the new one behind it, flip, then delete both the old code and the abstraction if no longer needed | In-process restructuring without long-lived VCS branches |
| Expand-Contract (Parallel Change) | Add the new interface/schema alongside the old → migrate callers → remove the old | Any interface or schema change with existing callers; pairs with `api-evolution.md` for published contracts |
| Dual Write / Change Data Capture | Write to (or replicate into) the new store while the old remains source of truth; reconcile, then flip | Datastore split or extraction; never flip before reconciliation reports zero drift |
| Feature-flag Cutover | Gate the new path behind a flag; ramp by cohort/percentage | Behavior-level switches where per-request routing is cheap; flags must have a removal date |

## Transition Plan checklist
- **Cutover unit**: what moves per increment, and what evidence proves an increment safe (tests, shadow traffic, reconciliation)
- **Coexistence**: how old and new run together — routing rule, flag, facade — and who owns it
- **Rollback**: defined per increment, not just for the whole migration
- **Data**: which store is source of truth at each stage; reconciliation check before every flip
- **Contract impact**: if a published API changes, apply the lifecycle patterns in `api-evolution.md`
- **Exit**: what deletes the old path and the scaffolding, and what stops the migration from stalling half-done (owner + target date)
