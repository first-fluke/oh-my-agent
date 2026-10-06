---
name: oma-bootstrap
description: Install or verify the oma CLI and its runtimes (bun, uv, serena) before any oma-* skill, agent, or workflow runs an `oma` command. Use when `oma` is missing from PATH, when a skill says to run `oma ...` and the shell reports "command not found", or on the first task in a fresh Cursor or Grok Bot workspace.
---

# oma bootstrap

The oma-* skills in this plugin describe *what* to do. Several of them delegate
the mechanics to the `oma` CLI (`oma agent spawn`, `oma market run`,
`oma recap`, `oma hook run`, `oma doctor`), and code search expects the
Serena MCP binary. Marketplace installs ship the skill text, not the binaries,
so a fresh workspace may have neither.

## When to run

- A skill instruction contains an `oma ...` command and `command -v oma` is empty.
- The shell reports `oma: command not found` or `serena: command not found`.
- The workspace has no `.agents/` directory and a skill needs project state
  (`.agents/state/`, `.agents/results/`, `oma-config.yaml`).

Skip this skill when `oma --version` already prints a version.

## Steps

Run from the repository root. Every step is idempotent; rerunning is safe.

1. Check: `command -v oma && oma --version`. If both succeed, stop here.
2. Provision the runtimes with the official installer in non-interactive
   mode. It installs bun, uv, serena-agent, and cue when missing, and
   `OMA_INSTALL_NO_RUN=1` skips the interactive setup it would otherwise
   launch at the end:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh \
     | OMA_INSTALL_NO_RUN=1 bash
   export PATH="$HOME/.bun/bin:$HOME/.local/bin:$PATH"
   ```

   Without `curl`, use `wget -qO-` in its place. Each dependency is
   best-effort: the installer warns and continues when one fails.

3. Install the CLI as a persistent global binary (skills call bare `oma`):

   ```bash
   bun install --global oh-my-agent
   ```

4. Wire the project non-interactively. This creates `.agents/` with the
   default preset and leaves existing files untouched:

   ```bash
   oma install --yes
   ```

5. Verify: `oma doctor`. It reports whether `serena` is on PATH and whether
   the project is registered. Report any warning before continuing with the
   original task.

## Rules

- Ask before `oma install --yes` when the repository is not yours or when
  `.agents/` already exists with local changes.
- Do not fall back to re-implementing an `oma` command by hand. If the CLI
  cannot be installed, say so and complete only the parts of the task that do
  not need it.
- Do not run the installer without `OMA_INSTALL_NO_RUN=1` in a headless Bot:
  the interactive setup reads from `/dev/tty` and hangs.
- If `serena` is still missing after step 2, run
  `uv tool install -p 3.13 serena-agent@latest --prerelease=allow` once, then
  `uv tool update-shell`.
