---
title: "指南：计划智能体"
sidebar_label: 计划智能体
description: "使用操作系统调度器（macOS launchd、Linux systemd、Windows Task Scheduler）运行重复或一次性智能体计划，无需保持供应商运行时打开。"
---

# 计划智能体

`oma schedule` 可以按时间计划运行任意智能体，与当前打开的是哪个 AI 供应商运行时（Claude Code、Codex、Antigravity、Cursor、Qwen、Grok、opencode 或 pi）无关。操作系统调度器触发任务，任务使用磁盘中已缓存的供应商凭据，以无头方式调用 `oma agent spawn`。

---

## 工作原理

运行 `oma schedule create` 时，oma 会：

1. 将任务记录写入全局清单 `~/.agents/schedule/schedules.json`。
2. 向操作系统调度器注册任务（macOS launchd、Linux systemd --user 或 Windows Task Scheduler）。操作系统任务会在配置的 cron 间隔调用 `oma schedule run <id>`。
3. 触发时，`oma schedule run` 查找任务，注入捕获的环境变量，调用 `oma agent spawn`，并将运行日志写入 `~/.agents/schedule/runs/<id>/<timestamp>.md`。

清单是唯一事实来源（SSOT）。操作系统调度器只是执行器。所有状态，包括任务定义、运行日志和上次触发时间戳，都位于 `~/.agents/schedule/` 下。

### 设计为仅全局

`oma schedule` 有意设计为用户全局功能，而不是按项目配置。由于操作系统调度器独立于当前工作目录运行任务，单一中央注册表是唯一实用的 SSOT。每个任务通过 `workspace` 和 `projectLabel` 记录所属项目，因此 `schedule list` 虽然使用共享注册表，仍能按项目分组任务。

没有 `--global` 标志；计划命令始终读取和写入 `~/.agents/schedule/`。

### 操作系统后端

| 平台 | 主要后端 | 回退 |
|---|---|---|
| macOS | launchd（plist + `launchctl`） | 用户 `crontab` |
| Linux | systemd --user timer | 用户 `crontab` |
| Windows | Task Scheduler（`schtasks`） | 无 |

oma 会自动选择可用后端，无需手动配置。

---

## 比较：schedule、ralph 与 Claude /loop

这三个功能有时会被混淆，因为它们都涉及“稍后再次运行”。它们代表不同概念。

| 功能 | 触发方式 | 范围 | 供应商重启后仍保留？ |
|---|---|---|---|
| `oma schedule` | 基于时间（cron） | 跨供应商、操作系统级 | 是，操作系统调度器即使没有供应商运行时打开也会触发 |
| `ralph` | 基于完成（Stop 钩子循环） | 跨供应商 | 仅在当前会话活动期间；ralph 是“持续运行直到完成”的循环，不是计时器 |
| Claude Code `/loop` | 基于时间（进程内 cron） | 仅 Claude 运行时 | 否，仅在 Claude Code 运行时触发 |

当你想让任务在每个工作日早上 9 点运行时使用 `schedule`。当你想让智能体持续迭代直到达到质量标准时使用 `ralph`。只有已经在 Claude Code 中，且不需要跨供应商可移植性时，才使用 `/loop`。

---

## 快速开始

```bash
# Run the qa-reviewer agent every weekday at 9 AM
oma schedule create qa-reviewer "Run QA review on the latest changes" --cron "0 9 * * 1-5"

# Run a backend agent every 2 hours using natural-language syntax
oma schedule create backend "Check for slow queries in the API logs" --every "2h"

# One-shot: run once at 3 PM today (cron syntax) and self-remove
oma schedule create pm "Generate weekly plan" --cron "0 15 * * *" --once

# Check what is scheduled
oma schedule list

# Remove a job
oma schedule delete sch_abc123def456
```

---

## 命令

### schedule create

注册计划智能体任务。

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>] [--dry-run] [--accept-rounded]
```

**参数：**

| 参数 | 必填 | 说明 |
|---|---|---|
| `agent-id` | 是 | 要生成的智能体类型：`backend`、`frontend`、`mobile`、`qa`、`debug`、`pm` |
| `prompt` | 是 | 运行时传给智能体的任务描述 |

**选项：**

| 标志 | 说明 |
|---|---|
| `--cron "<expr>"` | 五字段 cron 表达式（例如 `"0 9 * * *"` 表示每天 9 点）。不能与 `--every` 同时使用。 |
| `--every "<phrase>"` | 自然语言间隔（见下表）。不能与 `--cron` 同时使用。 |
| `--vendor <vendor>` | 传给 `oma agent spawn` 的 CLI 供应商覆盖：`antigravity`、`claude`、`codex`、`cursor`、`opencode`、`qwen`、`grok`、`pi`。默认从 `oma-config.yaml` 自动检测。 |
| `-w, --workspace <path>` | 智能体运行时的工作目录。默认使用注册时的当前工作目录。 |
| `--once` | 一次性模式：任务运行一次后自行移除。默认重复运行。 |
| `--expires-after <duration>` | 在例如 30d 的时长后自动使重复任务过期。`0` 表示无限期（默认）。 |
| `--env <KEY1,KEY2>` | 将指定的环境变量（仅限列出的变量）捕获到 `~/.agents/schedule/env/<id>`（权限 0600），以便运行时注入。密钥永远不会写入清单本身。 |
| `--dry-run` | 打印解析后的 cron 和任何取整提示，不写入调度器任务、清单条目或环境文件。 |
| `--accept-rounded` | OMA 将自然语言间隔取整为可由 cron 表达的步长后，注册该间隔所必需。先使用 `--dry-run` 预览。 |

`--cron` 和 `--every` 必须且只能指定一个。

#### --every：自然语言间隔

`--every` 接受以下短语形式。oma 会将它们解析为五字段 cron 表达式；请求的间隔被取整为最近的可由 cron 表达的步长时，会打印提示。

| 短语形式 | 示例 | 说明 |
|---|---|---|
| 紧凑单位 | `5m`、`2h`、`1d` | 分钟、小时、天 |
| Every + 紧凑单位 | `every 20m`、`every 2h` |  |
| Every + 单词 | `every 5 minutes`、`every 2 hours` | 接受复数单位单词 |
| 秒 | `30s` | 向上取整到最小 1 分钟；cron 无法表达小于一分钟的间隔 |

不能整除的间隔会取整到最近的整洁步长，并打印提示。例如，`--every 7m` 会取整为 `6m`（`*/6`），因为 7 不能整除 60。

注册前先预览取整后的间隔：

```bash
oma schedule create backend "Check logs" --every 7m --dry-run
# Preview: requested interval resolves to */6 * * * *
# Preview only: no OS job, manifest entry, or env file was written.
oma schedule create backend "Check logs" --every 7m --accept-rounded
```

省略预览时，命令会拒绝注册经过取整的间隔。计划使用所选操作系统调度器的本地时间规则。

**示例：**

```bash
# Exact cron expression (full control)
oma schedule create backend "Optimize slow queries" --cron "0 */4 * * *"

# Natural language (oma converts to cron)
oma schedule create frontend "Run lighthouse audit" --every "every 6 hours"
# Converts to 0 */6 * * * (6 divides 24 cleanly, so no rounding note)

# Pin to a vendor and a workspace
oma schedule create qa "Run security scan" --cron "0 2 * * 0" --vendor claude -w /home/user/myproject

# One-shot job
oma schedule create pm "Generate sprint retrospective" --cron "0 17 * * 5" --once

# Capture specific env vars for the job
oma schedule create backend "Sync external API data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```


---

### schedule list

列出所有项目的计划任务，按项目分组，并显示操作系统漂移状态。

```
oma schedule list [--json]
```

**选项：**

| 标志 | 说明 |
|---|---|
| `--json` | 输出机器可读 JSON |

**漂移状态：**

| 状态 | 含义 |
|---|---|
| `synced` | 任务同时存在于清单和操作系统调度器中 |
| `stale` | 任务已注册，但操作系统中的注册项调用了当前 CLI 已不再接受的命令（例如在命令路径标准化之前写入的 `schedule:run <id>`）。运行 `schedule sync` 重写；`oma update` 会自动执行此操作。 |
| `missing-in-os` | 任务在清单中，但在操作系统调度器中缺失。运行 `schedule sync` 修复。 |
| `orphan-in-os` | 任务在操作系统调度器中，但不在清单中。运行 `schedule sync --prune` 移除。 |

**输出（文本）：**

任务按项目标签分组。每行显示：ID、cron 表达式、智能体、供应商、操作系统后端、是否重复和漂移状态。

```
[my-project]
ID                 CRON           AGENT              VENDOR   BACKEND  RECUR  STATE
------------------------------------------------------------------------------------------
sch_abc123def456   0 9 * * 1-5    qa-reviewer        auto     launchd  true   synced
sch_xyz789ghi012   */30 * * * *   backend            claude   launchd  true   missing-in-os

[orphan-in-os]
  dev.oma.sch_old (in OS scheduler but not in manifest)
```

**示例：**

```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

---

### schedule delete

从清单和操作系统调度器中同时移除计划任务。

```
oma schedule delete <id>
```

**参数：**

| 参数 | 必填 | 说明 |
|---|---|---|
| `id` | 是 | `schedule list` 返回的任务 ID（格式：`sch_<base32-12>`） |

如果移除操作系统调度任务失败（例如后端暂时不可用），会打印警告，但清单条目仍会移除。

**示例：**

```bash
oma schedule delete sch_abc123def456
```

---

### schedule run

按 ID 执行计划任务。操作系统调度器会在触发时调用它，通常不手动调用。

```
oma schedule run <id>
```

封装器会：

1. 在清单中查找任务 ID。如果找不到则以非零状态退出。
2. 从 `~/.agents/schedule/env/<id>` 加载捕获的环境变量（如果存在），并将它们注入生成的进程。
3. 调用 `oma agent spawn <agentId> <prompt> <generatedSessionId> --vendor <vendor> -w <workspace>`。
4. 将运行结果写入 `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`。
5. 更新清单中的 `lastFiredAt`。
6. 如果设置了 `--once`，自行移除任务（清单和操作系统调度器）。

**身份验证失败会明确报错**：如果供应商凭据已过期，任务会以非零代码退出，并向 stderr 打印 `re-auth required: <vendor>`。它不会静默成功。可以配置可选的 `oma-voice` 通知。

调试时可以手动调用 `schedule run`：

```bash
oma schedule run sch_abc123def456
```

---

### schedule sync

将清单重新同步到操作系统调度器。系统迁移、操作系统调度器重置或需要修复漂移后使用。

```
oma schedule sync [--prune]
```

**选项：**

| 标志 | 说明 |
|---|---|
| `--prune` | 同时移除在操作系统调度器中、但不在清单中的任务（orphan-in-os 状态）。不使用 `--prune` 时只报告孤立任务，不移除。 |

**示例：**

```bash
# Repair missing-in-os jobs and rewrite stale registrations (does not remove orphans)
oma schedule sync

# Repair missing-in-os jobs AND remove orphans
oma schedule sync --prune
```

每次更新后，`oma update` 都会运行同样的同步（不带 `--prune`）。这样，即使某个 CLI 版本更改了 `oma schedule run` 的命令写法，现有的操作系统注册项也不会指向新二进制文件已不接受的命令。旧版本用 `oma schedule:run <id>` 写入的注册项同样继续有效：对由操作系统调用的任务，这种旧写法仍被接受。

---

## 存储布局

所有计划状态都位于 `~/.agents/schedule/` 下：

```
~/.agents/schedule/
├── schedules.json          # SSOT manifest (permissions 0600)
├── env/
│   └── sch_abc123def456    # Captured env vars for this job (permissions 0600)
└── runs/
    └── sch_abc123def456/
        └── 2026-06-16T090000Z.md   # Run log
```

权限：

- `~/.agents/schedule/` 目录：`0700`
- `schedules.json` 和 `env/<id>` 文件：`0600`

**密钥永远不会写入 `schedules.json`。**`--env` 标志只会将列出的键写入 `env/` 下独立的 `0600` 文件。只捕获明确列出的键，绝不会存储整个环境转储。

---

## 安全说明

- `schedule create` 是受信任路径操作：只有已认证用户可以注册任务。不要将 `schedule create` 暴露给外部或不受信任的输入。计划提示是在未来运行的任意代码。
- `schedule run` 只执行清单中存在其 ID 的任务。不可能注入任意 argv。
- 供应商磁盘凭据（例如 `~/.codex/auth.json`、`~/.grok/auth.json`）会原样用于无头调度。不会增加额外的身份验证门槛。凭据过期时，任务会明确失败。

---

## 提示和故障排查

**检查运行日志：**

```bash
ls ~/.agents/schedule/runs/sch_abc123def456/
cat ~/.agents/schedule/runs/sch_abc123def456/2026-06-16T090000Z.md
```

**系统重启后任务显示 `missing-in-os`：**

运行 `oma schedule sync`，将所有清单任务重新注册到操作系统调度器。

**任务触发但供应商凭据过期：**

检查运行日志中的 `re-auth required: <vendor>`。使用供应商 CLI 重新进行身份验证（例如 `claude login`、`codex login`），然后手动运行 `oma schedule run <id>`，在下一次计划触发前验证。

**`--every` 将我的间隔取整：**

oma 取整间隔时，会打印说明变更的提示。如果需要不能整除 60 分钟或 24 小时的精确间隔，请使用 `--cron` 和明确的五字段表达式。

**移除某个项目的所有任务：**

```bash
# List jobs for a specific project, then remove each
oma schedule list --json | jq -r '.jobs[] | select(.projectLabel == "my-project") | .id' \
  | xargs -I{} oma schedule delete {}
```

**Windows 支持：**

在 Windows 上，oma 使用 `schtasks` 注册任务。`schedule list` 的漂移检测和 `schedule sync` 命令在所有平台上工作方式相同。

请注意，`schtasks` 无法表达每一种 cron 形状。支持的形状是：`*/N * * * *`（每 N 分钟）、`M * * * *`（每小时的第 M 分钟）、`M H * * *`（每天）、`M H * * D`（每周；`D` 可以是单日、`1-5` 这样的范围，或 `1,3,5` 这样的逗号列表），以及 `M H D * *`（每月）。其他表达式（例如分钟字段中的逗号列表）会在 Windows 上运行 `schedule create` 时被拒绝。
