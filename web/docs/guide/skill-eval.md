---
title: "Skill Utility Eval"
description: How to write eval task fixtures for oma skills eval, the .agents/eval/ directory convention, checker types, and the mock/live execution modes.
---

# Skill Utility Eval

`oma skills eval` measures whether loading a skill actually improves agent task outcomes. It answers a different question than `oma skills audit` (which asks "are two skills redundant?"): it asks "does this skill help?".

The design follows two research findings: SkillOpt (arXiv:2605.23904) uses a held-out utility score as the gate for accepting skill edits; SkillLens (arXiv:2605.23899) shows that skill utility is independent of description distinctiveness — a distinct skill can still be useless, and an overlapping skill can still be helpful.

---

## How it works

For each task fixture, the command runs two arms:

1. **Baseline arm** — the task prompt is dispatched to an agent with the skill withheld.
2. **Treatment arm** — `SKILL.md` is prepended to the prompt, then the same task is dispatched.

Each arm is scored (0 = fail, 1 = pass) by the task's checker. The primary metric is:

```
utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)
```

A skill passes when `utilityLift ≥ 5%`. Below that threshold it is warned (marginal lift) or failed (no lift). At least 5 scoreable tasks are required for a verdict.

---

## The `.agents/eval/<skill>/` convention

Place task fixtures under `.agents/eval/<skill>/`. This path is inside `.agents/` but outside the skill directory itself, so it survives `oma update` without overwriting user-authored evals.

```
.agents/eval/
└── oma-scholar/
    ├── claims-only.yaml        ← task fixture
    ├── entity-lookup.yaml
    ├── partial-fetch.yaml
    ├── structured-output.yaml
    ├── edge-empty-response.yaml
    └── _rollouts/
        └── a3f1b2c4d5e6f7a8.json   ← recorded arm outputs + judge verdicts
```

Files that start with `_` are skipped when loading task fixtures. The `_rollouts/` subdirectory holds recorded outputs from previous `--live --record` runs.

---

## Task fixture schema

Each fixture is a YAML file with the following fields:

```yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
checker:
  type: judge
  rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

| Field | Required | Description |
|:------|:---------|:-----------|
| `id` | Yes | Unique identifier for this task (used in rollout filenames and reports) |
| `skill` | Yes | Skill being evaluated (matches the parent directory name) |
| `domain` | Yes | Domain label (used for grouping and future negative-transfer detection) |
| `prompt` | Yes | The task prompt dispatched to both arms |
| `checker` | No | How to score arm output. Defaults to `{ type: judge }` when omitted. |
| `weight` | Yes | Relative weight for the weighted mean score (use `1` unless tasks have different importance) |

### Checker types

#### judge (default)

An LLM evaluates the arm output against a rubric and returns PASS or FAIL. This is the default when `checker` is omitted or when `checker.type` is absent.

```yaml
checker:
  type: judge
  rubric: "Does the answer correctly cite the source and avoid hallucination?"
```

The `rubric` field is optional; if omitted the default rubric is used: "Does the answer correctly and completely satisfy the task prompt?"

You can also write the rubric at the top level for brevity:

```yaml
id: minimal-fixture
skill: oma-scholar
domain: research
prompt: "What are the main claims in paper X?"
rubric: "Does the answer enumerate the main claims without adding fabricated ones?"
weight: 1
```

**Important:** In `--mock` mode, judge tasks require a previously recorded verdict in `_rollouts/`. If no recorded verdict exists for a task, that task is excluded from the report with a warning. Run `--live --record` to populate the rollouts first.

#### assert (opt-in)

Deterministic substring check. Use for contract / format / tool-call verification where the expected output is exact.

```yaml
checker:
  type: assert
  expect_contains:
    - "section=statements"
    - "partial_fetch=true"
```

Passes when every string in `expect_contains` is present in the arm output.

#### regex (opt-in)

Deterministic regex match. Use when a pattern rather than an exact string is needed.

```yaml
checker:
  type: regex
  pattern: "section=\\w+"
```

Patterns longer than 200 characters are scored 0 (ReDoS stop-gap). Output is truncated to 10,000 characters before matching.

---

## Execution modes

### --mock (default)

Replays recorded rollouts from `_rollouts/`. Fully deterministic and offline — no LLM is called.

- For `assert`/`regex` checkers: scores are computed from the recorded output strings.
- For `judge` checkers: replays the `score` field recorded by `--live --record`.

If a judge task has no recorded score in `_rollouts/`, it is excluded from the report (with a console warning). This keeps mock mode strictly offline.

Safe for CI. Set `OMA_SKILLEVAL_MOCK=1` to force this mode.

```bash
oma skills eval --skill oma-scholar
```

### --live

Spawns real agent arms via `oma agent:spawn --read-only`. Both arms run in a temporary workspace to prevent project file modification.

Before dispatching, the command prints a cost preview listing the number of tasks, arm dispatches, judge dispatches, and the resolved vendor. Confirm with `y` or skip with `--yes`.

```bash
# Preview and confirm
oma skills eval --skill oma-scholar --live

# Skip confirmation
oma skills eval --skill oma-scholar --live --yes
```

### --live --record

Runs live arms and writes the captured outputs (including judge verdicts for judge-checker tasks) to `_rollouts/<hash>.json`. The filename is a deterministic SHA-256 hash of the task ID set — not date or random-based.

Use this to seed `--mock` runs so CI can replay the eval offline.

```bash
oma skills eval --skill oma-scholar --live --record --yes
```

---

## A minimal working fixture set

Five fixtures are required for a verdict (`MIN_TASKS = 5`). Here is a minimal set for an imaginary `oma-scholar` skill:

```yaml
# .agents/eval/oma-scholar/claims-only.yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

```yaml
# .agents/eval/oma-scholar/entity-lookup.yaml
id: entity-lookup
skill: oma-scholar
domain: research
prompt: "Look up the entity knows:concept/attention-mechanism"
rubric: "Does the answer return the entity name, description, and at least one related concept?"
weight: 1
```

Repeat for at least three more tasks. Then run:

```bash
# Seed rollouts
oma skills eval --skill oma-scholar --live --record --yes

# CI replay
oma skills eval --skill oma-scholar --json
```

---

## Reading the report

**Text output:**

```
Skill utility eval  (skill: oma-scholar)
  tasks: 7

  baseline: 42.9%  treatment: 71.4%
  utilityLift: 28.6%  (stddev: 14.3%)
  [PASS]
  Skill shows positive utility lift >= 5%.

  Per-task findings:
    claims-only: baseline=0 treatment=1 lift=+1.000
    entity-lookup: baseline=1 treatment=1 lift=+0.000
    ...

  Thresholds: fail <= 0%, warn < 5%
```

**JSON output** (via `--json`):

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "taskCount": 7,
  "coverage": "ok",
  "decision": "pass",
  "baselineScore": 0.4286,
  "treatmentScore": 0.7143,
  "utilityLift": 0.2857,
  "utilityStdDev": 0.1429,
  "findings": [
    { "taskId": "claims-only", "baseline": 0, "treatment": 1, "lift": 1.0 }
  ],
  "negativeTransfer": []
}
```

`ok` is `true` only when `coverage === "ok"` and `decision === "pass"`.

---

## CI integration

```bash
# Fail the build if the skill regresses or has insufficient coverage
oma skills eval --skill oma-scholar --json --require-coverage
```

Exit codes:
- `0` — pass or warn
- `1` — fail, or insufficient coverage with `--require-coverage`

---

## Honesty note on mock vs live scores

`--mock` with `assert`/`regex` checkers is a deterministic *substrate* — useful for contract checks (does the output contain the right tool call?) but not a trustworthy utility number for open-ended skills. A meaningful score requires `--live` with judge checkers, which is how the academic benchmarks behind this feature measure utility (SkillOpt measures benchmark accuracy; SkillLens uses utility-grounded task-success eval).

Mock determinism is preserved by recording the judge's binary verdict (PASS/FAIL) into the rollout entry during `--live --record`, then replaying that recorded score in subsequent `--mock` runs — no re-calling the LLM.

**Data egress:** During `--live`, the judge dispatches candidate arm output to the configured vendor for grading. A one-time warning is printed at the start of each live run.

---

## Shipping eval tasks with a skill

Skills can include an eval task set by placing fixtures at `.agents/eval/<skill>/`. These are user-authored files outside the skill directory, so they survive `oma update`. When creating a new skill with `oma-skill-creator`, add a matching `eval/` fixture set to give future authors a way to verify the skill's effect. See `.agents/skills/oma-skill-creator/SKILL.md` for the skill authoring workflow.
