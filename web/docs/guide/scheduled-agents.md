---
title: "Guide: Scheduled Agents"
description: Run any agent on a recurring or one-shot schedule using the OS scheduler (macOS launchd, Linux systemd, Windows Task Scheduler). Works across all seven supported AI vendors without requiring a vendor runtime to stay open.
---

# Scheduled Agents

`oma schedule` lets you run any agent on a time-based schedule, independent of which AI vendor runtime (Claude Code, Codex, Antigravity, Cursor, Qwen, Grok, opencode) is currently open. The OS scheduler fires the job, and the job calls `oma agent spawn` headlessly using the vendor credentials already cached on disk.

---

## How it works

When you run `oma schedule create`, oma:

1. Writes a job record to the global manifest at `~/.agents/schedule/schedules.json`.
2. Registers the job with the OS scheduler (macOS launchd, Linux systemd --user, or Windows Task Scheduler). The OS job calls `oma schedule run <id>` at the configured cron interval.
3. At fire time, `oma schedule run` looks up the job, injects any captured environment variables, calls `oma agent spawn`, and writes the run log to `~/.agents/schedule/runs/<id>/<timestamp>.md`.

The manifest is the single source of truth (SSOT). The OS scheduler is just an executor. All state — job definitions, run logs, last-fired timestamps — lives under `~/.agents/schedule/`.

### Global-only by design

`oma schedule` is intentionally user-global, not per-project. Because the OS scheduler runs jobs independently of the current working directory, a single central registry is the only practical SSOT. Each job records the project it belongs to via `workspace` and `projectLabel`, so `schedule list` can group jobs by project even though the registry is shared.

There is no `--global` flag; schedule commands always read and write `~/.agents/schedule/`.

### OS backends

| Platform | Primary backend | Fallback |
|---|---|---|
| macOS | launchd (plist + `launchctl`) | user `crontab` |
| Linux | systemd --user timer | user `crontab` |
| Windows | Task Scheduler (`schtasks`) | — |

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

# One-shot: run once at 3 PM today (cron syntax) and self-remove
oma schedule create pm "Generate weekly plan" --cron "0 15 * * *" --once

# Check what is scheduled
oma schedule list

# Remove a job
oma schedule delete sch_abc123def456
```

---

## Commands

### schedule create

Register a scheduled agent job.

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [-m <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>]
```

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `agent-id` | Yes | Agent type to spawn: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Yes | Task description passed to the agent at run time |

**Options:**

| Flag | Description |
|---|---|
| `--cron "<expr>"` | 5-field cron expression (e.g. `"0 9 * * *"` for 9 AM daily). Mutually exclusive with `--every`. |
| `--every "<phrase>"` | Natural-language interval (see table below). Mutually exclusive with `--cron`. |
| `--vendor <vendor>` | CLI vendor override passed to `oma agent spawn`: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. Defaults to auto-detect from `oma-config.yaml`. |
| `-w, --workspace <path>` | Working directory for the agent at run time. Defaults to the current working directory at registration time. |
| `--once` | One-shot mode: the job fires once and self-removes. Default is recurring. |
| `--expires-after <duration>` | Auto-expire a recurring job after a duration such as 30d. `0` means indefinite (default). |
| `--env <KEY1,KEY2>` | Capture the named environment variables (only those listed) into `~/.agents/schedule/env/<id>` (permissions 0600) for injection at run time. Secrets are never written to the manifest itself. |

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

```
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
| `missing-in-os` | Job is in manifest but missing from OS scheduler. Run `schedule sync` to repair. |
| `orphan-in-os` | Job exists in OS scheduler but not in manifest. Run `schedule sync --prune` to remove. |

**Output (text):**

Jobs are grouped by project label. Each row shows: ID, cron expression, agent, vendor, OS backend, whether recurring, and drift state.

```
[my-project]
ID                 CRON           AGENT              VENDOR   BACKEND  RECUR  STATE
------------------------------------------------------------------------------------------
sch_abc123def456   0 9 * * 1-5    qa-reviewer        auto     launchd  true   synced
sch_xyz789ghi012   */30 * * * *   backend            claude   launchd  true   missing-in-os

[orphan-in-os]
  dev.oma.sch_old (in OS scheduler but not in manifest)
```

**Examples:**

```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

---

### schedule delete

Remove a scheduled job from both the manifest and the OS scheduler.

```
oma schedule delete <id>
```

**Arguments:**

| Argument | Required | Description |
|---|---|---|
| `id` | Yes | Job ID from `schedule list` (format: `sch_<base32-12>`) |

If the OS scheduler removal fails (e.g. the backend is temporarily unavailable), a warning is printed but the manifest entry is still removed.

**Example:**

```bash
oma schedule delete sch_abc123def456
```

---

### schedule run

Execute a scheduled job by ID. This is invoked by the OS scheduler at fire time and is not normally called by hand.

```
oma schedule run <id>
```

The wrapper:
1. Looks up the job ID in the manifest. Exits non-zero if not found.
2. Loads captured environment variables from `~/.agents/schedule/env/<id>` (if present) and injects them into the spawned process.
3. Calls `oma agent spawn <agentId> <prompt> <generatedSessionId> --vendor <vendor> -w <workspace>`.
4. Writes the run result to `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Updates `lastFiredAt` in the manifest.
6. If `--once` was set, self-removes the job (manifest + OS scheduler).

**Authentication failures are loud:** if vendor credentials are expired, the job exits with a non-zero code and prints `re-auth required: <vendor>` to stderr. It does not silently succeed. An optional `oma-voice` notification can be configured.

You can invoke `schedule run` manually for debugging:

```bash
oma schedule run sch_abc123def456
```

---

### schedule sync

Re-synchronize the manifest to the OS scheduler. Use after system migrations, OS scheduler resets, or to repair drift.

```
oma schedule sync [--prune]
```

**Options:**

| Flag | Description |
|---|---|
| `--prune` | Also remove OS jobs that are in the OS scheduler but not in the manifest (orphan-in-os state). Without `--prune`, orphans are reported but not removed. |

**Examples:**

```bash
# Repair missing-in-os jobs (does not remove orphans)
oma schedule sync

# Repair missing-in-os jobs AND remove orphans
oma schedule sync --prune
```

---

## Storage layout

All schedule state lives under `~/.agents/schedule/`:

```
~/.agents/schedule/
├── schedules.json          # SSOT manifest (permissions 0600)
├── env/
│   └── sch_abc123def456    # Captured env vars for this job (permissions 0600)
└── runs/
    └── sch_abc123def456/
        └── 2026-06-16T090000Z.md   # Run log
```

Permissions:
- `~/.agents/schedule/` directory: `0700`
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
ls ~/.agents/schedule/runs/sch_abc123def456/
cat ~/.agents/schedule/runs/sch_abc123def456/2026-06-16T090000Z.md
```

**Job shows `missing-in-os` after a system restart:**

Run `oma schedule sync` to re-register all manifest jobs with the OS scheduler.

**Job fired but vendor credentials were expired:**

Check the run log for `re-auth required: <vendor>`. Re-authenticate with the vendor CLI (e.g. `claude login`, `codex login`) and run `oma schedule run <id>` manually to verify before the next scheduled fire.

**`--every` rounded my interval:**

When oma rounds your interval, it prints a note explaining the change. If you need a precise interval that does not divide cleanly into 60 minutes or 24 hours, use `--cron` with an explicit 5-field expression instead.

**Removing all jobs for a project:**

```bash
# List jobs for a specific project, then remove each
oma schedule list --json | jq -r '.jobs[] | select(.projectLabel == "my-project") | .id' \
  | xargs -I{} oma schedule delete {}
```

**Windows support:**

On Windows, oma uses `schtasks` to register jobs. The `schedule list` drift detection and `schedule sync` commands work the same way across all platforms.

Note that `schtasks` cannot express every cron shape. Supported shapes are: `*/N * * * *` (every N minutes), `M * * * *` (hourly at :M), `M H * * *` (daily), `M H * * D` (weekly; `D` may be a single day, a range like `1-5`, or a comma list like `1,3,5`), and `M H D * *` (monthly). Other expressions (e.g. a comma list in the minute field) are rejected at `schedule create` time on Windows.
