# Harness Reinforcement Design

Based on [Anthropic's Harness Design for Long-Running Apps](https://www.anthropic.com/engineering/harness-design-long-running-apps), this document identifies gaps in OMA's current implementation and specifies targeted reinforcements.

## Background

The Anthropic article establishes key principles for multi-agent harness design:
- Context resets outperform compaction for long-running agents
- Separated evaluation (Generator vs Evaluator) catches what self-review misses
- Gradable criteria with few-shot calibration produce consistent evaluation
- Live runtime evaluation detects bugs that static review cannot
- Every harness component encodes a model-limitation assumption — test and remove as models improve
- QA prompts require iterative tuning based on observed judgment errors

## Backtest Summary

### Already Aligned

| Article Principle | OMA Implementation |
|---|---|
| Generator/Evaluator separation | Executor agents + QA agent (distinct roles) |
| Structured artifact communication | Serena memory protocol (task-board, progress, result files) |
| Priority-tier execution | P0 → P1 → P2 sequential spawning |
| Technology stack specificity | Stack variants + tech-stack.yaml per skill |

### Gaps Identified (HIGH severity)

| # | Gap | Impact |
|---|-----|--------|
| 1 | No context anxiety detection or reset protocol | Quality degrades in long agent runs with no recovery mechanism |
| 4 | No runtime/live evaluation in QA | Static review misses stubbed features, broken flows, display-only implementations |
| 6 | No evaluator tuning feedback loop | QA judgment quality never improves; false negatives persist across sessions |

### Gaps Deferred (MEDIUM/LOW)

| # | Gap | Reason for Deferral |
|---|-----|---------------------|
| 2 | Sprint contract negotiation (Executor ↔ QA pre-agreement) | PM acceptance criteria partially covers; address after Gap 1/4/6 |
| 3 | Gradable criteria framework (numeric rubrics, few-shot calibration) | Requires Gap 6 infrastructure first |
| 5 | Progressive capability utilization (systematic scaffold removal) | Long-term optimization; low immediate impact |

## Design Decisions

### D1: External Anxiety Detection (not self-detection)

**Decision**: Orchestrator detects context anxiety externally; agents do not self-monitor.

**Why**: A degrading agent lacks meta-awareness of its own degradation. Self-detection creates a paradox — the agent consuming too much context would need more context to track its consumption. Output length monitoring requires remembering previous turns, which consumes the very resource being depleted.

**How**: Orchestrator compares turn budget usage vs acceptance criteria completion during PHASE 4 polling. Trigger at >= 80% turns consumed with < 50% criteria met.

**Standalone fallback**: When no Orchestrator is present, the Sprint Gate in difficulty-guide.md acts as a safety net. If a sprint takes 2x expected turns, the agent writes a checkpoint and informs the user.

### D2: Sprint Decomposition for Complex Tasks

**Decision**: Replace the single "Mid-check at 50%" with a sprint loop for Complex tasks.

**Why**: The article shows that feature-focused sprints (5-8 turns each) with gate checks between them prevent quality degradation over long runs. A single mid-check is a checkpoint, not a recovery boundary — it observes problems but doesn't reset context.

**How**: Modify difficulty-guide.md Complex protocol. Each sprint produces an independently testable deliverable. Sprint Gate checks completeness + lint/test + anxiety signals.

### D3: Mechanical Self-Check Only (no quality self-judgment)

**Decision**: Rename Review Loop Step [1] from "Self-Review" to "Mechanical Self-Check" and restrict scope to lint/test/build.

**Why**: The article demonstrates that "agents confidently praise mediocre work when evaluating own outputs." Quality judgment by the implementation agent is unreliable. The existing cross-review by QA agent (Step [3]) is the correct place for quality evaluation.

**How**: Modify orchestrator SKILL.md Review Loop. Explicitly forbid design quality, architecture alignment, and acceptance criteria satisfaction evaluation in Step [1].

### D4: Runtime Verification in QA Protocol

**Decision**: Add Step 2.5 (Runtime Verification) to QA execution-protocol.md.

**Why**: Static code review cannot detect: display-only features, stubbed functionality (buttons that render but do nothing), broken user flows, and edge cases that only surface at runtime. The article uses Playwright MCP; OMA uses curl/httpie as the baseline with browser tools when available.

**How**: Insert between Step 2 (Audit) and Step 3 (Report). Required for Medium/Complex tasks. Includes specific stub detection patterns.

### D5: Semi-Automated Evaluator Tuning

**Decision**: EA (Evaluator Accuracy) is a rolling 3-session retrospective metric, not a real-time score. Tuning is semi-automated via `oh-my-ag retro`.

**Why**:
- `false_negative` events are discovered after the session (next session or production). Real-time EA scoring is impossible for the most important error type.
- Fully automated tuning requires a meta-evaluator, which has the same bias problem. Human review of tuning suggestions avoids this.

**How**:
- Automatic: EA event collection in session-metrics.md
- Semi-automatic: `oh-my-ag retro` aggregates events and suggests patches
- Manual: User reviews and approves patches to QA checklist/protocol

### D6: Source-of-Truth Only (no spawn prompt injection)

**Decision**: All agent behavior changes go into source files (SKILL.md, execution-protocol.md, difficulty-guide.md). No modifications to spawn prompts in orchestrate.md or ultrawork.md.

**Why**: Agents already read these files during initialization. Duplicating instructions in spawn prompts creates dual source of truth, risks conflicts with SKILL.md, and wastes tokens on every spawn. This contradicts OMA's two-layer skill design principle.

**Exception**: Orchestrator-level logic (anxiety monitoring in Step 4, EA recording in Step 17.1) is modified because it is Orchestrator's own responsibility, not agent instructions.

## Change Specification

### File 1: `_shared/core/context-budget.md`

**Change**: Append "Context Anxiety Detection & Reset Protocol" section.

**Content**:
- Detection is Orchestrator's responsibility (external observation)
- Trigger: >= 80% turn budget consumed AND < 50% acceptance criteria complete
- Also triggers on: progress stall (3+ polling cycles with no update), shallow output (stubs/TODOs in result)
- Reset procedure: checkpoint via `write_memory` → terminate → re-spawn with checkpoint context
- Standalone mode fallback: Sprint Gate + 2x turn budget warning to user

### File 2: `_shared/core/difficulty-guide.md`

**Change**: Replace Complex protocol with sprint-based protocol.

**Content**:
- Step 2 adds sprint decomposition (2-4 feature-focused sprints, 5-8 turns each)
- Step 3 becomes a Sprint Loop with Sprint Gate between iterations
- Sprint Gate checks: deliverable complete, lint/test pass
- In standalone mode: sprint exceeding 2x expected turns → checkpoint + user notification
- Example provided (JWT auth + CRUD + tests → 3 sprints)

### File 3: `oma-orchestrator/SKILL.md`

**Change**: Modify Review Loop Step [1].

**Content**:
- Rename "Self-Review" → "Mechanical Self-Check"
- Scope: lint, type-check, tests, diff scope check only
- Explicit prohibition on quality judgment (design, architecture, acceptance criteria)
- Reference to Anthropic research on self-evaluation bias

### File 4: `oma-qa/resources/execution-protocol.md`

**Change**: Insert Step 2.5 between Audit and Report.

**Content**:
- Runtime Verification: start app, execute HTTP requests, verify database state
- Required for Medium/Complex; skip for Simple
- Execution guides by app type: Web (bun run dev + curl/Playwright), API (curl sequences), Mobile (emulator or API-layer)
- Runtime results table format (Feature, Method, Expected, Actual, Status)
- Stub detection checklist (buttons without handlers, placeholder data, non-responsive elements)

### File 5: `oma-qa/resources/checklist.md`

**Change**: Append "Runtime Verification" section.

**Content**:
- 10 binary check items: app starts, endpoints return expected codes, form submissions produce correct DB state, error states render messages, empty/loading/error UI handled, interactive elements respond, auth flows work end-to-end, rate limiting triggers, file upload actually transfers, pagination returns correct pages

### File 6: `_shared/core/session-metrics.md`

**Change**: Append "Evaluator Accuracy Tracking" and "Cost & Token Tracking" sections.

**Evaluator Accuracy**:
- Events: false_negative (+30), false_positive (+15), severity_mismatch (+10), missed_stub (+20), good_catch (-10)
- Rolling 3-session window for EA score
- Thresholds: EA >= 30 (tuning suggested), EA >= 50 (tuning required), false_negative >= 3 (checklist update), good_catch >= 5 (propagate)
- Recording: in-session events by Orchestrator, retrospective events via `oh-my-ag retro`

**Cost & Token Tracking**:
- Proxy metrics: turn count, wall-clock time, sprint resets, retries
- Per-agent session log table format
- Precise tokens via `oh-my-ag stats` post-hoc only
- Usage: cross-session comparison, disproportionate-agent detection, scaffold change impact tracking

### File 7: `_shared/core/lessons-learned.md`

**Change**: Append "QA Evaluation Lessons" section after "Debug Lessons".

**Content**:
- Initial lessons: runtime verification not optional, self-evaluation bias exists, severity calibration matters, false_negatives are costliest
- Same RCA entry format as other sections
- Referenced by qa-agent at Complex task start

### File 8: `_shared/core/evaluator-tuning.md` (NEW)

**Content**:
- Semi-automated tuning loop: collect EA → `oh-my-ag retro` analyzes → suggests patches → user approves → apply → validate over next 3 sessions
- Patch target mapping: error pattern → specific file to modify
- Tuning log format: error observed, root cause, patch applied, validation status
- Tuning from success: good_catch propagation to common-checklist.md
- Integration points: session-metrics.md (input), retro command (analysis), lessons-learned.md (persistent patterns), QA checklist/protocol (patch targets)

### File 9: `.agents/workflows/orchestrate.md`

**Change**: Modify Step 4 (Monitor Progress).

**Content**:
- Add Context Anxiety Check per polling cycle
- Turn budget ratio vs progress ratio matrix (4 conditions → continue or reset)
- Reset event recording in task-board.md
- Claude Code note for synchronous agent returns (check for incompleteness markers)

### File 10: `.agents/workflows/ultrawork.md`

**Change**: Modify Step 17.1.

**Content**:
- Add EA event collection (always, regardless of Quality Score availability)
- Review QA findings for: disputed items (false_positive), runtime-caught stubs (missed_stub), non-obvious bugs caught (good_catch)
- Append EA events to session-metrics.md
- Flag rolling EA >= 30 in final report with `oh-my-ag retro` suggestion

## Implementation Notes

- All changes are additive (append/insert) except File 2 (difficulty-guide.md Complex protocol replacement) and File 3 (orchestrator review loop rename)
- No spawn prompt modifications — single source of truth principle
- No new CLI commands required (retro command already exists)
- `oh-my-ag retro` will need EA aggregation logic added (separate implementation task)
- No breaking changes to existing workflows — new sections are additive

## Deferred Work

| Item | Dependency | Suggested Timing |
|------|-----------|-----------------|
| Sprint contract negotiation (Gap 2) | Gap 4 runtime verification validates the need | After 3+ sessions with runtime verification |
| Gradable criteria rubrics (Gap 3) | Gap 6 evaluator tuning infrastructure | After EA data accumulates (10+ sessions) |
| Progressive capability audit (Gap 5) | Gap 6 cost tracking provides data | Quarterly review cycle |
| `oh-my-ag retro` EA aggregation | Gap 6 session-metrics EA format | Implement alongside File 6 |
