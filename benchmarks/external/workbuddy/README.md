# WorkBuddy Bench

Provides a resumable OMA/Codex runner for the 260-task inventory. Code, Office,
and Web use the official graders. Security is retained as unexecuted with
`waiting_provider_access`. The standalone `run` command below runs the original
`bug_fix-easy-a_crash_in_local` Code smoke task. These runtime overrides do not
produce a canonical Harbor submission or compare OMA against a baseline agent.

## Queue pass completed: 2026-10-22

All 200 permitted Code, Web, and Office tasks received native grades. There are
no remaining environment or judge errors in those subsets, and their task
containers were removed. See the [final receipt](receipts/2026-10-22-full-pass.json)
for each task's score and evidence hashes.

| Subset | Graded | Mean native score |
| --- | ---: | ---: |
| Code | 80/80 | 0.7931 |
| Web | 70/70 | 0.5700 |
| Office | 50/50 | 0.8091 |
| Graded tasks | 200/200 | 0.7190 |

The remaining 60 tasks were not executed because of the provider access block.
The 200-task mean is not a score for the full 260-task benchmark. Runtime
metadata confirms `gpt-6.1-sol/high` and OMA definitions 20.10.3 for 194 tasks;
the six initial Code grades predate that metadata capture. Their scores are
preserved with this limitation recorded. OMA hook execution remains unverified.

## Run

Requires an arm64 Docker host, Python 3.12+, `uv`, Git, and an existing Codex
ChatGPT login. Docker must be running. The runner reads `CODEX_HOME/auth.json`
(default `~/.codex/auth.json`) through a read-only container mount; it never
extracts tokens or writes credentials into the checkout.

```bash
./benchmarks/external/workbuddy/run.sh prepare
./benchmarks/external/workbuddy/run.sh run
```

Downloads, dependencies, raw trajectories, patches, and logs default to
`~/.cache/oma-benchmarks/`. `--cache` and `--output` override the destinations.
Do not point them inside version-controlled source. `--keep-container` retains
the isolated runtime for inspection. After a completed agent run, collect or
repeat grading without another model call:

```bash
./benchmarks/external/workbuddy/run.sh collect \
  --container <retained-container> --output /tmp/workbuddy-recheck
```

The Code archive is about 191 MiB. The runner checks its published SHA256,
validates npm archive integrity and Node's published checksum, installs Python
dependencies using binary wheels only, and uses prebuilt native binaries.
It never builds images or packages. It pins the upstream framework commit and
stops if an existing checkout has a different revision.

## Evaluation boundary

The task workspace is extracted inside an isolated `python:3.12-slim` container.
`oma -y install --semantic-memory none` and `oma link codex` install the OMA
configuration and skills. The normal Codex CLI receives the official task
instruction plus a harness instruction to use OMA's debug skill and avoid
workflows and builds. Existing ChatGPT subscription authentication supplies the
model; the CLI chooses its default model.

The task's grading tests and gold patch are copied into the container only
after the agent exits. The verifier command comes directly from the official
dataset plugin's registry, and the official scorer computes the result. The
same tests are also run with the original production file restored, then the
agent's source is restored. This checks that the task's original defect fails
the grader.

The runtime differs from the upstream Harbor path:

- Packages are installed in a fresh running container rather than a built task image.
- Native arm64 Node 24.11.1 replaces the task Dockerfile's x64 Node 20.18.1.
- Python imports source through `PYTHONPATH=/workspace` rather than building an editable package.
- Codex uses ChatGPT authentication; upstream's provided harnesses use API credentials and separate images.
- OMA hook execution is unverified. The measured configuration is OMA skills and instructions.

The official full-benchmark launcher and image requirements are documented in
[WorkBuddy Bench](https://github.com/Tencent/workbuddy-bench) and its
[harness authoring guide](https://github.com/Tencent/workbuddy-bench/blob/main/configs/harnesses/HARNESS_AUTHORING.md).
The dataset uses the [Tencent license](https://github.com/Tencent/workbuddy-bench/blob/main/LICENSE).

## Verified smoke: 2026-10-21

See [receipt.json](receipts/2026-10-21.json). The agent read OMA's debug skill and
execution policy, changed `asgiref/local.py`, added regression tests, and exited
successfully. The official hidden tests passed **3/3**, with native score
**1.0**; the original production file passed **0/3** (3 failed). This establishes execution
and grading for this task, not an aggregate benchmark score or OMA improvement.

The agent also ran the repository's full tests: 40 passed and 2 failed. It
reproduced those two failures with the original implementation; they come from
old `asyncio.wait` tests under Python 3.12. They are separate from the three
official benchmark tests.

The recorded runtime used OMA CLI 20.10.2, installed skill snapshot 20.10.3,
Codex CLI 0.163.0, and the CLI's default `gpt-6.1-sol` model. The installer fetches
the current published skill snapshot, so subsequent runs must compare the
snapshot version and hashes in their receipts.

## Full suite

The suite inventory contains all **260 tasks: Code 80, Web 70, Office 50,
Security 60**. Dataset archives are checked against the published SHA256 values.
The suite freezes the public OMA 20.10.3 definitions in the cache and reuses
them, pins the solving model to `gpt-6.1-sol` with `high` effort, and records
actual model metadata, usage, and instruction/skill hashes per task.

```bash
./benchmarks/external/workbuddy/run.sh suite run \
  --output ~/.cache/oma-benchmarks/workbuddy-full \
  --judge-connection /absolute/path/to/private-judge-connection.json
./benchmarks/external/workbuddy/run.sh suite status \
  --output ~/.cache/oma-benchmarks/workbuddy-full
```

The private judge connection uses `host_url`, `container_url`, `api_key`, and
`model` fields. Web requires an OpenAI-compatible backend supporting text,
images, streaming, and tool calls for its native CBC agent judge. Configuring
the connection also enables Office's native LLM rubrics. Code's optional
whitebox post-judge stays disabled. Judge requests allow 600 seconds and Office
rubrics run one at a time; these settings are recorded as evaluation conditions.

`manifest.json` retains every task. Each task also has a live
`<subset>/<task>/status.json`. A scored task has a finite score in `[0, 1]`;
environment, model, judge, timeout, and build-gate failures have `score: null`.
Successful tasks are reused on resume. `--retry-errors` retries other terminal
states and archives the previous attempt. A model quota failure stops the batch.
`--task <exact-name> --max-tasks 1` supports an outer controller without shrinking
the inventory. A `STOP_AFTER_TASK` file in the output directory stops a newly
launched suite at its next task boundary.

A completed Code solve can be graded again without another model call. The
runner checks the saved successful agent exit, restores the exact patch into a
fresh environment, and records its hash and `model_invoked: false`:

```bash
./benchmarks/external/workbuddy/run.sh suite regrade \
  --subsets code --task <exact-task-name> \
  --attempt /absolute/path/to/completed/task-output \
  --output ~/.cache/oma-benchmarks/workbuddy-regrade --max-tasks 1
```

For pytest source tasks, the runtime restores generated version metadata from
the checksum-verified official wheel matching the Dockerfile's declared
version. Package dependencies, including declared build tools, use binary
wheels; the runtime does not invoke an editable package build.

To verify a task's preparation without starting its solver or grader, use a
separate output directory:

```bash
./benchmarks/external/workbuddy/run.sh suite check-env \
  --subsets code --task <exact-task-name> \
  --output ~/.cache/oma-benchmarks/workbuddy-environment-check --max-tasks 1
```

This reports `environment_ready` with no benchmark score. Optional project
dependencies are installed only for extras explicitly requested by the official
Dockerfile. Chained official compatibility writes are preserved.

Code, Office, and Web currently use the prebuilt-base runtime override described
above, with the official compatibility scaffolds retained. Grading calls the
unchanged `CompositeVerifier`, including its dataset-specific preparation and
scoring. Tests and judge inputs arrive only after solving; old/agent-created
reward files are cleared before grading.

The runtime reads every chained dependency installation and preserves original
requirements files and their version pins. It restores declared source console
entry points and the coverage task's official ZIP test-fixture setup without an
editable package build.

Serena's Python dependencies run in a separate environment so they cannot add
packages to the task's Python environment. Literal `setup.py` dependency and
console declarations are read without executing the installer. Legacy FastAPI
uses its declared AnyIO test-backend range; per-task receipts record this
compatibility condition. Global npm installs use the writable `/usr/local`
prefix, matching the official Dockerfile and allowing native CBC preparation.
Nested shell dependency commands and lockfile pins are retained. Static PEP 621
distribution metadata is restored when source imports require it. The
source-only HTTPPretty dependency uses Debian's matching prebuilt package;
these environment conditions are recorded without running a package backend.

Security remains in the inventory without scores. The provider's automatic
security review stopped that work with a `possible cybersecurity risk` response.
The full coordinator's coverage report marks those 60 tasks as
`waiting_provider_access`. The suite refuses to execute them, including with
`--retry-errors`. Retained implementation
files are not evidence that those tasks ran. No alternate model or execution
route is used to retry the blocked request.

Benchmark builds have been authorized for this session. The machine's separate
build-gate GUI still requires physical approval for task images that need it.
Affected permitted tasks remain unscored as `waiting_build_gate`. The runner
does not change or bypass the machine's gate. This queue pass has no remaining
build-gate failures in the 200 graded tasks.
