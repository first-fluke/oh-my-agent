---
title: "CLI 选项"
description: 所有 CLI 选项的详尽参考 —— 全局标志、输出控制、每命令选项和实际使用模式。
---

# CLI 选项

## 全局选项

这些选项在根命令 `oma` / `oh-my-agent` 上可用：

| 标志 | 说明 |
|:-----|:-----|
| `-V, --version` | 输出版本号并退出 |
| `-h, --help` | 显示命令帮助 |

所有子命令也支持 `-h, --help` 显示其特定帮助文本。

---

## 输出选项

许多命令支持机器可读输出，适用于 CI/CD 流水线和自动化。有三种方式请求 JSON 输出，按优先级排列：

### 1. --json 标志

```bash
oma stats --json
oma doctor --json
oma cleanup --json
```

`--json` 标志是获取 JSON 输出最简单的方式。可用于：`doctor`、`stats`、`retro`、`cleanup`、`auth:status`、`memory:init`、`verify`、`visualize`。

### 2. --output 标志

```bash
oma stats --output json
oma doctor --output text
```

`--output` 标志接受 `text` 或 `json`。它提供与 `--json` 相同的功能，但也允许显式请求文本输出（当环境变量设为 json 但你想要特定命令使用文本时有用）。

**验证：** 如果提供了无效格式，CLI 抛出：`Invalid output format: {value}. Expected one of text, json`。

### 3. OH_MY_AG_OUTPUT_FORMAT 环境变量

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats    # 输出 JSON
oma doctor   # 输出 JSON
oma retro    # 输出 JSON
```

将此环境变量设为 `json` 对所有支持的命令强制 JSON 输出。仅识别 `json`；其他值被忽略，默认为文本。

**解析顺序：** `--json` 标志 > `--output` 标志 > `OH_MY_AG_OUTPUT_FORMAT` 环境变量 > `text`（默认）。

### 支持 JSON 输出的命令

| 命令 | `--json` | `--output` | 备注 |
|:-----|:---------|:----------|:-----|
| `doctor` | 是 | 是 | 包含 CLI 检查、MCP 状态、技能状态 |
| `stats` | 是 | 是 | 完整指标对象 |
| `retro` | 是 | 是 | 包含指标、作者、提交类型的快照 |
| `cleanup` | 是 | 是 | 已清理项目列表 |
| `auth:status` | 是 | 是 | 每个 CLI 的认证状态 |
| `memory:init` | 是 | 是 | 初始化结果 |
| `verify` | 是 | 是 | 每项检查的验证结果 |
| `visualize` | 是 | 是 | 依赖图的 JSON 表示 |
| `describe` | 始终 JSON | 不适用 | 始终输出 JSON（自省命令） |

---

## 每命令选项

### update

```
oma update [-f | --force] [--ci]
```

| 标志 | 缩写 | 说明 | 默认值 |
|:-----|:-----|:-----|:-------|
| `--force` | `-f` | 更新时覆盖用户自定义的配置文件。影响：`oma-config.yaml`、`mcp.json`、`stack/` 目录。不使用此标志时，这些文件在更新前备份并在之后恢复。 | `false` |
| `--ci` | | 以非交互 CI 模式运行。跳过所有确认提示，使用纯控制台输出而非动画。CI/CD 流水线中 stdin 不可用时必需。 | `false` |

**使用 --force 时的行为：**
- `oma-config.yaml` 被替换为注册表默认值。
- `mcp.json` 被替换为注册表默认值。
- Backend `stack/` 目录（语言特定资源）被替换。
- 所有其他文件无论此标志如何都会更新。

**使用 --ci 时的行为：**
- 启动时不执行 `console.clear()`。
- `@clack/prompts` 被替换为纯 `console.log`。
- 竞品检测提示被跳过。
- 错误抛出而非调用 `process.exit(1)`。

### stats

```
oma stats [--json] [--output <format>] [--reset]
```

| 标志 | 说明 | 默认值 |
|:-----|:-----|:-------|
| `--reset` | 重置所有指标数据。删除 `.serena/metrics.json` 并以空值重新创建。 | `false` |

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| 标志 | 说明 | 默认值 |
|:-----|:-----|:-------|
| `--interactive` | 交互模式，手动数据输入。提示无法从 git 收集的额外上下文（如心情、重要事件）。 | `false` |
| `--compare` | 将当前时间窗口与上一个同等长度的窗口比较。显示增量指标（如提交 +12、添加行 -340）。 | `false` |

**窗口参数格式：**
- `7d` —— 7 天
- `2w` —— 2 周
- `1m` —— 1 个月
- 省略则默认（7 天）

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| 标志 | 缩写 | 说明 | 默认值 |
|:-----|:-----|:-----|:-------|
| `--dry-run` | | 预览模式。列出将被清理的所有项目但不做更改。无论发现什么，退出码为 0。 | `false` |
| `--yes` | `-y` | 跳过所有确认提示。不询问直接清理所有内容。适用于脚本和 CI。 | `false` |

**清理内容：**
1. 孤立 PID 文件：`/tmp/subagent-*.pid`，其引用的进程不再运行。
2. 孤立日志文件：`/tmp/subagent-*.log`，匹配已死亡 PID。
3. Gemini Antigravity 目录：`.gemini/antigravity/brain/`、`.gemini/antigravity/implicit/`、`.gemini/antigravity/knowledge/` —— 这些会随时间积累状态并变得很大。

### agent:spawn

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

| 标志 | 缩写 | 说明 | 默认值 |
|:-----|:-----|:-----|:-------|
| `--model` | `-m` | CLI 供应商覆盖。必须是：`gemini`、`claude`、`codex`、`qwen` 之一。覆盖所有基于配置的供应商解析。 | 从配置解析 |
| `--workspace` | `-w` | 智能体的工作目录。如果省略或设为 `.`，CLI 从 monorepo 配置文件自动检测工作区（pnpm-workspace.yaml、package.json、lerna.json、nx.json、turbo.json、mise.toml）。 | 自动检测或 `.` |

**验证：**
- `agent-id` 必须是：`backend`、`frontend`、`mobile`、`qa`、`debug`、`pm` 之一。
- `session-id` 不得包含 `..`、`?`、`#`、`%` 或控制字符。
- `vendor` 必须是：`gemini`、`claude`、`codex`、`qwen` 之一。

**供应商特定行为：**

| 供应商 | 命令 | 自动批准标志 | 提示词标志 |
|:-------|:-----|:-----------|:----------|
| gemini | `gemini` | `--approval-mode=yolo` | `-p` |
| claude | `claude` | （无） | `-p` |
| codex | `codex` | `--full-auto` | （无 —— 提示词是位置参数） |
| qwen | `qwen` | `--yolo` | `-p` |

这些默认值可在 `.agents/skills/oma-orchestrator/config/cli-config.yaml` 中覆盖。

### agent:status

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

| 标志 | 缩写 | 说明 | 默认值 |
|:-----|:-----|:-----|:-------|
| `--root` | `-r` | 定位内存文件（`.serena/memories/result-{agent}.md`）和 PID 文件的根路径。 | 当前工作目录 |

**状态判定逻辑：**
1. 如果 `.serena/memories/result-{agent}.md` 存在：读取 `## Status:` 头。如果无头，报告 `completed`。
2. 如果 PID 文件存在于 `/tmp/subagent-{session-id}-{agent}.pid`：检查 PID 是否存活。存活报告 `running`，死亡报告 `crashed`。
3. 如果两个文件都不存在：报告 `crashed`。

### agent:parallel

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

| 标志 | 缩写 | 说明 | 默认值 |
|:-----|:-----|:-----|:-------|
| `--model` | `-m` | 应用于所有启动智能体的 CLI 供应商覆盖。 | 按智能体从配置解析 |
| `--inline` | `-i` | 将任务参数解释为 `agent:task[:workspace]` 字符串而非文件路径。 | `false` |
| `--no-wait` | | 后台模式。启动所有智能体后立即返回，不等待完成。PID 列表和日志保存到 `.agents/results/parallel-{timestamp}/`。 | `false`（等待完成） |

**内联任务格式：** `agent:task` 或 `agent:task:workspace`
- 通过检查最后一个冒号分隔段是否以 `./`、`/` 开头或等于 `.` 来检测 workspace。
- 示例：`backend:Implement auth API:./api` —— agent=backend，task="Implement auth API"，workspace=./api。
- 示例：`frontend:Build login page` —— agent=frontend，task="Build login page"，workspace=自动检测。

**YAML 任务文件格式：**
```yaml
tasks:
  - agent: backend
    task: "Implement user API"
    workspace: ./api           # 可选
  - agent: frontend
    task: "Build user dashboard"
```

### memory:init

```
oma memory:init [--json] [--output <format>] [--force]
```

| 标志 | 说明 | 默认值 |
|:-----|:-----|:-------|
| `--force` | 覆盖 `.serena/memories/` 中空的或现有的 schema 文件。不使用此标志时，现有文件不被触动。 | `false` |

### verify

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

| 标志 | 缩写 | 说明 | 默认值 |
|:-----|:-----|:-----|:-------|
| `--workspace` | `-w` | 要验证的工作区目录路径。 | 当前工作目录 |

**智能体类型：** `backend`、`frontend`、`mobile`、`qa`、`debug`、`pm`。

---

## 实用示例

### CI 流水线：更新和验证

```bash
# CI 模式更新，然后运行 doctor 验证安装
oma update --ci
oma doctor --json | jq '.healthy'
```

### 自动化指标收集

```bash
# 收集 JSON 指标并推送到监控系统
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### 批量智能体执行与状态监控

```bash
# 后台启动智能体
oma agent:parallel tasks.yaml --no-wait

# 定期检查状态
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent:status $SESSION_ID backend frontend mobile"
```

### 测试后的 CI 清理

```bash
# 无提示清理所有孤立进程
oma cleanup --yes --json
```

### 工作区感知验证

```bash
# 在各自工作区验证每个领域
oma verify backend -w ./apps/api
oma verify frontend -w ./apps/web
oma verify mobile -w ./apps/mobile
```

### 冲刺复盘用的带比较复盘

```bash
# 两周冲刺复盘，与上一冲刺比较
oma retro 2w --compare

# 保存为 JSON 用于冲刺报告
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### 完整健康检查脚本

```bash
#!/bin/bash
set -e

echo "=== oh-my-agent Health Check ==="

# 检查 CLI 安装
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'

# 检查认证状态
oma auth:status --json | jq -r '.[] | "\(.name): \(.status)"'

# 检查指标
oma stats --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'

echo "=== Done ==="
```

### 用于智能体自省的 describe

```bash
# AI 智能体可以发现可用命令
oma describe | jq '.command.subcommands[] | {name, description}'

# 获取特定命令的详情
oma describe agent:spawn | jq '.command.options[] | {flags, description}'
```
