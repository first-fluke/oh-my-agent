---
name: schedule
description: Register a scheduled agent job from a natural-language schedule request — parse the interval, resolve agent-id + prompt + workspace, call oma schedule create, then confirm with oma schedule list
disable-model-invocation: true
---

- **Response language: the user's prompt language first, then `language` in `.agents/oma-config.yaml`, then English.**
- Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification, and completion. Execute required steps on the selected path in dependency order; apply documented branch and skip conditions.
- **This workflow is slash-invoked only** (`/schedule`). It is NOT triggered by broad keyword detection.

---

## Step 1: Collect Schedule Request

Ask the user for the following if not already provided in the prompt:

| Field | Description | Example |
|-------|-------------|---------|
| Agent ID | Identifier of the agent to run | `qa-reviewer`, `backend-engineer` |
| Prompt | Instruction the agent will receive | `"review the latest diff"` |
| Interval / cron | When to run | `"every 2 hours"`, `"5m"`, `"0 9 * * *"` |
| Workspace (optional) | Absolute path to the project directory | `/home/user/myproject` (default: cwd) |
| Vendor (optional) | CLI vendor override (passed to `oma agent spawn --vendor`) | `claude`, `codex`, `antigravity`, `cursor`, `qwen`, `grok`, `opencode`, `pi` |

If all required fields are already in the user's prompt, proceed directly to Step 2.

---

## Step 2: Resolve Interval Format

Determine whether the user's schedule phrase is:

- **Natural-language interval** — use `--every "<phrase>"` (e.g. `"every 2 hours"`, `"5m"`, `"every 30 minutes"`)
- **5-field cron expression** — use `--cron "<expr>"` (e.g. `"0 9 * * *"`)

If the phrase is ambiguous (e.g. "twice a day", "weekdays at 9am"), ask the user to clarify or suggest the closest cron equivalent and confirm before proceeding.

---

## Step 3: Preview and Register the Job

Resolve the schedule before any job, manifest entry, or captured env file is
created. Run the appropriate preview command first:

```bash
# Natural-language interval
oma schedule create <agent-id> "<prompt>" --every "<phrase>" --dry-run [--vendor <vendor>] [--workspace <path>] [--once]

# Explicit cron expression
oma schedule create <agent-id> "<prompt>" --cron "<expr>" --dry-run [--vendor <vendor>] [--workspace <path>] [--once]
```

Additional options when the user asks for them:

- `--expires-after <duration>` — auto-expire a recurring job after a duration such as 30d (`0` = indefinite)
- `--env <keys>` — comma-separated env var **names** to capture for the run (e.g. `OPENAI_API_KEY,FOO`)

If the preview shows a rounding `Note:`, show the requested interval and resolved
cron to the user. Do not register until they accept the resolved cron. Then run
the same natural-language command with `--accept-rounded` and without
`--dry-run`. The CLI refuses a rounded interval without that acceptance and
does not touch the OS scheduler, manifest, or `--env` secrets.

For an exact cron or interval, the preview requires no extra confirmation.
Register it by re-running the same command without `--dry-run`.

---

## Step 4: Confirm Registration

Run `oma schedule list` to display all registered jobs and confirm the new job appears:

```bash
oma schedule list
```

Show the output to the user. Verify the new job is listed with drift state `synced`.

If `missing-in-os` is shown, suggest running `oma schedule sync`. If `orphan-in-os` entries appear (OS jobs with no manifest entry), suggest `oma schedule sync --prune`.

---

## Step 5: Summarise

Report to the user:

- Agent ID and prompt registered
- Cron expression used (and the original interval phrase if `--every` was used)
- Workspace and vendor
- Whether the job is recurring or one-shot (`--once`)
- Next suggested action if the job did not sync
- How to manage the job later: `oma schedule delete <id>` to delete, `oma schedule run <id>` to fire it manually once
