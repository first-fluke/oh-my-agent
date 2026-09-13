---
title: "Incident Regression Cases"
sidebar_label: Incident Regression Cases
description: Capture an observed agent failure, preserve its evidence, and evaluate a candidate harness against an explicit regression contract.
---

# Incident Regression Cases

`oma harness incident` connects an observed failure to a regression case and the candidate evaluation that follows. It records observations separately from causal hypotheses. A failed process alone does not establish that the model caused the incident.

## Capture an incident

Save a JSON specification inside the project:

```json
{
  "schema_version": 1,
  "id": "incomplete-result",
  "summary": "The agent reported success while the result remained incomplete",
  "prompt": "Complete the task and update result.json",
  "agent": "backend",
  "observed": {
    "failure": "result.json still contained complete=false",
    "output": "success",
    "exit_code": 0
  },
  "initial_workspace": "initial",
  "expected_checks": [
    {
      "type": "file_json_equals",
      "path": "result.json",
      "pointer": "/complete",
      "value": true
    }
  ],
  "evidence_files": ["original-output.txt"],
  "dependencies": []
}
```

`initial_workspace`, `evidence_files`, and dependency fixture paths are relative to the specification file. A command check's `checker` path is project-relative. Check syntax matches [Harness Evaluation](./harness-eval.md). The initial directory must be a supplied pre-run task fixture without OMA/vendor instruction files; the harness under evaluation is injected separately.

```bash
oma harness incident capture --spec incidents/incomplete-result.json --json
oma harness incident show incomplete-result --json

# Import prompt and observable metadata from an existing local run
oma harness incident capture --spec incidents/run-failure.json --run <run-id> --json
```

`--run` refers to an existing `.agents/state/agent-runs/<run-id>.json`. It preserves the run/session identity, vendor, status, and original workspace fingerprint. A supplied prompt takes precedence over the run's recorded prompt. `source.trace_id` can link a reported incident to an external trace without fetching or uploading it.

The captured manifest lives at `.agents/results/incidents/<id>/incident.json`. It includes the initial snapshot when supplied, hashes of source evidence and checker files, acceptance checks, limitations, and a manifest hash. Existing IDs cannot be overwritten. Sensitive observation text is redacted; redaction is reported as a limit on exact replay. Snapshot collection rejects unsupported files and has file/count/total-size bounds. Evidence references preserve hashes and paths, not copies of every referenced source file.

The optional `cause` object has `category`, `hypothesis`, `confidence`, and `evidence`. Categories are `model`, `tool`, `config`, `context`, `application`, `evaluator`, and `unknown`. Omission leaves the cause `unknown`.

## Export and evaluate

```bash
oma harness incident export incomplete-result --json
oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --record-file incidents/comparison.json --yes --json
```

Export materializes the saved initial snapshot and a one-case exploratory suite. The manifest hash and source run/trace identity travel with the task into the evaluation and recording. Changes to exported files, prompt, agent, checks, or pinned checker sources invalidate reuse. Create a new incident ID to change the acceptance contract.

By default, `reproduce` starts a new live baseline/candidate comparison and records it. The normal live cost confirmation applies unless `--yes` is supplied. This command uses the harness task's configured agent vendor, including Codex; it does not impose the skill optimizer's protected compiler profile on task execution.

If no initial state was captured, `capture` and `show` still work, but runnable export and execution reproduction stop with a missing-evidence error. A historical run's current working tree cannot establish its original state. Even a separately supplied initial snapshot does not prove equivalence to that historical run; the report states this limitation.

## Choose the evidence operation

```bash
oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action inspect --record-file incidents/comparison.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action rescore --record-file incidents/comparison.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action fixture-replay --record-file incidents/comparison.json \
  --transcript incidents/tool-responses.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action rerun --record-file incidents/comparison.json --record --yes --json
```

| Operation | What happens |
|---|---|
| `inspect` | Reads and aggregates saved verdicts. No checks or agents run. |
| `rescore` | Applies current output/file checks to saved raw evidence. Old pass/fail fields are ignored. |
| `fixture-replay` | Replays supplied tool response data and file changes against the recorded initial state. No model or tool process runs. |
| `rerun` | Starts actual baseline/candidate agent calls from the recorded initial state. This incurs normal model usage. |

For a revised acceptance contract, create a separate harness suite and use `oma harness eval --action rescore` with the same suite/task/incident identity and prompt. An exported incident suite itself is immutable. See [recording and replay details](./harness-eval.md) for raw evidence requirements and the tool transcript schema.

Declare external dependencies as `{ "name": "service", "repeatability": "fixture|live|unavailable", "reason": "...", "fixture": "response.json" }`. A fixture dependency points to a file using the complete harness transcript schema, with the incident ID as `taskId`. Offline incident replay rejects live/unavailable dependencies, missing fixture files, changed fixture hashes, missing named responses, and requests/responses/file changes that differ from the pinned transcript. It still cannot attest that the author declared every external dependency. A live rerun also cannot guarantee that an external service behaves as it did historically.

Capture, export, and evaluation emit local `harness.incident.*` events that connect the incident, candidate/baseline hashes, execution mode, and corrected or regressed task IDs. A one-case incident is regression evidence, not a replacement for validation and final-test suites. Current harness profiles report `promotionReady: false`; these operations do not establish protected final-test isolation or automatically promote a candidate.
