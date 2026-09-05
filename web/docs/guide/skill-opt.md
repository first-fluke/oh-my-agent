---
title: "Skill Optimization"
description: How to use oma skill optimize for persistent, evidence-driven skill evolution with train, validation, and runner-owned final-test gates.
---

# Skill Optimization

`oma skill optimize` evolves a skill's `SKILL.md` to maximize its measured `utilityLift` as produced by `oma skill eval`. It separates raw rollout evidence, persistent scoped knowledge, and the executable skill. A Wiki Maintainer consolidates observable successes and failures; a Proposer uses that knowledge to emit bounded add/delete/replace edits. Candidates must improve held-out validation utility, and `--apply` additionally requires improvement on a runner-owned final-test split. At deployment there is no extra inference-time wiki lookup: the output remains a `SKILL.md`.

Research basis: Tang, L., Rashtchian, C., Ferng, C.-S., Tomkins, A., Juan, D.-C., & Vu, T. (2026). *WikiSkill: Compiling agent experience into persistent knowledge for skill evolution* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2608.27454

---

## Hard dependency: eval task fixtures

`oma skill optimize` cannot run without eval task fixtures. It requires at least **5 task fixtures** (`MIN_TASKS = 5`) in `.agents/eval/<skill>/`. If fewer are found, the command errors immediately:

```
[oma skill opt] no eval coverage for skill "oma-scholar": found 2 task fixture(s), need at least 5. Author tasks first — see web/docs/guide/skill-eval.md
```

See the [Skill Utility Eval guide](/docs/guide/skill-eval) for the `.agents/eval/<skill>/` directory convention, fixture schema, checker types, and how to seed rollouts for mock replay.

---

## How it works

Fixtures are split deterministically into **train**, **held-out validation**, and **runner-owned final-test** sets (60/20/20). The split is stable across runs — tasks are sorted by ID before splitting, so no randomness is involved.

For each epoch (up to `--max-epochs`, default 8):

1. **Score current best `SKILL.md` on the TRAIN split** — `oma skill eval` returns observable per-task prompts, outputs, and lift.
2. **Wiki Maintainer consolidates evidence** — up to five failures and three successes become evidence-linked patterns. Scoped patterns and prior gate outcomes are recalled from OMA's L1/L2/L3 memory system.
3. **Proposer emits K candidate edits** (up to `--edits-per-epoch`, default 4). Exact edits already in persistent rejection history are skipped.
4. **For each candidate edit:**
   - Apply the edit to an in-memory copy of `SKILL.md`.
   - Validate the candidate (frontmatter `name`/`description` must survive; body must parse).
   - Enforce the textual learning-rate budget: discard edits whose net character change exceeds `--lr` (default 600 chars).
   - Re-score the candidate on the **held-out validation split**.
5. **Accept the best validation candidate IFF** the validation lift strictly improves (`Δlift > 0`) AND no negative-transfer entry breaches the regression floor (`NEG_TRANSFER_FAIL = -0.1`). Every proposal gate is persisted.
6. **Early stop** after 2 consecutive epochs with no accepted edit (`OPT_EARLY_STOP_PATIENCE = 2`).
7. **Run the hidden final test after evolution.** The Maintainer and Proposer never see these tasks. A failed final test prevents `--apply` and records the validation winner as rejected knowledge.

The optimizer never edits the live `SKILL.md` during the loop — it always works on an in-memory candidate copy.

---

## Usage

```
oma skill optimize --skill <id>
               [--dry-run | --apply]
               [--mock | --live]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes]
               [--json] [--output <format>]
```

### Flags

| Flag | Default | Description |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | Skill ID to optimize (simple name, no path separators). |
| `--dry-run` | **yes (default)** | Propose edits and print the diff without changing `SKILL.md`; generated evidence and evolution events still persist. |
| `--apply` | — | Apply accepted edits to `SKILL.md` — backs up the original before an atomic write. Only runs when validation and final-test gates pass. |
| `--mock` | **yes (default)** | Replay recorded optimizer edits and eval verdicts from `_rollouts/`. Deterministic, offline. Safe for CI. |
| `--live` | — | Live LLM optimizer dispatch — incurs real model calls per epoch. Prints a cost preview and asks for confirmation unless `--yes`. |
| `--max-epochs <n>` | `8` | Maximum optimization epochs. |
| `--edits-per-epoch <k>` | `4` | Candidate edits the optimizer LLM proposes per epoch. |
| `--lr <chars>` | `600` | Textual learning-rate budget: maximum net character change per accepted edit. |
| `--yes` | — | Skip the cost-preview confirmation. Only meaningful with `--live`. |
| `--json` | — | Output as JSON for CI/CD. |
| `--output <format>` | `text` | Output format (`text` or `json`). |

---

## Minimal end-to-end example

```bash
# Propose edits (dry-run, mock mode — does not change SKILL.md, fully offline)
oma skill optimize --skill oma-scholar --mock --dry-run
```

Example output:

```
[oma skill opt] skill: oma-scholar, tasks: 8 (train: 4, val: 4), dry-run: true

Skill opt  (skill: oma-scholar)
  applied: false
  baselineLift: 18.5%  finalLift: 32.0%
  epochs: 3  acceptedEdits: 2  rejected: 6

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
oma skill optimize --skill oma-scholar --mock --apply
```

`--apply` writes only when the optimization found a strictly positive improvement on both the held-out validation and runner-owned final-test splits. A backup of the original `SKILL.md` is created before the atomic write. The diff is always printed so you can review what changed.

---

## Live mode

Live mode calls the real Maintainer and Proposer and re-runs live eval arms per epoch. It is expensive: every scored task has baseline and treatment calls, judge fixtures add grading calls, and the final test scores the original and candidate bodies. The preview reports an upper bound of underlying model calls from the actual split. Each call has a 120-second timeout; Claude eval arms run restricted with ambient tools, skills, MCP, and AgentMemory disabled.

```bash
# Cost preview + confirm
oma skill optimize --skill oma-scholar --live

# Skip confirmation
oma skill optimize --skill oma-scholar --live --yes

# Live opt, then apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes
```

The cost preview lists the upper bound of underlying model calls before any LLM call is made.

---

## JSON output

```bash
oma skill optimize --skill oma-scholar --json
```

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "baselineLift": 0.1850,
  "finalLift": 0.3200,
  "epochCount": 3,
  "acceptedEdits": [
    { "op": "add", "anchor": "### When to use", "after": "\n- User asks for a summary of arxiv abstracts or DOI-linked documents." }
  ],
  "rejectedCount": 6,
  "applied": false,
  "diff": "--- a/SKILL.md\n+++ b/SKILL.md\n...",
  "_dryRun": true,
  "finalTest": { "baselineLift": 0.10, "candidateLift": 0.25, "passed": true },
  "_split": { "trainCount": 4, "valCount": 1, "testCount": 3 }
}
```

`ok` is `true` only when validation improves and the runner-owned final test does not fail (or the candidate was applied).

---

## SSOT caveat for `oma-*` skills

Skills whose ID starts with `oma-` are owned by oh-my-agent and are **overwritten by `oma update`**. For these skills, `--apply` is discouraged — use `--dry-run` (the default), review the proposed diff, and upstream changes to the registry if the improvement is meaningful. For user-authored skills, `--apply` is safe.

The command prints a warning when the target skill is oma-owned:

```
[oma skill opt] warning: "oma-scholar" is an oma-owned skill. --apply output will be overwritten by oma update. Consider using --dry-run and upstreaming the diff instead.
```

---

## Overfitting guard

The Maintainer and Proposer see only TRAIN rollout evidence. Candidate selection uses the held-out VALIDATION split, while the runner-owned TEST split remains hidden until evolution ends. A validation winner that fails to improve the final test is not applied and is added to persistent rejection history.

---

## CI integration

In `--mock` mode, `oma skill optimize` is fully deterministic and offline — no LLM is called. Use it in CI to verify that a proposed skill diff still shows lift over the recorded rollouts:

```bash
oma skill optimize --skill oma-scholar --mock --json
```

Exit codes:
- `0` — optimization completed (with or without improvement)
- `1` — fewer than `MIN_TASKS` fixtures, or invalid `--skill` argument

---

## See also

- [Skill Utility Eval](/docs/guide/skill-eval) — authoring task fixtures, checker types, mock/live modes, the `_rollouts/` directory.
- [CLI Commands](/docs/cli-interfaces/commands) — flag reference for all skill management commands.
