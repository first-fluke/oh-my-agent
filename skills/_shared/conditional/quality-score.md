# Quality Measurements

Load when the task or active workflow needs a measured baseline or experiment comparison with defined metrics. The mere presence of tests or lint does not activate a scoring phase. Ordinary verification uses the applicable checks directly.

## Preserve independent acceptance gates

Tests, authorization/security requirements, and project acceptance criteria remain independent gates. A performance improvement cannot offset a correctness or security failure. Do not assign default weights, convert checklist completion into a security score, or trigger rollback from an arbitrary grade.

OMA does not implement a loader for `.agents/config/quality-score.yaml` or a universal composite scorer. If a project already provides a scoring command, record its formula, inputs, applicability, and output; do not infer configuration support from a sample path. A project composite may supplement the evidence but cannot waive mandatory checks.

## Measure a comparable baseline

1. Define the behavior, metric, units, direction, scope, and acceptance threshold from the task or project. Use the same command, dataset, environment, and measurement method before and after.
2. Reuse still-current verification artifacts. When new measurements are needed, capture the command's exit status and structured output (JSON, JUnit, SARIF, LCOV, or project equivalent). Do not infer totals from truncated console text.
3. Record the artifact path and revision/run identity with the result. Mark unavailable measurements as missing with a reason; estimates are labeled and excluded from measured comparisons.
4. Compare each applicable measure and check result. For noisy metrics, use the project's sampling/tolerance method; a single timing sample does not prove a regression.
5. Keep a change when it meets required behavior and comparison criteria. Investigate a regression before deciding whether to repair or discard the experiment; preserve unrelated work. Record a material tradeoff when requirements permit it.

For an actual experiment, use `experiment-ledger.md`. Ordinary test passes do not require a ledger row or a new measurement at every phase. Re-measure only affected metrics after relevant changes, failures, or uncertainty.

## Evidence record

Use existing result artifacts or a compact table such as:

| Measure | Baseline | Candidate | Method / evidence | Verdict |
|---|---|---|---|---|
| Required tests | pass | pass | exact command, exit status, report paths | pass |
| Request p95 latency | measured ms | measured ms | same workload, environment, sample method | within target / regression / inconclusive |
| Security finding | finding ID | remediation status | reproduction and verification paths | resolved / unresolved |

Report missing evidence without inventing a score. Authorization, builds, verification, and completion follow `../core/execution-policy.md`.
