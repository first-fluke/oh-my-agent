---
title: "Harness Evaluation"
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

Every task runs as a paired experiment:

1. OMA copies the task fixture into a fresh baseline workspace.
2. OMA copies the current `agents`, `config`, `rules`, `skills`, and `workflows` definitions into that workspace and projects them into the selected vendor format.
3. OMA repeats the setup in a second fresh workspace and applies the candidate overlay there.
4. The same primary agent, vendor route, prompt, write permissions, and timeout are used for both arms.
5. Deterministic checks inspect the resulting workspace and optional agent output.

The real project is never used as the arm's working directory. Temporary arm workspaces are removed after scoring; the selected vendor's own process sandbox remains the authority for access outside that working directory.

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
schema_version: 1
id: docs-harness
agent: docs-curator
tasks:
  - id: stale-api-doc
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
```

Task IDs must be unique. Fixture paths and check paths must remain inside the project and task workspace. Fixtures cannot contain symlinks or agent-harness control surfaces such as `.agents`, `.codex`, `.claude`, vendor skill directories, or root agent-instruction files. This prevents task data from shadowing either arm's controlled harness.

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

Artifact checks are intentionally deterministic. The first version does not run mutable package scripts as judges, because an evaluated agent could edit those scripts or their tests and invalidate the evaluator.

## Run and record

Live mode issues two dispatches per task, prints a cost preview, and requires confirmation:

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --live --record
```

Use `--yes` for non-interactive execution and `--timeout-minutes` to set the identical per-arm wall-clock limit. Live execution is available only when the selected vendor discovers harness files relative to the project workspace. OMA refuses HOME-based discovery because the baseline could see globally installed candidate content.

`--record` writes a hash-addressed JSON record below `_runs/` next to the suite. The record binds the results to three inputs:

- the suite, prompts, checks, and fixture contents;
- the current baseline harness definitions;
- the candidate overlay contents.

Mock mode is the default and performs no model calls. It only replays a record when all three hashes still match:

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --mock --require-coverage
```

## Metrics and decision gate

Each task passes only when every check passes. Scores are weighted means across paired tasks:

```text
lift = candidateScore - baselineScore
```

OMA also reports:

- corrected tasks: baseline failed and candidate passed;
- regressed tasks: baseline passed and candidate failed;
- coverage: at least five paired, scoreable tasks are required.

The candidate passes when lift is at least 5 percentage points and there are no regressions. Any regression fails the candidate. A non-negative lift below 5 points warns, and fewer than five paired tasks produces an `insufficient` decision. Add `--require-coverage` to make insufficient coverage exit non-zero in CI.

## Current boundary

This is an evaluation foundation, not automatic harness optimization. A builder can produce candidate overlays externally, then use this command as the acceptance gate. Hidden final-test suites, repeated stochastic trials, trusted external test runners, token accounting, forced model pinning for nested subagent calls, and an automated `harness opt` loop remain future extensions. Until nested-call pinning exists, suites intended to measure one fixed model should avoid candidate workflows that spawn other configured agent roles.
