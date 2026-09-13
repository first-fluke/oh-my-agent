---
title: "Skill Optimization"
sidebar_label: Skill Optimization
description: How to use oma skill optimize for persistent, evidence-driven skill evolution with deterministic train, validation, and runner-owned holdout gates.
---

# Skill Optimization

`oma skill optimize` evolves a skill's `SKILL.md` to maximize its measured `utilityLift` as produced by `oma skill eval`. It separates raw rollout evidence, persistent scoped knowledge, and the executable skill. A Wiki Maintainer consolidates observable successes and failures; a Proposer uses that knowledge to emit bounded add/delete/replace edits. Candidates must improve validation utility with complete task and negative-transfer measurements. `--apply` also requires an improved, fully measured runner-owned final test and verified live isolation. At deployment there is no extra inference-time wiki lookup: the output remains a `SKILL.md`.

Research basis: Tang, L., Rashtchian, C., Ferng, C.-S., Tomkins, A., Juan, D.-C., & Vu, T. (2026). *WikiSkill: Compiling agent experience into persistent knowledge for skill evolution* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2608.27454

CLI optimization currently requires `--live` and incurs model calls. The default/non-live path and `--mock` cannot generate or replay proposals because a recorded-proposal loader is not implemented; they stop before evaluation. Use `oma skill eval --mock` for offline replay. Injected optimizer/scorer APIs remain available for offline tests. Passing both `--live` and `--mock` is an error.

---

## Hard dependency: eval task fixtures

`oma skill optimize` cannot run without eval task fixtures. It requires at least **5 task fixtures** (`MIN_TASKS = 5`) in `.agents/eval/<skill>/`. If fewer are found, the command errors immediately:

```
[oma skill opt] no eval coverage for skill "oma-scholar": found 2 task fixture(s), need at least 5. Author tasks first — see web/docs/guide/skill-eval.md
```

See the [Skill Utility Eval guide](/docs/guide/skill-eval) for the `.agents/eval/<skill>/` directory convention, fixture schema, checker types, and how to seed rollouts for mock replay.

Promotion also requires a nonempty set of same-domain neighbor tasks belonging to other skills. Every candidate validation score and the final candidate score must measure the neighbors of its evaluated split with the exact candidate body. Missing neighbors or incomplete paired recordings cannot establish absence of negative transfer. Offline evaluation can replay only matching candidate recordings; use live optimization to generate and evaluate new candidates.

Replay and suite-scoped knowledge are tied to the full task/evaluator contract, including the effective default judge rubric and scorer protocol revision. Older recordings and prior knowledge scopes require fresh evidence after this provenance upgrade; relabeling old scores with new hashes does not establish a valid measurement.

---

## How it works

Fixtures are sorted by task ID and split deterministically into **train**, **held-out validation**, and **runner-owned final-test** sets. With at least five fixtures, the target proportions are 60/20/20 and every partition has at least one task. For example, eight fixtures produce four train, one validation, and three final-test tasks after rounding. Fixtures that declare the same `group` are assigned together, so a rephrased sibling cannot sit in train while the original sits in the final test; with fewer than three groups the split falls back to task IDs and warns. The final-test tasks come from this local fixture set and are withheld from the Maintainer and Proposer. Duplicate final-test task IDs and overlap with a development split are rejected.

For each epoch (up to `--max-epochs`, default 8):

1. **Score current best `SKILL.md` on the TRAIN split** — `oma skill eval` returns observable per-task prompts, outputs, and lift. Every task in an internal split must have both scored arms; failed or missing comparisons cannot shrink the denominator.
2. **Wiki Maintainer consolidates evidence** — up to five failures and three successes become evidence-linked patterns. Failures are chosen by learning value: regressions first, then the deepest shared failures; tasks both arms already pass are left out because they say nothing about the next edit. Successes are ranked by lift. Scoped patterns and prior gate outcomes are recalled from OMA's L1/L2/L3 memory system.
3. **Proposer emits K candidate edits** (up to `--edits-per-epoch`, default 4). Exact edits already in persistent rejection history are skipped.
4. **For each candidate edit:**
   - Apply the edit to an in-memory copy of `SKILL.md`.
   - Validate the candidate (frontmatter `name`/`description` must survive; body must parse).
   - Enforce the textual learning-rate budget: discard edits whose net character change exceeds `--lr` (default 600 chars).
   - Re-score every task in the **held-out validation split** (with paired baseline/candidate comparisons on neighbor tasks) and every task in the **held-in training split** (no neighbor comparisons).
5. **Accept the best valid candidate** by the held-in/held-out rule: the candidate loses nothing on either split (`Δval ≥ 0` and `Δtrain ≥ 0`) and gains on at least one of them. Candidates are ranked by `Δval + Δtrain`. A strict validation gain is not required, because a body that already passes every validation task can still be repaired on a training failure without losing held-out ground; the final test decides whether that repair generalizes. Task coverage must be complete, the nonempty negative-transfer sample must be fully measured, and no neighbor may show a confirmed regression at or below `NEG_TRANSFER_FAIL = -0.1`. In live runs a neighbor that regresses on its first paired comparison is re-measured once; the recorded delta is the mean of both comparisons, and only a reproduced regression (`confirmed: true`) rejects the candidate. Mock replays cannot re-measure, so a single-trial regression stands. Live reports must declare `isolation: "enforced"`. Proposal gate outcomes are recorded with `deltaLift` (validation), `deltaTrainLift`, and the neighbor deltas behind the verdict.
6. **Early stop** after 2 consecutive epochs with no accepted edit (`OPT_EARLY_STOP_PATIENCE = 2`).
7. **Run the runner-owned final test after evolution.** Both the original body and the validation winner must cover every final-test task. The candidate must not lose final-test lift (`candidateLift >= baselineLift`; the gain it was accepted for was already shown on the development splits, and a strict gain on a small frozen test would make most repairs unpromotable) and must pass another complete, candidate-specific negative-transfer check. `finalTest.findings` lists the per-task lift of the original body and the candidate so a failed test can be read as a real regression or a single noisy task. Missing, incomplete, or failed final tests prevent promotion. Measured final failures remain audit records and do not become rejection knowledge for later optimization.

The optimizer works on an in-memory candidate copy during the loop.

Unmeasured candidates are recorded as `inconclusive`, with reasons such as `insufficient-coverage`, `negative-transfer-unmeasured`, or `unverified-isolation`. They are excluded from learned rejection history and remain eligible for a retry after the evaluation conditions are repaired. A confirmed neighbor regression, a loss on either split (`split-regression`), or no gain on either split (`no-validation-lift`) is a rejection. Diagnostics that indicate incomplete evaluation or degraded maintenance block promotion.

---

## Usage

```
oma skill optimize --skill <id> --live
               [--dry-run | --apply]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes]
               [--json] [--output <format>]
```

### Flags

| Flag | Default | Description |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | Skill ID to optimize (simple name, no path separators). |
| `--dry-run` | **yes (default)** | Propose edits and print the diff without changing `SKILL.md`; generated evidence and evolution events still persist. |
| `--apply` | — | Write the validated candidate after all promotion gates pass, including complete final-test and negative-transfer evidence; backs up the original before an atomic write. An OMA-owned skill also requires `--yes`. |
| `--mock` | Non-live default | CLI proposal replay is not implemented, so this path stops before evaluation. Use `oma skill eval --mock` for offline evaluation replay. |
| `--live` | — | Required for current CLI optimization. Incurs real model calls; prints a cost preview and asks for confirmation unless `--yes`. |
| `--max-epochs <n>` | `8` | Maximum optimization epochs. |
| `--edits-per-epoch <k>` | `4` | Candidate edits the optimizer LLM proposes per epoch. |
| `--lr <chars>` | `600` | Textual learning-rate budget: maximum net character change per accepted edit. |
| `--yes` | — | Skip the live cost-preview confirmation and acknowledge overwrite behavior when applying an OMA-owned skill. |
| `--json` | — | Output as JSON for CI/CD. |
| `--output <format>` | `text` | Output format (`text` or `json`). |

---

## Minimal end-to-end example

```bash
# Evaluate one epoch and print a candidate diff without applying it
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1
```

Illustrative output for eight fixtures and a candidate that passes all promotion gates:

```
[oma skill opt] skill: oma-scholar, tasks: 8 (train: 4, val: 1, test: 3), dry-run: true

Skill opt  (skill: oma-scholar)
  applied: false
  baselineLift: 0.0%  finalLift: 100.0%  (train 50.0% → 100.0%)
  epochs: 1  acceptedEdits: 1  rejected: 0
  budget: 42 model calls used (no limit)
  finalTest: pass baseline=0.0000 candidate=0.3333

  diff:
--- a/SKILL.md
+++ b/SKILL.md
@@ -12,6 +12,9 @@
 ### When to use
 - User asks to look up an academic paper or technical claim.
+- User asks for a summary of arxiv abstracts or DOI-linked documents.
 - User wants citations or sources for a factual statement.
```

The diff shows what the optimizer would write. `SKILL.md` is unchanged, while generated evolution evidence and scoped gate outcomes are persisted for future runs.

---

## Applying a validated improvement

When you are satisfied with the proposed diff, re-run with `--apply`:

```bash
# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --live --apply --yes
```

### The procedure as an artifact

The optimizer and maintainer prompts are the improvement procedure. They ship as built-in defaults and can be overridden by files under `.agents/eval/_evolution/` (preserved by `oma update`):

| File | Role | Required placeholders |
|---|---|---|
| `optimizer.md` | Proposes SKILL.md edits from training evidence and persistent knowledge | `{{body}}`, `{{findings}}`, `{{editsPerEpoch}}` (also `{{knowledge}}`) |
| `maintainer.md` | Consolidates evidence into reusable patterns | `{{evidence}}`, `{{priorFacts}}` (also `{{skillId}}`, `{{suiteHash}}`, `{{epoch}}`) |
| `constitution.yaml` | Surfaces the loop must never write, which procedure parts a meta-optimization may change, default ground-truth `anchors` for meta runs, and a dispatch budget | must list itself under `immutable` |

`budget.max_dispatches_per_run` (default `null`, unlimited) is enforced in live runs: every underlying model call (task arm, neighbor arm, judge, optimizer, maintainer) charges one unit, and the call that would exceed the limit is refused before it is made. The loop then stops with a `budget:exhausted` diagnostic, the final test is skipped, promotion is blocked, and the result reports `budget: { limit, used }`. Usage is recorded in the run summary either way, so procedures can be compared on cost as well as gain.

`oma skill procedure` prints the active sources and hashes; `--export` writes the defaults for editing without overwriting existing files. A template that drops a required placeholder is refused rather than silently degraded. Every run records `procedure` (hash per part plus a combined hash) and `memory` in its result, its run summary, and the promotion lineage, so evidence produced under one procedure is never confused with another.

The optimizer's reply is read leniently for formatting only: code fences and blank lines are ignored, but any content line that is not a valid `EDIT:` line (or a lone `NO_ACTION`) is a `parse-error`, and the diagnostic now includes the first offending line so the failure can be traced.

### Memory ablation and long-run statistics

`--memory none` starts a run from empty knowledge (no recalled patterns or gate history) while still recording it. Comparing runs under `--memory recall` (default) and `--memory none` at the same budget is the test of whether persistent knowledge helps; a claim that the loop learns from experience needs that comparison, not the presence of a memory.

`oma skill evolution-stats --skill <id>` aggregates every recorded run for a skill from `.agents/results/skill-evolution/<id>/*.jsonl`: runs by status, proposals by gate outcome and the acceptance rate, verified improvements (final test passed and promotion eligible), applies and rollbacks, mean final lift, model calls over metered runs and calls per verified improvement (the cost of the process rather than of a run), and the same figures split by memory mode and by procedure hash. The meta-optimization report shows mean calls per inner run for the current procedure and each candidate, so a procedure that wins on gain by spending more is visible as such.

### Meta-optimization: the procedure as the candidate

`oma skill meta-optimize --target optimizer --skill <a> <b> ... --live` treats the optimizer (or maintainer) prompt as the thing under test. It runs the inner loop (`oma skill optimize --dry-run`) on each named held-out skill, `--repeats` times, under the current procedure; asks a proposer for up to `--candidates` small edits to the template; runs the inner loop again under each candidate with the same `--max-epochs` and `--edits-per-epoch` budget; and compares each candidate to the current procedure pairwise by (skill, repeat) on the validation-lift gain the inner loop achieved.

A candidate is promoted only when the paired bootstrap 95% interval of its gain difference lies above zero (seeded, 1000 resamples), at least three pairs exist, and no skill that improved under the current procedure loses more than half of that gain under the candidate. `--anchor` names skills that are never used for selection but are run once under the current and winning procedure to show drift; without the flag the constitution's `anchors` list applies, so a ground-truth set declared once is checked on every meta run. With `--apply` the winning template is written to `.agents/eval/_evolution/<target>.md` with a timestamped backup, a unified-diff patch, and a record in `.agents/results/skill-evolution/_procedure/promotions.jsonl` carrying the parent and candidate hashes, the constitution hash, and the evidence (skills, repeats, budget, pairs, interval). Without `--apply` nothing is written.

What stays frozen: the final-test partition of every skill is never read for selection (the metric is validation gain), the evaluator and optimization code are listed as immutable in the constitution, the constitution itself cannot be a target, and a target must appear in `meta_targets`. Inner runs default to `--memory none` so a procedure is judged on the edits it produces rather than on knowledge recalled from earlier runs. Every inner run records the combined procedure hash it ran under, so `oma skill evolution-stats` can attribute later results to the procedure that produced them.

This is the level-5 shape described in the survey of self-improving systems (Self-Harness held-in/held-out promotion, ADAS repeated evaluation with bootstrap intervals, frozen evaluators as in AlphaEvolve): the procedure is revised by the system, but the outer judgment stays outside the loop's reach. Cost scales as skills × repeats × (1 + candidates) inner runs; the command prints the upper bound and asks for confirmation unless `--yes`.

### Promotion lineage

Every `--apply` write appends a record to `.agents/results/skill-evolution/<skill>/promotions.jsonl` and writes a reviewable unified diff to `promotions/<candidate-hash>.patch` beside it. The record names the parent and candidate body hashes, the installed path, the backup path, and the evidence behind the write: validation and final-test lifts, the promotion decision, the fixture suite hash, the evaluator protocol revision, and the source/target runtimes. `oma skill promotions --skill <id>` lists the log.

`oma skill rollback --skill <id>` restores the body the most recent apply replaced. It refuses when the installed file no longer matches that apply's candidate (a later hand edit would be discarded), when the backup does not match the recorded parent, or when that apply was already rolled back; a successful rollback is appended to the same log with `reverses` pointing at the apply. For an OMA-owned skill the patch is the artifact to carry into the source repository or a user overlay, because `oma update` overwrites the installed copy; the record marks `omaOwned: true` so a later update is not mistaken for a regression.

`--apply` requires at least one accepted edit with no validation loss, `finalTest.passed: true`, and `promotion.eligible: true`. These gates require complete internal task coverage, a nonempty and fully measured candidate-specific negative-transfer sample, and enforced live isolation. A missing final test, incomplete measurements, or degraded compiler diagnostics prevent the write. A backup of the original `SKILL.md` is created before the atomic write, and the diff is printed for review.

Live evaluation can satisfy the isolation gate through the protected Claude or native Codex profile. Claude retains the HOME/target checks. Codex verifies that the ephemeral app-server thread has no instruction sources or tool environments before submitting the prompt. Other runtime profiles remain exploratory.

---

## Live mode

Live mode calls the real Maintainer and Proposer and re-runs live eval arms per epoch. It is expensive: every scored task has baseline and treatment calls, judge fixtures add grading calls, and the final test scores the original and candidate bodies. The preview reports an upper bound from the actual split, including the initial validation baseline, training and compiler calls, candidate validation calls, two final-test scores, and paired neighbor checks for every candidate plus the final candidate. Each call has a 120-second timeout. Protected Claude and Codex arms disable tools, automatic instruction discovery, MCP, and optimization memory.

```bash
# Cost preview + confirm
oma skill optimize --skill oma-scholar --live

# Skip confirmation
oma skill optimize --skill oma-scholar --live --yes

# Live opt, then apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes
```

The cost preview lists the upper bound of underlying model calls before any LLM call is made.

The Maintainer, Proposer, evaluation arms, and judges share a protected text transport in fresh temporary directories. Claude uses its restricted CLI profile. Codex uses the native `codex app-server` with the existing CLI login, selected model/provider, and reasoning effort; it does not substitute an API-key client or fall back to Claude. The Codex profile targets CLI 0.154.x on macOS/Linux with native file credential storage and an existing `auth.json`. Each call stages a private temporary `CODEX_HOME` that references the original config/auth files without copying credential contents. Native token refresh still uses the original auth file. Shared bootstrap state is excluded, and temporary state is cleaned up afterward. Keyring, auto, and ephemeral credential stores are currently unsupported. The thread contract is checked before sending model input; unsupported versions, storage modes, and protocol failures terminate the dispatch. Tools, startup instruction discovery, MCP access, and session persistence are disabled so compiler processes cannot read withheld fixtures through agent tools. Other compiler vendors fail explicitly until they have a verified transport.

The optimizer reports `proposed` for valid edits and `no-action` only for an explicit `NO_ACTION` response. Process/API failures become `dispatch-error`; malformed responses without valid edits become `parse-error`. These errors cannot become empty edit lists. If the Maintainer cannot provide validated patterns, it reports `degraded` with a dispatch or parsing reason; fallback patterns are excluded from persistent knowledge, and the run cannot promote a candidate. Evaluation failures appear in `diagnostics` and proposal gate records rather than learned rejection history.

---

## JSON output

```bash
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1 --json
```

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "baselineLift": 0.0,
  "finalLift": 1.0,
  "baselineTrainLift": 0.5,
  "finalTrainLift": 1.0,
  "epochCount": 1,
  "acceptedEdits": [
    { "op": "add", "anchor": "### When to use", "after": "\n- User asks for a summary of arxiv abstracts or DOI-linked documents." }
  ],
  "rejectedCount": 0,
  "applied": false,
  "diff": "--- a/SKILL.md\n+++ b/SKILL.md\n...",
  "_dryRun": true,
  "finalTest": {
    "baselineLift": 0.0,
    "candidateLift": 0.3333,
    "passed": true,
    "findings": [
      { "taskId": "oma-scholar-doi-summary", "original": 0, "candidate": 1 },
      { "taskId": "oma-scholar-citation-format", "original": 0, "candidate": 0 },
      { "taskId": "oma-scholar-claim-check", "original": 0, "candidate": 0 }
    ]
  },
  "promotion": { "eligible": true, "reasons": [] },
  "diagnostics": [],
  "budget": { "limit": null, "used": 42 },
  "_split": { "trainCount": 4, "valCount": 1, "testCount": 3 }
}
```

`ok` requires `(applied || (acceptedEdits.length > 0 && finalLift >= baselineLift))`, `finalTest.passed === true`, and `promotion.eligible === true`. `baselineTrainLift` and `finalTrainLift` report the held-in split alongside the validation lifts. The same condition gates `--apply`: an edit accepted for a training repair alone is written only when the final test also passes. A missing final test or promotion object cannot produce `ok: true`. The `_split` counts show the actual local fixture partition used for the run.

For example, an unmeasured candidate may produce this report excerpt:

```json
{
  "ok": false,
  "acceptedEdits": [],
  "rejectedCount": 0,
  "finalTest": { "baselineLift": 0.0, "candidateLift": 0.0, "passed": false },
  "promotion": {
    "eligible": false,
    "reasons": ["validation:inconclusive", "final-test-failed", "no-validated-candidate"]
  },
  "diagnostics": [
    {
      "stage": "validation",
      "status": "inconclusive",
      "message": "Candidate evaluation is incomplete; retry after repairing the evaluation conditions."
    }
  ]
}
```

Inspect `diagnostics`, `promotion.reasons`, and any `finalTest.blocker` before retrying. `rejectedCount` does not increase for an inconclusive proposal. A measured final-test failure can increase the run's audit rejection count while remaining excluded from persistent rejection knowledge.

---

## SSOT caveat for `oma-*` skills

Skills whose ID starts with `oma-` are owned by oh-my-agent and are **overwritten by `oma update`**. For these skills, `--apply` is discouraged — use `--dry-run` (the default), review the proposed diff, and upstream changes to the registry if the improvement is meaningful. For user-authored skills, `--apply` is safe.

The command prints a warning when the target skill is oma-owned:

```
[oma skill opt] warning: "oma-scholar" is an oma-owned skill. --apply output will be overwritten by oma update. Consider using --dry-run and upstreaming the diff instead.
```

---

## Overfitting guard

The Maintainer and Proposer receive TRAIN rollout evidence. Candidate selection uses the held-out VALIDATION split, and the runner owns the separate TEST split. Tool-free compiler execution prevents workspace access to those withheld fixtures and evaluators.

A final-test failure prevents application. Its outcome remains available for auditing, but neither final-test gate outcomes nor inconclusive proposals feed persistent optimization knowledge. The recorder, history reload, and semantic recall paths also exclude legacy final-test outcomes, so a later run cannot use prior final-test success or failure as training feedback.

---

## CI integration

Use evaluation replay for an offline CI check of existing candidate-specific recordings:

```bash
oma skill eval --skill oma-scholar --mock --neg-transfer --require-coverage --json
```

CLI optimization itself requires `--live`; it has no recorded-proposal replay adapter yet. Earlier guidance describing `oma skill optimize --mock` as a complete offline optimizer was incorrect. Move offline replay jobs to `oma skill eval --mock`, or explicitly enable live optimization and its model cost. For optimization runs, inspect JSON `ok` and `promotion.eligible`: exit zero also covers completed runs that found no promotable candidate.

Optimization exit codes:
- `0` — optimization completed (with or without improvement)
- `1` — invalid input or execution failure, including non-live CLI optimization, conflicting `--live --mock` flags, insufficient fixture count, unsupported compiler vendor, optimizer dispatch failure, or malformed optimizer output

---

## See also

- [Skill Utility Eval](/docs/guide/skill-eval) — authoring task fixtures, checker types, mock/live modes, the `_rollouts/` directory.
- [CLI Commands](/docs/cli-interfaces/commands) — flag reference for all skill management commands.
