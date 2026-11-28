# Paired Harbor track: bare Codex vs Codex + OMA

Measures what installing OMA changes on a third-party benchmark, by running the
same tasks twice through the canonical [Harbor](https://docs.harborframework.com)
runner: once with Harbor's built-in `codex` agent (control) and once with the
same agent plus a real OMA install (treatment).

Status: **interim**. Four task pairs are scored; the run stopped on the Codex
subscription usage limit and resumes with the command under
[Resume](#resume). Four pairs support no conclusion in either direction.

## Why this track exists

| Existing evidence | Problem |
|---|---|
| [`benchmarks/README.md`](../../README.md) scoreboard | One self-authored prompt, one build per harness, LLM-judged. The visual rubric scores the anti-patterns that `oma-design` already instructs the agent to avoid |
| [`skillsbench`](../skillsbench/README.md), [`workbuddy`](../workbuddy/README.md) | Third-party tasks, but OMA arm only. Without a bare-agent arm the scores say nothing about OMA's contribution. Both use a host-agent path, not the canonical runner |
| `oma skill eval` | Fixtures for 7 of 34 skills; recorded rollouts predate current `SKILL.md` files, so offline replay reports `insufficient` for all 7 |

## Design

| | |
|---|---|
| Benchmark | Terminal-Bench 4.1.0 (`terminal-bench/terminal-bench@4.1.0`, 66 tasks), the current leaderboard version |
| Runner | Harbor 0.27.0, local Docker, prebuilt task and verifier images |
| Control | `-a codex`, Codex CLI 0.172.0 |
| Treatment | [`oma_agent.py`](oma_agent.py): the same Codex, then `cli/install.sh` (`OMA_INSTALL_NO_RUN=1`), `oma -y install --semantic-memory none`, `oma link codex` in the task's working directory, OMA 21.2.0 |
| Model | `gpt-6.2-sol`, Codex default reasoning effort, ChatGPT subscription login (`auth.json`) |
| Held equal | Task instruction (no harness hint), model, effort, Codex version, timeouts, verifier, resource limits |
| Pairing | Both arms run the same task at the same time, one trial per arm at a time |
| Order | Seed `20261125` shuffle, batches of 5; any prefix of batches is a random sample |
| Trials | 1 per task per arm in the first pass. The leaderboard requires 5 |

Two treatment-only allowances keep the install whole rather than partial:
the CUE binary is downloaded from its GitHub release because `install.sh`
installs it through Homebrew only, and Codex runs with
`--dangerously-bypass-hook-trust` plus a trusted-project entry so OMA's project
hooks and project config load.

### Local eligibility

Tasks never run with resource overrides. On an 8-CPU / 8.4 GB Docker VM, a task
is eligible only when its declared requirements let both arms run side by side:
`gpus = 0`, `cpus <= 4`, `memory_mb <= 4096`. That selects 33 of the 66 tasks.
The other 33 need a larger host or a Harbor cloud sandbox; `plan.json` lists
every task with its eligibility.

### Scoring rules (fixed before the first trial)

- A trial with a verifier reward is scored by it; pass means reward >= 1.
- An agent timeout or agent crash without a reward is a failed trial.
- Model quota, provider refusal, and environment or verifier errors make a
  trial invalid. A task counts only when both arms have a scored trial.
- A treatment trial whose OMA install failed is invalid in the primary result
  and a failure in the `oma_setup_failure_as_fail` sensitivity row.
- Reported: pass rate per arm with Wilson 95% intervals, the paired difference
  with a task-level bootstrap interval, an exact two-sided test on discordant
  tasks, mean verifier test-case fraction, time, tokens, and cost per arm.

## Interim result (2026-11-25)

[`results/tb41-20261125/summary.json`](results/tb41-20261125/summary.json),
[`plan.json`](results/tb41-20261125/plan.json).

| | Control | Treatment |
|---|---:|---:|
| Scored pairs | 4 | 4 |
| Passed | 0 | 2 |
| Mean verifier test-case fraction | 0.937 | 0.761 |
| Mean agent time | 225 s | 294 s |
| Mean input tokens | 0.53 M | 1.03 M |
| Mean cost (API-equivalent) | $0.23 | $0.31 |

- Paired difference +0.50, bootstrap 95% interval [0.00, 1.00], exact p = 0.5.
  The interval spans "no effect" to "always better": no conclusion.
- Treatment-only passes: `fin-saccr-rwa`, `music-harmony`. Both arms failed
  `react-lead-form` (166/167 test cases each) and `production-planning`
  (control 19/20, treatment 1/20: the treatment agent asked which rule should
  govern a conflict, judged the plan infeasible, and wrote nothing).
- OMA was active in all 4 treatment trials: `AGENTS.md` and the session hook
  loaded in 4, a skill was read in 3 (`oma-pdf`, `oma-db`, `oma-frontend`),
  Serena was called in 2.
- Across the 7 tasks whose agent phase completed, the first model call carried
  16.7k input tokens in control and 20.4k in treatment (+3.7k, +22%), and the
  treatment made about 35% more model calls.
- 12 trials are invalid: 6 hit the usage limit, 6 hit the verifier defect
  below. They are retried on resume.

## Local Docker note

OrbStack runs `docker exec` processes with umask 0000. Harbor creates
`/logs/verifier` through `docker exec`, so `/logs` becomes world-writable and
the hardened 4.1 verifiers refuse to write a reward (`Untrusted parent
directory of /logs/verifier`); the reference solution itself then scores
nothing. [`local_docker.py`](local_docker.py) prefixes Harbor's
directory-management commands with `umask 022`. With it the reference
solutions of the three affected tasks and one unaffected task all score 1.0.
It applies to both arms and is recorded in `plan.json` as an amendment.

## Run

Requires Docker, Python 3.12+, `uv`, and a Codex ChatGPT login. The runner
reads `$CODEX_HOME/auth.json` (default `~/.codex/auth.json`); Harbor uploads it
to each task container and deletes it after the trial. `OPENAI_API_KEY` and
`CODEX_API_KEY` are removed from the runner's environment so no API billing
occurs.

```bash
uv venv ~/.cache/oma-benchmarks/harbor-paired/venv --python 3.13
uv pip install --python ~/.cache/oma-benchmarks/harbor-paired/venv/bin/python 'harbor==0.27.0'
export HARBOR_BIN=~/.cache/oma-benchmarks/harbor-paired/venv/bin/harbor
RUN=~/.cache/oma-benchmarks/harbor-paired/<run-id>

python3 benchmarks/external/harbor-paired/run.py plan --run-dir "$RUN" \
  --dataset terminal-bench/terminal-bench@4.1.0 \
  --codex-version 0.172.0 --oma-version 21.2.0 --seed 20261125 \
  --batch-size 5 --concurrency 1 --max-cpus 4 --max-memory-mb 4096
python3 benchmarks/external/harbor-paired/run.py run --run-dir "$RUN" \
  --environment local_docker:Umask022Docker \
  --environment-reason "OrbStack docker exec umask 0000 breaks 4.1 verifiers"
python3 benchmarks/external/harbor-paired/analyze.py --run-dir "$RUN" \
  --output benchmarks/external/harbor-paired/results/<run-id>/summary.json
```

For Claude Code, plan with `--host claude --agent-version <claude version>`
(default model `anthropic/claude-sonnet-5-5`; arms `claude-code` and
`oma_agent:OmaClaudeCode`). The runner needs a subscription token from
`claude setup-token`, read from `CLAUDE_CODE_OAUTH_TOKEN` or
`~/.cache/oma-benchmarks/claude-oauth-token`. It removes `ANTHROPIC_API_KEY`
and the caller's other `CLAUDE_*` / `ANTHROPIC_*` variables, so trials do not
inherit the launching session's settings.

`plan` freezes the pins and task order; it refuses to overwrite an existing
plan. `run` skips finished batches, reruns interrupted ones, retries tasks left
without a scored trial, and stops at the first usage-limit failure. Raw jobs
and trajectories stay under `~/.cache/oma-benchmarks/`; only `plan.json` and
`summary.json` are tracked. Never pass `--upload`.

### Resume

```bash
export HARBOR_BIN=~/.cache/oma-benchmarks/harbor-paired/venv/bin/harbor
python3 benchmarks/external/harbor-paired/run.py run \
  --run-dir ~/.cache/oma-benchmarks/harbor-paired/tb41-20261125 \
  --environment local_docker:Umask022Docker \
  --environment-reason "OrbStack docker exec umask 0000 breaks 4.1 verifiers"
```

One pass over the 33 eligible tasks is about 66 trials: roughly 6 to 7 hours
and about $20 to $25 of API-equivalent usage against the subscription limit.

## Limits

- One trial per task per arm cannot separate OMA's effect from run-to-run
  variance on a single task; only the aggregate is interpretable, and at 33
  tasks the paired interval will still be roughly ±15 to ±20 points.
- Images are `linux/amd64` under emulation on Apple Silicon. Absolute scores
  are not leaderboard-comparable; the paired difference is the result.
- Half of 4.1.0 is ineligible locally, so this is not a full-benchmark score.
- Codex is one of OMA's hosts. A Claude Code arm needs
  `CLAUDE_CODE_OAUTH_TOKEN` (`claude setup-token`) and a matching agent class.
- A project install adds `.agents/`, `.codex/`, and `AGENTS.md` to the task's
  working directory. Any effect of that footprint on a verifier is counted as
  an OMA effect.
