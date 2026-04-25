---
title: Installation
description: Complete installation guide for oh-my-agent — three install methods, all six presets with their skill lists, CLI tool requirements for all four vendors, post-install configuration, oma-config.yaml fields, and verification with oma doctor.
---

# Installation

## Prerequisites

- **An AI-powered IDE or CLI** — at least one of: Claude Code, Gemini CLI, Codex CLI, Qwen CLI, Antigravity IDE, Cursor, or OpenCode
- **bun** — JavaScript runtime and package manager (auto-installed by the install script if missing)
- **uv** — Python package manager for Serena MCP (auto-installed if missing)

---

## Method 1: One-Liner Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

This bootstrap script supports macOS and Linux only. On Windows, install `bun` and `uv` manually, then run `bunx oh-my-agent@latest`.

This script:
1. Detects your platform (macOS, Linux)
2. Checks for bun and uv, installing them if missing
3. Runs the interactive installer with preset selection
4. Creates `.agents/` with your selected skills
5. Sets up `.claude/` integration layer (hooks, symlinks, settings)
6. Configures Serena MCP if detected

Typical install time: under 60 seconds.

---

## Method 2: Manual Install via bunx

```bash
bunx oh-my-agent@latest
```

This launches the interactive installer without the dependency bootstrap. You need bun already installed.

The installer prompts you to select a preset, which determines which skills are installed:

### Presets

| Preset | Skills Included |
|--------|----------------|
| **all** | oma-brainstorm, oma-pm, oma-frontend, oma-backend, oma-db, oma-mobile, oma-design, oma-qa, oma-debug, oma-tf-infra, oma-dev-workflow, oma-translator, oma-orchestrator, oma-scm, oma-coordination |
| **fullstack** | oma-frontend, oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **frontend** | oma-frontend, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **backend** | oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **mobile** | oma-mobile, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **devops** | oma-tf-infra, oma-dev-workflow, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |

Every preset includes oma-pm (planning), oma-qa (review), oma-debug (bug fixing), oma-brainstorm (ideation), and oma-scm (git) as baseline agents. Domain-specific presets add the relevant implementation agents on top.

The shared resources (`_shared/`) are always installed regardless of preset. This includes core routing, context loading, prompt structure, vendor detection, execution protocols, and memory protocol.

### What Gets Created

After installation, your project will contain:

```
.agents/
├── config/
│ └── oma-config.yaml # Your preferences
├── skills/
│ ├── _shared/ # Shared resources (always installed)
│ │ ├── core/ # skill-routing, context-loading, etc.
│ │ ├── runtime/ # memory-protocol, execution-protocols/
│ │ └── conditional/ # quality-score, experiment-ledger, etc.
│ ├── oma-frontend/ # Per preset
│ │ ├── SKILL.md
│ │ └── resources/
│ └── ... # Other selected skills
├── workflows/ # All 16 workflow definitions
├── agents/ # Subagent definitions
├── mcp.json # MCP server configuration
├── results/plan-{sessionId}.json # Empty (populated by /plan)
├── state/ # Empty (used by persistent workflows)
└── results/ # Empty (populated by agent runs)

.claude/
├── settings.json # Hooks and permissions
├── hooks/
│ ├── triggers.json # Keyword-to-workflow mapping (11 languages)
│ ├── keyword-detector.ts # Auto-detection logic
│ ├── persistent-mode.ts # Persistent workflow enforcement
│ └── hud.ts # [OMA] statusline indicator
├── skills/ # Symlinks → .agents/skills/
└── agents/ # Subagent definitions for IDE

.serena/
└── memories/ # Runtime state (populated during sessions)
```

---

## Method 3: Global Install

For CLI-level usage (dashboards, agent spawning, diagnostics), install oh-my-agent globally:

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun global

```bash
bun install --global oh-my-agent
# or
npm install --global oh-my-agent
```

This installs the `oma` command globally, giving you access to all CLI commands from any directory:

```bash
oma doctor # Health check
oma dashboard # Terminal monitoring
oma dashboard:web # Web dashboard at http://localhost:9847
oma agent:spawn # Spawn agents from terminal
oma agent:parallel # Parallel agent execution
oma agent:status # Check agent status
oma agent:review # Code review via external CLI (codex/claude/gemini/qwen)
oma stats # Session statistics
oma retro # Engineering retrospective (commits, hotspots, trends)
oma recap # Conversation history recap across AI tools
oma cleanup # Clean up session artifacts
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update oh-my-agent
oma verify # Verify agent output (build/test/scope/secrets)
oma visualize # Dependency visualization (alias: `oma viz`)
oma describe # Introspect CLI commands as JSON
oma bridge # MCP stdio ↔ Streamable HTTP bridge
oma memory:init # Initialize Serena memory schema
oma auth:status # Check CLI auth status (gh/gemini/claude/codex/qwen)
oma search # Mechanical search primitives (alias: `oma s`)
oma image # Multi-vendor AI image generation (alias: `oma img`)
oma export # Export skills for external IDEs (e.g. cursor)
oma star # Star the repository
```

`oma` is short for `oh-my-agent`. Both work as CLI commands.

---

## AI CLI Tool Installation

You need at least one AI CLI tool installed. oh-my-agent supports four vendors, and you can mix them — using different CLIs for different agents via the agent-CLI mapping.

### Gemini CLI

```bash
bun install --global @google/gemini-cli
# or
npm install --global @google/gemini-cli
```

Authentication is automatic on first run. Gemini CLI reads skills from `.agents/skills/` by default.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# or
npm install --global @anthropic-ai/claude-code
```

Authentication is automatic on first run. Claude Code uses `.claude/` for hooks and settings, with skills symlinked from `.agents/skills/`.

### Codex CLI

```bash
bun install --global @openai/codex
# or
npm install --global @openai/codex
```

After install, run `codex login` to authenticate.

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

After install, run `/auth` inside the CLI to authenticate.

---

## oma-config.yaml

The `oma install` command creates `.agents/oma-config.yaml`. This is the central configuration file for all oh-my-agent behavior:

```yaml
# Required
language: en
model_preset: gemini-only   # built-in: claude-only, codex-only, gemini-only, qwen-only, antigravity

# Optional — date/time preferences
date_format: ISO
timezone: UTC

# Optional — auto-update the CLI in background
auto_update_cli: true

# Optional — partial override per agent (object-only, shallow merge)
agents:
  backend: { model: openai/gpt-5.3-codex, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }

# Optional — user-defined model slugs
# models:
#   my-model: { cli: gemini, cli_model: gemini-3-flash, supports: { thinking: true } }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude-only
#     agent_defaults:
#       backend: { model: openai/gpt-5.3-codex, effort: high }
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `language` | string | Yes | Response language code. Supports en, ko, ja, zh, es, fr, de, pt, ru, nl, pl. |
| `model_preset` | string | Yes | Active preset key. One of the five built-in keys or a `custom_presets` key. See [Per-Agent Models](../guide/per-agent-models.md). |
| `date_format` | string | No | Timestamp format (`ISO`, `US`, `EU`). Default: `ISO`. |
| `timezone` | string | No | Timezone identifier (e.g., `Asia/Seoul`). Default: `UTC`. |
| `agents` | map | No | Partial per-agent overrides (object-only `AgentSpec`). Shallow-merged over preset defaults. |
| `models` | map | No | User-defined model slugs, formerly in `models.yaml`. |
| `custom_presets` | map | No | User-defined presets. Supports `extends:` for partial inheritance from a built-in preset. |

### Vendor Resolution

When spawning an agent, the CLI vendor is resolved from the active `model_preset` (and any `agents:` overrides). See [Per-Agent Models](../guide/per-agent-models.md) for full details.

---

## Verification: `oma doctor`

After installation and setup, verify everything is working:

```bash
oma doctor
```

This command checks:
- All required CLI tools are installed and accessible
- MCP server configuration is valid
- Skill files exist with valid SKILL.md frontmatter
- Symlinks in `.claude/skills/` point to valid targets
- Hooks are properly configured in `.claude/settings.json`
- Memory provider is reachable (Serena MCP)
- `oma-config.yaml` is valid YAML with required fields

If anything is wrong, `oma doctor` tells you exactly what to fix, with copy-paste commands.

To inspect the resolved model and CLI for every agent, run:

```bash
oma doctor --profile
```

See [Per-Agent Models](../guide/per-agent-models.md) for the full matrix and migration details.

---

## Updating

### CLI Update

```bash
oma update
```

This updates the global oh-my-agent CLI to the latest version.

### Project Skills Update

Skills and workflows within a project can be updated via the GitHub Action (`action/`) for automated updates, or manually by re-running the installer:

```bash
bunx oh-my-agent@latest
```

The installer detects existing installations and offers to update while preserving your `oma-config.yaml` and any custom configuration.

---

## What is Next

Open your project in your AI IDE and start using oh-my-agent. Skills are auto-detected. Try:

```
"Build a login form with email validation using Tailwind CSS"
```

Or use a workflow command:

```
/plan authentication feature with JWT and refresh tokens
```

See the [Usage Guide](/docs/guide/usage) for detailed examples, or learn about [Agents](/docs/core-concepts/agents) to understand what each specialist does.
