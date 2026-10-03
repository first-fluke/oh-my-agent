---
title: 并行执行
description: 使用当前 CLI 语法、任务文件、内联模式、工作区隔离、模型与供应商解析、监控、会话 ID 和恢复模式并行运行多个 OMA 调度角色。
---

# 并行执行

oh-my-agent 的核心优势是同时运行多个专业智能体。后端智能体实现 API 时，前端智能体创建 UI，移动端智能体构建应用界面，编排器通过持久化运行状态和回执协调它们。

---

## agent:spawn：启动单个智能体

### 基本语法

```bash
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

### 参数

| 参数 | 必填 | 说明 |
|-----------|----------|-------------|
| `agent-id` | 是 | 规范调度角色：`orchestrator`、`architecture`、`qa`、`pm`、`backend`、`frontend`、`mobile`、`db`、`debug`、`refactor`、`docs`、`tf-infra` 或 `explore` |
| `prompt` | 是 | 任务说明（带引号的字符串或提示文件路径） |
| `session-id` | 是 | 将处理同一功能的智能体归入同一组。格式为 `session-YYYYMMDD-HHMMSS` 或任意唯一字符串。 |
| `options` | 否 | 参见下面的选项表 |

### 选项

| 标志 | 短标志 | 说明 |
|------|-------|-------------|
| `--workspace <path>` | `-w` | 智能体的工作目录。智能体只能修改此目录内的文件。 |
| `--vendor <vendor>` | | 为这次启动覆盖 CLI 供应商（`antigravity`、`claude`、`codex`、`cursor`、`opencode`、`qwen`、`grok` 或 `pi`）。 |
| `--resumed-from <run-id>` |  | 将重试关联到之前有证据支持的运行。 |
| `--fallback-vendors <vendors>` |  | 主供应商无法运行时使用的、有序逗号分隔供应商回退列表。 |
| `--task-id <id>` |  | 将启动绑定到会话计划中的任务 ID。 |
| `--isolation <mode>` |  | `worktree` 会在临时 OMA 工作树目录下创建新的 Git 工作树。工作树会保留，以便审查和合并或丢弃。 |
| `--read-only` |  | 将启动的智能体限制为非破坏性工具。 |

### 示例

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
```

---

## 使用后台进程并行启动

要同时运行多个智能体，可使用 shell 后台进程：

```bash
# Spawn 3 agents in parallel
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Block until all agents complete
```

`&` 会让每个智能体在后台运行。`wait` 会阻塞，直到所有后台进程完成。

### 工作区感知模式 {#workspace-aware-pattern}

并行运行智能体时始终分配独立工作区，以避免文件冲突：

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

## agent:parallel：内联并行模式

要使用更简洁的语法，并自动处理后台进程管理：

### 语法

```bash
oma agent parallel --inline "<agent1>:<prompt1>" "<agent2>:<prompt2>" [options]
```

### 示例

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
  --session session-auth-01
```

`--inline` 标志会解析每个 `agent:task` 参数。如果任务需要指定工作区，可添加第三个以冒号分隔的路径（`agent:task:workspace`）。不使用 `--inline` 时，传入包含 `{tasks: [{id?, agent, task, workspace?}]}` 的 YAML 任务文件。`--session` 将并行结果关联到已有会话。

---

## 多 CLI 配置

oh-my-agent 通过 `.agents/oma-config.yaml` 中的 `model_preset` 将每个智能体路由到适当的 CLI。选择正在使用的供应商对应的内置预设，也可以单独覆盖智能体。

### 配置示例

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed   # mixed: Claude for coordination, Codex for implementation/explore

# Override specific agents on top of the preset
agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }
  backend:  { model: openai/gpt-5.5, effort: high }
```

内置预设：`auto`、`free`、`antigravity`、`claude`、`codex`、`qwen`、`cursor`、`kiro` 和 `mixed`。详情参见[按智能体选择模型](../guide/per-agent-models.md)。

### 供应商解析

`oma agent spawn` 确定使用哪个 CLI 时，按以下优先级处理：

| 优先级 | 来源 | 示例 |
|---------|------|---------|
| 1（最高） | `--vendor` 标志 | `oma agent spawn backend "task" session-01 --vendor claude` |
| 2 | `oma-config.yaml` 中的 `agents:` 覆盖项 | `agents: { backend: { model: openai/gpt-5.5 } }` |
| 3 | 当前 `model_preset` 的智能体默认值 | 针对智能体角色查询预设 |

`--vendor` 标志始终优先。如果没有提供该标志，系统会依次检查 `agents:` 覆盖项、预设默认值，再检查配置的回退 CLI。使用 `model_preset: auto` 时，由当前运行时的原生设置提供模型。

---

## 供应商特定的启动方式

启动机制取决于 IDE 或 CLI：

| 供应商 | 智能体启动方式 | 结果处理 |
|--------|----------------|---------|
| **Claude Code** | 同供应商任务使用带有 `.claude/agents/{name}.md` 的 Agent 工具；跨供应商任务回退到 `oma agent spawn`。 | 同步返回 |
| **Codex CLI** | 同供应商任务使用 `.codex/agents/{name}.toml` 中的原生自定义智能体；跨供应商任务回退到 `oma agent spawn`。 | JSON 输出 |
| **Antigravity CLI/IDE** | 通过 `agy` 运行时使用 `oma agent spawn`；不要求自定义原生子智能体。 | 持久化回执和结果文件轮询 |
| **Cursor** | 优先使用可用的生成式 Cursor 集成，否则使用 `oma agent spawn`。 | 轮询结果文件 |
| **OpenCode / pi** | 选中时使用进程内扩展桥；跨供应商工作使用 `oma agent spawn`。 | 轮询结果文件 |
| **CLI 回退** | `oma agent spawn {agent} {prompt} {session} -w {workspace}` | 有证据支持的结果轮询 |

在 Claude Code 中运行时，工作流直接使用 `Agent` 工具：

```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

同一消息中的多次 Agent 工具调用会真正并行执行，不会按顺序等待。

所有供应商都遵循相同的调度规则：

1. 从 `.agents/oma-config.yaml` 解析 `target_vendor_for_agent`
2. 如果它与当前运行时供应商相同，使用该供应商的原生智能体文件
3. 如果不同，仅对该智能体使用 `oma agent spawn`

---

## 监控智能体

### 终端仪表板

```bash
oma dashboard terminal
```

显示实时表格，包括：
- 会话 ID 和整体状态
- 每个智能体的状态（running、completed、failed）
- 回合数
- 进度文件中的最新活动
- 已用时间

仪表板监控 `.agents/state/memories/`，实时显示更新，并在智能体写入进度时刷新。

### Web 仪表板

```bash
oma dashboard web
# Opens http://localhost:9847
```

功能：
- 通过 WebSocket 实时更新
- 连接断开后自动重连
- 带颜色的智能体状态指示器
- 从进度和结果文件流式传输活动日志
- 会话历史

### 推荐终端布局

使用 3 个终端以获得最佳可见性：

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   Terminal 1:           │   Terminal 2:        │
│   oma dashboard terminal         │   Agent spawn        │
│   (live monitoring)     │   commands           │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   Terminal 3:                                  │
│   Test/build logs, git operations              │
│                                                │
└────────────────────────────────────────────────┘
```

### 检查单个智能体状态

```bash
oma agent status <session-id> <agent-id>
```

返回指定智能体的当前状态：running、completed 或 failed，以及回合数和最近活动。

---

## 会话 ID 策略

会话 ID 将处理同一功能的智能体归入一组。建议：

- **每个功能使用一个会话**：处理“用户身份验证”的所有智能体共用 `session-auth-01`
- **格式**：使用描述性 ID，例如 `session-auth-01`、`session-payment-v2`、`session-20260324-143000`
- **自动生成**：编排器生成 `session-YYYYMMDD-HHMMSS` 格式的 ID
- **迭代复用**：使用相同会话 ID 重新启动需要改进的智能体

会话 ID 决定：

- 智能体读写哪些运行范围内的内存文件（`progress-{agentId}-{taskId}-{runId}-{sessionId}.md`、`result-{agentId}-{taskId}-{runId}-{sessionId}.md`）
- 仪表板监控什么
- 最终报告如何归组结果

---

## 并行执行技巧

### 应该做

1. **先锁定 API 契约**。启动实现智能体前运行 `/plan`，让前端和后端智能体对端点、请求与响应模式以及错误格式达成一致。

2. **每个功能使用一个会话 ID**。这样可以让智能体输出和仪表板监控保持一致。

3. **分配独立工作区**。始终使用 `-w` 隔离智能体：
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **主动监控**。打开仪表板终端，尽早发现问题。未被及时发现的失败智能体会浪费回合。

5. **实现完成后运行 QA**。所有实现智能体结束后按顺序启动 QA 智能体：
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent spawn qa "Review all changes" session-01
   ```

6. **通过重新启动进行迭代**。如果智能体输出需要改进，带上原始任务和修正上下文重新启动。不要创建新会话。

7. **不确定时从 `/work` 开始**。工作流会在每个关卡提供用户确认，引导你逐步完成。

### 不应该做

1. **不要在同一工作区启动智能体**。两个智能体写入同一目录会造成合并冲突并互相覆盖文件。

2. **不要超过 MAX_PARALLEL（默认 3**）。更多并发不一定更快。每个智能体都需要内存和 CPU，默认值适合大多数系统。

3. **不要跳过计划步骤**。没有计划就启动智能体，会导致实现错位，例如前端和后端使用不同的 API 形状。

4. **不要忽略失败的智能体**。失败智能体的工作不完整。检查其结构化声明或运行范围内的结果文件，修正提示后重新启动。

5. **不要为相关工作混用会话 ID**。如果后端和前端处理同一功能，必须共用会话 ID，以便编排器协调。

---

## 端到端示例

一个用户身份验证功能的完整并行执行工作流：

```bash
# Step 1: Plan the feature
# (In your AI IDE, run /plan or describe the feature)
# This creates .agents/results/plan-{sessionId}.json with task breakdown

# Step 2: Spawn implementation agents in parallel
oma agent spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use Argon2id for password hashing. Follow the API contract in .agents/results/api-contracts/" session-auth-01 -w ./apps/api &
oma agent spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Step 3: Monitor in a separate terminal
# Terminal 2:
oma dashboard terminal

# Step 4: Wait for all implementation agents
wait

# Step 5: Run QA review
oma agent spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Step 6: If QA finds issues, re-spawn specific agents with fixes
oma agent spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Step 7: Re-run QA to verify fixes
oma agent spawn qa "Re-review backend auth after fixes." session-auth-01
```
