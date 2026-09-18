---
title: "Guide: Troubleshooting"
sidebar_label: Troubleshooting
description: Diagnose installation, configuration, vendor, dashboard, schedule, evaluation, and agent-result failures with source-backed checks.
---

# Troubleshooting

Start with a machine-readable diagnosis from the project or install root:

```bash
oma doctor --json
```

The command should finish with JSON that identifies the install, vendor, configuration, and integration findings. Add `--profile` when the problem is model or per-agent resolution. Keep the JSON when reporting an issue; it contains the selected paths and checks without requiring a prose guess.

## The CLI or install is using the wrong files

Check the context explicitly:

```bash
oma doctor --json
oma doctor --profile
```

Project commands read the nearest `.agents/oma-config.cue` or `.agents/oma-config.yaml`, then one local overlay. A global command reads the HOME install root. If a local CUE and local YAML file both exist, remove one. If a local file is malformed, OMA stops rather than silently ignoring the override. See [Configuration reference](/docs/guide/configuration-reference).

After an update, inspect the config and generated paths:

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` keeps the run non-interactive. If user configuration was replaced unexpectedly, check whether `--force` was used; regular updates preserve the user-owned config, while force mode can replace it.

## A vendor does not start

Run the vendor’s own authentication check, then inspect OMA’s resolved profile:

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

Use the exact vendor command listed by `oma doctor` to re-authenticate. A model override must use the `owner/model` form accepted by the schema, and its vendor must support the selected CLI transport. For `model_preset: free`, check the resolved gateway URL and model with `oma doctor --profile`, then verify that the configured API-key environment variable contains a key. If you omit the `free` map, the defaults are `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY`, and model `auto`; never put the API key itself in YAML.

If a child exits with no result artifact, inspect the run directory and parent status. A spawned child receives the run identity and result instructions, writes the claim at the injected path, and reports its artifacts; the parent finalizes the managed receipt after capturing the exit code. Read-only children return `OMA_RESULT_JSON: ...`; that line is recorded as an inspection and does not satisfy executable verification.

## Hooks are installed but do not run

For Codex, inspect the generated file and follow the one-time trust flow:

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

Run `/hooks` after the first install and after an update changes a command string. OMA’s spawned Codex subprocesses pass the bypass flag for their own managed invocation; that does not trust a hook in a Codex session you start yourself. See [Codex Hook Trust](/docs/guide/codex-hook-trust).

## The dashboard is empty or disconnected

Start the terminal dashboard from the project containing the session files:

```bash
oma dashboard terminal
```

It reads `.agents/state/memories/` by default. Set `MEMORIES_DIR` when the state is elsewhere. The web dashboard binds to loopback and prints a tokenized URL:

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

Open the exact URL printed by the command; the web API and WebSocket require its dashboard token. If the port is busy, use another `DASHBOARD_PORT`. If no agents appear, check that the workflow has written session/task/progress files in the selected memory directory. The dashboard does not automatically search the legacy `.serena/memories/` directory.

## A schedule is missing or did not run

Inspect the manifest and scheduler state:

```bash
oma schedule list
oma schedule sync
oma schedule run SCHEDULE_ID
```

`schedule list` reports `synced`, `stale`, `missing-in-os`, and `orphan-in-os`. `schedule sync` restores missing jobs and rewrites stale registrations (an `Unknown command: schedule:run` line in the run log means the registration predates the command rename; `oma update` re-syncs it automatically); add `--prune` only when orphaned OS jobs should be removed. A preview created with `--dry-run` does not register a job. For a recurring interval, accept OMA’s rounding with `--accept-rounded` after reviewing the preview. Check the run log under `~/.agents/schedule/runs/<id>/` for a non-zero vendor exit or `re-auth required`.

## Evaluation or optimization reports no coverage

Both skill eval and skill optimization require at least five fixtures under `.agents/eval/<skill>/`. In mock mode, recorded rollout provenance must match the current skill and fixture hashes. Re-record with live mode when the fixture or skill changed; do not copy an old `_rollouts` file into a new skill directory and treat it as current evidence.

For optimization, keep the default `--dry-run` while reviewing the proposed diff. `--apply` requires a strict positive validation result and a passing runner-owned test split; an OMA-owned skill can be overwritten by a later `oma update`.

## A result cannot finish or resume

Inspect the run and plan files:

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

Run `oma agent verify RUN_ID --required` before finishing. A completed claim with a failed receipt, changed inputs, missing artifacts, unresolved items, or a changed task contract is rejected or downgraded. Resume is automatic only for tasks with `retry_policy: "safe"`, a replayable prompt, and attempts remaining. A live process or an interrupted native attempt without a clear partial/failed result is left alone to prevent duplicate work. See [Agent results and resume](/docs/guide/agent-results-and-resume).

When asking for help, include the relevant `oma doctor --json` output, command, session/run ID, and the unresolved message. Do not include credentials or the contents of secret-bearing files.
