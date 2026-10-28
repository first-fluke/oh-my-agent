---
title: Repairing plugin hooks and project bootstrap
description: See how marketplace hook paths, Bash provisioning, and project bootstrap receipts were repaired with regression fixtures.
---

# Repairing plugin hooks and project bootstrap

The plugin repair in [`2a29d3a8`](https://github.com/first-fluke/oh-my-agent/commit/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c) addressed hook dispatch and bootstrap behavior. Its parent, `82649cbd`, provides the before-state for this comparison.

## Failure mechanism

The [old hook manifest](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/hooks/hooks.json) invoked files under `${CLAUDE_PLUGIN_ROOT}/.claude/hooks/`. Those paths depend on generated files; the fixture with a fresh plugin cache leaves them out of the plugin directory.

The [old bootstrap](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/scripts/plugin-bootstrap.sh) also ran the downloaded Bash installer through `sh -c`. Its success marker lived in shared plugin data, and the fast path checked only that marker, the CLI version, and the project's settings-file presence. A second project with a settings file could therefore skip its own wiring.

## Repair

The [new dispatcher](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.sh) calls the installed CLI. When a matching executable project hook already owns the event, the marketplace hook defers to it so the event is not dispatched twice.

The [new bootstrap](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.sh):

- Runs the Bash installer through Bash and checks provisioning failures.
- Forces project installation even when a global-install setting is inherited.
- Stores the receipt in that project's `.agents/state/plugin-bootstrap.version`.
- Checks configuration, version metadata, the executable wrapper, and registered events before reusing a receipt.
- Retains failed-install diagnostics in `.agents/state/plugin-bootstrap.last-error.log` without recording a successful receipt.

## Reproduce the regression checks

Use a disposable checkout of `2a29d3a8eb4d760e4e4000b484c9f04761c59f5c` with Bun and the repository's development dependencies already available. From its root:

```bash
bun run --cwd cli test --project scripts --maxWorkers 1 \
  plugin-bootstrap.test.ts plugin-hook.test.ts plugin-install.integration.test.ts
```

The fixtures cover distinct boundaries:

| Fixture | What its assertions check |
|---|---|
| [Bootstrap](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.test.ts) | Bash-only provisioning, separate project receipts, CUE-only configuration, incomplete wiring, version failures, and retained diagnostics. |
| [Hook dispatch](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.test.ts) | Fresh-cache dispatch, handler time budgets, payload preservation, matching project-hook ownership, and fallback when that ownership is absent or invalid. |
| [Install integration](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-install.integration.test.ts) | Two project installations, preserved user settings, one prompt/Stop delivery across both registrations, and retry after failed wiring. |

These fixtures create temporary directories and fake CLI commands; the integration fixture uses the actual hook composer. They check shell dispatch and recorded effects without a marketplace installation or model call. The suites are skipped on Windows.

## What remains to check in a real session

A passing fixture run does not establish a working Claude Code session. In the actual target project, inspect the receipt/configuration, run `oma doctor`, restart the session, and exercise the relevant prompt and Stop behavior while checking their observed effects. CLI availability, credentials, provider behavior, and host hook policy need their own evidence.

For the same reproduce–fix–verify approach on another failure, start with [debugging a failing test](../tasks/debug-failing-tests.md). [Choose a setup](../getting-started/choose-setup.md) explains when the project runtime is needed.
