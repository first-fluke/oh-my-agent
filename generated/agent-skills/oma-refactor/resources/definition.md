# Refactoring - Invariant Definition

> Part I of the refactoring doctrine. This file is timeless; org-specific parameters live in `governance.md`. Empirical evidence is noted inline where a claim depends on it.

## Core definition

Refactoring is the act of improving a system's internal structure toward its codebase's conventional form - without changing externally observable behavior (the contract its consumers depend on) - through small, revertible, named transformations whose behavior preservation is mechanically verifiable, in order to lower the future cost of change, whose dominant term is human comprehension cost.

## The five mandatory properties

If any property is missing, the activity is not refactoring.

| # | Property | Meaning | Without it |
|---|----------|---------|------------|
| 1 | Behavior-preserving | Consumer contract unchanged | Feature change / redesign |
| 2 | Verifiable | Preservation guaranteed by tests/tools/types | Risky edit |
| 3 | Incremental | Composition of small named transformations | Rewrite |
| 4 | Economically motivated | Lowers future change cost (~= comprehension cost) | Vanity polishing |
| 5 | Separated | Never mixed with behavior changes in a commit | Unreviewable tangle |

### 1. Behavior preservation - the boundary is contractual, not technical
- Preserved: input/output equivalence, public interface semantics, the *meaning* of side effects (records written, events emitted).
- Not preserved: internal call order, private structure, stack-trace shape.
- Gray zone (performance, log format, serialization): judged by **Hyrum's Law** - if someone actually depends on it, it is part of the contract.
- Performance (tuning) is allowed only as a side effect, never as the goal. If performance is contractual (SLA, real-time), preserve it too.
- Preservation is necessary but not sufficient: behavior can be preserved while readability worsens - that is a failed refactoring. (Empirical: LLM refactorings preserved behavior ~84% yet worsened readability in ~71% of cases while static metrics improved.)

### 2. Verifiability - the precondition
Guarantee mechanisms: (a) test suite - tests are FROZEN during refactoring; a failing test means behavior changed; (b) deterministic tool transformations - engines have bugs too (refactoring-engine bug studies exist), so re-run tests anyway; (c) type system / compiler; (d) differential testing and semantic equivalence checking (e.g., execution-driven differential testers, equivalence checkers).
- Symmetry rule: refactor production with tests frozen; refactor tests with production frozen. One side at a time.
- "Test failed = behavior changed" holds only for deterministic tests. Flaky tests destroy the signal itself.
- When no net exists: write **characterization tests** (pin CURRENT behavior, bugs included - Hyrum). Practical form: golden-master / approval / snapshot tests.

### 3. Incrementality - an open catalog
Composition of named transformations (Extract Function, Move Method, Rename, ...). Small enough to verify instantly, revert instantly, and review confidently. The standard catalog names only a fraction of real-world behavior-preserving changes (detector studies explain ~20% of real changesets with the standard catalog alone) - the test is the five properties, not catalog membership. Compound refactorings are where automated agents fail most; decompose to atomic steps.

### 4. Economics - readability is the dominant term
`change cost = comprehension cost + ripple cost + verification cost`. Most developer time goes to comprehension, so readability (analysability) is the primary objective; coupling-driven ripple radius (modifiability) is the second, independent lever. Kent Beck: "Make the change easy (warning: this may be hard), then make the easy change."
- Cognitive grounding: refactoring removes extraneous cognitive load; working-memory limits (chunking) justify small units; naming is the largest readability lever no metric measures.
- Debt vocabulary: Cunningham's debt metaphor is a communication device for non-engineers (interest = ongoing cost, principal = structural flaw). Fowler's quadrants (deliberate x prudent) split the prescription: prudent-deliberate debt is a repayment-planning problem; reckless-inadvertent debt is an education problem.

### 5. Separation - two hats
Never wear the feature hat and the refactoring hat simultaneously; mixed (tangled) commits make preservation unreviewable and are a measured quality risk (tangled refactorings in agent patches significantly reduce compilability). This is why `refactor` is a distinct commit type. Separation governs commits, not budgets - preparatory refactoring embedded in feature work is part of that feature's cost.

## What refactoring is NOT
Bug fixing (intentional behavior change) / performance optimization (different goal, often anti-readability) / feature addition / rewrite (wholesale replacement without stepwise verification) / API-breaking change (= redesign/migration). Lifecycle home: ISO/IEC/IEEE 14764 perfective/preventive maintenance. Edge case: cross-language migration can satisfy all five properties but is conventionally named "migration".

## When NOT to refactor
- Code about to be deleted or replaced (zero economics)
- Cold, low-churn stable code (touching it is pure risk)
- Right before a release (risk asymmetry: gains are future, risk is now)
- Without a safety net (build the net first)
- Know the risk: a fraction of refactorings induce defects and security regressions (both empirically documented); the five properties reduce risk, they do not zero it.
- Rewrite is right only when incremental-migration total cost exceeds rewrite + full re-verification cost (include feature-freeze cost and second-system risk in the comparison).

## Triggers
- Code smells (qualitative heuristics: duplication, Long Method - long *body*, god class, Feature Envy, Shotgun Surgery, Speculative Generality): signals that change cost is rising, not defects.
- SATD (self-admitted technical debt): TODO/HACK/FIXME in comments/issues - a third signal independent of structure and history. Do not let the *tone* of the admission drive priority (negativity measurably skews developer prioritization even though most consider it wrong).

## Destination - one principle, three axes
**Reusability = context independence.** Every pattern is a named technique for severing one kind of context dependency (Strategy: host vs algorithm; Facade: consumer vs subsystem internals; Adapter: new context vs existing interface; DI: unit vs dependency construction). Roots: Parnas information hiding, GoF's two meta-principles, OCP, SDP/SAP. Composition is the mother of patterns; FP (pure functions) is the limit case - the smallest reusable unit. Catalogs are fractal: GoF / PoEAA / EIP / DDD / cloud (Strangler Fig) / POSA.

**Pattern choice = f(language expressiveness, code layer, codebase convention):**
- Language axis: patterns compensate for what the language cannot express (Norvig: most GoF patterns evaporate into idioms). The destination is the language's idiom, not a GoF diagram.
- Layer axis: functional core vs imperative shell call for different forms and different test economics.
- Convention axis: in brownfield, the coding guide and framework conventions beat "theoretically better" patterns - consistency is a component of analysability. Changing a convention is an architecture decision (ADR + lint ratchet for new code + module-wise migration), never a boy-scout edit.
- Timing: Rule of Three - abstract after reuse evidence accumulates; speculative generality is a smell.

## Naming - operationalizing the unmeasured lever

Rename is the only core transformation with no metric gate; its gate is qualitative: does the new name reveal the entity's **role** and **domain meaning** to the next reader? For variables, Sajaniemi's role taxonomy makes that question checkable (11 roles cover ~99% of variables in procedural/OO code): first identify the role, then verify the name exposes it.

| Role | Behavior | Naming cue |
|------|----------|-----------|
| Fixed value | Set once, read thereafter | `maxRetries`, `basePath` |
| Stepper | Walks a predictable succession | `attempt`, `pageIndex` |
| Flag | Two-state signal controlling flow | `isStale`, `hasOverflow` |
| Walker | Traverses a data structure | `cursor`, `currentNode` |
| Most-recent holder | Latest value seen so far | `lastError`, `currentLine` |
| Most-wanted holder | Best value found so far | `closestMatch`, `maxSoFar` |
| Gatherer | Accumulates across values | `total`, `mergedDiff` |
| Container | Elements enter and leave | `pendingJobs`, `seenIds` |
| Follower | Previous value of another variable | `prevNode` |
| Organizer | Holds data being rearranged | `sortedCopy` |
| Temporary | Held briefly (swap/reuse) | `tmp` - acceptable ONLY in this role |

Rename discipline:
- Generic names (`data`, `result`, `temp`, `value`) outside the temporary role fail the role check; lying names (name promises X, body does Y) outrank them as targets.
- One variable, one role: a variable that switches roles mid-scope is a **Split Variable** trigger, not a rename target.
- Functions are named for intent (what), not mechanism (how); command = verb, query = noun/predicate.
- Renames are engine-executed (LSP/IDE rename), never find-replace; tests re-run regardless.
- Goodhart applies here too: role vocabulary diagnoses; the terminal check is still "does the next reader understand this cheaper".

## Execution contexts
- **Greenfield**: refactoring is the third beat of TDD (Red -> Green -> Refactor) - minute-scale hygiene, net already exists.
- **Brownfield**: order inverts - find a seam (minimal mechanical change to enable testing) -> characterization tests -> restructure. Large scale: Strangler Fig, Branch by Abstraction, Sprout Method - the system stays working at every point. The classification is per code fragment (coverage map), not per project.
- **Stateful (data/API)**: git revert does not restore data. Mechanism: **Expand-Contract (parallel change)** - expand (old+new coexist) -> dual-write + backfill -> switch reads -> contract (remove old); feature flags are the standard switch. External consumers: semver + deprecation cycles as a staged contract-transfer protocol; the pattern vocabulary for that staging (Version Identifier, Two in Production, Aggressive Obsolescence, Limited Lifetime Guarantee - MAP evolution patterns, Zimmermann et al.) lives with `oma-architecture` (`resources/api-evolution.md`) - a published-contract change is an architecture decision, route there for the ADR.
- **Team concurrency**: big renames collide with every open branch - another reason for "small and frequent". Announce large refactorings + short merge windows; register bulk mechanical commits in `.git-blame-ignore-revs`; LSC (monorepo-wide atomic change + owner-split review) is incrementality at org scale.
- **Regulated environments**: even behavior-preserving changes trigger re-verification/re-certification - economics invert; batch-per-release refactoring is the one legitimate exception to "continuous flow".

## Architectural principle - refactoring enables divide and conquer
Functional core / imperative shell: pure-core unit tests cost ~0 and assert maximally -> "every step gets a unit test" is the rational default there; the shell gets few integration/contract tests. The test pyramid is D&C's verification form (unit = conquer, contract/integration = combine, E2E = divide). "All units pass therefore the system works" is the composition fallacy. Expensive, mock-heavy unit tests diagnose a failed decomposition - i.e., a refactoring target. Reusability and testability are the same coin: a test is the code's second consumption context.

## Goodhart - every metric is a proxy
Complexity targets -> mechanical splits; coverage KPIs -> assertion-free tests; size gates -> boundary-dodging splits; pattern counts -> speculative generality; git metrics -> commit-habit gaming; SATD tone -> priority distortion. Metrics diagnose; they do not replace qualitative judgment on what they cannot see (bad names, wrong abstraction level, missing domain concepts). The only terminal criterion: **can the next person understand and change this code more cheaply?**

## Standards anchors
ISO/IEC 25010 (maintainability - analysability is the standard vocabulary for the readability thesis) | ISO/IEC/IEEE 14764 (perfective/preventive) | ISO/IEC 25023, 5055 (automated measures) | ISO/IEC/IEEE 29119-4 (test design techniques, coverage criteria incl. MC/DC) | ISO 26262 / DO-178C (risk-tiered coverage; re-certification implications) | ISO/IEC 25051 (successor of withdrawn 12119). Standards are anchors for the doctrine, not its content.
