# Skill Dedup User A/B Test Plan

This plan validates behavior changes after skill prompt deduplication.
The goal is to prove no user-experience regression before full rollout.

## Scope

- Target change: deduplication in `.agents/skills/*` prompt files
- Control (A): current production prompts
- Treatment (B): deduplicated prompts
- Unit of randomization: session
- Primary mode: shadow A/B first, then canary

## Why user test first

Prompt edits can change routing and interaction quality even when tests pass.
CLI unit tests detect packaging/migration issues, but not user intent fit.

## Phase 1 - Shadow A/B (no user impact)

Run both A and B for the same real user prompt.
Return only A to users. Store B as hidden evaluation output.

### Labeling source (required)

- `task_success`, `wrong_routing`, `correction_event`, `redo_event`: session-close labels from QA reviewer
- `satisfaction`: session-close user signal (`up`/`down`) or `none` when unavailable
- `safety_incident`: runtime or QA incident flag, never inferred from missing fields

### Shadow sample size

- Minimum: 200 sessions
- Preferred: 500 sessions
- Duration: 3 to 7 days

### Shadow pass criteria

- Safety incidents in B: 0
- Wrong routing rate delta: <= +1.5%p vs A
- Clarification debt delta: <= +10% vs A
- Task success delta: >= -1.0%p vs A

If all pass, proceed to canary.

## Phase 2 - Canary (limited exposure)

- B exposure: 5% -> 10% -> 25% (step-up only after each gate passes)
- Gate window per step: at least 24h and 50 sessions
- Instant rollback if any stop condition triggers

### Stop conditions

- Any critical safety/policy violation in B
- Wrong routing rate delta > +2.0%p vs A
- User correction rate delta > +3.0%p vs A
- Satisfaction drop > 10% relative vs A in the same gate window

## Metrics (must be tracked)

- `task_success`: task completed as requested
- `wrong_routing`: selected wrong skill/domain
- `correction_event`: user correction required
- `redo_event`: user rejected and requested restart
- `cd_score`: clarification debt score per session
- `satisfaction`: thumbs up/down or equivalent
- `latency_ms`: response latency

Use session-level aggregates, then compare A vs B daily.

## Metric definitions (gate formulas)

- `task_success_rate` = sessions with final `task_success=true` / total sessions
- `wrong_routing_rate` = sessions with any `wrong_routing=true` turn / total sessions
- `correction_rate` = sessions with any `correction_event=true` turn / total sessions
- `redo_rate` = sessions with any `redo_event=true` turn / total sessions
- `avg_cd` = mean of final session-level `cd_score`
- Delta in `%p` = `rate_B - rate_A`; Delta in `%` = `(metric_B - metric_A) / metric_A * 100`

## Logging contract

Use the JSON schema in `docs/experiments/skill-dedup-shadow-log-schema.json`.
Store one record per turn, with stable `session_id` and `variant`.
Required fields for gate decisions must never be omitted.

### Prompt hash contract

- Normalize prompt text with Unicode NFC and LF newlines
- Hash algorithm: SHA-256 of normalized UTF-8 bytes
- Store `prompt_hash` and `prompt_hash_version` (current: `v1`)

## Analysis cadence

- Daily: guardrail metrics and stop checks (only if both arms have >= 30 sessions/day)
- End of phase: full comparison with confidence intervals
- Decision states: `promote`, `hold`, or `rollback`

## Ownership

- Product owner: approves gates and rollout decisions
- QA owner: validates regression classification
- Runtime owner: manages assignment, logging, rollback switch

## Deliverables

- Daily scorecard (use `docs/experiments/skill-dedup-scorecard-template.csv`)
- Incident log (if any)
- Final recommendation memo with promote/hold/rollback decision
