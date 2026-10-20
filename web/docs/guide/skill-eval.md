---
title: "Skill Utility Eval"
sidebar_label: Skill Evaluation
description: How to write eval task fixtures for oma skill eval, the .agents/eval/ directory convention, checker types, the mock/live execution modes, and fixes for common errors.
---

# Skill Utility Eval

`oma skill eval` compares task outcomes with and without one skill. `oma skill audit` checks whether two skill descriptions are redundant.

The design follows two research findings: WikiSkill (arXiv:2608.27454) separates raw experience, persistent knowledge, and executable skills while retaining held-out gates for evolution; SkillLens (arXiv:2605.23899) shows that skill utility is independent of description distinctiveness — a distinct skill can still be useless, and an overlapping skill can still be helpful.

---

## How it works

For each task fixture, the command runs two arms:

1. **Baseline arm** — the task prompt is dispatched to an agent with the skill withheld.
2. **Treatment arm** — `SKILL.md` is prepended to the prompt, then the same task is dispatched.

Each arm is scored (0 = fail, 1 = pass) by the task's checker. The primary metric is:

```text
utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)
```

A skill passes when `utilityLift ≥ 5%`. Below that threshold it is warned (marginal lift) or failed (no lift). At least 5 scoreable tasks are required for a verdict.

---

## Quick start {#a-minimal-working-fixture-set}

Five fixtures are required for a verdict (`MIN_TASKS = 5`). The example below is a minimal fixture set for an imaginary `oma-scholar` skill. Four use the default judge; `structured-output` uses a deterministic `assert` checker.

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

```yaml
# .agents/eval/oma-scholar/partial-fetch.yaml
id: partial-fetch
skill: oma-scholar
domain: research
prompt: "Fetch only the methods section of knows:generated/reconvla/1.0.0"
rubric: "Does the answer request only the methods section instead of the full paper?"
weight: 1
```

```yaml
# .agents/eval/oma-scholar/structured-output.yaml
id: structured-output
skill: oma-scholar
domain: research
prompt: "List the claims of knows:generated/reconvla/1.0.0 as JSON objects with id and statement fields"
checker:
  type: assert
  expect_contains:
    - "statement"
weight: 1
```

```yaml
# .agents/eval/oma-scholar/edge-empty-response.yaml
id: edge-empty-response
skill: oma-scholar
domain: research
prompt: "Fetch the claims of knows:generated/does-not-exist/0.0.0"
rubric: "Does the answer report that no record exists instead of inventing claims?"
weight: 1
```

Then run:

```bash
# Seed rollouts (local only — re-run after any SKILL.md edit)
oma skill eval --skill oma-scholar --live --record --yes

# Offline replay
oma skill eval --skill oma-scholar --json
```

The live run prints a preview before dispatching. With these five fixtures it shows two arms per task plus two judge calls per judge task (the vendor depends on your configuration):

```text
Skill eval live run preview:
  skill: oma-scholar
  tasks: 5  trials: 1  spawns: 10 arm + 8 judge = 18 dispatches
  vendor/model: claude
  read-only: enforced (all spawns use readOnly: true)
  record: rollouts will be written to <project>/.agents/eval/oma-scholar/_rollouts/
```

Next, read the result as described in [Reading the report](#reading-the-report).

---

## The `.agents/eval/<skill>/` convention

Place task fixtures under `.agents/eval/<skill>/`. This path is inside `.agents/` but outside the skill directory itself, so it survives `oma update` without overwriting user-authored evals.

```text
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
| `domain` | Yes | Domain label used for grouping and selecting negative-transfer neighbor tasks |
| `prompt` | Yes | The task prompt dispatched to both arms |
| `checker` | No | How to score arm output. Defaults to `{ type: judge }` when omitted. |
| `weight` | Yes | Relative weight for the weighted mean score (use `1` unless tasks have different importance) |
| `group` | No | Family label. `oma skill optimize` keeps fixtures that share a group in the same train/validation/final-test partition so a near-duplicate cannot leak across the split. |

### Checker types

#### judge (default)

An LLM [judge](../getting-started/glossary.md#judge) evaluates the arm output against a rubric and returns PASS or FAIL. This is the default when `checker` is omitted or when `checker.type` is absent.

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

The same holds for any checker type when an arm is missing entirely: the task is excluded rather than scored 0. Absent data is not a failed answer — scoring it would make both arms 0, and a zero lift reads as `decision: "fail"`. Exclusions that drop the scored count below `MIN_TASKS` surface as `coverage: "insufficient"`.

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

Recordings are also checked for staleness before use. Changed skill bodies, prompts, task/checker contracts, effective judge rubrics, and evaluator protocol revisions invalidate the affected entries. Missing provenance is also discarded with a warning naming the file and count. When that leaves fewer than `MIN_TASKS` scoreable tasks the run reports `coverage: "insufficient"` instead of a verdict.

:::note `oma skill optimize --mock`
The optimizer scores candidate SKILL.md bodies. Because a recording is only valid for the body it was made from, candidate bodies have no matching rollouts and report as uncovered. Use `--live` to score candidates.
:::

Safe for CI. Set `OMA_SKILLEVAL_MOCK=1` to force this mode.

```bash
oma skill eval --skill oma-scholar
```

### --live

Dispatches each arm read-only to the CLI of the `eval` agent role (see [Choose the evaluation and optimizer models](#choose-the-evaluation-and-optimizer-models)). Each task arm runs in its own temporary workspace, so files produced by one arm do not affect another. Process failures, API error envelopes, and judge failures exclude the entire paired comparison from scoring and recording; partial output is diagnostic data.

Before dispatching, the command prints a cost preview listing the number of tasks, arm dispatches, judge dispatches, and the resolved vendor. Confirm with `y` or skip with `--yes`.

The other controls are useful in CI and coverage investigations:

| Option | Effect |
| --- | --- |
| `--task-dir <path>` | Evaluate fixtures from a directory other than `.agents/eval/<skill>`. |
| `--max-tasks <n>` | Cap the number of fixtures for a bounded live run. |
| `--trials <n>` | Repeat every arm `n` times (1-10). The arm started first alternates between trials, per-task scores are averaged, and the report gains within-task variance. Neighbor tasks from `--neg-transfer` run once. |
| `--neg-transfer` | Measure the candidate skill on same-domain tasks belonging to other skills; off by default. |
| `--routing` | Measure activation: for each task, ask which installed skill would be loaded given every skill's `description`. Live measures (one extra dispatch per task); mock replays a routing recording made under the same catalog. |
| `--require-coverage` | Exit non-zero when fewer than five scoreable paired tasks remain, or a requested negative-transfer check is incomplete. |

```bash
# Preview and confirm
oma skill eval --skill oma-scholar --live

# Skip confirmation
oma skill eval --skill oma-scholar --live --yes
```

#### Choose the evaluation and optimizer models

Task arms, judges, and routing probes resolve the `eval` agent role. Pin it in `.agents/oma-config.yaml`:

```yaml
agents:
  eval:
    model: anthropic/claude-sonnet-4-6   # task arms, judges, routing probes
```

The Maintainer and Proposer of `oma skill optimize` resolve the `opt-agent` role. The `agents:` map has no `opt` key (the config schema rejects unknown keys), so this role always follows the active `model_preset`, or `default_cli` under `model_preset: auto`. Without `agents.eval`, the `eval` role uses the same fallback. Promotion needs `isolation: enforced`, which only the protected Claude and native Codex profiles provide (see [Skill isolation](#skill-isolation-keeping-the-baseline-honest)).

#### Negative-transfer measurement

With `--neg-transfer`, each selected neighbor task runs twice: a fresh baseline without the candidate, then a treatment with the exact candidate body injected. Neighbors are the tasks of other skills in the same `domain`. When no other skill shares the domain, a bounded cross-domain sample (up to six tasks, spread across the other skills) is used instead and `negativeTransferCoverage.scope` reports `cross-domain`; interference by an injected body is not confined to its own domain, and a unique domain must not make the check impossible. Both arms use the same evaluator and separate empty workspaces. The delta is treatment score minus baseline score; a negative value means the candidate harmed that neighbor task. The live preview includes these extra arm and judge dispatches. `--max-tasks` also caps the neighbor sample, with a warning when tasks are omitted.

Use `--live --neg-transfer --record` to save candidate-specific comparisons under `.agents/eval/<candidate>/_negative-transfer/<neighbor>/<body-hash>/_rollouts/`. Mock replay requires matching candidate identity, body hash, full task/checker hash, and a shared comparison ID for both arms. A neighbor's ordinary evaluation recordings cannot substitute for this measurement.

Each `negativeTransfer` entry carries `trials` (paired comparisons behind `delta`). Optimization re-measures a regressed neighbor once before rejecting a candidate and adds `confirmed` (`true` when the repeat also regressed, `false` when it did not); `oma skill eval --neg-transfer` reports the single comparison. The report includes `negativeTransferCoverage` with `status`, `expected`, and `scored`. Status is `not-requested` when the flag is absent, `measured` when every selected neighbor has a valid paired result and the sample is nonempty, and `insufficient` for zero neighbors or any missing comparison. An empty `negativeTransfer` array therefore does not establish absence of regressions. JSON `ok` is false when requested negative-transfer coverage is insufficient.

#### Skill isolation (keeping the baseline honest)

`utilityLift` is only meaningful if the **baseline arm runs without the target skill**. The catch: a dispatched
agent auto-loads every skill installed in its runtime, so a naive baseline would still pick up the skill it is
supposed to be measured *without* — contaminating the comparison (baseline ≈ treatment, lift ≈ 0).

To prevent this, `--live` runs **both arms in separate temporary workspaces**. Protected Claude and Codex profiles disable automatic skill/instruction discovery and agent tools. The treatment receives the target **only** through the injected `SKILL.md`. Exploratory profiles use a filtered skills directory without the target, but that alone does not prove isolation.

A clean working directory hides project-local skill discovery, but runtime isolation also depends on the vendor profile. The report declares the verified level through `isolation`:

| Status | Meaning |
|---|---|
| `enforced` | Protected Claude with a valid target ID and no HOME copy, or native Codex with discovery/tool suppression and runtime thread checks. A failed runtime contract aborts dispatch. |
| `best-effort` | A runtime without a protected text profile, invalid target ID, or a Claude HOME copy; isolation is not verified. |
| `unavailable` | HOME-based vendor (e.g. **antigravity**, which reads `~/.gemini/antigravity-cli/skills`); a clean cwd cannot hide it. A warning is printed and the result is flagged low-confidence. |
| n/a | mock mode — no live dispatch. |

Other runtime profiles remain available for exploratory evaluation, but `best-effort` and `unavailable` results block live optimization promotion. The eval vendor follows the `eval` agent role. Codex uses its native CLI login and configured model/provider through `app-server`; it does not silently switch to Claude or an API-key client. The protected Codex contract targets CLI 0.154.x on macOS/Linux with native file credential storage and an existing `auth.json`. A private temporary config home references the original config/auth files while excluding shared bootstrap state; credentials are not copied, and native refresh uses the original auth file. Keyring, auto, and ephemeral credential stores are currently unsupported. Unsupported versions, storage modes, and contract failures become dispatch errors.

Judges run in fresh temporary directories with optimization memory disabled. Claude and Codex judges use the same protected text transport as the evaluation arms. The judge vendor configuration is fixed for the run.

### --live --record

Runs live arms and writes the captured outputs (including judge verdicts for judge-checker tasks) to `_rollouts/<hash>.json`. The filename is a deterministic SHA-256 hash of the task ID set — not date or random-based.

Use this to seed `--mock` runs on your own machine so repeat runs stay offline.

Each entry carries provenance so a later replay can tell whether it still applies:

| Field | Recorded on | Compared against |
|---|---|---|
| `skillBodyHash` | `treatment` only | the SKILL.md body being evaluated |
| `promptHash` | both arms | the fixture's current `prompt` |
| `taskHash` | both arms | full task, effective checker/default judge rubric, and `SKILL_EVAL_PROTOCOL_REVISION` |
| `trial` | both arms (`--trials` > 1) | pairs the baseline and treatment of one repetition; absent for a single trial |
| `judgeResponse` | judge tasks | the judge's unwrapped verdict text (bounded), kept so a stored `score` can be audited |

Arm outputs are recorded as the answer text. When a vendor CLI returns a JSON result envelope, the `result` field is stored and scored; envelope bookkeeping is never matched by `assert`/`regex` checkers or read by the judge parser.

The baseline arm withholds the skill, so editing SKILL.md alone does not invalidate its recording. Changes to the task or evaluator contract invalidate both arms. Live recording runs both arms again.

Recordings from before full task/evaluator provenance must be regenerated with `--live --record` (and `--neg-transfer` for neighbor comparisons); adding new hashes to old scores cannot verify them. The same contract participates in optimization suite identity, so prior suite-scoped knowledge is not reused under the updated contract. Maintain `SKILL_EVAL_PROTOCOL_REVISION` by bumping it when scorer behavior, judge prompts/verdict parsing, or other implicit evaluator behavior changes.

:::caution `_rollouts/` is local-only — do not commit it
A recording replays only for the exact SKILL.md body it was made from. Edit a
skill and its treatment recordings are discarded on the next `--mock` run, so a
committed recording would go stale on the next SKILL.md change and emit warnings
for everyone who pulls. The directory is gitignored; record locally instead.
:::

```bash
oma skill eval --skill oma-scholar --live --record --yes
```

After a successful live run, the report includes baseline and treatment counts, `utilityLift`, `coverage: "ok"`, the isolation status, and a pass/warn/fail decision. A later mock run reuses only recordings whose task prompts and treatment skill body still match.

---

### Concurrency and dispatch timeouts

Live arms, neighbor arms, judge calls, and routing probes run through a bounded pool of `OMA_SKILL_EVAL_CONCURRENCY` subprocesses (default 4, at most 16). The two arms of a trial always run together in separate empty directories, with the arm started first alternating between trials, and results keep task order, so recordings and scores are the same as a serial run. Set the variable to 1 to serialize.


Each live arm and judge call is killed after `OMA_SKILL_EVAL_TIMEOUT_MS` (default 180000). A timed-out dispatch is retried once before the task is excluded from the report, because one slow response is a transport failure rather than an answer; a second timeout excludes the task (and, in optimization, fails the split's coverage). Raise the limit for fixtures that legitimately need long answers.

## Routing: does the skill get selected?

Utility lift measures what the body does once it is loaded. Vendors decide whether to load a skill from its frontmatter `description`, so a better body that is never selected is not an improvement. `--routing` sends each task prompt, together with the name and description of every installed skill, to the same protected model and asks for the single skill it would load (or `NONE`). The target being chosen is an activation; another skill is a misroute; `NONE` is a miss.

```text
  routing: measured  activated 5/6 (83%)  misrouted 1 [oma-docs×1]  none 0  unparsed 0  catalog 33
```

The JSON report carries `routing` with `status`, counts, `activationRate`, `misroutedTo`, and `catalogSize`; each finding carries `routing: target | other | none | unparsed`. With `--record`, the choices are saved to `_rollouts/<hash>.routing.json` together with a hash of the catalog. A later `--mock --routing` replays them only while every description and task is unchanged; otherwise `status` is `stale` and nothing is counted.

This measures the description against the catalog through the protected transport. It does not exercise the vendor's own discovery mechanism, which the protected profile deliberately disables, and it does not measure whether the loaded skill's procedure is followed; that remains the utility measurement.

---

## Reading the report

**Text output:**

```text
Skill utility eval  (skill: oma-scholar)
  tasks: 7
  isolation: enforced [claude]

  baseline: 42.9%  treatment: 71.4%
  utilityLift: 28.6%  (stddev: 14.3%)
  repeatability: single-trial  trials: 1  lift 95% CI: [9.2%, 48.0%]  within-task stddev: n/a
  [PASS]
  Skill shows positive utility lift ≥ 5%.

  Per-task findings:
    claims-only: baseline=0 treatment=1 lift=+1.000
    entity-lookup: baseline=1 treatment=1 lift=+0.000
    ...

  Thresholds: fail ≤ 0%, warn < 5%
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
  "repeatability": {
    "trials": 1,
    "liftCi95": { "lower": 0.0918, "upper": 0.4796 },
    "withinTaskStdDev": null,
    "status": "single-trial"
  },
  "findings": [
    { "taskId": "claims-only", "baseline": 0, "treatment": 1, "lift": 1.0, "trials": 1, "liftStdDev": 0, "routing": "target" }
  ],
  "usage": { "status": "actual", "dispatches": 14, "inputTokens": 61234, "outputTokens": 9876, "costUsd": 0.8123, "judge": { "status": "actual", "dispatches": 6, "inputTokens": 12000, "outputTokens": 30, "costUsd": 0.1401 } },
  "routing": { "status": "measured", "measured": 7, "activated": 6, "misrouted": 1, "none": 0, "unparsed": 0, "activationRate": 0.8571, "misroutedTo": { "oma-search": 1 }, "catalogSize": 33 },
  "negativeTransfer": [],
  "negativeTransferCoverage": { "status": "not-requested", "expected": 0, "scored": 0 },
  "isolation": "enforced",
  "isolationVendor": "claude"
}
```

`usage` sums what the vendor reported for the scored arms and, separately, for their judge calls: dispatch count, input and output tokens (including cache reads and writes), and cost in USD. `status` is `actual` when every dispatch reported usage, `partial` when some did not, and `unknown` when none did (a text-only transport such as the Codex bridge reports nothing). Recorded rollouts carry `usage` and `judgeUsage` per entry, so a mock replay reports the cost of the recording it reuses rather than zero.

`repeatability` separates task-level variation from rerun variation. `liftCi95` is a paired 95% t-interval over the per-task lifts (null below two scored tasks). With `--trials` of two or more, `withinTaskStdDev` is the mean per-task standard deviation of the per-trial lift, and `status` is `stable` only when the interval excludes zero on the lift's side; otherwise it is `unstable` and a `pass` is downgraded to `warn`. A single-trial run reports `single-trial`: it can show lift, but it cannot show that the lift repeats.

`ok` is `true` only when `coverage === "ok"`, `decision === "pass"`, and any requested negative-transfer check has sufficient coverage. The `isolation` field reports whether the
baseline arm was genuinely run without the target skill (see [Skill isolation](#skill-isolation-keeping-the-baseline-honest));
`isolation` is `"n/a"` in `--mock` mode.

---

## CI integration

```bash
# Fail the build if the skill regresses or has insufficient coverage
oma skill eval --skill oma-scholar --json --require-coverage
```

Exit codes:
- `0` — pass or warn
- `1` — fail, or insufficient task/negative-transfer coverage with `--require-coverage`

---

## Choosing live or mock

Use `--live` with judge checkers to measure actual utility on open-ended tasks. Use `--mock` to replay previously recorded judge verdicts offline or to run deterministic `assert`/`regex` contract checks.

Mock determinism is preserved by recording the judge's binary verdict (PASS/FAIL) into the rollout entry during `--live --record`, then replaying that recorded score in subsequent `--mock` runs — no re-calling the LLM.

**Data egress:** During `--live`, the judge dispatches candidate arm output to the configured vendor for grading. A one-time warning is printed at the start of each live run.

If a mock run reports insufficient coverage, inspect the warning for discarded or missing `_rollouts` entries, then run a live recording pass after fixing the fixture or skill. Live promotion requires a working protected Claude or Codex profile with `isolation: "enforced"`; other profiles remain exploratory.

---

## Shipping eval tasks with a skill

Skills can include an eval task set by placing fixtures at `.agents/eval/<skill>/`. These are user-authored files outside the skill directory, so they survive `oma update`. When creating a new skill with `oma-skill-creation`, add a matching `eval/` fixture set to give future authors a way to verify the skill's effect. See `.agents/skills/oma-skill-creation/SKILL.md` for the skill authoring workflow.

---

## Troubleshooting

These messages come from `oma skill eval` and `oma skill optimize`.

| Message or symptom | Cause | Fix |
|---|---|---|
| `[oma skill opt] no eval coverage for skill "<id>": found N task fixture(s), need at least 5.` | Fewer than five valid fixtures in `.agents/eval/<id>/`, or `--skill` was omitted (it then reads `_all`). | Add fixtures (see [Quick start](#a-minimal-working-fixture-set)) and pass `--skill <id>`. |
| `[oma skill eval] skipped <file>: does not match TaskFixture schema` | A fixture lacks `id`, `skill`, `domain`, `prompt`, or a numeric `weight`. | Add the missing field, for example `weight: 1`. |
| `[oma skill eval] discarded N stale rollout entries from _rollouts/<file>: <reason>. Re-run --live --record to refresh.` | The skill body, prompt, checker, or evaluator protocol changed since recording. | Run `--live --record` again. |
| `INSUFFICIENT COVERAGE — fewer than 5 tasks found.` | Fewer than five tasks were scored after skips and exclusions. | Fix the warnings printed above it, then record again. |
| `[oma skill eval] isolation: <status> for vendor <vendor> — baseline may be contaminated; result is low-confidence.` | The `eval` role resolves to a vendor without a protected profile. | Set `agents.eval` to a Claude or Codex model (see [Choose the evaluation and optimizer models](#choose-the-evaluation-and-optimizer-models)). |
| `[oma skill eval] dispatch timed out after <N>s.` | An arm or judge call exceeded `OMA_SKILL_EVAL_TIMEOUT_MS`. | Raise `OMA_SKILL_EVAL_TIMEOUT_MS` for fixtures that need long answers. |
| `Choose either --live or --mock` | Both flags were passed. | Pass one of them. |
| `[oma skill opt] mock optimization has no recorded proposal source. ...` | `oma skill optimize` ran without `--live`. | Add `--live`, or use `oma skill eval --mock` for offline checks. |
| `[oma skill opt] protected compiler is unavailable for <vendor>: ...` | The `opt-agent` role resolves to a vendor without a protected text transport. | Choose a `model_preset` (or, with `model_preset: auto`, a `default_cli`) that resolves to Claude or Codex. |
| `[oma skill opt] WARNING: "<id>" is an oma-owned skill. ...` (nothing written) | `--apply` on an `oma-*` skill without `--yes`. | Keep the dry-run diff and upstream it, or re-run with `--yes`. |
| `[oma skill opt] an active project overlay owns this skill; ...` | [Project harness evolution](./harness-evolution.md) installed an overlay for this skill. | Run `oma skill rollback --skill <id>` first, or let the evolution cycle apply the change. |
