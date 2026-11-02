---
name: oma-bootstrap
description: Install or verify the oma CLI and its runtimes (bun, uv, serena) before any oma-* skill, agent, or workflow runs an `oma` command. Use when `oma` is missing from PATH, when a skill says to run `oma ...` and the shell reports "command not found", or on the first task in a fresh Cursor or Grok Bot workspace.
---

# OMA bootstrap

## Scheduling

### Goal
Prepare the CLI, required provider tools and project state for the requested
OMA task. Marketplace installation supplies instructions, not runtime binaries.

### Intent signature
- An OMA task reports `oma: command not found` or a missing provider binary.
- A fresh Cursor or Grok Bot workspace lacks required project state.

### When to use
An invoked skill needs an `oma` command, a configured provider, or project OMA
state that is not ready. Check these requirements independently: a working CLI
does not establish that Serena or the project is ready.

### When NOT to use
For instruction-only work that needs no CLI, provider or project state, use the
requested skill directly. Do not provision tools just because the plugin loaded.

### Expected inputs
The invoked skill, its required tools and the task's actual repository or working
directory. Do not use the plugin cache or the Bot's HOME as the project root.

### Expected outputs
Evidence that each required phase is ready, or the specific dependency blocking
the original task. Do not equate a successful download with a working runtime.

### Dependencies
The official platform bootstrap script and `oma doctor --json`. Linux/macOS
commands below apply to hosted Bot computers; native Windows environments use
the PowerShell installer with `OMA_INSTALL_NO_RUN=1`.

## Structural Flow

### Transitions
- CLI available: skip CLI provisioning, then inspect required providers and state.
- Required provider missing: provision that dependency even if the CLI works.
- Project state absent: initialize only when the requested task needs it and
  project setup is authorized. Existing task authorization remains sufficient.
- Existing project: diagnose and reuse it; do not automatically reinstall over
  customized definitions or unrelated work.

### Failure and recovery
| Failure | Recovery |
|---|---|
| Installer succeeds but `oma --version` fails | Inspect `command -v oma` and PATH. Do not create another global install that shadows an existing npm or Homebrew binary. |
| Required Serena binary is still missing | If `uv` is available, run `uv tool install -p 3.13 serena-agent@latest --prerelease=allow` once, then `uv tool update-shell`. Report failure if it remains unavailable. |
| Existing project has configuration or registration issues | Inspect `oma doctor --json`; apply only the indicated repair covered by the task's authorization and preserve local changes. |
| Dependency or setup cannot proceed | Continue independent instruction-only work and report the blocked command. Do not substitute an invented implementation of `oma`. |

### Exit
Resume the original task when its required CLI, provider and project phases are
ready. Keep unresolved phases explicit; plugin import alone does not verify them.

## Logical Operations

### Canonical command path
1. Determine which phases the invoked skill actually requires. In its task
   directory, inspect `command -v oma` and, when present, `oma --version`.
   Check required provider binaries separately and inspect existing `.agents/`
   state. Do not stop after the CLI check.
2. If the CLI or required bootstrap dependencies are missing on Linux/macOS,
   run the official installer without launching its interactive setup:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh \
     | OMA_INSTALL_NO_RUN=1 bash
   export PATH="$PATH:$HOME/.bun/bin:$HOME/.local/bin"
   ```

   Without `curl`, use `wget -qO-`. The installer already installs the global
   CLI when absent and preserves an existing binary; do not follow it with an
   unconditional `bun install --global`. Optional dependencies can fail while
   the installer continues, so verify each required tool after it returns.
   Append the fallback PATH entries to preserve the priority of a working
   Homebrew or npm CLI during a provider-only repair.
3. Recheck `command -v oma && oma --version` and required provider binaries.
   Resolve any missing dependency using the recovery table before invoking it.
4. If project state is needed, inspect the project's existing installation.
   For an absent `.agents/` tree and authorized project setup, run:

   ```bash
   env -u OMA_YES CI=1 oma install
   ```

   CI mode skips prompts without the affirmative side effects of `--yes`, such
   as an automatic GitHub star. Installation writes managed skills, workflows,
   hooks, agents, rules and vendor settings; it does not preserve every existing
   file. For an existing installation, diagnose first instead of rerunning this
   command over local changes.
5. Run `oma doctor --json` when provider or project setup was required. Report
   relevant warnings and complete only the repairs needed for the original task.

### Resource scope and effects
Runtime bootstrap can install global tools and update PATH. Project setup writes
the target repository's OMA definitions and vendor settings and may update
selected providers' HOME configuration. This skill does not authorize publication,
account changes or messages to others.

### Guardrails
- Keep `OMA_INSTALL_NO_RUN=1` in headless bootstrap commands: interactive setup
  reads from `/dev/tty` and can hang.
- Preserve existing installations and local edits. If project setup falls outside
  the authorized task, request that missing authorization without stopping
  independent work.
- Do not install the project into the plugin checkout or the Bot's HOME.

## References
- [Linux/macOS bootstrap](../../../cli/install.sh) (dependency provisioning).
- [Windows bootstrap](../../../cli/install.ps1) (native Windows environments).
