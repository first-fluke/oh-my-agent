---
title: "Harness Evaluation"
sidebar_label: Harness Evaluation
description: Evaluate a complete OMA harness overlay with paired, isolated repository tasks and deterministic artifact checks.
---

# Harness Evaluation

`oma harness eval` measures whether a candidate OMA harness improves a fixed target agent without changing that agent's model. It adapts the test-time evaluation pattern from [AI4AI at Test-Time: Strong-to-Weak Capability Transfer via Harnesses](https://arxiv.org/abs/2608.12307): keep the target model fixed, change the harness, and compare outcomes on the same tasks.

This command evaluates a larger unit than `oma skill eval`:

| Command | Treatment | Score target |
|:--------|:----------|:-------------|
| `oma skill eval` | One `SKILL.md` body | Agent output |
| `oma harness eval` | A scoped `.agents/` overlay | Files and output produced in a repository workspace |

Use skill eval to answer “does this skill help?” Use harness eval to answer “does this combination of skills, workflows, rules, and agent instructions make the fixed agent complete repository tasks more reliably?”

## Evaluation model

A live run evaluates each task as a paired experiment:

1. OMA captures the initial task fixture. A complete snapshot seeds both arms so they start from the same files, even if the source fixture changes during execution.
2. OMA copies the current `agents`, `config`, `rules`, `skills`, and `workflows` definitions into that workspace and projects them into the selected vendor format.
3. OMA repeats the setup in a second fresh workspace and applies the candidate overlay there.
4. The same primary agent, vendor route, prompt, write permissions, and timeout are used for both arms.
5. Deterministic checks inspect the resulting workspace and optional agent output. Trusted command checks run afterward in a fresh copy of the task artifacts.

The real project is never used as the arm's working directory. OMA captures raw output and final task artifacts before checks and temporary workspace cleanup. The selected vendor's own process sandbox remains the authority for access outside the working directory.

## Candidate layout

The candidate path is a directory containing a partial `.agents/` tree:

```text
candidate/
└── .agents/
    ├── agents/
    │   └── docs-curator.md
    ├── rules/
    │   └── documentation.md
    ├── skills/
    │   └── project-docs/
    │       └── SKILL.md
    └── workflows/
        └── docs-check.md
```

Only files below `.agents/agents`, `.agents/rules`, `.agents/skills`, and `.agents/workflows` are accepted. Hooks, evaluator fixtures, state, results, configuration files, symlinks, and vendor agent variants are rejected. Protected agent frontmatter fields such as `model`, `tools`, `effort`, and execution limits must match the baseline. An arm also fails if the running agent mutates protected `.agents/` definitions before scoring.

## Suite format

A suite is one YAML file plus one fixture directory per task:

```text
harness-eval/
├── suite.yaml
└── fixtures/
    ├── stale-api-doc/
    │   ├── docs/api.md
    │   └── src/session.ts
    └── missing-guide/
        ├── docs/
        └── src/feature.ts
```

```yaml
schema_version: 2
id: docs-harness
agent: docs-curator
tasks:
  - id: stale-api-doc
    partition: validation
    prompt: Update the API documentation to match the implementation.
    workspace: fixtures/stale-api-doc
    weight: 1
    checks:
      - type: file_contains
        path: docs/api.md
        value: openSession
      - type: file_not_contains
        path: docs/api.md
        value: createSession
  - id: missing-guide
    partition: final-test
    prompt: Write the missing guide for the feature in this fixture.
    workspace: fixtures/missing-guide
    checks:
      - type: file_exists
        path: docs/feature.md
```

Version 2 requires both `validation` and `final-test` tasks. Each task must declare its partition. Validation is the default; use `--partition final-test` for a separate final run after candidate selection. The two partitions cannot share or nest fixture directories. Keep recording files outside fixture directories, candidate overlays, and evaluator inputs; these locations are rejected to prevent later runs from seeing final checks. Version 1 suites still run as `exploratory`; they cannot be selected as final-test.

Task IDs must be unique. Fixture paths and check paths must remain inside the project and task workspace. Suites and fixtures must also stay outside the baseline definitions copied into every arm. Fixtures cannot contain symlinks or agent-harness control surfaces such as `.agents`, `.codex`, `.claude`, vendor skill directories, or root agent-instruction files. This prevents task data from shadowing either arm's controlled harness.

Generated dependency directories such as `node_modules` and `.venv` are not copied from the baseline harness. Commit deterministic helper source and dependency manifests in the skill; provision runtime dependencies in the task fixture when a check requires them.

### Check types

| Type | Fields | Pass condition |
|:-----|:-------|:---------------|
| `file_exists` | `path` | The path exists after the arm completes. |
| `file_not_exists` | `path` | The path does not exist. |
| `file_contains` | `path`, `value` | The file exists and contains the value. |
| `file_not_contains` | `path`, `value` | The file exists and does not contain the value. |
| `output_contains` | `value` | Captured agent output contains the value. |
| `output_not_contains` | `value` | Captured agent output does not contain the value. |
| `file_json_equals` | `path`, `value`, optional `pointer` | Parsed file JSON equals `value`, optionally at a JSON Pointer. |
| `output_json_equals` | `value`, optional `pointer` | Captured output is valid JSON and equals `value`, optionally at a JSON Pointer. |
| `command` | `argv`, `checker`, `timeout_ms`, `expected_exit_code` | The trusted subprocess completes within its timeout and returns the specified exit code. |

JSON assertions compare parsed values, including types; success prose cannot satisfy a JSON state assertion. `pointer` uses JSON Pointer syntax such as `/result/count` and defaults to the entire value.

Command checks are authored by the trusted suite owner:

```yaml
- type: command
  argv: [/absolute/path/to/node, "{checker}", state.json]
  checker: checkers/verify-state.mjs
  timeout_ms: 5000
  expected_exit_code: 0
```

`checker` resolves relative to the suite file. It must be a standalone regular source file stored outside every fixture, the candidate overlay, and baseline `.agents` definitions. `argv[0]` must be an absolute executable outside the project; `{checker}` must be a complete argument. OMA passes arguments directly without shell interpolation. Timeouts must be positive integers no greater than 300,000 milliseconds. Exit codes are integers from 0 through 255.

Before dispatch, OMA snapshots checker source bytes and hashes the evaluator definitions and executable. After dispatch, it copies task artifacts to a separate temporary workspace, writes the snapshotted checker outside those artifacts, and invokes it there. Every command gets a fresh copy; one checker cannot alter the next check's input. Generated harness projections are excluded, and artifact symlinks are rejected. Checker source changes during an arm fail that arm; modified source is never substituted for the snapshot. The checker should use fixed assertions against artifacts or application behavior, and should not delegate its verdict to tests or package scripts the candidate can edit.

Checks and checker paths are not added to the agent prompt or fixture. The selected task's input is necessarily visible during its run. This protects evaluator integrity and separates partitions; it does not prevent a same-user process from reading other host files.

## Run and record

Live mode issues two dispatches per selected task, prints a dispatch preview, and requires confirmation:

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --live --record \
  --record-file harness-eval/_runs/trial-1.json
```

Use `--yes` for non-interactive execution and `--timeout-minutes` to set the same per-arm wall-clock limit. Live execution requires a vendor that discovers harness files relative to the project workspace. OMA refuses HOME-based discovery because the baseline could see globally installed candidate content.

`--record` writes an immutable version 2 JSON record. The default location is `_runs/` next to the suite, with baseline/candidate hashes in the filename. Use a new `--record-file` for another live run; an existing destination is rejected before dispatch. Records preserve:

- suite identity, partition, prompt and fixture provenance, baseline/candidate hashes, and evaluator/checker/executable hashes;
- original output and its hash, including available diagnostic stdout from failed dispatches;
- initial and final artifact manifests with file bytes, per-file hashes, file/directory modes, and a manifest digest;
- checker references, arm outcomes, incident identity when supplied, and the source record hash for a rerun.

Task snapshots are bounded to 5 MiB per file, 32 MiB total, and 2,000 entries. Symlinks, special files, secret-bearing paths, unreadable files, and oversized data are recorded as omissions. Copied harness controls are excluded from final task artifacts. Incomplete snapshots remain explicit evidence limitations; they cannot supply a pinned rerun or satisfy file rescoring. Raw output can still support output-only checks when the original dispatch succeeded.

Records have their own integrity hash. A changed record or artifact hash is rejected. These hashes identify evidence; they do not attest process confinement or make a result promotion-ready.

## Reuse a recording

The command separates four actions:

| Action | Work performed | Agent/model calls |
|:-------|:---------------|:------------------|
| `inspect` | Aggregate stored arm verdicts after provenance validation. No checks run. | None |
| `rescore` | Apply current output/file checks to original raw output and artifact bytes. | None |
| `fixture-replay` | Match a supplied tool-request transcript, replay its fixture responses and file changes, then apply supported checks. | None |
| `rerun` | Run the configured agent in fresh workspaces seeded from recorded initial snapshots. | Two per selected task |

`--action inspect` is the default. `--mock` is an alias for inspection and cannot be combined with another action. Neither inspection nor fixture replay reruns an agent.

### Inspect stored verdicts

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action inspect \
  --record-file harness-eval/_runs/trial-1.json
```

Inspection requires the original suite, partition, evaluator, baseline, and candidate hashes to match. It displays the recorded scores without invoking checkers or reevaluating output. Version 1 records remain available for inspection when their required provenance matches. Older records missing partition/evaluator provenance cannot pass current CLI validation. Legacy verdicts cannot be relabeled as new raw evidence: collect a new live record for rescoring, fixture replay, or a pinned rerun.

### Rescore original evidence

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rescore \
  --record-file harness-eval/_runs/trial-1.json
```

Rescoring uses current checks and ignores the original `passed` values and check verdicts. The suite identity, task ID/prompt/incident identity, baseline, candidate, and selected partition must still match. Checker definitions may change; the new result describes how the original bytes perform against those checks. Changes to today's fixture files do not replace the recorded final artifacts.

Command checks are insufficient for offline rescoring because the record does not pin the external runtime and environment. Checks targeting excluded or incomplete artifacts are also insufficient. A failed original dispatch leaves diagnostic output, which cannot become a valid measurement through rescoring. Use a live rerun when current acceptance criteria require command execution.

### Replay tool fixtures

A transcript file contains one object, or an array of objects with unique task IDs. Supply one transcript per selected task:

```json
{
  "schemaVersion": 1,
  "taskId": "stale-api-doc",
  "requests": [
    { "tool": "documentation", "request": { "path": "docs/api.md" } }
  ],
  "steps": [
    {
      "tool": "documentation",
      "request": { "path": "docs/api.md" },
      "response": { "body": "Use openSession." },
      "writes": [
        { "path": "docs/api.md", "content": "Use openSession.\n" }
      ],
      "removes": []
    }
  ],
  "output": "Fixture completed.",
  "dependencies": [
    { "name": "documentation", "repeatability": "fixture" }
  ]
}
```

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action fixture-replay \
  --record-file harness-eval/_runs/trial-1.json \
  --transcript harness-eval/tool-fixtures.json
```

Requests must match the step sequence exactly by tool name and request value. `writes` and `removes` are optional relative task-file changes; they cannot escape the workspace or modify harness controls. Tool names are data, and no transcript command is executed. `output` is fixture data, required when an output check needs it.

Each declared dependency has a `name`, `repeatability` (`fixture`, `live`, or `unavailable`), and optional `reason` and `fixture` reference. A fixture dependency requires a matching step with that tool name. Live or unavailable dependencies make replay insufficient. The optional `fixture` field is descriptive; replay consumes the supplied steps rather than loading that path. Transcript replay validates declared dependencies and does not establish that every historical dependency was captured.

Both recorded arms must have the same complete initial snapshot. OMA applies the same transcript to each arm and runs current output/file checks. Command checks require a live rerun. These results show that the supplied fixture sequence can be replayed; they cannot establish candidate behavioral improvement or model reproducibility.

### Rerun the agent from pinned initial files

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rerun \
  --record-file harness-eval/_runs/trial-1.json
```

A rerun requires a matching suite/task identity and identical complete initial snapshots for both original arms. It starts actual agent calls using the current baseline, candidate, configured vendor/model route, and current checks. It does not use the original final artifacts as the starting state. A later edit to the source fixture therefore cannot silently change the recorded initial state.

Reruns have the same dispatch preview, confirmation, and timeout behavior as live runs. They can use a changed candidate; select the original source explicitly with `--record-file`. Add `--record` to save a new sibling file ending in `-rerun-<timestamp>.json`, linked to the source record hash. The original record is preserved.

Pinned files do not reproduce external service state, clock behavior, or model sampling. A rerun is fresh behavioral evidence under the stated conditions, not a claim that the original agent trajectory was deterministically reproduced.

### Report labels

Reports include `executionMode`, `evidenceStatus` (`complete`, `insufficient`, or `legacy`), `replayLimitations`, and a `sourceRecordHash` when available. Evidence completeness describes what the current action can inspect or evaluate. Inherited incident limitations remain visible even when the current file capture is complete. `promotionReady` remains `false` in every mode.

## Metrics and decision gate

Each task passes only when every check passes. Scores are weighted means across paired tasks:

```text
lift = candidateScore - baselineScore
```

OMA also reports:

- corrected tasks: baseline failed and candidate passed;
- regressed tasks: baseline passed and candidate failed;
- coverage: at least five paired, scoreable tasks are required.

The score decision is `pass` when lift is at least 5 percentage points and there are no regressions. Any regression fails the candidate. A non-negative lift below 5 points warns, and fewer than five paired tasks produces an `insufficient` decision. Add `--require-coverage` to make insufficient coverage exit non-zero in CI. A score is not evidence when an arm is missing, a record hash is stale, or a deterministic check is incomplete. Live dispatch and evaluator-integrity errors force a failing decision; they cannot count as successful lift. Rescoring and fixture replay omit arms with insufficient evidence from scoreable pairs and report an `insufficient` decision instead of treating missing evidence as a candidate regression.

A passing score does not establish promotion eligibility. Reports include the partition, evaluator hash, `promotionReady: false`, and explicit blockers. Legacy and validation runs lack final-test evidence. Current dispatch routes do not attest filesystem access confinement, so even a final-test run cannot claim protected final evaluation or authorize promotion. This field stays false until an execution provider can establish that boundary.

## Current boundary

Candidate overlays are produced externally; this command does not implement a builder or an automated `harness opt` loop. Artifact capture, offline rescoring, tool fixture replay, pinned-file reruns, partition selection, and snapshotted evaluators are available, but OS-level secrecy for held-out data, repeated stochastic trials, token accounting, and forced model pinning for nested subagent calls are not established. Until nested-call pinning exists, suites intended to measure one fixed model should avoid candidate workflows that spawn other configured agent roles.
