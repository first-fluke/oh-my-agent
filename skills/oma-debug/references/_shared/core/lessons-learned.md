# Lessons Learned

Consult a relevant lesson after an observed failure or when prior evidence matches the current task. This file defines lesson handling; it is not a mandatory startup read or a destination for automatic edits to installed skills.

## Capture a useful lesson

Record a lesson when a repeated failure, consequential incident, or requested retrospective exposes a reusable cause and prevention method. Fix and verify routine failures directly. An expected failing regression test, a clarification question, or an experiment with a lower score does not by itself require an RCA.

Use the configured coordination store's `lessons-{sessionId}.md` (default `.agents/state/memories/`), or link an existing incident/result artifact. Include only information that helps prevent recurrence:

- The affected session/task/run and evidence paths.
- Observed behavior and impact; separate facts from suspected causes.
- Relevant framework version, configuration, or operating conditions.
- The fix and checks that support it.
- The prevention action and when it applies.

If the cause is unknown, say so. Do not invent a lesson merely to close a session. If the user says not to repeat a mistake, apply that correction to ongoing work immediately; record the reusable part without delaying the fix for a template.

## Applying lessons

- Check applicability against the installed version and actual configuration. A fix for one framework or runtime is not a universal rule.
- Review generated migrations against intended schema changes; generator success alone does not establish correctness.
- For integration failures, compare the actual producer and consumer contract: field names, types, authentication, timestamps, and error responses.
- Verify a suspected lifecycle, hydration, or redirect defect with the failing path before prescribing a hook, wrapper, or address substitution.
- Review findings need evidence. A disagreement alone does not establish an error; a separate reviewer does not guarantee correctness. Select runtime checks when the behavior requires them and record any verification limits.

## Promoting and maintaining lessons

Recurring evidence may justify a change to an owning skill, checklist, or project rule. Within an authorized source-maintenance task, prepare the scoped change, preserve exact version/trigger conditions, and verify it. Otherwise retain a proposal in the session artifact; do not mutate installed definitions during an unrelated run.

Read an experiment ledger only when it exists and a result needs analysis. A negative delta is a candidate for investigation, not proof of a reusable lesson. Keep successful and failed cases when comparing a proposed rule. Archive or remove historical lessons only under the repository's retention policy or the user's direction.

Use `session-metrics.md` for optional session evidence and `execution-policy.md` for authorization and completion.
