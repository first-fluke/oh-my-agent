---
title: Usage Guide
description: Full usage guide including examples, workflows, dashboard operations, and troubleshooting.
---

# How to Use Agent Skills

> If you are not sure where to start, type `/coordinate <your task prompt>` first.

## Quick Start

1. **Open in AI IDE**
   Open the `oh-my-agent` project directory in your AI IDE.

2. **Skills are automatically detected.** The IDE scans `.agents/skills/` and indexes all available skills.

3. **Chat in the IDE.** Describe what you want to build.

---

## Usage Examples

### Example 1: Simple Single-Domain Task

**You type:**
```
"Create a login form component with email and password fields using Tailwind CSS"
```

**What happens:**
- You invoke `oma-frontend` via /command or agent skills field
- The skill loads on demand (Progressive Disclosure)
- You get a React component with TypeScript, Tailwind, form validation

### Example 2: Complex Multi-Domain Project

**You type:**
```
"Build a TODO app with user authentication"
```

**What happens:**

1. **Workflow Guide activates** — detects multi-domain complexity
2. **PM Agent plans** — creates task breakdown with priorities
3. **You spawn agents via CLI**:
   ```bash
   oma agent:spawn backend "JWT authentication API" session-01 &
   oma agent:spawn frontend "Login and TODO UI" session-01 &
   wait
   ```
4. **Agents work in parallel** — save outputs to Knowledge Base
5. **You coordinate** — review `.agents/results/` for consistency
6. **QA Agent reviews** — security/performance audit
7. **Fix & iterate** — re-spawn agents with corrections

### Example 3: Bug Fixing

**You type:**
```
"There's a bug — clicking login shows 'Cannot read property map of undefined'"
```

**What happens:**

1. **oma-debug activates** — analyzes error
2. **Root cause found** — component maps over `todos` before data loads
3. **Fix provided** — loading states and null checks added
4. **Regression test written** — ensures bug won't return
5. **Similar patterns found** — proactively fixes 3 other components

### Example: Design System Creation

**You type:**
```
"Design a dark premium landing page for my SaaS product"
```

**What happens:**

1. **oma-design activates** — checks for `.design-context.md`
2. **Context gathered** — asks about audience, brand, aesthetic direction
3. **Prompt enhanced** — vague request becomes section-by-section spec
4. **2-3 directions proposed** — color, typography, layout, motion options
5. **DESIGN.md generated** — 6-section design system with tokens
6. **Audit run** — responsive, WCAG, Nielsen heuristics, AI slop check
7. **Handoff** — ready for oma-frontend implementation

### Example 4: CLI-based Parallel Execution

```bash
# Single agent (workspace auto-detected)
oma agent:spawn backend "Implement JWT auth API" session-01

# Parallel agents
oma agent:spawn backend "Implement auth API" session-01 &
oma agent:spawn frontend "Create login form" session-01 &
oma agent:spawn mobile "Build auth screens" session-01 &
wait
```

**Monitor in real-time:**
```bash
# Terminal (separate terminal window)
bunx oh-my-agent dashboard

# Or browser
bunx oh-my-agent dashboard:web
# → http://localhost:9847
```

---

## Real-time Dashboards

### Terminal Dashboard

```bash
bunx oh-my-agent dashboard
```

Watches `.serena/memories/` using `fswatch` (macOS) or `inotifywait` (Linux). Displays a live table with session status, agent states, turns, and latest activity. Updates automatically when memory files change.

**Requirements:**
- macOS: `brew install fswatch`
- Linux: `apt install inotify-tools`

### Web Dashboard

```bash
bun install          # first time only
bunx oh-my-agent dashboard:web
```

Open `http://localhost:9847` in your browser. Features:

- **Real-time updates** via WebSocket (event-driven, not polling)
- **Auto-reconnect** if the connection drops
- **Serena-themed UI** with purple accent colors
- **Session status** — ID and running/completed/failed state
- **Agent table** — name, status (with colored dots), turn count, task description
- **Activity log** — latest changes from progress and result files

The server watches `.serena/memories/` using chokidar with debounce (100ms). Only changed files trigger reads — no full re-scan.

---

## Key Concepts

### Progressive Disclosure
Skills are explicitly invoked via /command or loaded through agent skills field. Only the needed skill loads into context.

### Token-Optimized Skill Design
Each skill uses a two-layer architecture for maximum token efficiency:
- **SKILL.md** (~40 lines): Identity, routing, core rules — loaded immediately
- **resources/**: Execution protocols, examples, checklists, error playbooks — loaded on-demand

Shared resources live in `_shared/` (not a skill) and are referenced by all agents:
- Chain-of-thought execution protocols with 4-step workflow
- Few-shot input/output examples for mid-tier model guidance
- Error recovery playbooks with "3 strikes" escalation
- Reasoning templates for structured multi-step analysis
- Context budget management for Flash/Pro model tiers
- Automated verification via `verify.sh`
- Cross-session lessons learned accumulation

### CLI Agent Spawning
Use `oma agent:spawn` to run agents via CLI. Respects `agent_cli_mapping` in `user-preferences.yaml` to select the appropriate CLI (gemini, claude, codex, qwen) per agent type. Workspace is auto-detected from common monorepo conventions, or can be set explicitly with `-w`.

### Knowledge Base
Agent outputs stored at `.agents/results/`. Contains plans, code, reports, and coordination notes.

### Serena Memory
Structured runtime state at `.serena/memories/`. The orchestrator writes session info, task boards, per-agent progress, and results. Dashboards watch these files for monitoring.

### Workspaces
Agents can work in separate directories to avoid conflicts. Workspace is auto-detected from common monorepo conventions:
```
./apps/api   or ./backend   → Backend Agent workspace
./apps/web   or ./frontend  → Frontend Agent workspace
./apps/mobile or ./mobile   → Mobile Agent workspace
```

---

## Available Skills

| Skill | Use case | Output |
|-------|-------------------|--------|
| oma-coordination | Complex multi-domain projects | Step-by-step agent coordination |
| oma-pm | "plan this", "break down" | `.agents/plan.json` |
| oma-frontend | UI, components, styling | React components, tests |
| oma-backend | APIs, databases, auth (Python, Node.js, Rust, ...) | API endpoints, models, tests |
| oma-db | Database, schema, ERD, migration | Schema design, query tuning |
| oma-mobile | Mobile apps, iOS/Android | Flutter screens, state management |
| oma-brainstorm | Ideation, concept exploration | Design document |
| oma-dev-workflow | CI/CD, git hooks, monorepo setup | Workflow configs, automation |
| oma-tf-infra | Terraform, cloud infra | IaC modules, state management |
| oma-translator | Translation, multilingual content | Translated text preserving tone |
| oma-qa | "review security", "audit" | QA report with prioritized fixes |
| oma-debug | Bug reports, error messages | Fixed code, regression tests |
| oma-orchestrator | CLI sub-agent execution | Results in `.agents/results/` |
| oma-commit | "commit", "커밋해줘" | Git commits (auto-splits by feature) |

---

## Workflow Commands

Type these in AI IDE chat to trigger step-by-step workflows:

| Command | Description |
|---------|-------------|
| `/brainstorm` | Design-first ideation — explore intent, constraints, and approaches |
| `/coordinate` | Multi-agent orchestration via CLI with step-by-step guidance |
| `/deepinit` | Initialize project harness with AGENTS.md and ARCHITECTURE.md |
| `/exec-plan` | Create and track execution plans as repository artifacts |
| `/orchestrate` | Automated CLI-based parallel agent execution |
| `/plan` | PM task decomposition with API contracts |
| `/review` | Full QA pipeline (security, performance, accessibility, code quality) |
| `/debug` | Structured bug fixing (reproduce → diagnose → fix → regression test) |
| `/setup` | Project setup and configuration |
| `/tools` | MCP tool management |
| `/ultrawork` | High-quality 5-phase development with 11 review gates |
| `/stack-set` | Set backend language stack (Python, Node.js, Rust) for oma-backend |

These are separate from **skills** (invoked via /command or agent skills field). Workflows give you explicit control over multi-step processes.

---

## Typical Workflows

### Workflow A: Single Skill

```
You: "Create a button component"
  → The IDE loads oma-frontend
  → Get component immediately
```

### Workflow B: Multi-Agent Project (Auto)

```
You: "Build a TODO app with authentication"
  → use /coordinate to start oma-coordination
  → PM Agent creates plan
  → You spawn agents via CLI (oma agent:spawn)
  → Agents work in parallel
  → QA Agent reviews
  → Fix issues, iterate
```

### Workflow B-2: Multi-Agent Project (Explicit)

```
You: /coordinate
  → Step-by-step guided workflow
  → PM planning → plan review → agent spawning → monitoring → QA review
```

### Workflow C: Bug Fixing

```
You: "Login button throws TypeError"
  → oma-debug activates
  → Root cause analysis
  → Fix + regression test
  → Similar patterns checked
```

### Workflow D: CLI Orchestration with Dashboard

```
Terminal 1: bunx oh-my-agent dashboard:web
Terminal 2: oma agent:spawn backend "task" session-01 &
            oma agent:spawn frontend "task" session-01 &
Browser:    http://localhost:9847 → real-time status
```

---

## Tips

1. **Be specific** — "Build a TODO app with JWT auth, React frontend, Express backend" is better than "make an app"
2. **Use CLI spawning** for multi-domain projects — don't try to do everything in one chat
3. **Review Knowledge Base** — check `.agents/results/` for API consistency
4. **Iterate with re-spawns** — refine instructions, don't start over
5. **Use dashboards** — `bunx oh-my-agent dashboard` or `bunx oh-my-agent dashboard:web` to monitor orchestrator sessions
6. **Separate workspaces** — assign each agent its own directory

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Skills not loading in IDE | Open the project directory in your AI IDE, verify `.agents/skills/` and `SKILL.md`, then restart the IDE |
| CLI not found | Check `which gemini` / `which claude`, install missing CLIs |
| Agents producing incompatible code | Review outputs in `.agents/results/`, re-spawn one agent referencing the other agent output, then use QA Agent for final consistency check |
| Dashboard shows "No agents detected" | Memory files have not been created yet. Run the orchestrator or manually create files in `.serena/memories/` |
| Web dashboard won't start | Run `bun install` to install chokidar and ws |
| fswatch not found | macOS: `brew install fswatch`, Linux: `apt install inotify-tools` |
| QA report has 50+ issues | Focus on CRITICAL/HIGH first, document rest for later |

---

## CLI Commands

```bash
bunx oh-my-agent                # Interactive skill installer
bunx oh-my-agent doctor         # Check setup & repair missing skills
bunx oh-my-agent doctor --json  # JSON output for CI/CD
bunx oh-my-agent update         # Update skills to latest version
bunx oh-my-agent stats          # View productivity metrics
bunx oh-my-agent stats --reset  # Reset metrics
bunx oh-my-agent retro          # Session retrospective (learnings & next steps)
bunx oh-my-agent dashboard      # Terminal real-time dashboard
bunx oh-my-agent dashboard:web  # Web dashboard (http://localhost:9847)
bunx oh-my-agent help           # Show help
```

---

## For Developers (Integration Guide)

If you want to integrate these skills into your existing project, see [Existing Project Integration](./integration.md) for:
- Quick 3-step integration
- Full dashboard integration
- Customizing skills for your tech stack
- Troubleshooting and best practices

---

**Just chat in your AI IDE.** For monitoring, use the dashboards. For CLI execution, use the orchestrator scripts. To integrate into your existing project, use [Existing Project Integration](./integration.md).
