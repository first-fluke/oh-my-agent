# Session Evidence

Consult this guide for a requested retrospective, a substantive correction, or a review finding worth preserving. Routine work does not need a second log alongside existing progress and result artifacts.

## Record observations, not penalty scores

Do not assign points to questions, corrections, or review judgments. The former Clarification Debt (CD) and Evaluator Accuracy (EA) weights and thresholds are retired; they were prompt instructions, not CLI-computed metrics. Necessary clarification is not a failure, a user changing scope is not an agent error, and a disputed QA finding is not an established false positive.

When useful, record an event with session/task/run identity, an evidence path, observed impact, cause if known, and the action taken. Reuse the existing result or progress artifact. For a separate session summary, use the configured coordination store's `session-metrics-{sessionId}.md` (default `.agents/state/memories/`). Distinguish:

| Observation | Evidence to retain |
|---|---|
| Material clarification | Missing decision and how the answer changed dependent work |
| User scope change | New request and affected acceptance criteria |
| Agent mistake or rework | Requirement missed, affected behavior, correction, and verification |
| Blocked action | Exact missing input or authority and independent work completed |
| Review error or useful finding | Finding, reproduction or counterexample, adjudicated outcome, and impact |

A disputed finding stays unresolved until code, tests, or other evidence settle it. Judge severity by impact and exposure, not diff size. Keep useful catches, false positives, and missed defects separate; do not net them into an agent score or claim an accuracy rate without a defined labeled evaluation set.

## Respond to the cause

Correct the affected work and verify it. Pause only actions dependent on unresolved information or authorization, under `execution-policy.md`. Do not stop a session, trigger another agent, or require an RCA because a counter crossed a threshold.

For repeated failures, a consequential incident, or a user-requested retrospective, record the known cause and prevention evidence using `lessons-learned.md`. An ordinary failed check, including an expected RED test, does not require a separate RCA. Propose durable instruction changes only when evidence supports them; edit canonical definitions within an authorized source-maintenance task.

## Measurements and tooling

- Prefer observed task outcomes, relevant check results, retries, elapsed time, and recorded usage over inferred scores. State the measurement source and limits; progress updates are not a reliable turn counter, and checkpoint counts are not reset counts.
- `oma stats` reports the CLI's productivity and recorded usage/cost summaries. It does not parse this Markdown into CD or EA scores. Cost estimates are not billing receipts.
- `oma retro` groups recorded `gate.failed`, `blocker.raised`, and `decision.missing` events into harness suggestions. Those suggestions still need causal review; they do not automatically modify prompts.
- If the active workflow uses quality measurement or experiments, link the actual artifacts from `../conditional/quality-score.md` and `../conditional/experiment-ledger.md`. Do not fabricate missing measurements or mix them with conversational event counts.
- For model or prompt comparisons, use `../../oma-skill-creation/resources/prompt-evaluation.md`. Compare equivalent tasks and report correctness, interruptions, latency, and measured cost separately.

Keep existing historical logs as evidence. This guide neither schedules deletion nor imposes a retention deadline.
