---
oma-docs: skip
---

# Bug Report Template

Use this template for Complex or CRITICAL/HIGH severity bugs. For Simple/Medium bugs, the condensed template in `debugging-checklist.md` §Documentation Template is sufficient.

Save to: `.agents/results/bugs/bug-YYYYMMDD-[short-description].md`

Fill in the sections that apply and delete the rest. Record only what was actually observed, changed, or run.

---

# Bug: [Short Descriptive Title]

**Date Reported**: YYYY-MM-DD
**Date Fixed**: YYYY-MM-DD (or "In Progress")
**Reporter**: [User name or issue number]
**Severity**: CRITICAL | HIGH | MEDIUM | LOW
**Status**: OPEN | IN PROGRESS | FIXED | ON HOLD | WON'T FIX

## Problem Description

**What happened?** [The bug from the user's perspective]

**What was expected?** [What should have happened instead]

**Impact**: [Who is affected, what it costs them, and any workaround]

## Reproduction Steps

1. [Step]
2. [Step]
3. [Observed result]

**Frequency**: [Every time | Intermittent (pattern) | Specific conditions (describe)]

## Evidence

**Error message / stack trace**:
```
[Exact text]
```

**Other evidence**: [Logs, request and response, screenshots: file path or description]

## Environment

[Only what is relevant to the bug: runtime and version, OS, browser or device, app/API version, database, deployment environment]

## Root Cause

**Code location**: `path/to/file`, line, function

**Mechanism**: [Why the failure occurs and which condition triggers it]

**Hypotheses ruled out**: [What was checked and excluded]

## Fix

**Approach**: [The fix strategy and why it addresses the root cause]

**Files Modified**:
- `path/to/file` - [what changed]

**Migration/Deployment Notes**: [Database, configuration, or breaking changes and the rollback plan; "None" when there are none]

## Verification

- [ ] Regression test: [file, cases, command and actual outcome (RED before the fix, GREEN after)]
- [ ] Manual reproduction: [steps, environment and actual outcome]
- [ ] Related areas: [scope actually checked and findings]
- [ ] Performance: [measurement or not checked]

**Not run**: [Suites or checks that were not run, and why]

## Prevention

[What would have caught this earlier: a test, a type or lint rule, a validation, or a review point]

## Related

[Similar bugs, dependent issues, and documentation or external references used]
