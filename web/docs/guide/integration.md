---
title: "Guide: Existing Project Integration"
description: Complete guide for adding oh-my-agent to an existing project — CLI path, manual path, verification, SSOT symlink structure, and what the installer does under the hood.
---

# Guide: Existing Project Integration

## Two Integration Paths

There are two ways to add oh-my-agent to an existing project:

1. **CLI path** — Run `oma` (or `npx oh-my-agent`) and follow the interactive prompts. Recommended for most users.
2. **Manual path** — Copy files and configure symlinks yourself. Useful for restricted environments or custom setups.

Both paths produce the same result: a `.agents/` directory (the SSOT) plus vendor-native generated files such as `.claude/agents/`, `.codex/agents/`, and `.gemini/agents/`.

---

## CLI Path: Step by Step

### 1. Install the CLI

```bash
# Global install (recommended)
bun install --global oh-my-agent

# Or use npx for one-time runs
npx oh-my-agent
```

After global install, the `oma` (or `oh-my-agent`) command is available.

### 2. Navigate to Your Project Root

```bash
cd /path/to/your/project
```

The installer expects to run from the project root (where `.git/` lives).

### 3. Run the Installer

```bash
oma
```

The default command (no subcommand) launches the interactive installer.

### 4. Select Project Type

The installer presents these presets:

| Preset | Skills Included |
|:-------|:---------------|
| **All** | Every available skill |
| **Fullstack** | Frontend + Backend + PM + QA |
| **Frontend** | React/Next.js skills |
| **Backend** | Python/Node.js/Rust backend skills |
| **Mobile** | Flutter/Dart mobile skills |
| **DevOps** | Terraform + CI/CD + Workflow skills |
| **Custom** | Choose individual skills from the full list |

### 5. Choose Backend Language (if applicable)

If you selected a preset that includes the backend skill, you are asked to choose a language variant:

- **Python** — FastAPI/SQLAlchemy (default)
- **Node.js** — NestJS/Hono + Prisma/Drizzle
- **Rust** — Axum/Actix-web
- **Other / Auto-detect** — Configure later with `/stack-set`

### 6. Configure IDE Symlinks

The installer always creates Claude Code symlinks (`.claude/skills/`). It also generates vendor-native agent files and hooks for Claude, Codex, Gemini, and Qwen, and if a `.github/` directory exists, it creates GitHub Copilot symlinks automatically. Otherwise, it asks:

```
Also create symlinks for GitHub Copilot? (.github/skills/)
```

### 7. Git Rerere Setup

The installer checks if `git rerere` (reuse recorded resolution) is enabled. If not, it offers to enable it globally:

```
Enable git rerere? (Recommended for multi-agent merge conflict reuse)
```

This is recommended because multi-agent workflows can produce merge conflicts, and rerere remembers how you resolved them so the same resolution is applied automatically next time.

### 8. MCP Configuration

If an Antigravity IDE MCP config exists (`~/.gemini/antigravity/mcp_config.json`), the installer offers to configure the Serena MCP bridge:

```
Configure Serena MCP with bridge? (Required for full functionality)
```

If accepted, it sets up:

```json
{
  "mcpServers": {
    "serena": {
      "command": "npx",
      "args": ["-y", "oh-my-agent@latest", "bridge", "http://localhost:12341/mcp"],
      "disabled": false
    }
  }
}
```

Similarly, if Gemini CLI settings exist (`~/.gemini/settings.json`), it offers to configure Serena for Gemini CLI in HTTP mode:

```json
{
  "mcpServers": {
    "serena": {
      "url": "http://localhost:12341/mcp"
    }
  }
}
```

### 9. Completion

The installer displays a summary of everything installed:
- List of installed skills
- Location of the skills directory
- Created symlinks
- Skipped items (if any)

---

## Manual Path

For environments where the interactive CLI is not available (CI pipelines, restricted shells, corporate machines).

### Step 1: Download and Extract

```bash
# Download the latest tarball from the registry
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz

# Verify checksum
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz.sha256" -o agent-skills.tar.gz.sha256
sha256sum -c agent-skills.tar.gz.sha256

# Extract
tar -xzf agent-skills.tar.gz
```

### Step 2: Copy Files to Your Project

```bash
# Copy the core .agents/ directory
cp -r .agents/ /path/to/your/project/.agents/

# Regenerate vendor-native files from the SSOT
oma link
```

`oma link` rebuilds `.claude/`, `.codex/`, `.gemini/`, and related vendor-native files from `.agents/agents/`. At runtime, OMA uses native dispatch only when the current runtime vendor matches the target vendor for that agent. Mixed-vendor setups still work, but non-matching agents fall back to external `oma agent:spawn`.

### Step 3: Configure User Preferences

```bash
mkdir -p /path/to/your/project/.agents
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
model_preset: gemini-only
EOF
```

### Step 4: Initialize Memory Directory

```bash
oma memory:init
# Or manually:
mkdir -p /path/to/your/project/.serena/memories
```

---

## Verification Checklist

After installation (either path), verify everything is set up correctly:

```bash
# Run the doctor command for a full health check
oma doctor

# Check output format for CI
oma doctor --json
```

The doctor command checks:

| Check | What It Verifies |
|:------|:----------------|
| **CLI installations** | gemini, claude, codex, qwen — version and availability |
| **Authentication** | API key or OAuth status for each CLI |
| **MCP configuration** | Serena MCP server setup for each CLI environment |
| **Skill status** | Which skills are installed and whether they are current |

Manual verification commands:

```bash
# Verify .agents/ directory exists
ls -la .agents/

# Verify skills are installed
ls .agents/skills/

# Verify symlinks point to correct targets
ls -la .claude/skills/

# Verify config exists
cat .agents/oma-config.yaml

# Verify memory directory
ls .serena/memories/ 2>/dev/null || echo "Memory not initialized"

# Check version
cat .agents/skills/_version.json 2>/dev/null
```

---

## Multi-IDE Symlink Structure (SSOT Concept)

oh-my-agent uses a Single Source of Truth (SSOT) architecture. The `.agents/` directory is the only place where skills, workflows, configs, and agent definitions live. All IDE-specific directories contain only symlinks pointing back to `.agents/`.

### Directory Layout

```
your-project/
  .agents/                          # SSOT — the real files live here
    agents/                         # Agent definition files
      backend-engineer.md
      frontend-engineer.md
      qa-reviewer.md
      ...
    config/                         # Configuration
      oma-config.yaml
    mcp.json                        # MCP server configuration
    results/plan-{sessionId}.json                       # Current plan (generated by /plan)
    skills/                         # Installed skills
      _shared/                      # Shared resources across all skills
        core/                       # Core protocols and references
        runtime/                    # Runtime execution protocols
        conditional/                # Conditionally-loaded resources
      oma-frontend/                 # Frontend skill
      oma-backend/                  # Backend skill
      oma-qa/                       # QA skill
      ...
    workflows/                      # Workflow definitions
      orchestrate.md
      work.md
      ultrawork.md
      plan.md
      ...
    results/                        # Agent execution results
  .claude/                          # Claude Code — symlinks only
    skills/                         # -> .agents/skills/* and .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot — symlinks only (optional)
    skills/                         # -> .agents/skills/*
  .serena/                          # MCP memory storage
    memories/                       # Runtime memory files
    metrics.json                    # Productivity metrics
```

### Why Symlinks?

- **One update, all IDEs benefit.** When `oma update` refreshes `.agents/`, every IDE picks up the changes automatically.
- **No duplication.** Skills are stored once, not copied per IDE.
- **Safe removal.** Deleting `.claude/` does not destroy your skills. The SSOT in `.agents/` remains intact.
- **Git-friendly.** Symlinks are small and diff cleanly.

---

## Safety Tips and Rollback Strategy

### Before Installation

1. **Commit your current work.** The installer creates new directories and files. Having a clean git state means you can `git checkout .` to undo everything.
2. **Check for existing `.agents/` directory.** If one exists from a different tool, back it up first. The installer will overwrite it.

### After Installation

1. **Review what was created.** Run `git status` to see all new files. The installer creates files only in `.agents/`, `.claude/`, and optionally `.github/`.
2. **Add to `.gitignore` selectively.** Most teams commit `.agents/` and `.claude/` to share the setup. But `.serena/` (runtime memory) and `.agents/results/` (execution results) should be gitignored:

```gitignore
# oh-my-agent runtime files
.serena/
.agents/results/
.agents/state/
```

### Rollback

To completely remove oh-my-agent from a project:

```bash
# Remove the SSOT directory
rm -rf .agents/

# Remove IDE symlinks
rm -rf .claude/skills/ .claude/agents/
rm -rf .github/skills/  # if created

# Remove runtime files
rm -rf .serena/
```

Or simply revert with git:

```bash
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```

---

## Dashboard Setup

After installation, you can set up real-time monitoring. See the [Dashboard Monitoring guide](/docs/guide/dashboard-monitoring) for full details.

Quick setup:

```bash
# Terminal dashboard (watches .serena/memories/ for changes)
oma dashboard

# Web dashboard (browser-based, http://localhost:9847)
oma dashboard:web
```

---

## What the Installer Does Under the Hood

When you run `oma` (the install command), here is exactly what happens:

### 1. Legacy Migration

The installer checks for the old `.agent/` directory (singular) and migrates it to `.agents/` (plural) if found. This is a one-time migration for users upgrading from earlier versions.

### 2. Competitor Detection

The installer scans for competing tools and offers to remove them to avoid conflicts.

### 3. Tarball Download

The installer downloads the latest release tarball from the oh-my-agent GitHub releases. This tarball contains the complete `.agents/` directory with all skills, shared resources, workflows, configs, and agent definitions.

### 4. Shared Resources Installation

`installShared()` copies the `_shared/` directory to `.agents/skills/_shared/`. This includes:

- `core/` — Skill routing, context loading, prompt structure, quality principles, vendor detection, API contracts.
- `runtime/` — Memory protocol, execution protocols per vendor.
- `conditional/` — Resources loaded only when specific conditions are met (quality score, exploration loop).

### 5. Workflow Installation

`installWorkflows()` copies all workflow files to `.agents/workflows/`. These are the definitions for `/orchestrate`, `/work`, `/ultrawork`, `/plan`, `/exec-plan`, `/brainstorm`, `/deepinit`, `/review`, `/debug`, `/design`, `/scm`, `/tools`, and `/stack-set`.

### 6. Config Installation

`installConfigs()` copies default configuration files to `.agents/config/`, including `oma-config.yaml` and `mcp.json`. If these files already exist, they are preserved (not overwritten) unless `--force` is used.

### 7. Skill Installation

For each selected skill, `installSkill()` copies the skill directory to `.agents/skills/{skill-name}/`. If a variant was selected (e.g., Python for backend), it also sets up the `stack/` directory with language-specific resources.

### 8. Vendor Adaptations

`installVendorAdaptations()` installs IDE-specific files for all supported vendors (Claude, Codex, Gemini, Qwen):

- Agent definitions (`.claude/agents/*.md`, `.codex/agents/*.toml`, `.gemini/agents/*.md`)
- Hook configurations (`.claude/hooks/`)
- Settings files and vendor integration docs (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`)

### 9. CLI Symlinks

`createCliSymlinks()` creates symlinks from IDE-specific directories to the SSOT:

- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}.md` -> `../../.agents/workflows/{workflow}.md`
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}` (if Copilot enabled)

Vendor-native agent files are generated from `.agents/agents/` by `oma link`, `oma install`, or `oma update` rather than symlinked directly.

### 10. Global Workflows

`installGlobalWorkflows()` installs workflow files that may be needed globally (outside the project directory).

### 11. Git Rerere + MCP Configuration

As described in the CLI path above, the installer optionally configures git rerere and MCP settings.
