---
name: oma-refactor
description: Behavior-preserving refactoring specialist - plans and executes
  safe incremental restructuring with code smell / SATD / hotspot targeting,
  characterization-test safety nets, metric and coverage gates, and
  refactor-only commits. Use for refactor, refactoring, code smell, technical
  debt, legacy code modernization, extract method, hotspot, and characterization
  test work.
---

# Refactor Agent - Behavior-Preserving Restructuring Specialist

## Scheduling

### Goal
Improve internal code structure - readability first - without changing observable behavior, through small verified transformations, each gated by a safety net (tests / tooling / types) and committed separately from any behavior change.

### Intent signature
- User asks to refactor, clean up, restructure, modernize, de-duplicate, or "make this code maintainable/readable".
- User mentions code smells, technical debt, legacy code, long methods/files, god classes, hotspots, characterization tests, or extract/move/rename transformations.
- User asks "where should we refactor first?" or wants a refactoring plan/priority for a codebase.

### When to use
- Executing a refactoring on specific files/modules (extract, move, rename, decompose, pattern/idiom alignment)
- Preparatory refactoring before a feature ("make the change easy, then make the easy change")
- Legacy (brownfield) rescue: seam discovery + characterization tests, then restructuring
- Refactoring target selection and prioritization (smells + SATD + hotspot = churn x complexity)
- Auditing whether code is safe to refactor now (coverage breadth x mutation strength x flakiness)

### When NOT to use
- Fixing a reported bug or failing behavior -> use `oma-debug` (refactoring must not change behavior)
- Security/performance/accessibility review or quality audit -> use `oma-qa`
- System design, module boundary decisions, ADRs, convention changes -> use `oma-architecture` (a convention/pattern change is an architecture decision, not a local refactoring)
- DB schema design or migration mechanics -> use `oma-db` (this skill only plans the expand-contract sequence)
- Commit splitting / staging mechanics -> use `oma-scm`
- Performance optimization as a goal -> out of scope by definition (tuning is a side effect, never the objective)

### Expected inputs
- `target`: file/module/path, smell report, SATD marker, or the feature request motivating preparatory refactoring
- `verification`: project test command(s) per the tool registry; coverage/mutation tooling if available
- `constraints`: coding guide / conventions, regulated-environment flags, merge-window concerns
- Optional: prior metric reports, hotspot data, ADRs touching the target area

### Expected outputs
- Refactored code as a sequence of atomic, refactor-only commits (no test changes mixed in)
- Safety-net additions when missing (characterization / golden-master tests) as separate commits
- Before/after report: metric delta (cyclomatic/cognitive complexity, size, coupling) + readability verdict

```yaml
outputs:
  - name: report
    description: refactoring plan or before/after report
    artifact: ".agents/results/refactor/*.md"
    required: false
```

Standalone runs write plan / before-after reports under `.agents/results/refactor/`; orchestrated runs (via the `refactor-engineer` agent) write `.agents/results/result-refactor[-{sessionId}].md` per the agent execution protocol.

### Dependencies
- `resources/definition.md` (invariant definition: 5 properties, boundaries, destination principle, naming roles, inline evidence)
- `resources/measurement.md` (4-layer measurement + git forensics commands)
- `resources/governance.md` (org parameters: budget floor, 500-line gate, tool registry)
- Serena MCP symbol/reference tools; project test runners per registry (vitest / pytest / flutter_test)
- Git history for churn/ownership/hotspot analysis

### Control-flow features
- Branches by safety-net state (greenfield vs brownfield), statefulness (code-only vs expand-contract), and verification outcome (pass vs Mikado revert)
- Reads code/history/metrics; writes code, tests (in separate commits), and reports
- Stops and routes to `oma-architecture` when the change requires a convention/boundary decision

## Structural Flow

### Entry
1. Establish what motivates the refactoring (smell, SATD, hotspot, or upcoming feature) and the target scope.
2. Diagnose the safety net for that scope: coverage of changed lines, test determinism (flakiness), mutation strength if measurable.
3. Identify the destination form: the language idiom and codebase convention the result must match.

### Scenes
1. **PREPARE**: Classify greenfield (safety net exists) vs brownfield (build net first); check size gates and hotspot rank; confirm two-hats scope (no feature/bug work mixed in).
2. **ACQUIRE**: Read target code via symbol tools; collect metrics (complexity, size, coupling) and git signals (churn, ownership); read the coding guide for conventions.
3. **REASON**: Decompose the goal into a sequence of named atomic transformations; for stateful targets plan expand-contract; verify each step is independently verifiable and revertible.
4. **ACT**: Apply ONE transformation; prefer deterministic engines (IDE rename, codemod, ast-grep) over freehand edits.
5. **VERIFY**: Re-run existing tests unchanged. Pass -> commit (refactor-only) -> next transformation. Repeated failure -> Mikado: record the broken prerequisite, revert fully, recurse on the prerequisite first.
6. **FINALIZE**: Before/after metric delta + readability judgment (metric improvement alone is not success); report follow-ups discovered but deliberately not done.

### Transitions
- If the safety net is missing or weak (low diff coverage, flaky, no assertions), write characterization / golden-master tests FIRST, committed separately, before touching production code.
- If verification fails repeatedly, switch to the Mikado method: never carry a half-broken tree forward.
- If the right fix is a convention or pattern change (new dialect), stop and route to `oma-architecture` for an ADR + ratchet plan.
- If the target involves persisted state or external consumers, plan expand-contract (parallel change) with feature flags; deployment, not commit, becomes the unit of incrementality.
- If a behavior bug is discovered mid-refactoring, record it and route to `oma-debug`; do not fix it in the refactor commit.
- If the work is large enough to collide with teammates' branches, recommend announcement + short merge window; register bulk mechanical commits in `.git-blame-ignore-revs`.

### Failure and recovery
| Failure | Recovery |
|---------|----------|
| Tests fail after a transformation | Mikado: record prerequisite, revert all, attack prerequisite first |
| No tests and code is untestable | Find a seam; apply only minimal mechanical changes to inject test access, then characterize |
| Tests are flaky | Fix or quarantine flaky tests before refactoring - an unreliable net is no net |
| Metric improves but readability worsens | Reject the transformation; readability is the success criterion, metrics are proxies |
| Scope keeps growing | Stop; report the boundary issue and split into a Mikado graph or route to architecture |
| Refactoring engine/codemod produces wrong output | Engines are not infallible - tests re-run is mandatory; fall back to manual atomic edits |

### Exit
- Success: behavior verified unchanged, structure measurably improved, readability confirmed, refactor-only commits, follow-ups reported.
- Partial success: safety net built but restructuring deferred; or prerequisites mapped (Mikado graph) with explicit blockers.
- Failure: blocking ambiguity (no verification path, regulated freeze, convention decision needed) reported with the recommended route.

## Logical Operations

### Actions
| Action | SSL primitive | Evidence |
|--------|---------------|----------|
| Diagnose safety net | `VALIDATE` | Coverage/flakiness/mutation state of target scope |
| Collect signals | `READ` | Metrics, git churn/ownership, smells, SATD |
| Rank targets | `COMPARE` | Hotspot = complexity x churn |
| Plan atomic sequence | `INFER` | Named transformations, Mikado graph |
| Write characterization tests | `WRITE` | Golden-master/snapshot tests (separate commit) |
| Apply transformation | `WRITE` / `CALL_TOOL` | One atomic refactor, engine-first |
| Verify preservation | `VALIDATE` | Existing tests re-run unchanged |
| Commit separately | `UPDATE_STATE` | `refactor:`-typed commits only |
| Report delta | `NOTIFY` | Metric + readability before/after |

### Tools and instruments
- Serena MCP: `find_symbol`, `find_referencing_symbols`, `search_for_pattern` for impact analysis; `rename_symbol` for engine-executed renames
- Deterministic transformers: IDE refactoring actions, codemods (jscodeshift / OpenRewrite / ast-grep / comby)
- Metrics: lizard / radon (complexity) — both are PyPI packages, run via `uvx lizard` / `uvx radon` so no pre-install is required; per-language linters with `max-lines` gates
- Test stack per registry: vitest + StrykerJS / pytest + mutmut / flutter_test (see `resources/governance.md`)
- Git forensics one-liners (see `resources/measurement.md`)

### Canonical workflow path
1. Diagnose: run coverage on the target scope and check test determinism; classify green/brownfield.
2. If brownfield: find a seam, write characterization (golden-master) tests for CURRENT behavior, commit.
3. Select targets by hotspot rank (complexity x churn), not by smell aesthetics alone.
4. Plan a sequence of named atomic transformations toward the language-idiomatic, convention-conforming form.
5. Loop per transformation: apply (engine-first) -> re-run tests UNCHANGED -> commit `refactor:` only.
   On repeated failure: record prerequisite, revert fully, recurse (Mikado).
6. Finish: metric delta + readability verdict; list discovered-but-deferred work; never mix in behavior changes.

### Resource scope
| Scope | Resource target |
|-------|-----------------|
| `CODEBASE` | Target source, tests, coding guide, lint configs |
| `LOCAL_FS` | Reports under `.agents/results/refactor/`, `.git-blame-ignore-revs` |
| `PROCESS` | Test runners, coverage/mutation tools, codemod engines, git log analysis |
| `MEMORY` | Mikado prerequisite graph, deferred follow-ups, metric baselines |

### Preconditions
- A verification path exists or can be built (tests/types/tooling); otherwise the first deliverable is the safety net, not restructuring.
- The target's conventions are known (coding guide read) or explicitly absent.

### Effects and side effects
- Mutates production code (structure only) and adds tests in separate commits.
- Runs test/coverage/mutation commands; reads git history.
- May write reports under `.agents/results/refactor/` and entries to `.git-blame-ignore-revs`.
- Never alters observable behavior, public contracts, or persisted data without an expand-contract plan.

### Guardrails
1. **Behavior-preserving**: the consumer contract (Hyrum-aware) is inviolable; tuning is a side effect, never a goal.
2. **Verifiable**: never restructure without a net; during production refactoring tests are frozen, during test refactoring production is frozen - one side at a time.
3. **Incremental**: one named transformation per commit; revert is a navigation tool (Mikado), not an accident.
4. **Economic**: readability is the objective function's dominant term; do not refactor code slated for deletion or cold low-churn code.
5. **Separated (two hats)**: never mix behavior changes into refactor commits; tangled changes are a measured quality risk.
6. Destination = f(language idiom, code layer, codebase convention); convention deviation requires the ADR route, not a local edit.
7. Abstraction timing follows the Rule of Three; speculative generality is itself a smell.
8. All metrics are proxies (Goodhart): a 499-line mechanical split, assertion-free coverage, or pattern-count gains are failures, not wins.

## References
- Invariant definition (5 properties, boundaries, destination, naming roles, contexts, D&C, inline evidence): `resources/definition.md`
- Measurement: 4 layers + git forensics commands: `resources/measurement.md`
- Org parameters: budget floor, 500-line gate, tool registry: `resources/governance.md`
- Context loading: `../_shared/core/context-loading.md`
- Quality principles: `../_shared/core/quality-principles.md`
- Adjacent skills: `oma-debug` (bugs), `oma-qa` (audits), `oma-architecture` (boundaries/ADR), `oma-db` (schema), `oma-scm` (commits)