---
title: 并行执行
description: 同时运行多个 oh-my-agent 智能体的完整指南 —— agent:spawn 语法及所有选项、agent:parallel 内联模式、工作区感知模式、多 CLI 配置、供应商解析优先级、仪表盘监控、会话 ID 策略以及应避免的反模式。
---

# 并行执行

oh-my-agent 的核心优势在于同时运行多个专业化智能体。当 backend 智能体在实现 API 时，frontend 智能体在创建 UI，mobile 智能体在构建应用界面 —— 所有这些都通过共享内存协调。

---

## agent:spawn —— 单智能体启动

### 基本语法

```bash
oma agent:spawn <agent-id> <prompt> <session-id> [options]
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `agent-id` | 是 | 智能体标识符：`backend`、`frontend`、`mobile`、`db`、`pm`、`qa`、`debug`、`design`、`tf-infra`、`dev-workflow`、`translator`、`orchestrator`、`commit` |
| `prompt` | 是 | 任务描述（引号字符串或提示词文件路径） |
| `session-id` | 是 | 将处理同一功能的智能体分组。格式：`session-YYYYMMDD-HHMMSS` 或任何唯一字符串。 |
| `options` | 否 | 见下方选项表 |

### 选项

| 标志 | 缩写 | 说明 |
|------|------|------|
| `--workspace <path>` | `-w` | 智能体的工作目录。智能体只修改此目录内的文件。 |
| `--model <name>` | `-m` | 覆盖此次启动的 CLI 供应商。选项：`gemini`、`claude`、`codex`、`qwen`。 |
| `--max-turns <n>` | `-t` | 覆盖此智能体的默认轮次限制。 |
| `--json` | | 以 JSON 格式输出结果（适用于脚本化场景）。 |
| `--no-wait` | | 即发即忘 —— 立即返回，不等待完成。 |

### 示例

```bash
# 使用默认供应商启动 backend 智能体
oma agent:spawn backend "Implement JWT authentication API with refresh tokens" session-01

# 使用工作区隔离启动
oma agent:spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# 为此特定智能体覆盖供应商
oma agent:spawn frontend "Build login form" session-01 -m claude -w ./apps/web

# 为复杂任务设置更高的轮次限制
oma agent:spawn backend "Implement payment gateway integration" session-01 -t 30

# 使用提示词文件而非内联文本
oma agent:spawn backend ./prompts/auth-api.md session-01 -w ./apps/api
```

---

## 使用后台进程并行启动

要同时运行多个智能体，使用 shell 后台进程：

```bash
# 并行启动 3 个智能体
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent:spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # 阻塞直到所有智能体完成
```

`&` 使每个智能体在后台运行。`wait` 阻塞直到所有后台进程完成。

### 工作区感知模式

并行运行智能体时，务必分配独立工作区以防止文件冲突：

```bash
# 全栈并行执行
oma agent:spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent:spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent:spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# 实现完成后，运行 QA（顺序执行 —— 依赖于实现结果）
oma agent:spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel —— 内联并行模式

提供更简洁的语法，自动管理后台进程：

### 语法

```bash
oma agent:parallel -i <agent1>:<prompt1> <agent2>:<prompt2> [options]
```

### 示例

```bash
# 基本并行执行
oma agent:parallel -i backend:"Implement auth API" frontend:"Build login form" mobile:"Auth screens"

# 使用 no-wait（即发即忘）
oma agent:parallel -i backend:"Auth API" frontend:"Login form" --no-wait

# 所有智能体自动共享同一会话
oma agent:parallel -i \
  backend:"JWT auth with refresh tokens" \
  frontend:"Login form with email validation" \
  db:"User schema with soft delete and audit trail"
```

`-i`（inline）标志允许直接在命令中指定智能体-提示词对。

---

## 多 CLI 配置

并非所有 AI CLI 在各领域都表现一致。oh-my-agent 允许你将智能体路由到最适合其领域的 CLI。

### 完整配置示例

```yaml
# .agents/oma-config.yaml

# 响应语言
language: en

# 报告日期格式
date_format: "YYYY-MM-DD"

# 时间戳时区
timezone: "Asia/Seoul"

# 默认 CLI（无智能体特定映射时使用）
default_cli: gemini

# 每智能体 CLI 路由
agent_cli_mapping:
  frontend: claude       # 复杂 UI 推理、组件组合
  backend: gemini        # 快速 API 脚手架、CRUD 生成
  mobile: gemini         # 快速 Flutter 代码生成
  db: gemini             # 快速 schema 设计
  pm: gemini             # 快速任务分解
  qa: claude             # 彻底的安全和无障碍审查
  debug: claude          # 深度根因分析、符号追踪
  design: claude         # 细致的设计决策、反模式检测
  tf-infra: gemini       # HCL 生成
  dev-workflow: gemini   # 任务运行器配置
  translator: claude     # 具有文化敏感性的细致翻译
  orchestrator: gemini   # 快速协调
  commit: gemini         # 简单提交消息生成
```

### 供应商解析优先级

当 `oma agent:spawn` 确定使用哪个 CLI 时，遵循以下优先级（最高优先）：

| 优先级 | 来源 | 示例 |
|--------|------|------|
| 1（最高） | `--model` 标志 | `oma agent:spawn backend "task" session-01 -m claude` |
| 2 | `agent_cli_mapping` | oma-config.yaml 中的 `agent_cli_mapping.backend: gemini` |
| 3 | `default_cli` | oma-config.yaml 中的 `default_cli: gemini` |
| 4 | `active_vendor` | 旧版 `cli-config.yaml` 设置 |
| 5（最低） | 硬编码回退 | `gemini` |

这意味着 `--model` 标志始终优先。如果未提供标志，系统依次检查智能体特定映射、默认值、旧版配置，最后回退到 Gemini。

---

## 供应商特定的启动方式

启动机制因 IDE/CLI 而异：

| 供应商 | 智能体启动方式 | 结果处理 |
|--------|-------------|---------|
| **Claude Code** | 使用 `.claude/agents/{name}.md` 定义的 `Agent` 工具。同一消息中多个 Agent 调用 = 真正并行。 | 同步返回 |
| **Codex CLI** | 模型协调的并行子智能体请求 | JSON 输出 |
| **Gemini CLI** | `oma agent:spawn` CLI 命令 | MCP 内存轮询 |
| **Antigravity IDE** | 仅 `oma agent:spawn`（自定义子智能体不可用） | MCP 内存轮询 |
| **CLI 回退** | `oma agent:spawn {agent} {prompt} {session} -w {workspace}` | 结果文件轮询 |

在 Claude Code 中运行时，工作流直接使用 `Agent` 工具：
```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

同一消息中的多个 Agent 工具调用以真正并行方式执行 —— 不需要顺序等待。

---

## 监控智能体

### 终端仪表盘

```bash
oma dashboard
```

显示实时表格，包含：
- 会话 ID 和整体状态
- 每个智能体的状态（运行中、已完成、失败）
- 轮次计数
- 来自进度文件的最新活动
- 已用时间

仪表盘监视 `.serena/memories/` 中的实时更新。智能体写入进度时自动刷新。

### Web 仪表盘

```bash
oma dashboard:web
# 打开 http://localhost:9847
```

功能：
- 通过 WebSocket 实时更新
- 连接断开时自动重连
- 彩色智能体状态指示器
- 从进度和结果文件流式传输活动日志
- 会话历史记录

### 推荐终端布局

使用 3 个终端以获得最佳可视性：

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   终端 1：              │   终端 2：           │
│   oma dashboard         │   智能体启动         │
│   （实时监控）          │   命令               │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   终端 3：                                     │
│   测试/构建日志、git 操作                      │
│                                                │
└────────────────────────────────────────────────┘
```

### 检查单个智能体状态

```bash
oma agent:status <session-id> <agent-id>
```

返回特定智能体的当前状态：running、completed 或 failed，以及轮次计数和最后活动。

---

## 会话 ID 策略

会话 ID 将处理同一功能的智能体分组。最佳实践：

- **每个功能一个会话：** 所有处理"用户认证"的智能体共享 `session-auth-01`
- **格式：** 使用描述性 ID：`session-auth-01`、`session-payment-v2`、`session-20260324-143000`
- **自动生成：** 编排器以 `session-YYYYMMDD-HHMMSS` 格式生成 ID
- **可重用于迭代：** 重新启动智能体进行改进时使用相同的会话 ID

会话 ID 决定：
- 智能体读写哪些内存文件（`progress-{agent}.md`、`result-{agent}.md`）
- 仪表盘监控什么
- 结果如何在最终报告中分组

---

## 并行执行技巧

### 应该做

1. **先锁定 API 契约。** 在启动实现智能体前运行 `/plan`，这样 frontend 和 backend 智能体就能在端点、请求/响应 schema 和错误格式上达成一致。

2. **每个功能使用一个会话 ID。** 这使智能体输出分组有序，仪表盘监控一目了然。

3. **分配独立工作区。** 始终使用 `-w` 隔离智能体：
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **主动监控。** 打开仪表盘终端尽早发现问题 —— 失败的智能体如果不能及时发现会浪费轮次。

5. **实现后运行 QA。** 在所有实现智能体完成后顺序启动 QA 智能体：
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent:spawn qa "Review all changes" session-01
   ```

6. **通过重启迭代。** 如果智能体的输出需要改进，带上原始任务和修正上下文重新启动。不要开启新会话。

7. **不确定时从 `/work` 开始。** work 工作流会在每个关卡逐步引导你并获取用户确认。

### 不应该做

1. **不要在同一工作区启动多个智能体。** 两个智能体写入同一目录会产生合并冲突并覆盖彼此的工作。

2. **不要超过 MAX_PARALLEL（默认 3）。** 更多并发智能体不一定意味着更快的结果。每个智能体需要内存和 CPU 资源。默认的 3 适合大多数系统。

3. **不要跳过计划步骤。** 没有计划就启动智能体会导致实现不一致 —— frontend 按一种 API 格式构建，backend 按另一种格式构建。

4. **不要忽略失败的智能体。** 失败智能体的工作是不完整的。检查 `result-{agent}.md` 了解失败原因，修正提示词，重新启动。

5. **不要为相关工作混用会话 ID。** 如果 backend 和 frontend 智能体在处理同一功能，它们必须共享同一会话 ID，这样编排器才能协调它们。

---

## 端到端示例

构建用户认证功能的完整并行执行工作流：

```bash
# 步骤 1：规划功能
# （在你的 AI IDE 中，运行 /plan 或描述功能）
# 这会创建包含任务分解的 .agents/plan.json

# 步骤 2：并行启动实现智能体
oma agent:spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use bcrypt for password hashing. Follow the API contract in .agents/skills/_shared/core/api-contracts/" session-auth-01 -w ./apps/api &
oma agent:spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent:spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# 步骤 3：在另一个终端中监控
# 终端 2：
oma dashboard

# 步骤 4：等待所有实现智能体完成
wait

# 步骤 5：运行 QA 审查
oma agent:spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# 步骤 6：如果 QA 发现问题，重新启动特定智能体进行修复
oma agent:spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# 步骤 7：重新运行 QA 验证修复
oma agent:spawn qa "Re-review backend auth after fixes." session-auth-01
```
