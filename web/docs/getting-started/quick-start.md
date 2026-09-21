---
title: Quick Start
description: The shortest path from an empty project to a verified oh-my-agent prompt, with expected results and recovery steps.
---

# Quick Start

Use this page when you want to confirm the harness works before reading the full reference. You need a project directory and at least one supported AI CLI or IDE. The installer can bootstrap `bun`, `uv`, Serena, and CUE on macOS, Linux, or Windows; the selected host integration is required for the first prompt, while provider and browser integrations are optional.

## 1. Install

### Fastest path — skills into your agents

```bash
npx skills add first-fluke/oh-my-agent
```

This installs the OMA skill pack into detected agent runtimes (Claude Code, Cursor, Codex, and more). Skills teach the agent how to work. For stop-hook gates, artifact verification, independent judges, and the `oma` CLI, install the full harness below.

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


## 2. Check the result

Run the health check from the same project directory:

```bash
oma doctor
```

Success means the selected vendor integration and `.agents/` files are ready. Optional MCP, browser, memory, or code-intelligence integrations may be reported as warnings; they are needed only for tasks that use them. Use `oma doctor --profile` to inspect the resolved model and CLI for each canonical agent role.

If the command is missing, the CLI was installed outside your current `PATH`; open a new shell or add the package manager's bin directory. If `oma doctor` reports an invalid configuration, fix the named field and run it again. Do not delete `.agents/oma-config.yaml` to recover: it is the user-owned configuration that preserves settings across updates.

## 3. Run one small task

Open the repository in the configured AI tool and describe one self-contained change:

```text
Add a validation message to the existing email field. Follow the project's current form and test conventions. Done when the invalid-email case is covered by a focused test.
```

When the keyword hook is enabled for the selected host, it can activate a matching workflow. Skill routing is performed by the host or the selected workflow, so an arbitrary host prompt does not guarantee a hook, a particular skill, or a `CHARTER_CHECK`. The execution contract should still inspect repository conventions, make only the scoped change, and report its verification. The exact files and command depend on the project; the prompt above is illustrative.

For a task that crosses API and UI boundaries, select `/work` or `/orchestrate` explicitly. For a single domain, continue with [Single Skill Execution](../guide/single-skill.md). The [Usage Guide](../guide/usage.md) contains longer examples.

## 4. Know the defaults before scaling up

OMA starts with `model_preset: auto`, Serena for code intelligence, Agent Memory for semantic memory, native web search, and telemetry disabled. Serena uses the shared `bridge` transport and automatically updates unless configured otherwise. Browser DevTools MCP is opt-in; a fresh interactive setup offers Aside first. See [Important Defaults](./important-defaults.md) for the consequences and the override keys.

If a managed task stalls, start with `oma agent status <session-id> [agent-id]`, then inspect its receipt under `.agents/state/agent-runs/` and the injected structured claim path. Those records show the run, task, workspace, exit code, and verification status. Human-readable `result-*.md` and `progress-*.md` files under `.agents/state/memories/` add context when present. Rerun only the smallest failed command after confirming the run is no longer active. A persistent workflow remains active until it completes or you say `workflow done`; see [Workflows](../core-concepts/workflows.md#persistent-mode-mechanics) for state-file recovery.

## Next steps

- [Important Defaults](./important-defaults.md) for precedence, providers, and recovery choices
- [Installation](./installation.md) for presets, vendor setup, global installs, and updates
- [Agents](../core-concepts/agents.md) for the 33 skill packages and dispatch roles
- [Workflows](../core-concepts/workflows.md) for planning, parallel execution, QA, and persistent modes
