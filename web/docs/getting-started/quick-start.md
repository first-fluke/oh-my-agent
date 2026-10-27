---
title: Quick Start
description: Choose one skill or a runtime preset, then run a scoped first task with observed verification.
---

# Quick Start

Use one focused task to check the result. Load a skill in the coding agent you already use, or install the runtime when you need project hooks, specialist agents, and workflows. [Choose a setup](./choose-setup.md) explains the available paths and their dependencies.

## 1. Choose the setup {#1-install}

For the read-only Git task below, ask your agent to load the skill and read its instructions and support directory:

```bash
bunx skills use first-fluke/oh-my-agent@oma-scm
```

Continue with the task in Step 3. The skill's CLI operations, other skills, project rules, and external services remain separate dependencies. Loading this skill does not run the OMA installer.

### Install the runtime when needed

The runtime bootstrap can prepare `bun`, `uv`, Serena, CUE, and the global `oma` command. Select the AI CLI or IDE you already use; provider and browser integrations depend on the tasks you plan to run.

From the project directory, run the bootstrap installer:

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

On Windows PowerShell, run:

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

The interactive setup asks for the response language, CLI vendors, [capability providers](./glossary.md#capability-provider), [model preset](./glossary.md#model-preset), project [skill preset](./glossary.md#skill-preset), and any stack variant. For a first run, keep the defaults, select the vendor you already use, and choose the project preset closest to the repository. See [Presets](./installation.md#presets) for each preset's skills and for [workflows that need skills outside a preset](./installation.md#workflows-that-need-skills-outside-a-preset).

If you already have `bun`, use the installer directly:

```bash
bunx oh-my-agent@latest
```

The bootstrap scripts install into the current project. Use `oma install --global` when you want a HOME-level install; read [Global Install](../guide/global-install.md) before mixing project and global installs.

## 2. Check the result

For temporary skill loading, confirm that the agent read the selected instructions
and verify the task itself. For a runtime installation, run the health check from
the same project directory:

```bash
oma doctor
```

The text command prints a report with sections such as `CLI Status` and `Skills Status`, then returns the shell status. The exact rows depend on the hosts installed in the project:

```text
┌   🩺 oh-my-agent doctor
◇  CLI Status ...
◇  Skills Status ...
$ echo $?
0
```

`oma doctor` may report optional integration issues as warnings. Default AgentMemory preparation is checked during `oma install` and `oma update`; installation, startup, or health failures stop those commands. Selecting `providers.semantic_memory: none` or `honcho`, or setting `OMA_NO_AGENTMEMORY=1`, skips that preparation.

For a machine-readable status, `oma doctor --json` returns a non-zero status when the report contains issues. Use `oma doctor --profile` to inspect the resolved model and CLI for each canonical agent role.

If `oma` is unavailable but Bun is installed, run the same check without the global command:

```bash
bunx oh-my-agent@latest doctor
```

If the bare command is still missing, open a new shell or add the package manager's bin directory to `PATH`; [Installation](./installation.md#method-3-global-install) shows how to install the `oma` command. If `oma doctor` reports an invalid configuration, fix the named field and run it again. Do not delete `.agents/oma-config.yaml` to recover: it is the user-owned configuration that preserves settings across updates.

## 3. Run one small task

Open an existing Git repository in your AI tool. Use the loaded `oma-scm` skill,
or the copy installed by a named runtime preset. If you used Custom selection,
include `oma-scm` for this example:

```text
Use oma-scm to inspect this repository's current branch and working tree. Do not edit, stage, commit, or contact remotes. Report staged, unstaged, and untracked changes, with the Git commands and exit statuses actually observed.
```

Compare the reported branch and changes with the actual Git output. The agent
should report which commands ran and their exit statuses. This read-only task
needs no code test or build.

When the keyword hook is enabled for the selected host, it can activate a matching workflow. Skill routing is performed by the host or the selected workflow, so an arbitrary host prompt does not guarantee a hook, a particular skill, or a `CHARTER_CHECK`. The execution contract should still inspect repository conventions, respect the requested read-only scope, and report the observed checks. The exact files and command depend on the project.

For a task that crosses API and UI boundaries, select `/work` or `/orchestrate` explicitly. For a single domain, continue with [Single Skill Execution](../guide/single-skill.md). The [Usage Guide](../guide/usage.md) contains longer examples.

## 4. Know the runtime defaults before scaling up

Temporary skill loading does not configure these runtime defaults. For project
hooks, provider setup, or team workflows, use the runtime path in
[Choose a setup](./choose-setup.md).

OMA starts with `model_preset: auto`, Serena for code intelligence, Agent Memory for semantic memory, native web search, and telemetry disabled. Serena uses the shared `bridge` transport and automatically updates unless configured otherwise. Browser DevTools MCP is opt-in; a fresh interactive setup offers Aside first. See [Important Defaults](./important-defaults.md) for the consequences and the override keys.

If a managed task stalls, start with `oma agent status <session-id> [agent-id]`, then inspect its receipt under `.agents/state/agent-runs/` and the injected structured claim path. Those records show the run, task, workspace, exit code, and verification status. Human-readable `result-*.md` and `progress-*.md` files under `.agents/state/memories/` add context when present. Rerun only the smallest failed command after confirming the run is no longer active. A [persistent workflow](./glossary.md#persistent-workflow) remains active until it completes or you say `workflow done`; see [Workflows](../core-concepts/workflows.md#persistent-mode-mechanics) for state-file recovery.

## Next steps

- [Choose a setup](./choose-setup.md) for one skill, a runtime preset, or the Claude Code plugin
- [Important Defaults](./important-defaults.md) for precedence, providers, and recovery choices
- [Installation](./installation.md) for presets, vendor setup, global installs, and updates
- [Agents](../core-concepts/agents.md) for the 33 skill packages and dispatch roles
- [Workflows](../core-concepts/workflows.md) for planning, parallel execution, QA, and persistent modes
- [Troubleshooting](../guide/troubleshooting.md) when the install, a vendor, or a hook does not behave as expected
