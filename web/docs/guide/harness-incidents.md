---
title: "Incident Regression Cases"
sidebar_label: Incident Regression Cases
description: Capture an observed agent failure, preserve its evidence, and evaluate a candidate harness against an explicit regression contract.
---

# Incident Regression Cases

`oma harness incident` connects an observed failure to a regression case and the candidate evaluation that follows. It records observations separately from causal hypotheses. A failed process alone does not establish that the model caused the incident.

## Find candidates

```bash
oma harness incident scan            # failed/blocked/partial runs with no captured incident
oma harness incident scan --json
oma harness incident scan --skeleton <run-id> > incidents/run-failure.json
```

The scan reads `.agents/state/agent-runs/`, keeps runs whose status is `failed`, `blocked`, or `partial`, and drops any run a captured incident already references through `source.runId`. `--skeleton` prints a specification for one run with the id, agent, source run, observed failure, exit code, and, when the runner preserved it, the tail of the agent's output filled in; `expected_checks` is left as a `TODO` because the correct behavior is a decision the scan cannot make. `oma agent spawn` and `oma agent parallel` keep the last 64 KiB of each run's log as `.agents/state/agent-runs/<run-id>.output.txt` and reference it from the run record, so `capture --run` imports that output as the observation when the specification omits one and `incident promote` can validate the derived fixture against it. Fill it in, then capture with `--run <run-id>` so the run's identity and workspace fingerprint are preserved.

## Capture a failed run automatically

```bash
oma harness feedback --scan-runs            # capture, promote, report
oma harness feedback --scan-runs --live     # and optimize the affected skills
```

A failed, blocked, or partial run whose task had a contract needs no hand-written specification. The expected behavior is the contract's acceptance criteria, decided before the run; the criteria covered by a failing verification receipt are the unmet set, or every criterion when the run never verified. The opt-agent rewrites the unmet criteria as a judge rubric (`PASS only if …`), the judge grades the run's own preserved output against it, and the incident is captured only when that output fails: a rubric the failure passes did not capture the failure. The specification is written under `.agents/results/incidents/_specs/<id>.json` and captured with the run's identity, carrying the rubric as an `output_judge` acceptance check. Runs without a preserved output, a prompt, or a contract are listed as not capturable with the reason.

`output_judge` is a graded contract. The mechanical harness evaluator reports it as not evaluated; its purpose is the skill regression fixture that `incident promote` derives from it with the same rubric.

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

`initial_workspace`, `evidence_files`, and dependency fixture paths are relative to the specification file. A command check's `checker` path is project-relative. Check syntax matches [Harness Evaluation](../harness-eval/). The initial directory must be a supplied pre-run task fixture without OMA/vendor instruction files; the harness under evaluation is injected separately.

```bash
oma harness incident capture --spec incidents/incomplete-result.json --json
oma harness incident show incomplete-result --json

# Import prompt and observable metadata from an existing local run
oma harness incident capture --spec incidents/run-failure.json --run <run-id> --json
```

`--run` refers to an existing `.agents/state/agent-runs/<run-id>.json`. It preserves the run/session identity, vendor, status, and original workspace fingerprint. A supplied prompt takes precedence over the run's recorded prompt. `source.trace_id` can link a reported incident to an external trace without fetching or uploading it.

The captured manifest lives at `.agents/results/incidents/<id>/incident.json`. It includes the initial snapshot when supplied, hashes of source evidence and checker files, acceptance checks, limitations, and a manifest hash. Existing IDs cannot be overwritten. Sensitive observation text is redacted; redaction is reported as a limit on exact replay. Snapshot collection rejects unsupported files and has file/count/total-size bounds. Evidence references preserve hashes and paths, not copies of every referenced source file.

The optional `cause` object has `category`, `hypothesis`, `confidence`, and `evidence`. Categories are `model`, `tool`, `config`, `context`, `application`, `evaluator`, and `unknown`. Omission leaves the cause `unknown`.

## Promote to a skill fixture

```bash
oma harness incident promote <id> [--skill <id>] [--draft] [--force] --json
```

A captured incident becomes a regression fixture for the skill the failing agent exercised, so `oma skill optimize` can repair the skill against it. The skill is chosen by routing the incident prompt against the installed skill catalog with the same description-level probe `oma skill eval --routing` uses (one model call); when routing picks nothing, the first `skills:` entry of the agent definition under `.agents/agents/<agent>.md` is used, else the installed skill named `oma-<agent>`. `--skill` overrides, and the promotion records which of the three decided (`attribution`). The fixture is written to `.agents/eval/<skill>/incident-<id>.yaml` with `group: incident-<id>` so it never straddles the train/validation/test split, and the promotion is recorded next to the incident as `promotion.json`. An incident is promoted once.

The checker comes from the acceptance checks. When every check is `output_contains`, the fixture is a deterministic `assert`. Otherwise the checks cannot run in a skill evaluation (there are no files or commands), so `--draft` asks the opt-agent for a judge rubric that starts with `PASS only if` and names the observed failure. Either way the fixture is admitted only when the recorded failing output fails it: an assert the observed output already satisfies, or a drafted rubric the judge passes on that output, is refused because it is not a regression case. An incident without observed output cannot be validated and needs `--force`, which is recorded as a limitation.

## Close the loop

```bash
oma harness feedback                 # promote every unpromoted incident, report what changed
oma harness feedback --live          # also run one optimization epoch per affected skill (dry-run)
oma harness feedback --apply --json  # write edits that pass every gate
```

`feedback` is the deployment feedback loop in one command: with `--scan-runs` every uncaptured failed run with a contract is captured first (see above), then every captured incident without a fixture is promoted (drafting rubrics when needed), affected skills are grouped, and with `--live` each is optimized once against its enlarged suite under the normal gates (held-in/held-out acceptance, confirmed negative transfer, runner-owned final test). The report under `.agents/results/feedback/feedback-<ts>.json` lists promotions, skipped incidents with reasons, and each skill's outcome with the diff, so the chain from an observed failure to a candidate edit is one auditable record. For scheduled operation with a shared model-call allowance, persistent retries, and project skill overlays, enable [project harness evolution](./harness-evolution.md). The next session's state snapshot announces applied changes.

What stays a human decision: a run without a task contract has no recorded expected behavior, so it is listed by `incident scan` and captured only through a specification; `--skeleton` drafts one.

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

For a revised acceptance contract, create a separate harness suite and use `oma harness eval --action rescore` with the same suite/task/incident identity and prompt. An exported incident suite itself is immutable. See [recording and replay details](../harness-eval/) for raw evidence requirements and the tool transcript schema.

Declare external dependencies as `{ "name": "service", "repeatability": "fixture|live|unavailable", "reason": "...", "fixture": "response.json" }`. A fixture dependency points to a file using the complete harness transcript schema, with the incident ID as `taskId`. Offline incident replay rejects live/unavailable dependencies, missing fixture files, changed fixture hashes, missing named responses, and requests/responses/file changes that differ from the pinned transcript. It still cannot attest that the author declared every external dependency. A live rerun also cannot guarantee that an external service behaves as it did historically.

Capture, export, and evaluation emit local `harness.incident.*` events that connect the incident, candidate/baseline hashes, execution mode, and corrected or regressed task IDs. A one-case incident is regression evidence, not a replacement for validation and final-test suites. Current harness profiles report `promotionReady: false`; these operations do not establish protected final-test isolation or automatically promote a candidate.
