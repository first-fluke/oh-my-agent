# Harness² external benchmark track

Opt-in harness for running
[`google-research/harness2`](https://github.com/google-research/harness2)
against OMA-related harness configurations.

Harness² ("Recursive Agent Harnessing for an Open World") optimizes the system
around a fixed model: prompts, guardrails, memory, tool guidance, subagents,
skills, scripts, and plugins. It ships three benchmarks:

| ID | Benchmark | Notes |
|---|---|---|
| `jb` | JobBench | Professional-work tasks |
| `lab` | LAB | Legal tasks; needs Pandoc + Poppler |
| `wb` | WorkBuddy-Bench | `office` / `web` / `code` subsets; needs Docker |

## Why this is a separate track

The generated [`benchmarks/README.md`](../../README.md) scoreboard uses Claude
Code + Opus 4.6, one prompt, five harnesses, and a 5-axis 100-point score.
Harness² uses OpenCode (default) or Codex, Vertex-hosted models, judge-based
task scoring, and its own task sets. Mixing the two would produce
apples-to-oranges numbers, so this track has its own reports and never edits
the main scoreboard.

**OMA is not a Harness² executor.** Harness² exposes `oc` (OpenCode) and `cx`
(Codex) substrates. Measuring OMA itself requires either a substrate adapter
(code-level; not a documented plugin API) or expressing OMA's prompts, skills,
and subagents as a Harness² harness configuration. The latter is only a partial
port: OMA's vendor hooks do not run under OpenCode or Codex. See
[`config/oma-harness/README.md`](config/oma-harness/README.md).

## Prerequisites

Benchmark runs require **Linux** (Debian/Ubuntu is documented upstream):

- Python 3.12 + `uv`
- Node.js 20+ and `npm`
- Google Cloud CLI (`gcloud`) with Vertex AI access for model-backed runs
- Docker Engine for `wb`
- `pandoc` + `poppler-utils` for `lab`
- `git`, `curl`, `unzip`, `ca-certificates`

The credential-free demo needs only Linux, Python 3.12, `uv`, and `git`.

### macOS

Benchmark runs are not supported on a macOS host. Use Docker, a Linux VM, or a
remote Linux runner. A minimal container setup:

```bash
docker run --rm -it \
  -v "$PWD:/repo" -w /repo \
  ghcr.io/astral-sh/uv:python3.12-bookworm-slim bash

apt-get update
apt-get install -y git curl unzip ca-certificates pandoc poppler-utils

./benchmarks/external/harness2/run.sh demo
```

For `wb`, mount the Docker socket or run on a Linux host with Docker Engine;
Docker-in-Docker is outside this scaffold.

[`run.sh`](run.sh) refuses `demo`/benchmark commands on non-Linux hosts and
prints this guidance. `--plan` works on any host.

## Quick start

The demo runs both recursion modes with deterministic editors and real Python
executions. It makes no model calls and needs no credentials.

```bash
./benchmarks/external/harness2/run.sh demo
```

Preview the commands without cloning or running anything:

```bash
./benchmarks/external/harness2/run.sh bench lab --k 1 --plan
```

A model-backed LAB run (requires Linux, Vertex auth, and an explicit network
policy):

```bash
./benchmarks/external/harness2/run.sh bench lab \
  --k 1 --mode parallel \
  --network-policy "blocked: huggingface.co,hf.co,github.com,raw.githubusercontent.com" \
  --yes
```

## Commands

```
run.sh demo  [--k N] [--plan]
run.sh setup <jb|lab|wb> [--subset office|web|code] [--substrate oc|cx] [--dry-run] [--plan]
run.sh check <jb|lab|wb> [--subset ...] [--substrate ...] [--plan]
run.sh run   <jb|lab|wb> [options] --network-policy TEXT --yes
run.sh judge <jb|lab|wb> [options] --yes
run.sh report <jb|lab|wb> [options]
run.sh bench <jb|lab|wb> [options] --network-policy TEXT --yes
```

Common options:

| Flag | Default | Meaning |
|---|---|---|
| `--k N` | `1` | Recursion budget (R=4k rollouts, P=3k improver sessions per task) |
| `--mode` | `parallel` | `parallel` / `sequential` (`agg` / `seq` accepted upstream) |
| `--seed N` | none | Stream-order seed; omit for sorted task order |
| `--substrate` | `oc` | `oc` (OpenCode) or `cx` (Codex) |
| `--subset` | none | `office` / `web` / `code`; `wb` only and required for runs |
| `--only-domains` | none | Comma list; `run` / `bench` only |
| `--max-tasks N` | none | Per-domain cap; `run` / `bench` only |
| `--workers N` | upstream | Domains run concurrently; `run` / `bench` only |
| `--dry-run` | off | Pass `--dry-run` to the upstream command (no model calls) |
| `--plan` | off | Print the planned commands and exit; safe on macOS |
| `--yes` | off | Required before model spend; `HARNESS2_YES=1` also works |

`bench` runs `setup` → `check` → `run` → `judge` → `report`. With `--dry-run`
it stops after the upstream dry-run and skips judging/reporting.

Per upstream requirements, judging and reporting must reuse the same benchmark,
substrate, subset, `--k`, `--mode`, and seed as the run.

## Reproducibility

Every non-plan invocation writes
`results/<run-id>/manifest.json` with:

- OMA commit, Harness² repository/ref/commit
- benchmark, subset, substrate, `k`, mode, seed, filters
- model IDs (solver / improver / judge) and Vertex project/region, if set
- network policy text
- command log, start/finish timestamps, exit code

Pin the upstream revision in CI or shared runs:

```bash
HARNESS2_REF=<commit-sha> ./benchmarks/external/harness2/run.sh bench lab ...
```

The default `HARNESS2_REF=main` is convenient but not reproducible on its own;
the recorded commit makes each run traceable.

## Security and network

Harness² does **not** restrict executor network access. JobBench publishes
task rubrics on Hugging Face, and upstream docs report a Codex rollout that
downloaded its own rubric. Before a graded run, block egress at the executor:

- `huggingface.co`, `hf.co`, `*.hf.co`
- `github.com`, `raw.githubusercontent.com`

Pass the policy you used via `--network-policy`; it is stored in the manifest.
Setup itself needs those hosts, so apply restrictions after setup.

Additional warnings:

- **Codex runs with its sandbox disabled.** Enforce restrictions at the network
  layer, not with a tool flag.
- **WorkBuddy + Codex bridge** may bind `0.0.0.0`. Restrict access to intended
  clients.
- Do not run model-backed benchmarks on a host with sensitive data or broad
  cloud credentials.
- `.env` is ignored; never commit Vertex keys or tokens.

## Results policy

Only these are intended for version control:

- `results/<run-id>/manifest.json`
- optional `results/<run-id>/report.txt`

Raw `runs/`, demo output, `dependencies/`, and the checkout under `.work/` are
gitignored. Do not auto-commit results from CI, and do not merge these numbers
into the main scoreboard.

## Cost

Cost depends on benchmark, model, `--k`, and judge rounds. Upstream describes
`--k` as 4k rollouts and 3k improver sessions per task, so raising it multiplies
spend. Start with `--max-tasks 1` and `--k 1`, keep a provider-side budget cap,
and use `--dry-run` to inspect the task stream first.

## Upstream

- Repository: <https://github.com/google-research/harness2>
- License: Apache 2.0
- Not an officially supported Google product.
- This scaffold tracks the upstream CLI surface as of 2026-10-20; re-check
  `--help` after changing `HARNESS2_REF`.