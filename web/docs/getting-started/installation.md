---
title: Installation
description: Install oh-my-agent, choose skills and providers, understand the generated project files, configure model and runtime defaults, and verify the setup with oma doctor.
---

# Installation

## Prerequisites

- **An AI-powered IDE or CLI**: at least one supported host such as Claude Code, Codex CLI, Qwen Code, Antigravity CLI (`agy`), Cursor, OpenCode, Kimi Code CLI, Kiro, CommandCode, pi, GitHub Copilot, or Hermes
- **bun**: JavaScript runtime and package manager (auto-installed by the install script if missing)
- **uv**: Python package manager (the bootstrap script offers to install it when missing)
- **Code intelligence provider**: Serena is the default provider. Gortex is also supported when selected in provider configuration. The installer can bootstrap Serena with `uv tool install`; it continues with a warning when an optional dependency is unavailable. With Gortex selected, project-mode `oma install` and `oma update` register the project with the Gortex daemon (`gortex track`) when it is not tracked yet and add OMA's generated directories to that project's exclude list through the Gortex CLI; nothing is written into the project tree. Gortex itself must be installed separately.

The installer groups integrations by capability. Hook vendors include Antigravity, Claude, Codex, CommandCode, Cursor, Grok, Kimi, Kiro, and Qwen; OpenCode and pi use extension bridges; GitHub Copilot and Hermes receive skill links; and ZCode receives workflow commands. You can select more than one vendor, but the first task only needs the host you plan to use.

---

## Method 1: one-liner install (recommended)

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Both bootstrap scripts behave the same way:
1. Detects your platform (macOS, Linux, or Windows)
2. Checks for bun and uv (and serena if chosen) — installing them if missing
3. Runs the interactive installer with preset and provider selection
4. Creates `.agents/` with your selected skills and configuration
5. Sets up runtime integration layers (hooks, symlinks, settings for detected vendors)
6. Configures code-intelligence and memory MCP servers

The bootstrap continues after optional dependency failures and reports follow-up commands. Run `oma doctor` after the installer finishes.

---

## Method 2: manual install via bunx

```bash
bunx oh-my-agent@latest
```

This launches the interactive installer without the dependency bootstrap. You need bun already installed.

The installer prompts you to select a skill preset. The current presets are defined in `cli/constants/skill-data.ts`:

### Presets

| Preset | Skills Included |
|--------|----------------|
| **all** | All 33 current skill packages |
| **fullstack** | Architecture, brainstorming, design, frontend, backend, mobile, database, PM, QA, debugging, SCM, Terraform, and developer workflow |
| **fullstack-web** | Fullstack web implementation, architecture, design, PM, QA, debugging, SCM, and developer workflow |
| **fullstack-mobile** | Mobile-focused fullstack implementation, architecture, design, PM, QA, debugging, SCM, and developer workflow |
| **frontend** | Architecture, brainstorming, design, frontend, PM, QA, debugging, and SCM |
| **backend** | Architecture, brainstorming, backend, database, PM, QA, debugging, SCM, and developer workflow |
| **mobile** | Architecture, brainstorming, mobile, PM, QA, debugging, and SCM |
| **devops** | Architecture, brainstorming, Terraform, developer workflow, observability, PM, QA, debugging, and SCM |
| **research** | Scholar, market, PDF, HWP, academic writing, search, translation, and SCM |
| **content** | Design, image, voice, academic writing, translation, and SCM |

Presets are skill bundles; they do not create one subagent definition per skill. The `all` preset expands from the live skill registry, so the list can grow with the repository. Domain presets include only the skills needed for that focus.

The shared resources (`_shared/`) are always installed regardless of preset. This includes core routing, context loading, prompt structure, vendor detection, execution protocols, and memory protocol.

### What gets created

After installation, your project will contain:

```
.agents/
├── oma-config.yaml # Your preferences
├── oma-config.cue # Optional schema-backed configuration
├── skills/
│ ├── _shared/ # Shared resources (always installed)
│ │ ├── core/ # skill-routing, context-loading, etc.
│ │ ├── runtime/ # memory-protocol, execution-protocols/
│ │ └── conditional/ # quality-score, experiment-ledger, etc.
│ ├── oma-frontend/ # Per preset
│ │ ├── SKILL.md
│ │ └── resources/
│ └── ... # Other selected skills
├── workflows/ # Current workflow definitions (21 in this checkout)
├── agents/ # Subagent definitions
├── mcp.json # MCP server configuration
├── results/ # Plans and agent results (populated by workflows)
└── state/ # Persistent workflow and coordination state

.claude/
├── settings.json # Vendor settings, when Claude Code is selected
├── hooks/oma-hook.sh # Generated wrapper for the in-process hook chain
├── hooks/hud.ts # Optional [OMA] statusline indicator
├── skills/ # Symlinks → .agents/skills/
└── agents/ # Generated native subagent files, when supported

.agents/state/memories/
└── ... # Runtime coordination state
```

The installer only creates vendor directories for the hosts you select. Hook source remains in `.agents/hooks/core/`; generated vendor files are integration outputs. Serena may also use a legacy `.serena/memories/` directory in older projects.

---

## Method 3: global install

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
oma doctor --profile # Show resolved model/CLI per dispatch role
oma dashboard terminal # Terminal monitoring
oma dashboard web # Web dashboard at http://localhost:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update oh-my-agent
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # MCP stdio ↔ Streamable HTTP bridge
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives (alias: `oma s`)
oma image # Multi-vendor AI image generation (alias: `oma img`)
oma video # Video generation and capture
oma slide # Presentation generation and export
oma export # Export skills for external IDEs (e.g. cursor)
oma star # Star the repository
```

`oma` is short for `oh-my-agent`. Both work as CLI commands.

---

## AI CLI tool installation

You need at least one AI CLI tool installed. oh-my-agent supports multiple vendors, and you can mix them by using different CLIs for different agents via the agent-CLI mapping.

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

### Antigravity CLI (`agy`)

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

Authentication is handled by `agy` on first run. The binary is `agy`. For headless environments, set the `ANTIGRAVITY_API_KEY` environment variable instead. `oma doctor` reports auth state via `~/.gemini/antigravity-cli/cache/onboarding.json`.

---

## oma-config.yaml

The `oma install` command creates `.agents/oma-config.yaml`. This is the central configuration file for all oh-my-agent behavior:

```yaml
# Required
language: en
model_preset: auto          # follows the current runtime's native model settings

# Optional — date/time preferences
date_format: ISO
timezone: Australia/Sydney  # omit to use the system timezone

# Optional — auto-update the CLI in background
auto_update_cli: true
telemetry: false

# Optional — capability providers (defaults are context7/native/serena/agentmemory)
# providers:
#   docs: context7
#   web: native
#   code_intelligence: serena
#   semantic_memory: agentmemory

# Optional — browser DevTools MCP. Omit to preserve the current setup.
# mcp:
#   devtools_browsers: [aside]

# Optional — partial override per agent (object-only, shallow merge)
agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.6 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-5.5, effort: high }
```

### Field reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `language` | string | Yes | Response language code. Supports en, ko, ja, zh, es, fr, de, pt, ru, nl, pl. |
| `model_preset` | string | Yes | Active preset key. `auto` follows the current runtime; fixed keys include `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro`, and `mixed`. Custom preset keys are also valid. See [Per-Agent Models](../guide/per-agent-models.md). |
| `default_cli` | string | No | Fallback CLI for `oma agent spawn` when explicit agent settings and the selected preset do not resolve a vendor. |
| `free` | map | No | FreeLLMAPI gateway settings used when `model_preset: free`; keep API keys in environment variables. |
| `providers` | map | No | Capability providers: `code_intelligence` (`serena` or `gortex`), `docs` (`context7`), `web` (`native` or `brave`), and `semantic_memory` (`agentmemory`, `honcho`, or `none`). |
| `date_format` | string | No | Timestamp format (`ISO`, `US`, `EU`). Default: `ISO`. |
| `timezone` | string | No | Timezone identifier (for example, `Asia/Seoul`). Omitted values use the host system timezone. |
| `auto_update_cli` | boolean | No | Whether routine CLI checks may update in the background. Default: `true` (opt out with `false`). |
| `telemetry` | boolean | No | Vendor telemetry opt-in. Default: `false`. |
| `agents` | map | No | Partial per-agent overrides (object-only `AgentSpec`). Shallow-merged over preset defaults. |
| `models` | map | No | User-defined model slugs, formerly in `models.yaml`. |
| `custom_presets` | map | No | User-defined presets. Supports `extends:` for partial inheritance from a built-in preset. |
| `mcp.devtools_browsers` | list | No | Browsers for DevTools MCP: `aside`, `chrome`, or `firefox`. Omitted preserves the existing setup; `[]` explicitly disables the browser server. |
| `serena.mode` | string | No | `bridge` shares a project Serena server and is the default; `stdio` opts into one process per session. |
| `serena.auto_update` | boolean | No | Whether `oma update` upgrades Serena. Default: `true`. |

> **Configuration format:** A valid `.agents/oma-config.cue` is evaluated as the shared configuration. If shared CUE evaluation fails, the loader can fall back to `.agents/oma-config.yaml`; a local overlay (`oma-config.local.cue` or `.yaml`) is optional and invalid local intent is fatal. `OMA_MODEL_PRESET` overrides the file value for the current process.

### Vendor resolution

When spawning an agent, the CLI resolves settings in this order: `agents.<id>`, the selected `model_preset`, the preset orchestrator fallback, then `default_cli`. With `model_preset: auto`, the current runtime's native configuration supplies the model; an unknown runtime falls back to `default_cli`. See [Per-Agent Models](../guide/per-agent-models.md) for the full matrix.

---

## Verification: `oma doctor`

After installation and setup, verify everything is working:

```bash
oma doctor
```

This command checks:
- The selected host CLI is installed and accessible; optional tools are reported separately
- Configured MCP server entries are valid (for example, Serena, Gortex, Context7, or DevTools)
- Skill files exist with valid SKILL.md frontmatter
- Symlinks and hook scripts point to valid targets
- Hooks are properly configured in vendor settings files
- Selected code-intelligence and memory providers are reachable (with Gortex, also whether the current project is in the daemon's tracked set)
- `oma-config.cue` / `oma-config.yaml` is valid with required fields

If anything is wrong, `oma doctor` identifies the missing or invalid item and separates first-task blockers from optional integration warnings.

To inspect the resolved model and CLI for every agent, run:

```bash
oma doctor --profile
```

See [Per-Agent Models](../guide/per-agent-models.md) for the full matrix and migration details.

---

## Updating

### CLI update

```bash
oma update
```

This updates the global oh-my-agent CLI to the latest version.

### Project skills update

Skills and workflows within a project can be updated via the GitHub Action (`action/`) for automated updates, or manually by re-running the installer:

```bash
bunx oh-my-agent@latest
```

The installer detects existing installations and offers to update while preserving your `oma-config.yaml` and any custom configuration.

---

## What is next

Open your project in the selected AI IDE or CLI and start using oh-my-agent. Skill routing depends on the host; enabled hooks can detect workflows. Try:

```
"Build a login form with email validation using Tailwind CSS"
```

Or use a workflow command:

```
/plan authentication feature with JWT and refresh tokens
```

See the [Usage Guide](/docs/guide/usage) for detailed examples, or learn about [Agents](/docs/core-concepts/agents) to understand what each specialist does.
