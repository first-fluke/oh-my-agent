---
title: Installation
description: Install oh-my-agent, choose skills and providers, understand the generated project files, configure model and runtime defaults, and verify the setup with oma doctor.
---

# Installation

For one task, start with [a single skill](./choose-setup.md#load-one-skill). For
project hooks and team workflows, use the runtime installation below. The
[setup guide](./choose-setup.md) separates instruction loading, skill presets,
and Claude Code marketplace installation.

## Prerequisites

- **An AI-powered IDE or CLI**: at least one supported host such as Claude Code, Codex CLI, Qwen Code, Antigravity CLI (`agy`), Cursor, OpenCode, Kimi Code CLI, Kiro, CommandCode, pi, GitHub Copilot, or Hermes
- **bun**: JavaScript runtime and package manager (auto-installed by the install script if missing)
- **uv**: Python package manager (the bootstrap script offers to install it when missing)
- **Code intelligence provider**: Serena is the default provider. Gortex is also supported when selected in provider configuration. The installer can bootstrap Serena with `uv tool install`; it continues with a warning when an optional dependency is unavailable. With Gortex selected, project-mode `oma install` and `oma update` register the project with the Gortex daemon (`gortex track`) when it is not tracked yet and add OMA's generated directories to that project's exclude list through the Gortex CLI; nothing is written into the project tree. Gortex itself must be installed separately.

The installer groups integrations by capability. Hook vendors include Antigravity, Claude, Codex, CommandCode, Cursor, Grok, Kimi, Kiro, and Qwen; OpenCode and pi use extension bridges; GitHub Copilot and Hermes receive skill links; and ZCode receives workflow commands. You can select more than one vendor, but the first task only needs the host you plan to use.

---

## Method 1: one-liner install

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
3. Installs the `oma` command globally with `bun install --global oh-my-agent` unless `oma` is already on your PATH (hooks and workflows call it)
4. Runs the interactive installer with preset and provider selection
5. Creates `.agents/` with your selected skills and configuration
6. Sets up runtime integration layers (hooks, symlinks, settings for detected vendors)
7. Configures code-intelligence and memory MCP servers

The bootstrap continues after optional dependency failures and reports follow-up commands. AgentMemory is the default semantic-memory provider: `oma install` and `oma update` fail if its installation, startup, or health check fails. Selecting `providers.semantic_memory: none` or `honcho`, or setting `OMA_NO_AGENTMEMORY=1`, skips automatic AgentMemory preparation. Run `oma doctor` after the installer finishes.

### What the installer also does by default

- **Aside browser MCP**: pre-selected in the interactive setup, and installed with `curl -fsSL https://releases.aside.com/install.sh | bash` when missing, only if you keep it selected. Deselect it in the browser MCP step or later with `oma update mcp`.
- **AgentMemory service**: `bun install -g @agentmemory/agentmemory`, registered as a login service (launchd, systemd user unit, or Windows scheduled task).
- **CUE**: installed with `brew install cue` (macOS/Linux) or `winget` (Windows) by the bootstrap script, and again by `oma install` when Serena is the code-intelligence provider.
- **Writes outside the project**: `~/.claude.json` (marks the project as a trusted Claude Code workspace), `~/.serena/` (OMA context, answer-size floor, project registration), `~/.cursor/cli-config.json` (turns off Cursor's commit attribution), `~/.grok/config.toml` (telemetry), and `~/.gemini/antigravity-cli/` (HUD), each only for a selected vendor. Linking skills into home-directory vendor folders (Antigravity, Hermes, Kimi) asks first.
- **Telemetry opt-outs**: Claude `DISABLE_TELEMETRY=1` (this also turns off Claude Code Remote Control) and Gemini, Qwen, Codex, and Grok usage stats. Set `telemetry: true` to keep vendor defaults.
- **Claude Code settings**: unset keys in `.claude/settings.json` are filled in, including `skipDangerousModePermissionPrompt: true`, `effortLevel: high`, `cleanupPeriodDays: 180`, and env flags that turn off auto memory, adaptive thinking, error reporting, and built-in git instructions. Values you already set are kept.
- **Co-author trailer**: Claude Code's commit attribution becomes `Co-Authored-By: First Fluke <our.first.fluke@gmail.com>`, and PRs get a "Generated with oh-my-agent" line. Set `scm.co_author.enabled: false` to turn it off.
- **commit-msg guard**: `.githooks/commit-msg` rejects `Co-authored-by` addresses missing from `.githooks/co-authors.allow` or `scm.co_author.email`. `git config --local core.hooksPath .githooks` is set only when no other hooks are active; otherwise oma prints how to chain the guard. Set `scm.co_author.enforce_hook: false` to opt out.
- **Background updates**: `oma update` updates the `oma` CLI in the background (`auto_update_cli: false` or `OMA_SKIP_VERSION_CHECK=1` to stop it) and runs `uv tool upgrade serena-agent --prerelease=allow` (`serena.auto_update: false` to stop it).
- **Serena cleanup timer**: with Serena in the default `bridge` mode, the first agent session that starts a shared Serena server registers a timer that stops idle shared Serena servers every 5 minutes (launchd `dev.oma.serena-daemon-gc`, systemd user timer `oma-serena-daemon-gc.timer`, or Windows scheduled task `OMA Serena Daemon GC`). Set `serena.mode: stdio` to skip the shared server and its timer. `oma uninstall` does not remove the timer.
- **Non-interactive runs** (`-y`, `OMA_YES=1`, `CI=true`) use the `All` skill preset unless `--preset` selects another, plus `model_preset: auto` and Python as the backend language. They select no browser MCP (and skip the Aside install script) unless `mcp.devtools_browsers` already lists one.

---

## Method 2: manual install via bunx

```bash
bunx oh-my-agent@latest
```

This launches the interactive installer without the dependency bootstrap. You need bun already installed.

The installer prompts you to select a [skill preset](./glossary.md#skill-preset). The current presets are defined in `PRESETS` in `cli/constants/skill-data.ts`:

### Presets

Pick the preset that matches the work the repository needs. Skill names below drop the `oma-` prefix.

| Preset | Choose it when the project is | Skills included | Count |
|--------|-------------------------------|-----------------|-------|
| **all** | Any project, or you want every workflow to work out of the box | Every skill in the registry | 33 |
| **fullstack** | Web and mobile clients with a backend and Terraform infrastructure | architecture, brainstorm, design, frontend, backend, mobile, db, pm, qa, debug, scm, tf-infra, dev-workflow | 13 |
| **fullstack-web** | A web frontend with a backend and database | architecture, brainstorm, design, frontend, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **fullstack-mobile** | A mobile app with a backend and database | architecture, brainstorm, design, mobile, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **frontend** | A web UI only | architecture, brainstorm, design, frontend, pm, qa, debug, scm | 8 |
| **backend** | An API or service with a database | architecture, brainstorm, backend, db, pm, qa, debug, scm, dev-workflow | 9 |
| **mobile** | A mobile app only | architecture, brainstorm, mobile, pm, qa, debug, scm | 7 |
| **devops** | Infrastructure, CI/CD, and observability work | architecture, brainstorm, tf-infra, dev-workflow, observability, pm, qa, debug, scm | 9 |
| **security** | Security scanning, code review, and remediation | security, architecture, qa, debug, refactor, scm | 6 |
| **research** | Papers, market research, and PDF/HWP conversion | scholar, market, pdf, hwp, academic-writing, search, translation, scm | 8 |
| **content** | Design assets, images, voice, and written content | design, image, voice, academic-writing, translation, scm | 6 |

Presets are skill bundles; they do not create one subagent definition per skill. The `all` preset expands from the live skill registry, so the list can grow with the repository. Domain presets include only the skills for that focus.

Choose a preset from the command line:

```bash
oma install --preset frontend --yes
```

`--preset` uses the names in the table and takes priority over the interactive
skill prompt and the non-interactive `all` default. An unknown name is rejected
before installation begins. Omitting the option keeps the existing selection
flow. The option selects skills; shared files, agents, workflows, hooks and
provider setup still follow the runtime installer. Reinstalling with a smaller
preset retains previously installed skills. Custom selection is available only
through the interactive menu; `custom` and empty values are not accepted by
`--preset`.

After installation, read the selected-skill list and workflow availability
report. A workflow is exposed only when its required skill manifests have valid
names and descriptions. Existing retained skills can satisfy those requirements.
Conditional references are reported separately and do not expand the selected
preset. This check covers manifests; tools, providers, credentials, and execution
still need their own checks.

### Workflows that need skills outside a preset

Every preset copies the workflow and agent definitions. Commands and prompts are
exposed only for workflows whose required skills are available. For example, a
fresh frontend installation leaves `/work` unavailable because it lacks
`oma-coordination`; its existing PM and QA skills already satisfy the other entry
requirements. The installer reports that missing skill without switching to
`all`.

| Workflow | Required entry skills | Presets that include them |
|----------|-------------|-------------------------|
| `/work`, `/ultrawork`, `/ralph` | oma-coordination, oma-pm, oma-qa | all |
| `/orchestrate` | oma-coordination, oma-orchestration, oma-qa | all |
| `/docs` | oma-docs | all |
| `/explain` | oma-explanation | all |
| `/security` | oma-security | all, security |
| `/recap` | oma-recap | all |
| `/video` | oma-video | all |
| `/design` | oma-design | all, fullstack, fullstack-web, fullstack-mobile, frontend, content |
| `/architecture` | oma-architecture | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops, security |
| `/plan` | oma-pm | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops |
| `/review` | oma-qa | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops, security |
| `/scm` | oma-scm | every preset |

Branch-specific references remain advisory. For example, `/convert` chooses PDF,
HWP, or video tools after inspecting its input; `/ralph` and `/ultrawork` can need
`oma-refactor` for a refactoring branch. These references are not unconditional
entry requirements.

Run `oma doctor` to diagnose missing or invalid manifests. To add a missing skill,
run `oma install` and choose **Select individually**. After repairing a manifest,
run `oma link` to refresh workflow exposure; reinstalling also refreshes it. Use
the matching `--global` scope for an OMA global installation. Existing user
commands are retained when unavailable OMA commands are removed.

### Domain plugins

Claude Code marketplace users can choose a domain entry after adding the
`oh-my-agent` marketplace:

```bash
claude plugin install oma-frontend@oh-my-agent
# Alternatives: oma-security@oh-my-agent, oma-research@oh-my-agent
```

The domain entries contain 8 frontend, 6 security, or 8 research skills and a
matching native agent selection. Their session bootstrap passes that preset to
the runtime installer. Shared runtime setup and existing installed skills follow
the installer behavior described above. The `oma` entry retains the full plugin.
The same domain roots are declared in the generated Codex marketplace catalog.

The pinned host CI jobs register the local marketplace on fresh runners, install
domain entries, and inspect the resulting inventory. These checks run without
model calls. Runtime credentials, external providers, and a successful first
task still need their own verification. Release checks also require both
manifests in every domain root to match the CLI version and have a Release Please
version updater.

The shared resources (`_shared/`) are always installed regardless of preset. This includes core routing, context loading, prompt structure, vendor detection, execution protocols, and memory protocol.

### What gets created

After installation, your project will contain:

```text
.agents/
├── oma-config.yaml          # Your preferences
├── oma-config.cue           # Optional schema-backed configuration
├── mcp.json                 # MCP server configuration
├── skills/
│   ├── _shared/             # Shared resources (always installed)
│   │   ├── core/            # skill-routing, context-loading, etc.
│   │   ├── runtime/         # memory-protocol, execution-protocols/
│   │   └── conditional/     # quality-score, experiment-ledger, etc.
│   ├── oma-frontend/        # Per preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                  # Other selected skills
├── workflows/               # Workflow definitions (all 21, every preset)
├── agents/                  # Subagent definitions (all 12, every preset)
├── hooks/                   # Hook sources (core/, variants/)
├── rules/                   # Project rules
├── config/                  # Shipped defaults (defaults.yaml)
├── results/                 # Plans and agent results (populated by workflows)
└── state/                   # Persistent workflow and coordination state
    └── memories/            # Runtime coordination state

.claude/
├── settings.json            # Vendor settings, when Claude Code is selected
├── hooks/
│   ├── oma-hook.sh          # Generated wrapper for the in-process hook chain
│   └── hud.ts               # Optional [OMA] statusline indicator
├── skills/                  # Symlinks → .agents/skills/
└── agents/                  # Generated native subagent files, when supported
```

The installer only creates vendor directories for the hosts you select. Hook source remains in `.agents/hooks/core/`; generated vendor files are integration outputs. Serena may also use a legacy `.serena/memories/` directory in older projects.

---

## Method 3: global install

For CLI-level usage (dashboards, agent spawning, diagnostics), install oh-my-agent globally:

:::note
This section installs the `oma` command. It is not the same as `oma install --global`, which installs skills, workflows, and rules into the OMA global home (`~/.oma/.agents/`) for every project. See [Global Install](../guide/global-install.md).
:::

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
oma dashboard web # Web dashboard at http://127.0.0.1:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update installed skills from the registry
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # Proxy MCP stdio to a shared per-project Serena server
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives
oma image # Multi-vendor AI image generation
oma video # Video generation and capture
oma slide # Presentation generation and export
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
#   code_intelligence_guard: block   # deny native Grep/Glob/rg while serena is configured (off to disable)
#   semantic_memory: agentmemory

# Optional — browser DevTools MCP. Omit to preserve the current setup.
# mcp:
#   devtools_browsers: [aside]

# Optional — partial override per agent (object-only, shallow merge)
agents:
  backend: { model: openai/gpt-6.1-terra, effort: high }
  qa:      { model: anthropic/claude-sonnet-5-5 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.8 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-6.1-terra, effort: high }
```

### Field reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `language` | string | Yes | Response language code. Supports en, ko, ja, zh, es, fr, de, pt, ru, nl, pl. |
| `model_preset` | string | Yes | Active [model preset](./glossary.md#model-preset) key. `auto` follows the current runtime; fixed keys include `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro`, and `mixed`. Custom preset keys are also valid. See [Per-Agent Models](../guide/per-agent-models.md). |
| `default_cli` | string | No | Fallback CLI for `oma agent spawn` when explicit agent settings and the selected preset do not resolve a vendor. |
| `free` | map | No | FreeLLMAPI gateway settings used when `model_preset: free`; keep API keys in environment variables. |
| `providers` | map | No | Capability providers: `code_intelligence` (`serena` or `gortex`), `code_intelligence_guard` (`block` or `off`), `docs` (`context7`), `web` (`native` or `brave`), and `semantic_memory` (`agentmemory`, `honcho`, or `none`). |
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

```text
"Build a login form with email validation using Tailwind CSS"
```

Or use a workflow command:

```text
/plan authentication feature with JWT and refresh tokens
```

See the [Usage Guide](/docs/guide/usage) for detailed examples, or learn about [Agents](/docs/core-concepts/agents) to understand what each specialist does. If the install or a hook does not behave as expected, see [Troubleshooting](../guide/troubleshooting.md).
