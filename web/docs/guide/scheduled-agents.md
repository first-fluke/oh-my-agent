---
title: "Guide: Scheduled Agents"
sidebar_label: Scheduled Agents
description: Run any agent on a recurring or one-shot schedule using the OS scheduler (macOS launchd, Linux systemd, Windows Task Scheduler) without requiring a vendor runtime to stay open.
---

# Scheduled Agents

`oma schedule` lets you run any agent on a time-based schedule, independent of which AI vendor runtime (Claude Code, Codex, Antigravity, Cursor, Qwen, Grok, opencode, or pi) is currently open. The OS scheduler fires the job, and the job calls `oma agent spawn` headlessly using the vendor credentials already cached on disk.

---

## How it works

When you run `oma schedule create`, oma:

1. Writes a job record to the global manifest at `~/.oma/schedule/schedules.json`.
2. Registers the job with the OS scheduler (macOS launchd, Linux systemd --user, or Windows Task Scheduler). The OS job calls `oma schedule run <id>` at the configured cron interval.
3. At fire time, `oma schedule run` looks up the job, injects any captured environment variables, calls `oma agent spawn`, and writes the run log to `~/.oma/schedule/runs/<id>/<timestamp>.md`.

The manifest is the single source of truth (SSOT). The OS scheduler is just an executor. All state — job definitions, run logs, last-fired timestamps — lives under `~/.oma/schedule/`.

### Global-only by design

`oma schedule` is intentionally user-global, not per-project. Because the OS scheduler runs jobs independently of the current working directory, a single central registry is the only practical SSOT. Each job records the project it belongs to via `workspace` and `projectLabel`, so `schedule list` can group jobs by project even though the registry is shared.

There is no `--global` flag; schedule commands use `$OMA_HOME/schedule/`, defaulting to `~/.oma/schedule/`. Registered OS jobs receive the resolved home explicitly so they open the same registry without a login shell. Run `oma schedule sync` after moving the home to refresh job commands and log paths.

### OS backends

| Platform | Primary backend | Fallback | stderr of `oma schedule run` |
|---|---|---|---|
| macOS | launchd (plist + `launchctl`) | — | `runs/<id>/stderr.log` |
| Linux | systemd --user timer | user `crontab` when `systemctl --user` is unavailable | `runs/<id>/stderr.log` (systemd); not saved (crontab) |
| Windows | Task Scheduler (`schtasks`) | — | Not saved |

oma selects the available backend automatically. You do not configure this manually.

---

## Comparison: schedule vs ralph vs Claude /loop

These three features are sometimes confused because they all involve "running again later." They are different concepts.

| Feature | Trigger | Scope | Survives vendor restart? |
|---|---|---|---|
| `oma schedule` | Time-based (cron) | Cross-vendor, OS-level | Yes — OS scheduler fires even when no vendor runtime is open |
| `ralph` | Completion-based (Stop hook loop) | Cross-vendor | Only while the current session is active; ralph is a "keep going until done" loop, not a timer |
| Claude Code `/loop` | Time-based (in-process cron) | Claude runtime only | No — only fires while Claude Code is running |

Use `schedule` when you want a job to run at 9 AM every weekday. Use `ralph` when you want an agent to keep iterating until it meets a quality bar. Use `/loop` only when you are already inside Claude Code and do not need cross-vendor portability.

---

## Quick start

```bash
# Run the qa-reviewer agent every weekday at 9 AM
oma schedule create qa-reviewer "Run QA review on the latest changes" --cron "0 9 * * 1-5"

# Run a backend agent every 2 hours using natural-language syntax
oma schedule create backend "Check for slow queries in the API logs" --every "2h"

# One-shot: run at the next 15:00 and remove the job after a successful run
oma schedule create pm "Generate weekly plan" --cron "0 15 * * *" --once

# Check what is scheduled
oma schedule list

# Remove a job
oma schedule delete sch_abcdefgh2345
```

`schedule create` prints the job ID that `run` and `delete` need:

```text
Scheduled job registered: sch_abcdefgh2345
  Agent:   qa-reviewer
  Cron:    0 9 * * 1-5
  Vendor:  auto
  Project: my-project
  Once:    false
```

Fire a new job once by hand to check the prompt and vendor credentials before its first scheduled run:

```bash
oma schedule run sch_abcdefgh2345
ls ~/.oma/schedule/runs/sch_abcdefgh2345/
```

---

## Commands

### schedule create

Register a scheduled agent job.

```bash
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <Nd>] [--env <KEY1,KEY2>] [--dry-run] [--accept-rounded]
```

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `agent-id` | Yes | Agent passed to `oma agent spawn`: a canonical ID (`orchestrator`, `architecture`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `qa`, `docs`, `tf-infra`, `explore`) or a definition name such as `qa-reviewer` or `backend-engineer`. It is not validated at registration, so run `oma schedule run <id>` once after creating the job. |
| `prompt` | Yes | Task description passed to the agent at run time |

**Options:**

| Flag | Description |
|---|---|
| `--cron "<expr>"` | 5-field cron expression (e.g. `"0 9 * * *"` for 9 AM daily). Mutually exclusive with `--every`. |
| `--every "<phrase>"` | Natural-language interval (see table below). Mutually exclusive with `--cron`. |
| `--vendor <vendor>` | CLI vendor override passed to `oma agent spawn`: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. Defaults to auto-detect from `oma-config.yaml`. |
| `-w, --workspace <path>` | Working directory for the agent at run time. Defaults to the current working directory at registration time. |
| `--once` | One-shot mode: the job removes itself after the first run that exits 0. A failed run keeps the job, so it fires again at the next cron match. Default is recurring. |
| `--expires-after <duration>` | Remove a recurring job at its first fire after this age. Use whole days with a unit, such as `30d`; a bare number (`30`) is rejected. `0` means indefinite (default). |
| `--env <KEY1,KEY2>` | Capture the named environment variables (only those listed) into `~/.oma/schedule/env/<id>` (permissions 0600) for injection at run time. Secrets are never written to the manifest itself. |
| `--dry-run` | Print the resolved cron and any rounding note without writing a scheduler job, manifest entry, or environment file. |
| `--accept-rounded` | Required to register a natural-language interval after OMA rounds it to a cron-expressible step. Preview it first with `--dry-run`. |

Exactly one of `--cron` or `--every` is required.

#### --every: natural-language intervals

`--every` accepts the following phrase forms. oma parses them into a 5-field cron expression and prints a note when the requested interval is rounded to the nearest cron-expressible step.

| Phrase form | Example | Notes |
|---|---|---|
| Compact unit | `5m`, `2h`, `1d` | Minute, hour, day |
| Every + compact | `every 20m`, `every 2h` | |
| Every + word | `every 5 minutes`, `every 2 hours` | Plural unit words accepted |
| Seconds | `30s` | Ceiled to 1-minute minimum; cron cannot express sub-minute intervals |

Non-divisible intervals are rounded to the nearest clean step and a note is printed. For example, `--every 7m` rounds to `6m` (`*/6`) because 7 does not divide 60.

Preview a rounded interval before registering it:

```bash
oma schedule create backend "Check logs" --every 7m --dry-run
# Preview: requested interval resolves to */6 * * * *
# Note: Requested every 7m -- 7 is not a divisor of 60; rounded to every 6m (*/6 * * * *).
# Preview only: no OS job, manifest entry, or env file was written.
oma schedule create backend "Check logs" --every 7m --accept-rounded
```

If the preview is omitted, the command refuses to register a rounded interval. Schedules use the local time rules of the selected OS scheduler.

**Examples:**

```bash
# Exact cron expression (full control)
oma schedule create backend "Optimize slow queries" --cron "0 */4 * * *"

# Natural language (oma converts to cron)
oma schedule create frontend "Run lighthouse audit" --every "every 6 hours"
# Converts to 0 */6 * * * (6 divides 24 cleanly, so no rounding note)

# Pin to a vendor and a workspace
oma schedule create qa "Run security scan" --cron "0 2 * * 0" --vendor claude -w /home/user/myproject

# One-shot job
oma schedule create pm "Generate sprint retrospective" --cron "0 17 * * 5" --once

# Capture specific env vars for the job
oma schedule create backend "Sync external API data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

---

### schedule list

List all scheduled jobs across all projects, grouped by project, with OS drift state.

```bash
oma schedule list [--json]
```

**Options:**

| Flag | Description |
|---|---|
| `--json` | Output machine-readable JSON |

**Drift states:**

| State | Meaning |
|---|---|
| `synced` | Job exists in both manifest and OS scheduler |
| `stale` | Job is registered, but the OS registration invokes a command the current CLI no longer accepts (for example `schedule:run <id>` written before the command-path standardization). Run `schedule sync` to rewrite it; `oma update` does this automatically. |
| `missing-in-os` | Job is in manifest but missing from OS scheduler. Run `schedule sync` to repair. |
| `orphan-in-os` | An agent schedule (`dev.oma.sch_*`) exists in the OS scheduler but not in the manifest. Run `schedule sync --prune` to remove. |

Internal services such as `dev.oma.agentmemory`, `dev.oma.serena-daemon-gc`, and `dev.oma.serena-reaper` have their own service managers. `schedule list` excludes them from orphan detection, and `schedule sync --prune` preserves them.

**Output (text):**

Jobs are grouped by project label. Each row shows: ID, cron expression, agent, vendor, OS backend, whether recurring, and drift state.

```text
[my-project]
ID                 CRON           AGENT              VENDOR   BACKEND  RECUR  STATE
------------------------------------------------------------------------------------------
sch_abcdefgh2345   0 9 * * 1-5    qa-reviewer        auto     launchd  true   synced
sch_mnopqrst4567   */30 * * * *   backend            claude   launchd  true   missing-in-os

[orphan-in-os]
  dev.oma.sch_old (in OS scheduler but not in manifest)
```

Jobs created by `oma harness evolution enable` are listed with agent `__builtin__`; they run `oma harness evolution run --scheduled` in that project. Manage them with `oma harness evolution enable` and `disable` (see [Project Harness Evolution](./harness-evolution.md)) rather than `oma schedule delete`. `oma schedule builtin-evolution-add` and `oma schedule inspect`, which appear in `oma schedule --help`, are internal helpers for that command.

**Examples:**

```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

---

### schedule delete

Remove a scheduled job from both the manifest and the OS scheduler.

```bash
oma schedule delete <id>
```

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `id` | Yes | Job ID from `schedule list` (format: `sch_<base32-12>`) |

If the OS scheduler removal fails (e.g. the backend is temporarily unavailable), a warning is printed but the manifest entry is still removed.

**Example:**

```bash
oma schedule delete sch_abcdefgh2345
```

---

### schedule run

Execute a scheduled job by ID. This is invoked by the OS scheduler at fire time and is not normally called by hand.

```bash
oma schedule run <id>
```

The wrapper:
1. Looks up the job ID in the manifest. Exits non-zero if not found. If `--expires-after` has elapsed, removes the job instead of running it.
2. Loads captured environment variables from `~/.oma/schedule/env/<id>` (if present) and injects them into the spawned process.
3. Calls `oma agent spawn <agentId> <prompt> <generatedSessionId> --vendor <vendor> -w <workspace>`.
4. Writes the run result to `~/.oma/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Updates `lastFiredAt` in the manifest.
6. If `--once` was set and the agent exited 0, removes the job (manifest + OS scheduler).

**Authentication failures are loud:** if vendor credentials are expired, the job exits with a non-zero code and prints `re-auth required: <vendor>` to stderr (saved in `runs/<id>/stderr.log` on launchd and systemd). The vendor shows as `unknown` when the job was created without `--vendor`. It does not silently succeed.

You can invoke `schedule run` manually for debugging:

```bash
oma schedule run sch_abcdefgh2345
```

---

### schedule sync

Re-synchronize the manifest to the OS scheduler. Use after system migrations, OS scheduler resets, or to repair drift.

```bash
oma schedule sync [--prune]
```

**Options:**

| Flag | Description |
|---|---|
| `--prune` | Also remove OS jobs that are in the OS scheduler but not in the manifest (orphan-in-os state). Without `--prune`, orphans are reported but not removed. |

**Examples:**

```bash
# Repair missing-in-os jobs and rewrite stale registrations (does not remove orphans)
oma schedule sync

# Repair missing-in-os jobs AND remove orphans
oma schedule sync --prune
```

`oma update` runs the same reconciliation (without `--prune`) after every update, so a CLI release that changes the `oma schedule run` command spelling cannot leave existing OS registrations pointing at a command the new binary rejects. Registrations written by older versions with `oma schedule:run <id>` also keep working: that legacy spelling stays accepted for OS-invoked jobs.

---

## Storage layout

All schedule state lives under `~/.oma/schedule/`:

```text
~/.oma/schedule/
├── schedules.json          # SSOT manifest (permissions 0600)
├── env/
│   └── sch_abcdefgh2345    # Captured env vars for this job (permissions 0600)
├── running/                # Lease files while a job runs
└── runs/
    └── sch_abcdefgh2345/
        ├── 2026-06-16T09-00-00-000Z.md   # One log per fire: session, exit code, agent output
        ├── stdout.log                    # launchd and systemd only: stdout of oma schedule run
        └── stderr.log                    # launchd and systemd only: stderr, e.g. re-auth required
```

Permissions:
- `~/.oma/schedule/` directory: `0700`
- `schedules.json` and `env/<id>` files: `0600`

**Secrets are never written to `schedules.json`.** The `--env` flag writes only the named keys to a separate `0600` file under `env/`. Only keys explicitly listed are captured; a full environment dump is never stored.

---

## Security notes

- `schedule create` is a trusted-path operation: only the authenticated user can register jobs. Do not expose `schedule create` to external or untrusted inputs. A scheduled prompt is arbitrary code that runs at a future time.
- `schedule run` executes only jobs whose ID exists in the manifest. Arbitrary argv injection is not possible.
- Vendor disk credentials (e.g. `~/.codex/auth.json`, `~/.grok/auth.json`) are used as-is for headless dispatch. No additional authentication gating is applied. If credentials expire, the job loud-fails.

---

## Tips and troubleshooting

**Checking run logs:**

```bash
ls ~/.oma/schedule/runs/sch_abcdefgh2345/
cat ~/.oma/schedule/runs/sch_abcdefgh2345/2026-06-16T09-00-00-000Z.md
```

**Job shows `missing-in-os` after a system restart:**

Run `oma schedule sync` to re-register all manifest jobs with the OS scheduler.

**Job fired but vendor credentials were expired:**

On macOS (launchd) and Linux (systemd), check `~/.oma/schedule/runs/<id>/stderr.log` for `re-auth required: <vendor>`. The `<timestamp>.md` run log holds the agent's own output and exit code. The crontab and Task Scheduler backends do not keep this stderr; run `oma schedule run <id>` in a terminal to see it. Re-authenticate with the vendor CLI (e.g. `claude login`, `codex login`) and run `oma schedule run <id>` manually to verify before the next scheduled fire.

**Changing a job:**

There is no `schedule update`. Create the replacement first, then delete the old ID with `oma schedule delete <old-id>`. `--env` copies variable values when the job is created, so after rotating a secret, re-create the job with the new value exported in your shell.

**`--every` rounded my interval:**

When oma rounds your interval, it prints a note explaining the change. If you need a precise interval that does not divide cleanly into 60 minutes or 24 hours, use `--cron` with an explicit 5-field expression instead.

**Removing all jobs for a project:**

```bash
# List jobs for a specific project, then remove each
oma schedule list --json | jq -r '.jobs[] | select(.projectLabel == "my-project") | .id' \
  | xargs -I{} oma schedule delete {}
```

**Windows support:**

On Windows, oma uses `schtasks` to register jobs. Task Scheduler registrations cannot be read back, so `schedule list` reports every registered job as `stale`, and `schedule sync` (also run by `oma update`) re-registers all of them. On Windows, treat `stale` as expected; `missing-in-os` and `orphan-in-os` still indicate drift.

Note that `schtasks` cannot express every cron shape. Supported shapes are: `*/N * * * *` (every N minutes), `M * * * *` (hourly at :M), `M H * * *` (daily), `M H * * D` (weekly; `D` may be a single day, a range like `1-5`, or a comma list like `1,3,5`), and `M H D * *` (monthly). Other expressions (e.g. a comma list in the minute field) are rejected at `schedule create` time on Windows.

`--every` produces a supported shape only for minute intervals that divide 60 (for example `--every 5m` or `--every 30m`). Hour and day intervals (`--every 2h`, `--every "every 6 hours"`, `--every 1d`) and hour steps such as `--cron "0 */4 * * *"` produce `0 */N * * *` or `0 0 */N * *`, which Task Scheduler rejects at `schedule create`. On Windows, use a fixed time instead, for example `--cron "0 9 * * 1-5"`.

---

## See also

- [Project Harness Evolution](./harness-evolution.md) — the built-in `__builtin__` job that runs budgeted skill improvement.
- [Harness Evaluation](./harness-eval.md) — how the evaluation commands fit together.
