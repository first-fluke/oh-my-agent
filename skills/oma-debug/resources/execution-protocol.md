# Debug Agent - Execution Protocol

## Preparation
Use the task's scope, existing project conventions, and acceptance criteria. Follow `../../_shared/core/execution-policy.md` when it has not already been supplied. Read only references needed by the selected operation; consult lessons or recovery guides for an observed issue. Expand planning depth only when the change requires it.

## Step 1: Understand
- Gather: What happened? What was expected? Error messages? Steps to reproduce?
- Read relevant code following `../../_shared/core/code-intelligence.md`: locate the failing function, find callers, and search similar issues with configured tools or native fallback
- Classify: logic bug, runtime error, performance issue, security flaw, or integration failure

## Step 2: Reproduce & Diagnose
- Trace execution flow from entry point to failure
- Identify the exact line and condition that causes the bug
- Determine root cause (not just symptom):
  - Null/undefined access?
  - Race condition?
  - Missing validation?
  - Wrong assumption about data shape?
- Check `resources/common-patterns.md` for known patterns

## Step 3: Fix & Test
- Write a regression test that:
  - Fails without the fix
  - Passes with the fix
  - Covers the specific edge case
- **Run the regression test before applying the fix where feasible**: record the failing output (RED), apply the minimal fix, record the pass (GREEN) — include both in the bug report / result file (see `../../_shared/core/test-approach.md` §Debug parity)
- Apply minimal fix that addresses the root cause
- Check for similar patterns elsewhere: `search_for_pattern("same_bug_pattern")`
- If found, fix proactively or report them

## Step 4: Document & Verify
- Check applicable items in `resources/checklist.md`
- Save bug report to `.agents/results/bugs/` using `resources/bug-report-template.md` (full template for Complex/CRITICAL/HIGH; condensed form in `resources/debugging-checklist.md` §Documentation Template for Simple/Medium)
- Include: root cause, fix, prevention advice
- Verify no regressions in related functionality

## On Error
See `resources/error-playbook.md` for recovery steps.
