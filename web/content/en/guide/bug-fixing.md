---
title: "Use Case: Bug Fixing"
description: Structured reproduce-diagnose-fix-regress loop with severity-based escalation.
---

# Use Case: Bug Fixing

## Intake format

Start with a reproducible report:

```text
Symptom:
Environment:
Steps to reproduce:
Expected vs actual:
Logs/trace:
Regression window (if known):
```

## Severity triage

Classify early to choose response speed:

- `P0`: data loss, auth bypass, production outage
- `P1`: major user flow broken
- `P2`: degraded behavior with workaround
- `P3`: minor/non-blocking

`P0/P1` should always involve QA/security review.

## Execution loop

1. Reproduce exactly in a minimal environment.
2. Isolate root cause (not just symptom patching).
3. Implement smallest safe fix.
4. Add regression tests for the failing path.
5. Re-check adjacent paths likely to share the same failure mode.

## Prompt template for oma-debug

```text
Bug: <error/symptom>
Repro steps: <steps>
Scope: <files/modules>
Expected behavior: <expected>
Need:
1) root cause
2) minimal fix
3) regression tests
4) adjacent-risk scan
```

## Common escalation signals

Escalate to QA or security when bug touches:

- authentication/session/token refresh
- permission boundaries
- payment/transaction consistency
- performance regressions under load

## Post-fix validation

- original repro no longer fails
- no new errors in related flows
- tests fail before fix and pass after fix
- rollback path is clear if hotfix is required

## Done criteria

Bug-fixing is done when:

- root cause is identified and documented
- fix is verified through reproducible checks
- regression coverage is in place
