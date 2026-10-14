---
title: "Guide: Troubleshooting"
sidebar_label: Troubleshooting
description: Diagnose installation, configuration, vendor, hook, dashboard, schedule, evaluation, and agent-result failures by symptom or exact error message, with source-backed checks and fixes.
---

# Troubleshooting

Start with a machine-readable diagnosis from the project or install root:

```bash
oma doctor --json
```

The command should finish with JSON that identifies the install, vendor, configuration, and integration findings. Add `--profile` when the problem is model or per-agent resolution. Keep the JSON when reporting an issue; it contains the selected paths and checks without requiring a prose guess.

## Find your symptom

| Symptom | Go to |
|---------|-------|
| OMA reads the wrong config, or an update replaced your settings | [The CLI or install is using the wrong files](#the-cli-or-install-is-using-the-wrong-files) |
| `oma install` or `oma update` cannot download a release | [An install or update cannot download the release](#an-install-or-update-cannot-download-the-release) |
| A vendor CLI or model does not start | [A vendor does not start](#a-vendor-does-not-start) |
| Hooks are installed but nothing happens | [Hooks are installed but do not run](#hooks-are-installed-but-do-not-run) |
| The dashboard is empty, disconnected, or will not start | [The dashboard is empty or disconnected](#the-dashboard-is-empty-or-disconnected) |
| A scheduled job is missing or failed | [A schedule is missing or did not run](#a-schedule-is-missing-or-did-not-run) |
| Skill eval or optimization reports no coverage | [Evaluation or optimization reports no coverage](#evaluation-or-optimization-reports-no-coverage) |
| An agent run will not verify, finish, or resume | [A result cannot finish or resume](#a-result-cannot-finish-or-resume) |
| The CLI printed an error message | [Find your error](#find-your-error) |

## Find your error

Each message below is printed by the CLI. Match the start of the message.

| Message | Cause | Fix |
|---------|-------|-----|
| `Unknown plan task: <id>` | The task ID (from `--task-id`, or the agent ID by default) is not a task `id` in `.agents/results/plan-<session>.json` | Pass `--task-id` with a task ID from the plan |
| `Plan is immutable after dispatch; ...` | The session plan changed after its first dispatch | Restore the plan, or save the changed plan under a new session ID (and a new `lineage_id` if you set one) |
| `Task acceptance contract changed before dispatch` or `Plan changed before dispatch` | The plan was edited while a run was starting | Retry once the plan is stable |
| `Attempt limit reached for workflow lineage and logical goal` | The plan's `max_attempts` (default 3, including the first attempt) is used up | Inspect the failed attempts before planning another one |
| `Cannot verify a finished run; start a new run` | `oma agent verify` ran after the run finished | Start a new run with `oma agent begin` |
| `Choose a command, --required, or --affected` | `oma agent verify` received no verification mode, or more than one | Use exactly one of `--required`, `--affected PATH...`, or `-- <argv>` |
| `No complete test selection for affected paths: ...` | The graph has no complete test selection for those paths | Use `--required` |
| `The spawning parent finalizes managed runs; write the claim file instead` | `oma agent finish` was called on a run started by `oma agent spawn` or `parallel` | Write the claim at the injected path; the parent finalizes the run |
| `Resume requires a session plan with task contracts` | The session has no plan file | Resume works only for plan-based sessions; spawn the task again instead |
| `A resume coordinator already owns this session` | Another `oma agent resume` for the session is running, or its lease came from another host | Wait for the other resume to finish; a lease left by a dead process on the same host is reclaimed automatically |
| `No graph-backed context found for <agent>` | No graph context exists for that agent | Fix the task definition, or continue with the project's documented native search path |
| `Dashboard failed: port 9847 is already in use. ...` | Another process holds the dashboard port | `DASHBOARD_PORT=8080 oma dashboard web`, or stop the other process |
| `Invalid DASHBOARD_PORT: ...` | `DASHBOARD_PORT` is not an integer from 1 to 65535 | Set a valid port, or unset it to use 9847 |
| `Removed option <old>. Use <new>.` | The command used a flag spelling that was removed | Use the flag named in the message |
| `Unknown command: ... Use oma --help.` | The command path was removed or renamed | Run `oma --help` or `oma describe` for the current paths |
| `oma agent spawn` exits with code 3 | The vendor exited 0, but the run did not end `completed` | Read `unresolved` in the run record; see [Agent results and resume](./agent-results-and-resume.md) |

## The CLI or install is using the wrong files

Check the context explicitly:

```bash
oma doctor --json
oma doctor --profile
```

| Symptom | Cause | Fix |
|---------|-------|-----|
| A setting is ignored, or a global default wins | Commands read global defaults from `$OMA_HOME/.agents/` (default `~/.oma/.agents/`), then the nearest project shared config and one local overlay. Different ancestor project roots are not merged | Check which config paths `oma doctor --json` selected, and edit the file that is actually read |
| OMA stops while loading config | A local CUE and a local YAML file both exist, or a local file is malformed. OMA stops rather than silently ignoring the override | Remove one of the two local files, or fix the malformed one |
| User configuration was replaced after an update | The update ran with `--force`. Regular updates preserve the user-owned config; force mode can replace it | Update without `--force`, then inspect the config and generated paths |

See [Configuration reference](/docs/guide/configuration-reference) for the file order. After an update, inspect the config and generated paths:

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` keeps the run non-interactive.

## An install or update cannot download the release

<!-- oma-docs:ignore-start -->
`oma install`, `oma update`, and the `oma doctor` repair download the release that `prompt-manifest.json` on `main` names. They try the `agent-skills.tar.gz` asset of the `cli-v<version>` GitHub release first, checked against its `.sha256` file, then that tag's source archive, then a shallow clone of the tag. A checksum mismatch, or a payload whose `.agents/skills/_version.json` names a different version, stops the run instead of trying another source.
<!-- oma-docs:ignore-end -->

| Symptom | Cause | Fix |
|---------|-------|-----|
| The download fails right after a release | The manifest names a version whose assets are still publishing | Wait a few minutes and retry |
| You need unreleased content from `main` | Releases install only tagged content | Opt in for one run with `OMA_UPDATE_CHANNEL=main oma update` |

```bash
OMA_UPDATE_CHANNEL=main oma update
```

The run prints a warning: main-branch content is neither a tagged release nor checksum-verified.

## A vendor does not start

Run the vendor’s own authentication check, then inspect OMA’s resolved profile:

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

| Symptom | Cause | Fix |
|---------|-------|-----|
| The vendor CLI is not authenticated | The vendor session expired or was never set up | Re-authenticate with the exact vendor command listed by `oma doctor` |
| A model override is rejected | The override is not in the `owner/model` form accepted by the schema, or its vendor does not support the selected CLI transport | Use the `owner/model` form with a vendor that supports the transport |
| `model_preset: free` cannot reach its gateway | The resolved gateway URL or model is wrong, or the configured API-key environment variable is empty | Check the gateway URL and model with `oma doctor --profile`, then set the key in the environment variable |
| A child exits with no result artifact | The child did not write its claim at the injected path | Inspect the run directory and parent status (see below) |

If you omit the `free` map, the defaults are `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY`, and model `auto`; never put the API key itself in YAML.

A spawned child receives the run identity and result instructions, writes the claim at the injected path, and reports its artifacts; the parent finalizes the managed receipt after capturing the exit code. Read-only children return `OMA_RESULT_JSON: ...`; that line is recorded as an inspection and does not satisfy executable verification.

## Hooks are installed but do not run

| Symptom | Cause | Fix |
|---------|-------|-----|
| Codex does not run OMA hooks | The hooks are not trusted yet: this is the first install, or an update changed a hook command string | Inspect `.codex/hooks.json`, then run `/hooks` inside Codex |

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

OMA’s spawned Codex subprocesses pass the bypass flag for their own managed invocation; that does not trust a hook in a Codex session you start yourself. See [Codex Hook Trust](/docs/guide/codex-hook-trust).

## The dashboard is empty or disconnected

Start the terminal dashboard from the project containing the session files:

```bash
oma dashboard terminal
```

| Symptom | Cause | Fix |
|---------|-------|-----|
| `No agents detected yet` | The workflow has not written session, task, or progress files in the watched memory directory yet, or the dashboard watches another directory | Wait for the first progress file; run from the project root, pass `--project-root <path>`, or set `MEMORIES_DIR` |
| Files in the legacy `.serena/memories/` directory do not appear | The dashboard reads `.agents/state/memories/` and does not search the legacy directory | Set `MEMORIES_DIR` to the directory that holds the files |
| `oma dashboard web` exits with `port 9847 is already in use` | Another process holds the port | Use another `DASHBOARD_PORT` |
| The web page stays Disconnected after you restarted the dashboard | Each start creates a new access token, and the open tab still holds the old one | Reload the page |

The web dashboard binds to loopback and prints its URL. Open it; the page carries its own token for the web API and WebSocket.

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

More dashboard signals are in [Dashboard Monitoring](./dashboard-monitoring.md#troubleshooting-runbook).

## A schedule is missing or did not run

Inspect the manifest and scheduler state. The first two commands are read-only; the last two change state:

```bash
oma schedule list                 # read-only: synced, stale, missing-in-os, orphan-in-os
oma schedule inspect SCHEDULE_ID  # read-only: one manifest entry
oma schedule sync                 # writes: registers missing jobs and rewrites stale ones
oma schedule run SCHEDULE_ID      # executes the job now (normally invoked by the OS scheduler)
```

| Symptom | Cause | Fix |
|---------|-------|-----|
| `schedule list` shows `missing-in-os` or `stale` | The OS registration is missing or outdated | `oma schedule sync` |
| The run log shows `Unknown command: schedule:run` | The registration predates the command rename | `oma update` re-syncs it automatically; `oma schedule sync` also rewrites it |
| `schedule list` shows `orphan-in-os` | An OS job has no manifest entry | `oma schedule sync --prune`, only when the orphaned jobs should be removed |
| A created schedule never registered | It was created with `--dry-run`, which only previews | Create it again without `--dry-run` |
| A recurring interval was not registered | The interval needs rounding | Review the preview, then accept the rounding with `--accept-rounded` |
| The job ran but failed | The vendor exited non-zero, or the log says `re-auth required` | Check the run log under `~/.oma/schedule/runs/<id>/` and re-authenticate the vendor |

## Evaluation or optimization reports no coverage

| Symptom | Cause | Fix |
|---------|-------|-----|
| Skill eval or optimization reports no coverage | Fewer than five fixtures exist under `.agents/eval/<skill>/` | Add fixtures until there are at least five |
| Mock mode rejects recorded rollouts | Recorded rollout provenance does not match the current skill and fixture hashes | Re-record with live mode; do not copy an old `_rollouts` file into a new skill directory and treat it as current evidence |
| `--apply` refuses to write | `--apply` requires a strict positive validation result and a passing runner-owned test split | Keep the default `--dry-run` while reviewing the proposed diff, and fix the failing validation first |

An OMA-owned skill changed by `--apply` can be overwritten by a later `oma update`.

## A result cannot finish or resume

Inspect the run and plan files:

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

| Symptom | Cause | Fix |
|---------|-------|-----|
| A completed claim is rejected or downgraded | A failed receipt, changed inputs, missing artifacts, unresolved items, or a changed task contract | Run `oma agent verify RUN_ID --required` before finishing, and fix what the receipt reports |
| Resume leaves a task `blocked` | Automatic resume needs `retry_policy: "safe"`, a replayable prompt, and attempts remaining | Read the reason in the dry-run report. The plan is frozen after its first dispatch, so set `retry_policy` in a new session's plan, or rerun the task manually |
| Resume does not retry a task | A live process, or an interrupted native attempt without a clear partial or failed result, is left alone to prevent duplicate work | Wait for the live process, or finalize the native attempt first |

See [Agent results and resume](./agent-results-and-resume.md) for the full lifecycle.

## Ask for help

When asking for help, include the relevant `oma doctor --json` output, command, session/run ID, and the unresolved message. Do not include credentials or the contents of secret-bearing files. Open an issue at [github.com/first-fluke/oh-my-agent/issues](https://github.com/first-fluke/oh-my-agent/issues).

## See also

- [Using OMA](./usage.md#troubleshooting): setup problems such as missing skills, CLIs, and workspace conflicts
- [Dashboard Monitoring](./dashboard-monitoring.md#troubleshooting-runbook): stuck, crashed, and disconnected dashboard signals
- [Agent results and resume](./agent-results-and-resume.md): run records, claims, and recovery
- [Glossary](../getting-started/glossary.md): terms such as [run record and claim](../getting-started/glossary.md#run-record-and-claim)
