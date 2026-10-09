---
title: Quick Start
description: Run one scoped task from install through verification, with expected output and recovery.
---

# Quick Start

Use this page to run one small task and record a concrete result. You need a project directory and at least one supported AI CLI or IDE. The installer can bootstrap `bun`, `uv`, Serena, and CUE on macOS, Linux, or Windows; the selected host integration is required for the first prompt, while provider and browser integrations are optional.

## 1. Install

### Fastest path — skills into your agents

```bash
npx skills add first-fluke/oh-my-agent
```

This installs the OMA skill pack into detected agent runtimes (Claude Code, Cursor, Codex, and more). Skills teach the agent how to work. For stop-hook gates, artifact verification, independent judges, and the `oma` CLI, install the full harness below.

Skills-only installs do not provide the `oma` CLI, hooks, workflows, or judges. Use a named installed skill for the first task below; use the full harness when you need the CLI checks.

### Full harness (gates, hooks, CLI)

From the project directory, run the bootstrap installer:

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

On Windows PowerShell, run:

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

The interactive setup asks for the response language, CLI vendors, capability providers, model preset, project skill preset, and any stack variant. For a first run, keep the defaults, select the vendor you already use, and choose the project preset closest to the repository.

If you already have `bun`, use the installer directly:

```bash
bunx oh-my-agent@latest
```

The bootstrap scripts install into the current project. Use `oma install --global` when you want a HOME-level install; read [Installation](./installation.md) before mixing project and global installs.


## 2. Check the result (full harness only)

If you installed the full harness, run the health check from the same project directory:

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

If the bare command is still missing, open a new shell or add the package manager's bin directory to `PATH`. If `oma doctor` reports an invalid configuration, fix the named field and run it again. Do not delete `.agents/oma-config.yaml` to recover: it is the user-owned configuration that preserves settings across updates.

If you installed skills only, skip this CLI check and continue to the named-skill task below.

## 3. Run one small task

Open the repository in the configured AI tool and ask for one named skill and one self-contained result:

```text
Use the discovered `oma-docs` skill to check one existing link in this project's README. If it is stale, update only that link. Done when you report the inspected target, the exact verification command, and its exit status.
```

The host should identify the selected skill, inspect one target, and report either a focused link edit or that the link is already valid. Include the command output and exit status for any check that actually ran. A skills-only install does not add `/debug`, `/ralph`, hooks, or workflow gates; asking for the named skill keeps this first task within the installed capabilities.

When the keyword hook is enabled for the selected host, it can activate a matching workflow. Skill routing is performed by the host or the selected workflow, so an arbitrary host prompt does not guarantee a hook, a particular skill, or a `CHARTER_CHECK`. The execution contract should still inspect repository conventions, make only the scoped change, and report its verification. The exact files and command depend on the project.

For a task that crosses API and UI boundaries, select `/work` or `/orchestrate` explicitly. For a single domain, continue with [Single Skill Execution](../guide/single-skill.md). The [Usage Guide](../guide/usage.md) contains longer examples.

## 4. Know the defaults before scaling up

OMA starts with `model_preset: auto`, Serena for code intelligence, Agent Memory for semantic memory, native web search, and telemetry disabled. Serena uses the shared `bridge` transport and automatically updates unless configured otherwise. Browser DevTools MCP is opt-in; a fresh interactive setup offers Aside first. See [Important Defaults](./important-defaults.md) for the consequences and the override keys.

If a managed task stalls, start with `oma agent status <session-id> [agent-id]`, then inspect its receipt under `.agents/state/agent-runs/` and the injected structured claim path. Those records show the run, task, workspace, exit code, and verification status. Human-readable `result-*.md` and `progress-*.md` files under `.agents/state/memories/` add context when present. Rerun only the smallest failed command after confirming the run is no longer active. A persistent workflow remains active until it completes or you say `workflow done`; see [Workflows](../core-concepts/workflows.md#persistent-mode-mechanics) for state-file recovery.

## Next steps

- [Important Defaults](./important-defaults.md) for precedence, providers, and recovery choices
- [Installation](./installation.md) for presets, vendor setup, global installs, and updates
- [Agents](../core-concepts/agents.md) for the 33 skill packages and dispatch roles
- [Workflows](../core-concepts/workflows.md) for planning, parallel execution, QA, and persistent modes
