---
name: oma-bootstrap
description: Install or verify the oma CLI before any oma-* skill, agent, or workflow runs an `oma` command. Use when `oma` is missing from PATH, when a skill says to run `oma ...` and the shell reports "command not found", or on the first task in a fresh Cursor or Grok Bot workspace.
---

# oma bootstrap

The oma-* skills in this plugin describe *what* to do. Several of them delegate
the mechanics to the `oma` CLI (`oma agent spawn`, `oma market run`,
`oma recap`, `oma hook run`, `oma doctor`). Marketplace installs ship the
skill text, not the binary, so a fresh workspace may not have `oma` yet.

## When to run

- A skill instruction contains an `oma ...` command and `command -v oma` is empty.
- The shell reports `oma: command not found`.
- The workspace has no `.agents/` directory and a skill needs project state
  (`.agents/state/`, `.agents/results/`, `oma-config.yaml`).

Skip this skill when `oma --version` already prints a version.

## Steps

1. Check: `command -v oma && oma --version`. If both succeed, stop here.
2. Install the CLI (first option that works):

   ```bash
   # bun available
   bun install --global oh-my-agent

   # npm only
   npm install --global oh-my-agent

   # no global install allowed: use it ad hoc
   bunx oh-my-agent@latest --version   # or: npx oh-my-agent@latest --version
   ```

3. Wire the project non-interactively from the repository root. This creates
   `.agents/` with the default preset and leaves existing files untouched:

   ```bash
   oma install --yes
   ```

4. Verify: `oma doctor`. Report any warning it prints before continuing with
   the original task.

## Rules

- Ask before `oma install --yes` when the repository is not yours or when
  `.agents/` already exists with local changes.
- Do not fall back to re-implementing an `oma` command by hand. If the CLI
  cannot be installed, say so and complete only the parts of the task that do
  not need it.
- Keep the one-liner installers (`curl ... | bash`) for interactive sessions;
  they prompt for presets and vendors and are not suited to a headless Bot.
