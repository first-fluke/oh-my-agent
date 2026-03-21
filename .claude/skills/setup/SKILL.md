---
name: setup
description: oh-my-agent project setup verification and configuration
disable-model-invocation: true
---

# /setup

Response language follows `language` setting in `.agents/config/user-preferences.yaml`.

## Steps

### Step 1: Verify Project Structure

Check these paths exist and report status:

| Path | Purpose | Required |
|:-----|:--------|:--------:|
| `.agents/skills/` | Domain skills (SSOT) | Yes |
| `.agents/workflows/` | Workflow definitions | Yes |
| `.agents/config/user-preferences.yaml` | User preferences | Yes |
| `.claude/skills/` | Claude Code skills | Yes |
| `.claude/agents/` | Subagent definitions | Yes |
| `.agents/plan.json` | Current plan | No |

### Step 2: Language & Preferences

- Read `.agents/config/user-preferences.yaml`
- Show current settings: language, date_format, timezone
- If file doesn't exist: create with defaults (language: en, date_format: ISO)
- Offer to change settings if needed

### Step 3: Available Skills

List all skills in `.claude/skills/` with their descriptions (from frontmatter).

### Step 4: Available Subagents

List all agents in `.claude/agents/` with their domains:

| Domain | Agent File |
|:-------|:-----------|
| backend | `backend-engineer.md` |
| frontend | `frontend-engineer.md` |
| mobile | `mobile-engineer.md` |
| db | `db-engineer.md` |
| qa | `qa-reviewer.md` |
| debug | `debug-investigator.md` |
| pm | `pm-planner.md` |

### Step 5: Summary

Report setup status with counts:
- Skills available
- Agents available
- Current language
- Plan status (exists / not found)
- Suggest next action: `/plan` if no plan, `/orchestrate` or `/coordinate` if plan exists

$ARGUMENTS
