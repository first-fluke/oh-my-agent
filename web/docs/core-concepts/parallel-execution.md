---
title: Parallel Execution
description: Run multiple OMA dispatch roles in parallel with the current CLI syntax, task files, inline mode, workspace isolation, model and vendor resolution, monitoring, session IDs, and recovery patterns.
---

# Parallel Execution

oh-my-agent runs multiple specialized agents in parallel. For example, backend, frontend, and mobile agents can work on separate parts of an application while the orchestrator coordinates them through durable run state and receipts.

---

## oma agent spawn: single agent spawning {#agentspawn-single-agent-spawning}

### Basic syntax

```bash
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `agent-id` | Yes | Canonical dispatch role: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, or `explore` |
| `prompt` | Yes | Task description (quoted string or path to a prompt file) |
| `session-id` | Yes | Groups agents working on the same feature. Format: `session-YYYYMMDD-HHMMSS` or any unique string. |
| `options` | No | See options table below |

### Options

| Flag | Short | Description |
|------|-------|-------------|
| `--workspace <path>` | `-w` | Working directory for the agent. Agents only modify files within this directory. |
| `--vendor <vendor>` | | Override the CLI vendor for this spawn (`antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, or `pi`). |
| `--resumed-from <run-id>` | | Link a retry to the preceding evidence-backed run. |
| `--fallback-vendors <vendors>` | | Ordered comma-separated vendor fallbacks when the primary cannot run. |
| `--task-id <id>` | | Bind the spawn to a task ID from the session plan. |
| `--isolation <mode>` | | `worktree` creates a fresh git worktree under the temporary OMA worktree directory. The worktree remains for review and merge/discard. |
| `--read-only` | | Restrict the spawned agent to non-destructive tools. |
| `--edit-only` | | Approve file edits and nothing else. The agent runs no commands, so the parent runs the checks. A vendor without such a mode refuses the launch. |
| `--model-id <id>` | | Run on this model, spelled as the target CLI expects it. Replaces the configured plan for this spawn, including its effort and provider route. |

`--read-only`, `--edit-only`, and neither are the three permission levels of a spawn. With neither, the agent runs with the vendor's auto-approve flag.

| Vendor | `--edit-only` passes | Effect |
|--------|----------------------|--------|
| Claude Code | `--disallowedTools Bash --permission-mode acceptEdits` | Edits apply; shell is unavailable |
| Grok | `--permission-mode acceptEdits --allow Edit --allow Write` | Edits apply; shell is refused |
| Antigravity | `--mode accept-edits` | Edits apply; shell is refused |
| Qwen Code | `--approval-mode auto-edit` | Edits apply; shell is unavailable. Qwen resets the mode in a folder it does not trust |
| Kiro | `--trust-tools=fs_read,fs_write` | Edits apply; shell is refused |
| Codex | `--sandbox workspace-write` | Codex has no tool-level rule: shell runs inside the sandbox, writes stay in the workspace, and the network is off |
| pi | `--exclude-tools bash,powershell` | Shell tools are removed |
| Cursor, OpenCode, Kilo, Kimi | (none) | Refused unless `vendors.<id>.edit_only_flag` names a restriction |

The first six rows were run against the installed CLIs on 2026-11-16 (Claude Code 2.1.325, Grok 1.0.77, agy 1.5.9, Qwen Code 0.27.1, kiro-cli 3.2.1, Codex 0.167.1). Cursor is refused because its shell tool ran without `--force`, with and without `--sandbox enabled`. A vendor's own user-level allow rules still apply on top of these flags.

### Examples

```bash
# Spawn a backend agent with default vendor
oma agent spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Spawn with workspace isolation
oma agent spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Override the CLI vendor for this specific spawn
oma agent spawn frontend "Build login form" session-01 --vendor claude -w ./apps/web

# Retry a run while preserving its evidence chain
oma agent spawn backend "Fix the payment gateway issue" session-01 --resumed-from run-123

# Use a prompt file instead of inline text
oma agent spawn backend ./prompts/auth-api.md session-01 -w ./apps/api

# Run inside an isolated git worktree (hypothesis spawn pattern)
oma agent spawn backend "Try a Drizzle-based rewrite" session-01 --isolation worktree

# Hand a task to a named vendor and model, with edits approved and nothing else
oma agent spawn docs ./prompts/translate-intro.md session-01 --vendor grok --model-id grok-4.7 --edit-only
```

---

## Parallel spawning with background processes

To run multiple agents simultaneously, use shell background processes:

```bash
# Spawn 3 agents in parallel
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Block until all agents complete
```

The `&` runs each agent in the background. `wait` blocks until all background processes finish.

### Workspace-aware pattern

Always assign separate workspaces when running agents in parallel to prevent file conflicts:

```bash
# Full-stack parallel execution
oma agent spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# After implementation, run QA (sequential; depends on implementation)
oma agent spawn qa "Review all implementations for security and accessibility" session-02
```

---

## oma agent parallel: inline parallel mode {#agentparallel-inline-parallel-mode}

For a cleaner syntax that handles background process management automatically:

### Syntax

```bash
oma agent parallel --inline "<agent1>:<prompt1>" "<agent2>:<prompt2>" [options]
```

### Examples

```bash
# Basic parallel execution
oma agent parallel --inline \
  "backend:Implement auth API" \
  "frontend:Build login form" \
  "mobile:Auth screens"

# With no-wait (fire and forget)
oma agent parallel --inline "backend:Auth API" "frontend:Login form" --no-wait

# All agents share the same session automatically
oma agent parallel --inline \
  "backend:JWT auth with refresh tokens" \
  "frontend:Login form with email validation" \
  "db:User schema with soft delete and audit trail" \
  --session-id session-auth-01
```

The `--inline` flag parses each `agent:task` argument. Add a third colon-delimited path (`agent:task:workspace`) when the task needs a specific workspace. Without `--inline`, pass a YAML task file with `{tasks: [{id?, agent, task, workspace?}]}`. `--session-id` binds the results to an existing session and the task IDs from the YAML file.

---

## oma agent batch: one session per worklist item {#agentbatch-worklist}

Use a batch when many items have the same shape, such as files to translate or modules to migrate. Each item is done when a command says so, not when an agent says so.

```bash
oma agent batch <agent-id> <prompt-template> --items <file> --check "<command>" [options]
```

- `--items` is a file with one item per line (`-` reads stdin). Blank lines and `#` comments are skipped and duplicates are dropped.
- `--check` is a command that exits 0 when an item is done. `{item}` is replaced by the item in every argument; the command runs without a shell.
- `<prompt-template>` is a file that contains `{item}`. Each session receives the rendered template, the check command, and the check's current output.

The batch runs the check for every item first and skips the ones that pass. Each remaining item gets one agent session per attempt, and the parent runs the check again after the session. A clean agent exit does not count: only the check does. Running the same command again resumes the batch, because the check decides what is left.

| Flag | Description |
|------|-------------|
| `--vendor <vendor>` | CLI vendor for every item |
| `--fallback-vendors <vendors>` | Vendors to switch to, in order, when the current one keeps failing |
| `--model-id <id>` | Model for the primary vendor; fallback vendors use their own configuration |
| `--edit-only` | Approve file edits and nothing else |
| `--concurrency <count>` | Sessions running at once (default 3) |
| `--max-attempts <count>` | Sessions per item before it is reported as failed (default 2) |
| `--dry-run` | Run the checks and report what would be dispatched |
| `--session-id <id>`, `--workspace <path>`, `--timeout-seconds`, `--deadline` | Same meaning as for `oma agent spawn` |

A vendor failure is a spawn that exits with a code other than 0 or 3, which means the vendor CLI itself failed (quota, authentication, crash). It does not consume an attempt. After two vendor failures in a row the batch moves to the next fallback vendor; with none left it stops and reports the remaining items as `not-run`, so an exhausted vendor is not fed the rest of the worklist.

```bash
# Fix lint errors one file per session; rerun the same command to resume
oma agent batch frontend ./prompts/fix-lint.md \
  --items ./files-with-lint-errors.txt \
  --check "bunx biome check {item}" \
  --vendor antigravity --fallback-vendors grok,claude --edit-only
```

The report is written to `.agents/results/batch-<timestamp>/report.json` with one entry per item: `already-passing`, `fixed`, `failed`, or `not-run`. The command exits 1 when any item is `failed` or `not-run`.

---

## Multi-CLI configuration

oh-my-agent routes each agent to the appropriate CLI via `model_preset` in `.agents/oma-config.yaml`. Choose a built-in preset for the vendor you use, and optionally override individual agents.

### Configuration example

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed   # mixed: Claude for coordination, Codex for implementation/explore

# Override specific agents on top of the preset
agents:
  frontend: { model: anthropic/claude-sonnet-5-5 }
  backend:  { model: openai/gpt-6.1-terra, effort: high }
```

Built-in presets: `auto`, `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro`, and `mixed`. See [Per-Agent Models](../guide/per-agent-models.md) for details.

### Vendor resolution

When `oma agent spawn` determines which CLI to use:

| Priority | Source | Example |
|----------|--------|---------|
| 1 (highest) | `--vendor` flag | `oma agent spawn backend "task" session-01 --vendor claude` |
| 2 | `agents:` override in `oma-config.yaml` | `agents: { backend: { model: openai/gpt-6.1-terra } }` |
| 3 | Active `model_preset` agent defaults | preset lookup for the agent role |

The `--vendor` flag always wins. If no flag is provided, the system checks `agents:` overrides, then the preset defaults, then the configured fallback CLI. With `model_preset: auto`, the current runtime's native settings supply the model.

---

## Vendor-specific spawn methods

The spawn mechanism varies by IDE/CLI:

| Vendor | How Agents Are Spawned | Result Handling |
|--------|----------------------|-----------------|
| **Claude Code** | Same-vendor tasks use the Agent tool with `.claude/agents/{name}.md`; cross-vendor tasks fall back to `oma agent spawn`. | Synchronous return |
| **Codex CLI** | Same-vendor tasks use native custom agents from `.codex/agents/{name}.toml`; cross-vendor tasks fall back to `oma agent spawn`. | JSON output |
| **Antigravity CLI/IDE** | `oma agent spawn` through the `agy` runtime; custom native subagents are not required | Durable receipt and result-file poll |
| **Cursor** | Uses generated Cursor integration where available; otherwise `oma agent spawn` | Result file poll |
| **OpenCode / pi** | Uses the in-process extension bridge when selected; cross-vendor work uses `oma agent spawn` | Result file poll |
| **CLI Fallback** | `oma agent spawn {agent} {prompt} {session} -w {workspace}` | Evidence-backed result poll |

When running inside Claude Code, the workflow uses the `Agent` tool directly:

```text
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Multiple Agent tool calls in the same message execute as true parallel, with no sequential waiting.

The same dispatch rule applies across vendors:

1. Resolve `target_vendor_for_agent` from `.agents/oma-config.yaml`
2. If it matches the current runtime vendor, use that vendor's native agent file
3. If it does not match, use `oma agent spawn` only for that agent

---

## Monitoring agents

### Terminal dashboard

```bash
oma dashboard terminal
```

Displays a live table with:
- Session ID and overall status
- Per-agent status (running, completed, failed)
- Turn counts
- Latest activity from progress files
- Elapsed time

The dashboard watches `.agents/state/memories/` for real-time updates. It refreshes as agents write progress.

### Web dashboard

```bash
oma dashboard web
# Serves the dashboard at http://127.0.0.1:9847
```

Features:
- Real-time updates via WebSocket
- Auto-reconnect on connection drops
- Colored agent status indicators
- Activity log streaming from progress and result files
- Session history

### Recommended terminal layout

Use 3 terminals for optimal visibility:

| Terminal | Run | Purpose |
|----------|-----|---------|
| 1 | `oma dashboard terminal` | Live monitoring |
| 2 | `oma agent spawn …` or `oma agent parallel …` | Agent spawn commands |
| 3 | Tests, build logs, git | Verification and git operations |

### Checking individual agent status

```bash
oma agent status <session-id> <agent-id>
```

Returns the current status of a specific agent: running, completed, or failed, along with turn count and last activity.

---

## Session ID strategy

Session IDs group agents working on the same feature. Best practices:

- **One session per feature:** All agents working on "user authentication" share `session-auth-01`
- **Format:** Use descriptive IDs: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **Auto-generated:** The orchestrator generates IDs in `session-YYYYMMDD-HHMMSS` format
- **Reusable for iteration:** Use the same session ID when re-spawning agents with refinements

Session IDs determine:
- Which run-scoped memory files agents read and write (`progress-{agentId}-{taskId}-{runId}-{sessionId}.md`, `result-{agentId}-{taskId}-{runId}-{sessionId}.md`)
- What the dashboard monitors
- How results are grouped in the final report

---

## Tips for parallel execution

### Do

1. **Lock API contracts first.** Run `/plan` before spawning implementation agents so frontend and backend agents agree on endpoints, request/response schemas, and error formats.

2. **Use one session ID per feature.** This keeps agent outputs grouped and dashboard monitoring coherent.

3. **Assign separate workspaces.** Always use `-w` to isolate agents:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **Monitor actively.** Open a dashboard terminal to catch issues early. A failing agent wastes turns if not caught quickly.

5. **Run QA after implementation.** Spawn the QA agent sequentially after all implementation agents complete:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent spawn qa "Review all changes" session-01
   ```

6. **Iterate with re-spawns.** If an agent's output needs refinement, re-spawn it with the original task plus correction context. Do not start a new session.

7. **Start with `/work` if unsure.** The work workflow guides you through the process step by step with user confirmation at each gate.

### Do not

1. **Do not spawn agents in the same workspace.** Two agents writing to the same directory will create merge conflicts and overwrite each other's work.

2. **Do not exceed MAX_PARALLEL (default 3).** More concurrent agents does not always mean faster results. Each agent needs memory and CPU resources. The default of 3 is tuned for most systems.

3. **Do not skip the plan step.** Spawning agents without a plan leads to misaligned implementations, where the frontend builds against one API shape while the backend builds another.

4. **Do not ignore failed agents.** A failed agent's work is incomplete. Check its structured claim or run-scoped result file for the failure reason, fix the prompt, and re-spawn.

5. **Do not mix session IDs for related work.** If backend and frontend agents are working on the same feature, they must share a session ID so the orchestrator can coordinate them.

---

## End-to-end example

A complete parallel execution workflow for building a user authentication feature:

```bash
# Step 1: Plan the feature
# (In your AI IDE, run /plan or describe the feature)
# This creates .agents/results/plan-{sessionId}.json with task breakdown

# Step 2: Spawn implementation agents in parallel
oma agent spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use Argon2id for password hashing. Follow the API contract in .agents/results/api-contracts/" session-auth-01 -w ./apps/api &
oma agent spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Step 3: Wait for all implementation agents
# (monitor them from a second terminal; see the block below)
wait

# Step 4: Run QA review
oma agent spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Step 5: If QA finds issues, re-spawn specific agents with fixes
oma agent spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Step 6: Re-run QA to verify fixes
oma agent spawn qa "Re-review backend auth after fixes." session-auth-01
```

Run the dashboard in a second terminal while the agents work. It keeps running until you press Ctrl+C, so do not paste it into the same shell as the spawn commands:

```bash
oma dashboard terminal
```

---

## See also

- [Agent results and resume](../guide/agent-results-and-resume.md): run receipts, claims, and `oma agent resume`
- [Dashboard monitoring](../guide/dashboard-monitoring.md)
- [Multi-agent project guide](../guide/multi-agent-project.md)
- [Per-agent models](../guide/per-agent-models.md)
- [The /orchestrate workflow](./workflows.md#orchestrate)
- [CLI commands reference](../cli-interfaces/commands.md)
