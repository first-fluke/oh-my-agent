# Governance - Organization Parameters

> **Declaration**: numeric values and tool names here (20% / 500 lines / vitest...) are THIS organization's chosen parameters - other orgs may fill in different values. The mechanisms themselves - a floor's existence, burden-of-proof inversion, registry unification, ratchet enforcement - are invariant doctrine.

## G-1. Budget: 20% of capacity is a FLOOR

Every organization - including legacy orgs that never refactor - allocates at least 20 of every 100 units of engineering capacity to refactoring. This is an unconditional floor, not a recommendation for mature teams.

- **Accounting-illusion correction**: an org "too busy to refactor" is already paying 30-40% involuntarily (slowed delivery, repeated hotfixes, re-deciphering time) - it just appears as zero because no budget line captures it. The real choice is "20 deliberately vs 30-40 haphazardly".
- **Bootstrap order from zero**: (1) instrument - install Layer 1-4 measurement first; (2) safety net - kill flaky tests, characterize hotspots; (3) only then repay principal. The first spending is the infrastructure that makes refactoring possible; skipping this order is how adoption fails.
- **The floor is permanent**: "debt is low, cut the budget" reverses causality - low debt is the state that spending maintains. The control loop adjusts upward only; the sole exception below the floor is regulated-environment rhythm reallocation.
- **Enforcement is org-level**: a capacity-planning line item + quarterly consumption reporting. Team-level budgets are always eaten by feature pressure.

## G-2. Budget usage restriction

The budget covers only what feature flow cannot reach: hotspot principal repayment, test infrastructure (flaky eradication, mutation strengthening, framework migration), large-scale restructuring, state migrations. **Preparatory refactoring embedded in a feature is that feature's cost** - absorbing it into the budget creates "we have a budget, so no refactoring during features".

## G-3. Control loop + outcome accounting

Layer-2 signals worsening (velocity decline, revert/hotfix rise, flakiness rise, SATD accumulation) -> raise above the floor; on recovery -> return to the floor (one-way). Close the loop with DORA outcomes (lead time, change failure rate) reviewed quarterly next to budget consumption.

## G-4. Goodhart defense

The budget must not become ritual: spending targets come from hotspot rank (Layer 3); effects close via the procedure's final verification step plus DORA.

## G-5. File size gate: 500 lines, burden of proof inverted

A file exceeding 500 lines is a refactoring target by default; KEEPING it requires a documented justification. The point is the default inversion, not the number.

- **Closed justification list**: generated code / data tables / cohesive state machines or parsers where splitting hurts readability (requires ADR-grade record - the most abused item) / vendored code / regulated freeze.
- **Ratchet enforcement**: lint rule (`max-lines: 500` ESLint, `max-module-lines=500` Pylint, metric tooling for Dart) - new files hard-fail in CI; existing violations frozen in a baseline and forbidden to grow (shrink updates the baseline). Suppression comments must state the reason; permanent exemptions need an ADR.
- **Caution**: LOC is the weakest metric - the gate's virtue is enforceable simplicity. Splits follow responsibility boundaries, never line counts; a split producing mutually-importing tightly-coupled halves is void.

## G-6. Per-language tool registry

One test framework per language per repo, declared here; changing it follows the convention-change procedure (ADR + ratchet migration) and is a typical G-1 budget expenditure. All Layer-4 instrumentation stacks on the runner - dual runners split coverage, mutation, CI gates, and agent output.

| Language | Test | Coverage (breadth) | Mutation (strength) | Notes |
|----------|------|--------------------|---------------------|-------|
| TS/JS | **vitest** | `@vitest/coverage-v8` | StrykerJS | residual jest requires a migration ADR |
| Python | **pytest** | `pytest-cov` | mutmut / cosmic-ray | no unittest-style mixing |
| Dart/Flutter | **flutter_test** | `flutter test --coverage` | (ecosystem gap - compensate with assertion review) | includes golden tests |

This registry is part of the coding guide and therefore part of any coding agent's effective system prompt; ecosystem gaps are recorded with their compensation rule.
