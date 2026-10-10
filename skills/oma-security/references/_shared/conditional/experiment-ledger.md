# Experiment Ledger

Load when comparing an actual hypothesis with a baseline or another approach. Routine implementation, formatting, and every failed check do not require experiment bookkeeping.

## Location and ownership

Use `../runtime/memory-protocol.md` for the configured coordination store. The default is `.agents/state/memories/experiment-ledger-{sessionId}.md`. The coordinator maintains the shared ledger; parallel agents write task/run-scoped results for the coordinator to merge, avoiding concurrent edits to the same table. Reuse an existing experiment artifact when it already carries the evidence.

## Record a comparison

1. State the hypothesis, affected scope, baseline revision, and success criteria before changing behavior.
2. Capture comparable baseline and candidate measurements as described in `quality-score.md`. Preserve required binary checks and raw evidence paths.
3. Record the decision and reason: retain, repair, discard, or inconclusive. A missing or noisy measurement is not a loss. Do not rank unrelated tasks or agents by average score delta.
4. If discarding, remove only changes owned by that experiment after inspecting the diff. Preserve user edits, other agents' work, and useful failure evidence.

Suggested fields, not a parsed schema:

| Experiment / task / run | Hypothesis | Baseline evidence | Candidate evidence | Required checks | Decision and reason | Changed paths |
|---|---|---|---|---|---|---|
| IDs from active run | Specific mechanism | Revision and report | Revision and report | pass / fail / missing | retain / repair / discard / inconclusive | Owned files |

Keep units and comparison criteria beside metric deltas. A scalar composite is optional only when the project already defines and computes it; there is no OMA default formula.

## End of an experiment

Summarize the selected approach, unresolved limits, and evidence. A discarded attempt becomes a lesson only when its cause and reusable prevention are understood (`../core/lessons-learned.md`). Do not generate lessons or modify canonical skills from a numeric threshold.

The ledger records work; it does not grant more retries, spending, commits, or permission to remove workspaces. Those follow the active task budget and `../core/execution-policy.md`.
