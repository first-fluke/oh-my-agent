---
title: "Guide: Global Install"
description: Install oh-my-agent into your user HOME (~/.agents/) instead of per-project so the same skills, workflows, and rules apply across every project. Covers oma install --global, oma update --global, oma uninstall --global, OMA_HOME override, dual-install detection via oma doctor, and platform caveats (sudo refusal, CI, WSL, cwd=HOME guard).
---

## What is a global install?

By default, `oma install` scopes everything to the current project directory: the SSOT lives at `<cwd>/.agents/` and vendor configs are written into `<cwd>/.claude/`, `<cwd>/.codex/`, etc. A **global install** (`oma install --global`) installs oh-my-agent into your user HOME instead, so the same skills, workflows, and rules are available in every project you open without repeating the install step. The SSOT lives at `~/.agents/` and vendor configs at `~/.claude/`, `~/.codex/`, etc.

## Project vs global comparison

| Aspect | Project (`oma install`) | Global (`oma install --global`) |
|--------|------------------------|--------------------------------|
| SSOT location | `<cwd>/.agents/` | `~/.agents/` |
| Vendor configs | `<cwd>/.claude/`, `<cwd>/.codex/`, etc. | `~/.claude/`, `~/.codex/`, etc. |
| Lock file | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Metadata | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Use case | Per-project customization | Personal default across all projects |
| oma-config.yaml scope | Project-specific | User-wide baseline |

Both modes can coexist. `oma doctor` reports both installs if present and flags drift between them.

## First-run setup

The first time you run `oma install --global` on a machine, the install shows an explanatory note before proceeding:

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Confirm to continue. The install then follows the same interactive flow as a project install (language, model preset, project type, vendor selection).

After a successful install, the next steps are shown:

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Caveats

### Sudo refused

`oma install` (in any mode) exits immediately when run under `sudo`:

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Run the command as your normal user without `sudo`.

### CI environments

Running `oma install --global` inside a CI pipeline modifies the CI runner's HOME directory. This is usually undesirable. If you do need it (e.g., a bootstrapping pipeline), oma emits a warning:

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

The install proceeds if `--yes` / `OMA_YES=1` is set. Without it, the warning is shown and the install continues interactively (which will hang in most CI setups).

### WSL: Linux HOME vs Windows USERPROFILE

When oma detects it is running inside Windows Subsystem for Linux, it prints:

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

A WSL install and a PowerShell install are independent. If you want global coverage on both sides, run `oma install --global` once from WSL and once from PowerShell.

### cwd = HOME warning (project mode)

If you run `oma install` (without `--global`) while your current directory is your HOME, oma warns you:

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

In non-interactive / CI mode this aborts automatically. Use `--global` if you intend a user-wide install.

## Uninstall

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

The uninstall command separates oma-owned files from user-owned files. User-owned content (oma-config.yaml, mcp.json, custom skills without the `<!-- oma:generated -->` marker) is never deleted.

To uninstall a project install, omit `--global`:

```bash
oma uninstall [--dry-run]
```

## OMA_HOME override

For testing or staging purposes you can redirect all oma operations to an arbitrary directory:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` takes precedence over `--global` and `process.cwd()`. Forbidden system paths (`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`) are rejected even via `OMA_HOME`. The path must be absolute and writable.
