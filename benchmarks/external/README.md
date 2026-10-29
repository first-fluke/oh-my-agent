# External benchmarks

This directory holds benchmark tracks that are **not** part of the generated
[`benchmarks/README.md`](../README.md) scoreboard.

The main scoreboard compares Claude Code harnesses on one prompt with a fixed
model. External tracks may use different models, executors, task sets, and
scoring, so their numbers are **not comparable** to the main table. Keep them
separate and link the methodology instead of merging scores.

| Track | What it measures | Report |
|---|---|---|
| Main harness benchmark | OMA vs vanilla / omc / ecc / superpowers on one build prompt | [`benchmarks/README.md`](../README.md) |
| Harness² external | Agent task success on JobBench / LAB / WorkBuddy-Bench via OpenCode or Codex | [`harness2/README.md`](harness2/README.md) |
| SkillsBench | All 87 v1.1 tasks with OMA/Codex; resumable per-task grading | [`skillsbench/README.md`](skillsbench/README.md) |
| WorkBuddy-Bench | All 260 Code / Office / Web / Security tasks with OMA/Codex | [`workbuddy/README.md`](workbuddy/README.md) |

External tracks are opt-in and manual. They are not release gates and do not
auto-update any README.

## Full SkillsBench and WorkBuddy run

The full inventories contain 347 tasks. View live coverage without changing
the running jobs:

```bash
python3 benchmarks/external/full_run.py status
```

The coordinator invokes one task at a time per benchmark, with both benchmarks
running in parallel. It preserves scored tasks and original grader artifacts,
loads runner fixes between tasks, and waits before retrying model quota errors.
An updated preparation runner can retry a SkillsBench setup failure before
any model was invoked. Other attempted failures keep their history across
controller reloads. `--workbuddy-first SUBSET/TASK` can prioritize a pending
task while retaining the rest of the inventory.
After preparing the upstream checkouts and inventories as described in each
track, start or resume the queues with:

```bash
python3 benchmarks/external/full_run.py run --retry-errors
```

Runtime state and private logs are under `~/.cache/oma-benchmarks/`. Separate
supervisor locks reject duplicate launches. Failed setup, unavailable resources,
model quota, and failed judging retain explicit statuses; they do not become
zero scores. `mean_of_scored_tasks` describes completed tasks only. Check
`all_scored` and coverage before treating a run as complete.

[`judge_bridge.py`](judge_bridge.py) supplies the WorkBuddy Office and Web
judges through the existing Codex login. It passes images to the model and
supports the native CBC tool-call loop. The recorded judge condition is
`gpt-6.1-sol` with low reasoning effort. Connection credentials and cached
judge prompts stay outside the repository.
Before each Office or Web task, the coordinator checks the judge's health and
recorded model. An unavailable judge pauses that queue as `waiting_judge`
before the solver starts.

The current run uses prebuilt containers with runtime environment preparation.
The task Dockerfiles and native graders remain the source of environment and
scoring requirements. The local desktop build gate requires a separate human
click and killed the first native image build after its dialog timed out.
Tasks that need those images stay queued as `waiting_build_gate`. Chat approval
for benchmark builds has been recorded; the desktop gate has not been bypassed.

The provider's automatic security review stopped the WorkBuddy Security work
with a `possible cybersecurity risk` response. Those 60 tasks retain
`waiting_provider_access` in the coordinator's coverage report. The other
tasks continue; no substitute model or alternate execution path is used to
retry the blocked security request.
