---
name: tools
description: Show available skills, agents, and their status
disable-model-invocation: true
---

# /tools

Response language follows `language` setting in `.agents/config/user-preferences.yaml`.

## Default: Show Status

List all available resources in this project:

### 1. Workflow Skills (`.claude/skills/`)

Read each `SKILL.md` frontmatter and display:

| Skill | Description |
|:------|:-----------|
| `/brainstorm` | Design exploration |
| `/commit` | Git commit |
| `/coordinate` | Task coordination with issue remediation |
| `/debug` | Bug investigation and fix |
| `/deepinit` | Project initialization with AGENTS.md |
| `/exec-plan` | Execution plan management |
| `/orchestrate` | Parallel multi-agent orchestration |
| `/plan` | PM analysis and task decomposition |
| `/review` | QA review pipeline |
| `/setup` | Project setup verification |
| `/tools` | This command |
| `/ultrawork` | 5-phase gate orchestration |

### 2. Subagents (`.claude/agents/`)

List agent files with their specialization.

### 3. Domain Skills (`.agents/skills/`)

List installed domain skills from SSOT.

### 4. Shared Resources (`.agents/skills/_shared/`)

List available shared resources (context-loading, skill-routing, etc.).

## With Arguments

- `/tools skills` — Show only workflow skills
- `/tools agents` — Show only subagents
- `/tools domains` — Show only domain skills
- `/tools shared` — Show only shared resources

$ARGUMENTS
