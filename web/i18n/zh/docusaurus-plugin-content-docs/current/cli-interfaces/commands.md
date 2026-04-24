---
title: "CLI 命令"
description: oh-my-agent CLI 每个命令的完整参考 —— 语法、选项、示例，按类别组织。
---

# CLI 命令

全局安装后（`bun install --global oh-my-agent`），使用 `oma` 或 `oh-my-agent`。不安装一次性使用可运行 `npx oh-my-agent`。

环境变量 `OH_MY_AG_OUTPUT_FORMAT` 可设为 `json`，对支持的命令强制机器可读输出。这等同于对每个命令传递 `--json`。

---

## 安装与配置

### oma (install)

无参数的默认命令启动交互式安装器。

```
oma
```

**功能：**
1. 检查旧版 `.agent/` 目录，如找到则迁移到 `.agents/`。
2. 检测并提议移除竞争工具。
3. 提示选择项目类型（All、Fullstack、Frontend、Backend、Mobile、DevOps、Custom）。
4. 如果选择了 backend，提示选择语言变体（Python、Node.js、Rust、Other）。
5. 询问 GitHub Copilot 符号链接。
6. 从注册表下载最新 tarball。
7. 安装共享资源、工作流、配置和选中的技能。
8. 安装所有供应商的供应商适配（Claude、Codex、Gemini、Qwen）。
9. 创建 CLI 符号链接。
10. 提议启用 `git rerere`。
11. 提议为 Antigravity IDE 和 Gemini CLI 配置 MCP。

**示例：**
```bash
cd /path/to/my-project
oma
# 按照交互式提示操作
```

### doctor

CLI 安装、MCP 配置和技能状态的健康检查。

```
oma doctor [--json] [--output <format>]
```

**选项：**

| 标志 | 说明 |
|:-----|:-----|
| `--json` | 以 JSON 输出 |
| `--output <format>` | 输出格式（`text` 或 `json`） |

**检查内容：**
- CLI 安装：gemini、claude、codex、qwen（版本和路径）。
- 每个 CLI 的认证状态。
- MCP 配置：`~/.gemini/settings.json`、`~/.claude.json`、`~/.codex/config.toml`。
- 已安装技能：哪些技能存在及其状态。

**示例：**
```bash
# 交互式文本输出
oma doctor

# CI 流水线用 JSON 输出
oma doctor --json

# 管道到 jq 进行特定检查
oma doctor --json | jq '.clis[] | select(.installed == false)'
```

### update

从注册表更新技能到最新版本。

```
oma update [-f | --force] [--ci]
```

**选项：**

| 标志 | 说明 |
|:-----|:-----|
| `-f, --force` | 覆盖用户自定义的配置文件（`oma-config.yaml`、`mcp.json`、`stack/` 目录） |
| `--ci` | 以非交互 CI 模式运行（跳过提示、纯文本输出） |

**功能：**
1. 从注册表获取 `prompt-manifest.json` 检查最新版本。
2. 与 `.agents/skills/_version.json` 中的本地版本比较。
3. 如果已是最新，退出。
4. 下载并解压最新 tarball。
5. 保留用户自定义文件（除非 `--force`）。
6. 将新文件覆盖到 `.agents/`。
7. 恢复保留的文件。
8. 更新供应商适配并刷新符号链接。

**示例：**
```bash
# 标准更新（保留配置）
oma update

# 强制更新（重置所有配置为默认值）
oma update --force

# CI 模式（无提示、无动画）
oma update --ci

# CI 模式 + 强制
oma update --ci --force
```

---

## 监控与指标

### dashboard

启动终端仪表盘进行实时智能体监控。

```
oma dashboard
```

无选项。监视当前目录中的 `.serena/memories/`。渲染方框绘制 UI，包含会话状态、智能体表格和活动信息流。每次文件变化时更新。按 `Ctrl+C` 退出。

内存目录可通过 `MEMORIES_DIR` 环境变量覆盖。

**示例：**
```bash
# 标准使用
oma dashboard

# 自定义内存目录
MEMORIES_DIR=/path/to/.serena/memories oma dashboard
```

### dashboard:web

启动 Web 仪表盘。

```
oma dashboard:web
```

在 `http://localhost:9847` 启动 HTTP 服务器，带 WebSocket 连接进行实时更新。在浏览器中打开 URL 查看仪表盘。

**环境变量：**

| 变量 | 默认值 | 说明 |
|:-----|:-------|:-----|
| `DASHBOARD_PORT` | `9847` | HTTP/WebSocket 服务器端口 |
| `MEMORIES_DIR` | `{cwd}/.serena/memories` | 内存目录路径 |

**示例：**
```bash
# 标准使用
oma dashboard:web

# 自定义端口
DASHBOARD_PORT=8080 oma dashboard:web
```

### stats

查看生产力指标。

```
oma stats [--json] [--output <format>] [--reset]
```

**选项：**

| 标志 | 说明 |
|:-----|:-----|
| `--json` | 以 JSON 输出 |
| `--output <format>` | 输出格式（`text` 或 `json`） |
| `--reset` | 重置所有指标数据 |

**跟踪的指标：**
- 会话计数
- 使用的技能（含频率）
- 完成的任务
- 总会话时间
- 变更的文件、添加的行、删除的行
- 最后更新时间戳

指标存储在 `.serena/metrics.json` 中。数据从 git 统计和内存文件收集。

**示例：**
```bash
# 查看当前指标
oma stats

# JSON 输出
oma stats --json

# 重置所有指标
oma stats --reset
```

### retro

含指标和趋势的工程复盘。

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

**参数：**

| 参数 | 说明 | 默认值 |
|:-----|:-----|:-------|
| `window` | 分析的时间窗口（如 `7d`、`2w`、`1m`） | 最近 7 天 |

**选项：**

| 标志 | 说明 |
|:-----|:-----|
| `--json` | 以 JSON 输出 |
| `--output <format>` | 输出格式（`text` 或 `json`） |
| `--interactive` | 交互模式，手动输入 |
| `--compare` | 当前窗口与上一个同等长度窗口的比较 |

**显示内容：**
- 推文式摘要（一行指标）
- 摘要表（提交、变更文件、添加/删除行、贡献者）
- 与上次复盘的趋势（如果存在历史快照）
- 贡献者排行榜
- 提交时间分布（小时直方图）
- 工作会话
- 提交类型分布（feat、fix、chore 等）
- 热点（最常变更的文件）

**示例：**
```bash
# 最近 7 天（默认）
oma retro

# 最近 30 天
oma retro 30d

# 最近 2 周
oma retro 2w

# 与上一时期比较
oma retro 7d --compare

# 交互模式
oma retro --interactive

# 自动化用 JSON
oma retro 7d --json
```

---

## 智能体管理

### agent:spawn

启动子智能体进程。

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

**参数：**

| 参数 | 必填 | 说明 |
|:-----|:-----|:-----|
| `agent-id` | 是 | 智能体类型。可选：`backend`、`frontend`、`mobile`、`qa`、`debug`、`pm` |
| `prompt` | 是 | 任务描述。可为内联文本或文件路径。 |
| `session-id` | 是 | 会话标识符（格式：`session-YYYYMMDD-HHMMSS`） |

**选项：**

| 标志 | 说明 |
|:-----|:-----|
| `-m, --model <vendor>` | CLI 供应商覆盖：`gemini`、`claude`、`codex`、`qwen` |
| `-w, --workspace <path>` | 智能体的工作目录。如省略，从 monorepo 配置自动检测。 |

**供应商解析顺序：** `--model` 标志 > oma-config.yaml 中的 `agent_cli_mapping` > `default_cli` > cli-config.yaml 中的 `active_vendor` > `gemini`。

**提示词解析：** 如果提示词参数是现有文件的路径，则使用文件内容作为提示词。否则，参数作为内联文本使用。供应商特定的执行协议会自动追加。

**示例：**
```bash
# 内联提示词，自动检测工作区
oma agent:spawn backend "Implement /api/users CRUD endpoint" session-20260324-143000

# 从文件读取提示词，显式工作区
oma agent:spawn frontend ./prompts/dashboard.md session-20260324-143000 -w ./apps/web

# 覆盖供应商为 Claude
oma agent:spawn backend "Implement auth" session-20260324-143000 -m claude -w ./api

# Mobile 智能体，自动检测工作区
oma agent:spawn mobile "Add biometric login" session-20260324-143000
```

### agent:status

检查一个或多个子智能体的状态。

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

**参数：**

| 参数 | 必填 | 说明 |
|:-----|:-----|:-----|
| `session-id` | 是 | 要检查的会话 ID |
| `agent-ids` | 否 | 空格分隔的智能体 ID 列表。如省略，无输出。 |

**选项：**

| 标志 | 说明 | 默认值 |
|:-----|:-----|:-------|
| `-r, --root <path>` | 内存检查的根路径 | 当前目录 |

**状态值：**
- `completed` —— 结果文件存在（可选带状态头）。
- `running` —— PID 文件存在且进程存活。
- `crashed` —— PID 文件存在但进程已死，或无 PID/结果文件。

**输出格式：** 每行一个智能体：`{agent-id}:{status}`

**示例：**
```bash
# 检查特定智能体
oma agent:status session-20260324-143000 backend frontend

# 输出：
# backend:running
# frontend:completed

# 使用自定义根路径检查
oma agent:status session-20260324-143000 qa -r /path/to/project
```

### agent:parallel

并行运行多个子智能体。

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

**参数：**

| 参数 | 必填 | 说明 |
|:-----|:-----|:-----|
| `tasks` | 是 | YAML 任务文件路径，或（使用 `--inline`）内联任务规格 |

**选项：**

| 标志 | 说明 |
|:-----|:-----|
| `-m, --model <vendor>` | 所有智能体的 CLI 供应商覆盖 |
| `-i, --inline` | 内联模式：将任务指定为 `agent:task[:workspace]` 参数 |
| `--no-wait` | 后台模式 —— 启动智能体后立即返回 |

**YAML 任务文件格式：**
```yaml
tasks:
  - agent: backend
    task: "Implement user API"
    workspace: ./api           # 可选，省略则自动检测
  - agent: frontend
    task: "Build user dashboard"
    workspace: ./web
```

**内联任务格式：** `agent:task` 或 `agent:task:workspace`（workspace 必须以 `./` 或 `/` 开头）。

**结果目录：** `.agents/results/parallel-{timestamp}/` 包含每个智能体的日志文件。

**示例：**
```bash
# 从 YAML 文件
oma agent:parallel tasks.yaml

# 内联模式
oma agent:parallel --inline "backend:Implement auth API:./api" "frontend:Build login:./web"

# 后台模式（不等待）
oma agent:parallel tasks.yaml --no-wait

# 覆盖所有智能体的供应商
oma agent:parallel tasks.yaml -m claude
```

### agent:review

使用外部 AI CLI（codex、claude、gemini 或 qwen）运行代码审查。

```
oma agent:review [-m <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**选项：**

| 标志 | 说明 |
|:-----|:-----|
| `-m, --model <vendor>` | 使用的 CLI 供应商：`codex`、`claude`、`gemini`、`qwen`。默认为配置中解析的供应商。 |
| `-p, --prompt <prompt>` | 自定义审查提示词。如省略，使用默认的代码审查提示词。 |
| `-w, --workspace <path>` | 审查路径。默认为当前工作目录。 |
| `--no-uncommitted` | 跳过未提交变更的审查。设置后仅审查会话中已提交的变更。 |

**功能：**
- 从环境或近期 git 活动中自动检测当前会话 ID。
- 对于 `codex`：使用原生 `codex review` 子命令。
- 对于 `claude`、`gemini`、`qwen`：构造基于提示词的审查请求并调用 CLI。
- 默认审查工作目录中的未提交变更。
- 使用 `--no-uncommitted` 时，仅审查当前会话中已提交的变更。

**示例：**
```bash
# 使用默认供应商审查未提交变更
oma agent:review

# 使用 codex 审查（使用原生 codex review 命令）
oma agent:review -m codex

# 使用 claude 进行自定义提示词审查
oma agent:review -m claude -p "Focus on security vulnerabilities and input validation"

# 审查特定路径
oma agent:review -w ./apps/api

# 仅审查已提交变更（跳过工作区）
oma agent:review --no-uncommitted

# 使用 gemini 审查特定工作区中的已提交变更
oma agent:review -m gemini -w ./apps/web --no-uncommitted
```

---

## 内存管理

### memory:init

初始化 Serena 内存 schema。

```
oma memory:init [--json] [--output <format>] [--force]
```

**选项：**

| 标志 | 说明 |
|:-----|:-----|
| `--json` | 以 JSON 输出 |
| `--output <format>` | 输出格式（`text` 或 `json`） |
| `--force` | 覆盖空的或现有的 schema 文件 |

**功能：** 创建 `.serena/memories/` 目录结构及初始 schema 文件，供 MCP 内存工具用于读写智能体状态。

**示例：**
```bash
# 初始化内存
oma memory:init

# 强制覆盖现有 schema
oma memory:init --force
```

---

## 集成与工具

### auth:status

检查所有支持 CLI 的认证状态。

```
oma auth:status [--json] [--output <format>]
```

**选项：**

| 标志 | 说明 |
|:-----|:-----|
| `--json` | 以 JSON 输出 |
| `--output <format>` | 输出格式（`text` 或 `json`） |

**检查内容：** Gemini（API 密钥）、Claude（API 密钥或 OAuth）、Codex（API 密钥）、Qwen（API 密钥）。

**示例：**
```bash
oma auth:status
oma auth:status --json
```

### bridge

将 MCP stdio 桥接到 Streamable HTTP 传输。

```
oma bridge [url]
```

**参数：**

| 参数 | 必填 | 说明 |
|:-----|:-----|:-----|
| `url` | 否 | Streamable HTTP 端点 URL（如 `http://localhost:12341/mcp`） |

**功能：** 在 MCP stdio 传输（Antigravity IDE 使用）和 Streamable HTTP 传输（Serena MCP 服务器使用）之间充当协议桥接。这是必需的，因为 Antigravity IDE 不直接支持 HTTP/SSE 传输。

**架构：**
```
Antigravity IDE <-- stdio --> oma bridge <-- HTTP --> Serena Server
```

**示例：**
```bash
# 桥接到本地 Serena 服务器
oma bridge http://localhost:12341/mcp
```

### verify

验证子智能体输出是否符合预期标准。

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

**参数：**

| 参数 | 必填 | 说明 |
|:-----|:-----|:-----|
| `agent-type` | 是 | 可选：`backend`、`frontend`、`mobile`、`qa`、`debug`、`pm` |

**选项：**

| 标志 | 说明 | 默认值 |
|:-----|:-----|:-------|
| `-w, --workspace <path>` | 要验证的工作区路径 | 当前目录 |
| `--json` | 以 JSON 输出 | |
| `--output <format>` | 输出格式（`text` 或 `json`） | |

**功能：** 运行指定智能体类型的验证脚本，检查构建成功、测试结果和范围合规。

**示例：**
```bash
# 在默认工作区验证 backend 输出
oma verify backend

# 在特定工作区验证 frontend
oma verify frontend -w ./apps/web

# CI 用 JSON 输出
oma verify backend --json
```

### cleanup

清理孤立的子智能体进程和临时文件。

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**选项：**

| 标志 | 说明 |
|:-----|:-----|
| `--dry-run` | 显示将被清理的内容但不做实际操作 |
| `-y, --yes` | 跳过确认提示，清理所有内容 |
| `--json` | 以 JSON 输出 |
| `--output <format>` | 输出格式（`text` 或 `json`） |

**清理内容：**
- 系统临时目录中的孤立 PID 文件（`/tmp/subagent-*.pid`）。
- 孤立日志文件（`/tmp/subagent-*.log`）。
- Gemini Antigravity 目录（brain、implicit、knowledge），位于 `.gemini/antigravity/` 下。

**示例：**
```bash
# 预览将被清理的内容
oma cleanup --dry-run

# 带确认提示清理
oma cleanup

# 无提示清理所有内容
oma cleanup --yes

# 自动化用 JSON 输出
oma cleanup --json
```

### visualize

以依赖图形式可视化项目结构。

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

`viz` 是 `visualize` 的内置别名。

**选项：**

| 标志 | 说明 |
|:-----|:-----|
| `--json` | 以 JSON 输出 |
| `--output <format>` | 输出格式（`text` 或 `json`） |

**功能：** 分析项目结构并生成依赖图，显示技能、智能体、工作流和共享资源之间的关系。

**示例：**
```bash
oma visualize
oma viz --json
```

### star

在 GitHub 上给 oh-my-agent 加星。

```
oma star
```

无选项。需要安装并认证 `gh` CLI。为 `first-fluke/oh-my-agent` 仓库加星。

**示例：**
```bash
oma star
```

### describe

将 CLI 命令描述为 JSON，用于运行时自省。

```
oma describe [command-path]
```

**参数：**

| 参数 | 必填 | 说明 |
|:-----|:-----|:-----|
| `command-path` | 否 | 要描述的命令。如省略，描述根程序。 |

**功能：** 输出包含命令名称、描述、参数、选项和子命令的 JSON 对象。供 AI 智能体了解可用的 CLI 能力。

**示例：**
```bash
# 描述所有命令
oma describe

# 描述特定命令
oma describe agent:spawn

# 描述子命令
oma describe "agent:parallel"
```

### help

显示帮助信息。

```
oma help
```

显示包含所有可用命令的完整帮助文本。

### version

显示版本号。

```
oma version
```

输出当前 CLI 版本并退出。

---

## 环境变量

| 变量 | 说明 | 使用者 |
|:-----|:-----|:-------|
| `OH_MY_AG_OUTPUT_FORMAT` | 设为 `json` 对所有支持的命令强制 JSON 输出 | 所有带 `--json` 标志的命令 |
| `DASHBOARD_PORT` | Web 仪表盘端口 | `dashboard:web` |
| `MEMORIES_DIR` | 覆盖内存目录路径 | `dashboard`、`dashboard:web` |

---

## 别名

| 别名 | 完整命令 |
|:-----|:---------|
| `viz` | `visualize` |
