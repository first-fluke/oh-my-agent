---
title: "Guide: Global Install"
sidebar_label: Global Installation
description: Install oh-my-agent into the OMA global home (~/.oma/) instead of per-project so the same skills, workflows, and rules apply across every project. Covers oma install --global, oma update --global, oma uninstall --global, OMA_HOME override, dual-install detection via oma doctor, and platform caveats (sudo refusal, CI, WSL, cwd=HOME guard).
---

## What is a global install?

By default, `oma install` scopes everything to the current project directory: the SSOT lives at `<cwd>/.agents/` and vendor configs are written into `<cwd>/.claude/`, `<cwd>/.codex/`, etc. A **global install** (`oma install --global`) installs oh-my-agent into the OMA global home instead, so the same skills, workflows, and rules are available in every project you open without repeating the install step. The SSOT lives at `~/.oma/.agents/`; vendor configs remain at `~/.claude/`, `~/.codex/`, etc.

## Project vs global comparison

| Aspect | Project (`oma install`) | Global (`oma install --global`, default OMA home) |
|--------|------------------------|--------------------------------|
| SSOT location | `<cwd>/.agents/` | `~/.oma/.agents/` |
| Vendor configs | `<cwd>/.claude/`, `<cwd>/.codex/`, etc. | `~/.claude/`, `~/.codex/`, etc. |
| Lock file | `<cwd>/.agents/_install.lock` | `~/.oma/.agents/_install.lock` |
| Metadata | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.oma/.agents/_version.json (schemaVersion=2)` |
| Use case | Per-project customization | Personal default across all projects |
| oma-config.yaml scope | Project-specific | User-wide baseline |

Both modes can coexist. `oma doctor` reports both installs if present and flags drift between them.

After a successful global install, verify the user-rooted files and resolved profile:

```bash
oma doctor --json
oma doctor --profile
```

The first command reports install and vendor health; the profile command shows the model plan used by agents. Run these from any project when the global install is the one you want to inspect.

## First-run setup

The first time you run `oma install --global` on a machine, the install shows an explanatory note before proceeding:

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.oma/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.oma/.agents/_install.lock
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

### cwd = HOME guard (project mode)

`oma link` and `oma update` (without `--global`) refuse to run while your current directory is your HOME. In project mode `<cwd>/.claude/settings.json` would be `~/.claude/settings.json` — your global Claude Code settings — and the project-scoped render would rewrite its `$HOME/.claude/hooks/...` commands to `$CLAUDE_PROJECT_DIR/...`, breaking every hook and the statusline in projects without their own `.claude/hooks/`. Use `oma link --global` / `oma update --global` for the global install instead, or `cd` into a project first.

If you run `oma install` (without `--global`) while your current directory is your HOME, oma warns you:

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

In non-interactive / CI mode this aborts automatically. Use `--global` if you intend a user-wide install.

## Relinking a global install

`oma link` regenerates vendor-native files from the SSOT without reinstalling. Like `install` and `update`, it resolves its target from the install context, so pass `--global` to reconcile `~/.oma/.agents/` — it works from any directory, not just `$HOME`:

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.oma/.agents/oma-config.yaml)
oma link opencode --global
```

Without `--global`, `oma link` targets `<cwd>/.agents/` — so running it inside a project when your install is global reports that no `.agents/` directory was found there.

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

Set `OMA_HOME` to an absolute path to relocate OMA-owned global data:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` is the global storage root, not a project install target. With the value above, global definitions live at `/tmp/oma-test/.agents/`; project install and link still use `<cwd>/.agents/`. Vendor-native settings and authentication stay outside `OMA_HOME`. Global OpenCode integration files are written to `~/.config/opencode/` under the actual HOME directory.

`OMA_STATE_HOME` is an explicit exception for profile/L1/project runtime storage: it must be absolute and contains `u/`. When unset, profiles follow `OMA_HOME`. `XDG_CONFIG_HOME` no longer relocates OMA state and does not change OMA's OpenCode output path. OS Keychain secrets, AgentMemory/Honcho data, and managed toolchain caches stay with their existing owners.

## Global storage layout

Let `H` be `OMA_HOME`, defaulting to `~/.oma`:

| Data | Location |
|---|---|
| Global definitions, config, install metadata | `H/.agents/` |
| Schedule manifest, captured environment, run logs | `H/schedule/` |
| Global backups | `H/backup/` |
| Serena registry, locks, logs | `H/state/serena/` |
| Vault key-name index | `H/state/vault-index.json` |
| Profiles, L1 sessions, project runtime | `H/u/<profile>/` |

Global config supplies defaults. The nearest project `.agents/oma-config.*` and
its local overlay override them; different ancestor project roots are not merged.
A project selecting `semantic_memory: none` keeps memory disabled even when the
global config selects AgentMemory.

## Existing installations

The home migration copies OMA-owned data from `~/.agents/` and `~/.config/oma/`
into the new layout. Originals remain, except verified OMA-owned skill directories
converted to discovery links: their original content is archived under
`H/backup/legacy-global-skills/` before the old path becomes a link to the migrated
skill. Existing destination files are not overwritten; conflicts and data in use
are reported for retry. Vault indexes
merge key names, without moving secret values out of the OS keychain. User
skills and foreign links remain in place; vendor authentication files are not
moved. Runtime readers use only
the new paths.

```bash
oma home migrate --dry-run --json
oma home migrate --json
oma schedule sync
```

Global install and update run the migration before writing their global files.
Project install/update use the unified roots without migrating unrelated global
data. The migration does not change OS job registrations; run `oma schedule sync`
after migration if schedules exist. Active services or runners can defer data;
finish those processes and rerun the migration.
