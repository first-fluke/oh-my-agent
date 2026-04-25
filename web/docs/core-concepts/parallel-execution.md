---
title: Parallel Execution
description: Complete guide to running multiple oh-my-agent agents simultaneously — agent:spawn syntax with all options, agent:parallel inline mode, workspace-aware patterns, multi-CLI configuration, vendor resolution priority, monitoring with dashboards, session ID strategy, and anti-patterns to avoid.
---

# Parallel Execution

The core advantage of oh-my-agent is running multiple specialized agents simultaneously. While the backend agent implements your API, the frontend agent creates the UI, and the mobile agent builds the app screens — all coordinated through shared memory.

---

## agent:spawn — Single Agent Spawning

### Basic Syntax

```bash
oma agent:spawn <agent-id> <prompt> <session-id> [options]
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `agent-id` | Yes | Agent identifier: `backend`, `frontend`, `mobile`, `db`, `pm`, `qa`, `debug`, `design`, `tf-infra`, `dev-workflow`, `translator`, `orchestrator`, `commit` |
| `prompt` | Yes | Task description (quoted string or path to a prompt file) |
| `session-id` | Yes | Groups agents working on the same feature. Format: `session-YYYYMMDD-HHMMSS` or any unique string. |
| `options` | No | See options table below |

### Options

| Flag | Short | Description |
|------|-------|-------------|
| `--workspace <path>` | `-w` | Working directory for the agent. Agents only modify files within this directory. |
| `--model <name>` | `-m` | Override CLI vendor for this specific spawn. Options: `gemini`, `claude`, `codex`, `qwen`. |
| `--max-turns <n>` | `-t` | Override default turn limit for this agent. |
| `--json` | | Output result as JSON (useful for scripting). |
| `--no-wait` | | Fire and forget — return immediately without waiting for completion. |

### Examples

```bash
# Spawn a backend agent with default vendor
oma agent:spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Spawn with workspace isolation
oma agent:spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Override vendor for this specific agent
oma agent:spawn frontend "Build login form" session-01 -m claude -w ./apps/web

# Set a higher turn limit for a complex task
oma agent:spawn backend "Implement payment gateway integration" session-01 -t 30

# Use a prompt file instead of inline text
oma agent:spawn backend ./prompts/auth-api.md session-01 -w ./apps/api
```

---

## Parallel Spawning with Background Processes

To run multiple agents simultaneously, use shell background processes:

```bash
# Spawn 3 agents in parallel
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent:spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Block until all agents complete
```

The `&` runs each agent in the background. `wait` blocks until all background processes finish.

### Workspace-Aware Pattern

Always assign separate workspaces when running agents in parallel to prevent file conflicts:

```bash
# Full-stack parallel execution
oma agent:spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent:spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent:spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# After implementation, run QA (sequential — depends on implementation)
oma agent:spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel — Inline Parallel Mode

For a cleaner syntax that handles background process management automatically:

### Syntax

```bash
oma agent:parallel -i <agent1>:<prompt1> <agent2>:<prompt2> [options]
```

### Examples

```bash
# Basic parallel execution
oma agent:parallel -i backend:"Implement auth API" frontend:"Build login form" mobile:"Auth screens"

# With no-wait (fire and forget)
oma agent:parallel -i backend:"Auth API" frontend:"Login form" --no-wait

# All agents share the same session automatically
oma agent:parallel -i \
  backend:"JWT auth with refresh tokens" \
  frontend:"Login form with email validation" \
  db:"User schema with soft delete and audit trail"
```

The `-i` (inline) flag allows specifying agent-prompt pairs directly in the command.

---

## Multi-CLI Configuration

oh-my-agent routes each agent to the appropriate CLI via `model_preset` in `.agents/oma-config.yaml`. Choose a built-in preset for the vendor you use, and optionally override individual agents.

### Configuration Example

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity   # mixed: Claude for QA/PM, Codex for impl, Gemini for retrieval

# Override specific agents on top of the preset
agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }
  backend:  { model: openai/gpt-5.3-codex, effort: high }
```

Built-in presets: `claude-only`, `codex-only`, `gemini-only`, `qwen-only`, `antigravity`. See [Per-Agent Models](../guide/per-agent-models.md) for details.

### Vendor Resolution

When `oma agent:spawn` determines which CLI to use:

| Priority | Source | Example |
|----------|--------|---------|
| 1 (highest) | `--model` flag | `oma agent:spawn backend "task" session-01 -m claude` |
| 2 | `agents:` override in `oma-config.yaml` | `agents: { backend: { model: openai/gpt-5.3-codex } }` |
| 3 | Active `model_preset` agent defaults | preset lookup for the agent role |

The `--model` flag always wins. If no flag is provided, the system checks `agents:` overrides, then the preset defaults.

---

## Vendor-Specific Spawn Methods

The spawn mechanism varies by IDE/CLI:

| Vendor | How Agents Are Spawned | Result Handling |
|--------|----------------------|-----------------|
| **Claude Code** | Same-vendor tasks use the Agent tool with `.claude/agents/{name}.md`; cross-vendor tasks fall back to `oma agent:spawn`. | Synchronous return |
| **Codex CLI** | Same-vendor tasks use native custom agents from `.codex/agents/{name}.toml`; cross-vendor tasks fall back to `oma agent:spawn`. | JSON output |
| **Gemini CLI** | Same-vendor tasks use `.gemini/agents/{name}.md` when available; cross-vendor tasks fall back to `oma agent:spawn`. | MCP memory poll |
| **Antigravity IDE** | `oma agent:spawn` only (custom subagents not available) | MCP memory poll |
| **CLI Fallback** | `oma agent:spawn {agent} {prompt} {session} -w {workspace}` | Result file poll |

When running inside Claude Code, the workflow uses the `Agent` tool directly:
```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Multiple Agent tool calls in the same message execute as true parallel — no sequential waiting.

The same dispatch rule applies across vendors:

1. Resolve `target_vendor_for_agent` from `.agents/oma-config.yaml`
2. If it matches the current runtime vendor, use that vendor's native agent file
3. If it does not match, use `oma agent:spawn` only for that agent

---

## Monitoring Agents

### Terminal Dashboard

```bash
oma dashboard
```

Displays a live table with:
- Session ID and overall status
- Per-agent status (running, completed, failed)
- Turn counts
- Latest activity from progress files
- Elapsed time

The dashboard watches `.serena/memories/` for real-time updates. It refreshes as agents write progress.

### Web Dashboard

```bash
oma dashboard:web
# Opens http://localhost:9847
```

Features:
- Real-time updates via WebSocket
- Auto-reconnect on connection drops
- Colored agent status indicators
- Activity log streaming from progress and result files
- Session history

### Recommended Terminal Layout

Use 3 terminals for optimal visibility:

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   Terminal 1:           │   Terminal 2:        │
│   oma dashboard         │   Agent spawn        │
│   (live monitoring)     │   commands           │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   Terminal 3:                                  │
│   Test/build logs, git operations              │
│                                                │
└────────────────────────────────────────────────┘
```

### Checking Individual Agent Status

```bash
oma agent:status <session-id> <agent-id>
```

Returns the current status of a specific agent: running, completed, or failed, along with turn count and last activity.

---

## Session ID Strategy

Session IDs group agents working on the same feature. Best practices:

- **One session per feature:** All agents working on "user authentication" share `session-auth-01`
- **Format:** Use descriptive IDs: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **Auto-generated:** The orchestrator generates IDs in `session-YYYYMMDD-HHMMSS` format
- **Reusable for iteration:** Use the same session ID when re-spawning agents with refinements

Session IDs determine:
- Which memory files agents read and write (`progress-{agent}.md`, `result-{agent}.md`)
- What the dashboard monitors
- How results are grouped in the final report

---

## Tips for Parallel Execution

### Do

1. **Lock API contracts first.** Run `/plan` before spawning implementation agents so frontend and backend agents agree on endpoints, request/response schemas, and error formats.

2. **Use one session ID per feature.** This keeps agent outputs grouped and dashboard monitoring coherent.

3. **Assign separate workspaces.** Always use `-w` to isolate agents:
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **Monitor actively.** Open a dashboard terminal to catch issues early — a failing agent wastes turns if not caught quickly.

5. **Run QA after implementation.** Spawn the QA agent sequentially after all implementation agents complete:
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent:spawn qa "Review all changes" session-01
   ```

6. **Iterate with re-spawns.** If an agent's output needs refinement, re-spawn it with the original task plus correction context. Do not start a new session.

7. **Start with `/work` if unsure.** The work workflow guides you through the process step by step with user confirmation at each gate.

### Do Not

1. **Do not spawn agents in the same workspace.** Two agents writing to the same directory will create merge conflicts and overwrite each other's work.

2. **Do not exceed MAX_PARALLEL (default 3).** More concurrent agents does not always mean faster results. Each agent needs memory and CPU resources. The default of 3 is tuned for most systems.

3. **Do not skip the plan step.** Spawning agents without a plan leads to misaligned implementations — the frontend builds against one API shape while the backend builds another.

4. **Do not ignore failed agents.** A failed agent's work is incomplete. Check `result-{agent}.md` for the failure reason, fix the prompt, and re-spawn.

5. **Do not mix session IDs for related work.** If backend and frontend agents are working on the same feature, they must share a session ID so the orchestrator can coordinate them.

---

## End-to-End Example

A complete parallel execution workflow for building a user authentication feature:

```bash
# Step 1: Plan the feature
# (In your AI IDE, run /plan or describe the feature)
# This creates .agents/results/plan-{sessionId}.json with task breakdown

# Step 2: Spawn implementation agents in parallel
oma agent:spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use bcrypt for password hashing. Follow the API contract in .agents/skills/_shared/core/api-contracts/" session-auth-01 -w ./apps/api &
oma agent:spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent:spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Step 3: Monitor in a separate terminal
# Terminal 2:
oma dashboard

# Step 4: Wait for all implementation agents
wait

# Step 5: Run QA review
oma agent:spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Step 6: If QA finds issues, re-spawn specific agents with fixes
oma agent:spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Step 7: Re-run QA to verify fixes
oma agent:spawn qa "Re-review backend auth after fixes." session-auth-01
```
