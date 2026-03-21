---
title: Existing Project Integration
description: Safe and non-destructive integration workflow for adding oh-my-agent skills to an existing project.
---

# Integrate Into an Existing Project

This guide replaces the legacy root `AGENT_GUIDE.md` workflow and reflects the current workspace structure (`cli` + `web`) and CLI behavior.

## Goal

Add `oh-my-agent` skills to an existing project without overwriting current assets.

## Recommended Path (CLI)

Run this in the target project root:

```bash
bunx oh-my-agent
```

What it does:

- Installs or updates `.agents/skills/*`
- Installs shared resources in `.agents/skills/_shared`
- Creates compatibility symlinks at `.agents/skills/*` and `.claude/skills/*`
- Installs `.agents/workflows/*`
- Installs `.agents/config/user-preferences.yaml`
- Optionally installs global workflows under `~/.gemini/global_workflows`

## Safe Manual Path

Use this when you need full control over each copied directory.

```bash
cd /path/to/your-project

mkdir -p .agents/skills .agents/skills .agents/workflows .agents/config .claude/skills

# Copy only missing skill directories (example)
for skill in oma-coordination oma-pm oma-frontend oma-backend oma-mobile oma-qa oma-debug oma-orchestrator oma-commit; do
  if [ ! -d ".agents/skills/$skill" ]; then
    cp -r /path/to/oh-my-agent/.agents/skills/$skill .agents/skills/$skill
  fi
done

# Copy shared resources if missing
[ -d .agents/skills/_shared ] || cp -r /path/to/oh-my-agent/.agents/skills/_shared .agents/skills/_shared

# Compatibility symlinks
for skill in oma-coordination oma-pm oma-frontend oma-backend oma-mobile oma-qa oma-debug oma-orchestrator oma-commit _shared; do
  [ -L ".agents/skills/$skill" ] || ln -s "../../.agents/skills/$skill" ".agents/skills/$skill"
  [ -L ".claude/skills/$skill" ] || ln -s "../../.agents/skills/$skill" ".claude/skills/$skill"
done

# Copy workflows if missing
for wf in coordinate.md orchestrate.md plan.md review.md debug.md setup.md tools.md; do
  [ -f ".agents/workflows/$wf" ] || cp /path/to/oh-my-agent/.agents/workflows/$wf .agents/workflows/$wf
done

# Copy default user preferences only if missing
[ -f .agents/config/user-preferences.yaml ] || cp /path/to/oh-my-agent/.agents/config/user-preferences.yaml .agents/config/user-preferences.yaml
```

## Verification Checklist

```bash
# 9 installable skills (excluding _shared)
find .agents/skills -mindepth 1 -maxdepth 1 -type d ! -name '_shared' | wc -l

# Shared resources
[ -d .agents/skills/_shared ] && echo ok

# 7 workflows
find .agents/workflows -maxdepth 1 -name '*.md' | wc -l

# Basic command health
bunx oh-my-agent doctor
```

## Optional Dashboards

Dashboards are optional and use the installed CLI:

```bash
bunx oh-my-agent dashboard
bunx oh-my-agent dashboard:web
```

Web dashboard default URL: `http://localhost:9847`

## Rollback Strategy

Before integration, create a checkpoint commit in your project:

```bash
git add -A
git commit -m "chore: checkpoint before oh-my-agent integration"
```

If you need to undo, revert that commit with your normal team process.

## Multi-CLI Symlink Support

When you run `bunx oh-my-agent`, you'll see this prompt after selecting skills:

```text
Also create symlinks for other CLI tools?
  ○ Cursor (.cursor/skills/)
  ○ GitHub Copilot (.github/skills/)
```

The installer will always:

1. Install skills to `.agents/skills/` (SSOT for CLI-based usage)
2. Create compatibility symlinks at `.agents/skills/` and `.claude/skills/`

If you select additional CLI tools, it will also create symlinks for those directories. This keeps one source of truth while allowing skills to work across multiple tools.

### Symlink Structure

```text
.agents/skills/oma-frontend/     ← Source (SSOT)
.agents/skills/oma-frontend/      → ../../.agents/skills/oma-frontend/
.claude/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/
.github/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (GitHub Copilot)
```

The installer skips existing symlinks and warns if a real directory exists at the target location.

## Notes

- Do not overwrite existing `.agents/skills/*` folders unless you intend to replace customized skills.
- Keep project-specific policy files (`.agents/config/*`) under your repository ownership.
- For multi-agent orchestration patterns, continue with the [`Usage Guide`](./usage.md).
