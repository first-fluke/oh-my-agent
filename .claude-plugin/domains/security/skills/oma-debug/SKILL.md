---
name: oma-debug
description: Diagnose a reproducible failure, fix its cause, and verify the
  regression. Use for crashes, incorrect behavior, and failing tests.
---

# Debug Agent - Bug Fixing Specialist

## Scheduling

### Goal
Reproduce, diagnose, minimally fix, and regression-test bugs while preserving scope discipline and documenting root cause.

### Intent signature
- User reports a bug, crash, traceback, exception, error message, performance issue, intermittent failure, or regression.
- User needs root cause analysis plus a minimal code fix and regression test.

### When to use
- User reports a bug with error messages
- Something is broken and needs fixing
- Performance issues or slowdowns
- Intermittent failures or race conditions
- Regression bugs

### When NOT to use
- Building new features -> use Frontend/Backend/Mobile agents
- General code review -> use QA Agent

### Expected inputs
- Error message, failing behavior, reproduction steps, logs, test failure, or affected code path
- Existing tests, stack traces, environment notes, and suspected regression boundary

### Expected outputs
- Root cause explanation
- Minimal fix scoped to the failing behavior
- Regression test or explicit reason it cannot be added
- Bug documentation under `.agents/results/bugs/` when appropriate

### Dependencies
- `resources/execution-protocol.md`, `resources/checklist.md`, and `resources/debugging-checklist.md`
- Local codebase search and symbol/reference tools
- Project test, lint, typecheck, and runtime commands
- Project logging commands
- `resources/bug-report-template.md` and the tools reference in `resources/debugging-checklist.md`

## Structural Flow

### Transitions
- If reproduction fails, use logs/tests to establish a weaker but explicit diagnostic signal.
- If the first fix fails verification, return to root-cause analysis.
- If similar patterns exist, inspect and patch only affected cases.
- If the request is actually feature work, route to the relevant implementation skill.

### Failure and recovery
- If environment is missing, document the blocker and provide the closest static diagnosis.
- If no regression test is feasible, explain why and include manual verification.
- If fix scope grows, stop and call out the broader design issue.

### Exit
- Success: bug is fixed, regression coverage exists, and the original failing check and regression test pass.
- Partial success: root cause or verification blocker is explicit.

## Logical Operations

### Canonical workflow path
1. Capture the reported symptom, logs, suspected scope, reproduction path, and verification command.
2. Run the smallest reproduction command first (a test, runtime, or log command), or establish the closest reliable failing signal.
3. Locate files and inspect symbols or content with the configured code-intelligence provider. For Serena, use `find_file`, `search_for_pattern`, `get_symbols_overview`, and `find_symbol`. Native search is limited to the provider exclusions and non-code paths permitted by the project's search policy.
4. Read the failing code, affected tests, references, and similar patterns.
5. Establish the causal mechanism: isolate the root cause and reject unsupported hypotheses. Follow `resources/execution-protocol.md` for the diagnosis record when an OMA workflow is active.
6. Add the regression test, apply the minimal fix, and re-run the regression test with the original failing check (RED before the fix, GREEN after). Run broader suites only when the user or the active workflow requires it; otherwise report them as not run.
7. Document the root cause, fix, test, and residual risk.

### Resource scope and effects
Reads logs, the failing source, tests, and related patterns; edits source and tests only as needed for the fix. Runs reproduction and verification commands. May create bug reports and result artifacts under `.agents/results/bugs/`.

### Guardrails
1. Reproduce first, then diagnose - never guess at fixes
2. Identify root cause, not just symptoms
3. Minimal fix: change only what's necessary
4. Every fix gets a regression test
5. Search for similar patterns elsewhere after fixing
6. Document in `.agents/results/bugs/`

### Code intelligence
Use the configured provider to locate the failing function, find callers, and search similar error patterns. Native search and scoped reads are supported fallbacks; see the shared capability contract.

## References
- Local code tools: `../_shared/core/code-intelligence.md` (code search/navigation)

- Execution steps (follow for the selected task): `resources/execution-protocol.md`
- Checklist (pre-submit self-verification): `resources/checklist.md`
- Error recovery: `resources/error-playbook.md`
- Bug report template (Complex or CRITICAL/HIGH bugs): `resources/bug-report-template.md`
- Condensed bug report, tools reference, and handoff routing: `resources/debugging-checklist.md`
- Context loading: `../_shared/core/context-loading.md`
- Context budget: `../_shared/core/context-budget.md`
- Lessons learned: `../_shared/core/lessons-learned.md` (matching prior failure or requested retrospective)
- Observability handoff: `../oma-observability/SKILL.md` §Integrations — traces/logs by `trace_id`, 6-dim forensics