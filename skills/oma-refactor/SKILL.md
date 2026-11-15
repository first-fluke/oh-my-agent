---
name: oma-refactor
description: Restructure existing code while preserving observable behavior. Use
  for targeted technical debt or hotspot work with characterization tests.
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
- Adding or completing behavior already requested by the user -> use the appropriate existing implementation skill; classify the scope in step 1 of the canonical workflow path first.
- Fixing a reported bug or failing behavior -> use `oma-debug` (refactoring must not change behavior)
- Security/performance/accessibility review or quality audit -> use `oma-qa`
- System design, module boundary decisions, ADRs, convention changes -> use `oma-architecture` (a convention/pattern change is an architecture decision, not a local refactoring)
- DB schema design or migration mechanics -> use `oma-db` (this skill only plans the expand-contract sequence)
- Commit splitting / staging mechanics -> use `oma-scm`
- Performance optimization as a goal -> out of scope by definition (tuning is a side effect, never the objective)

### Expected inputs
- `target`: file/module/path, smell report, SATD marker, or the feature request motivating preparatory refactoring
- `verification`: existing project test command(s); coverage/mutation tooling if already available
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

Standalone runs write plan / before-after reports under `.agents/results/refactor/`; orchestrated runs (via the `refactor-engineer` agent) write the result report at the path defined by the agent result contract (`references/_shared/runtime/result-contract.md`).

### Dependencies
- `resources/definition.md` (invariant definition: 5 properties, boundaries, destination principle, naming roles, inline evidence)
- `resources/measurement.md` (4-layer measurement + git forensics commands)
- Configured code-intelligence symbol/reference tools; existing project test runners for the target language
- Git history for churn/ownership/hotspot analysis
- Configured code intelligence for symbol/reference/pattern impact analysis; an available semantic rename engine for renames. Native inspection remains valid, but do not replace a semantic rename with blind text replacement
- Deterministic transformers: IDE refactoring actions, codemods (jscodeshift / OpenRewrite / ast-grep / comby)
- Metrics: use already installed complexity tools such as lizard / radon and existing project lint limits; installing or downloading additional tools requires authorization
- Test stack: use the repository's existing test runner and coverage commands (Jest, Vitest, unittest, pytest, XCTest, Swift Testing, cargo test, go test, or whatever the project already uses) and preserve their configuration. Add coverage or mutation instrumentation only when it is relevant to the task and available in the project; a runner migration is separate work

## Structural Flow

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
| Tests fail after a transformation | Mikado: record prerequisite, undo only this transformation's edits, preserve unrelated work, attack prerequisite first |
| No tests and code is untestable | Find a seam; apply only minimal mechanical changes to inject test access, then characterize |
| Tests are flaky | Fix or quarantine flaky tests before refactoring - an unreliable net is no net |
| Metric improves but readability worsens | Reject the transformation; readability is the success criterion, metrics are proxies |
| Scope keeps growing | Stop; report the boundary issue and split into a Mikado graph or route to architecture |
| Refactoring engine/codemod produces wrong output | Engines are not infallible - tests re-run is mandatory; fall back to manual atomic edits |
| A pure refactor has no implementation to restructure (missing or stub code) | Report the missing target rather than inventing one; missing or stub code does not itself authorize new behavior |
| A contract fact needed for correctness remains unknown after checking available task and project evidence | Ask for that specific fact under the shared execution policy and clarification protocol. Distinguish missing information from missing authorization: retain existing permission, pause only dependent work, and continue independent authorized work |

### Exit
- Success: behavior verified unchanged, structure measurably improved, readability confirmed, refactor-only commits, follow-ups reported.
- Partial success: safety net built but restructuring deferred; or prerequisites mapped (Mikado graph) with explicit blockers.
- Handoff: already-requested implementation or bug fixing continues under its owning skill's completion criteria; changing skills is not a task failure.
- Blocked or failed: report the exact missing contract, verification path, or required decision and the dependent work it prevents, plus independent work completed. A pure refactor with no target reports that limit without inventing behavior.

## Logical Operations

### Canonical workflow path
1. Classify the requested outcome against the actual target code, not the word "refactor" alone. Behavior-preserving restructuring stays here. Implementation or bug fixing already included in the request continues under the appropriate existing implementation skill or `oma-debug`, within existing authorization and without renewed approval. For mixed requests, separate behavior changes from restructuring and apply this skill only to the latter (two hats: no feature or bug work mixed in).
2. For the refactoring scope, establish its motivation and diagnose the safety net: run coverage on the changed lines, check test determinism (flakiness), and measure mutation strength if measurable. Classify greenfield (safety net exists) vs brownfield (build the net first). When no verification path (tests, types, tooling) exists, the first deliverable is the safety net, not restructuring.
3. If brownfield: find a seam, write characterization (golden-master or snapshot) tests for CURRENT behavior, and commit them separately.
4. Read the target code via symbol tools and the coding guide for conventions (known, or explicitly absent). Collect metrics (complexity, size, coupling), git signals (churn, ownership), smells, and SATD; check any existing project size gate.
5. Select targets by hotspot rank (complexity x churn), not by smell aesthetics alone.
6. Identify the destination form: the language idiom and codebase convention the result must match. Plan a sequence of named atomic transformations toward it, each independently verifiable and revertible; for stateful targets plan expand-contract.
7. Loop per transformation: apply ONE transformation, preferring deterministic engines (IDE rename, codemod, ast-grep) over freehand edits -> re-run existing tests UNCHANGED -> commit `refactor:` only -> next transformation. This safety-net run is the skill's required verification: perform it when test execution is permitted; when the user or project instructions rule it out, stop before the next transformation and report the applied transformation as unverified.
   On repeated failure (Mikado): record the broken prerequisite, undo only this transformation's edits,
   preserve pre-existing edits and other contributors' concurrent work, recurse on the prerequisite first.
8. When one feature spans several files after a split, a short entry-file comment listing the related paths and their roles can serve as a map; keep it current.
9. Finish: before/after metric delta + readability verdict (metric improvement alone is not success); list discovered-but-deferred work; never mix in behavior changes.

### Resource scope and effects
Reads target source, tests, the coding guide, lint configs, and git history. Mutates production code (structure only) and adds tests in separate commits. Runs test runners, coverage/mutation tools, codemod engines, and git log analysis. May write reports under `.agents/results/refactor/` and entries to `.git-blame-ignore-revs`. Never alters observable behavior, public contracts, or persisted data without an expand-contract plan.

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
- Local code tools: `references/_shared/core/code-intelligence.md` (code search/navigation)
- Authorization and contract ambiguity: `references/_shared/core/execution-policy.md` and `references/_shared/core/clarification-protocol.md` (when clarification or authorization is needed)

- Invariant definition (5 properties, boundaries, destination, naming roles, contexts, D&C, inline evidence): `resources/definition.md`
- Measurement: 4 layers + git forensics commands: `resources/measurement.md`
- Context loading: `references/_shared/core/context-loading.md`
- Quality principles: `references/_shared/core/quality-principles.md`
- Adjacent skills: `oma-debug` (bugs), `oma-qa` (audits), `oma-architecture` (boundaries/ADR), `oma-db` (schema), `oma-scm` (commits)