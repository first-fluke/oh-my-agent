---
title: "指南：故障排查"
sidebar_label: 故障排查
description: "按症状或确切的错误消息，使用有来源依据的检查与修复，诊断安装、配置、供应商、钩子、仪表盘、计划任务、评估和智能体结果故障。"
---

# 故障排查

从项目根目录或安装根目录开始，运行机器可读的诊断：

```bash
oma doctor --json
```

命令应输出 JSON，指出安装、供应商、配置和集成方面的发现。模型或每个智能体的解析出现问题时，添加 `--profile`。报告问题时保留 JSON；它包含所选路径和检查结果，不需要凭文字猜测。

## 查找你的症状 {#find-your-symptom}

| 症状 | 前往 |
|---------|-------|
| OMA 读取了错误的配置，或更新替换了你的设置 | [CLI 或安装使用了错误的文件](#the-cli-or-install-is-using-the-wrong-files) |
| `oma install` 或 `oma update` 无法下载发布版本 | [安装或更新无法下载发布版本](#an-install-or-update-cannot-download-the-release) |
| 供应商 CLI 或模型无法启动 | [供应商无法启动](#a-vendor-does-not-start) |
| 钩子已安装但没有任何反应 | [已安装钩子但没有运行](#hooks-are-installed-but-do-not-run) |
| 仪表盘为空、已断开或无法启动 | [仪表盘为空或已断开](#the-dashboard-is-empty-or-disconnected) |
| 计划任务缺失或失败 | [计划任务缺失或没有运行](#a-schedule-is-missing-or-did-not-run) |
| 技能评估或优化报告没有覆盖率 | [评估或优化报告没有覆盖率](#evaluation-or-optimization-reports-no-coverage) |
| 智能体运行无法验证、完成或恢复 | [结果无法完成或恢复](#a-result-cannot-finish-or-resume) |
| CLI 打印了错误消息 | [查找你的错误](#find-your-error) |

## 查找你的错误 {#find-your-error}

下面的每条消息都由 CLI 打印。请匹配消息的开头部分。

| 消息 | 原因 | 修复 |
|---------|-------|-----|
| `Unknown plan task: <id>` | 任务 ID（来自 `--task-id`，默认为智能体 ID）不是 `.agents/results/plan-<session>.json` 中的任务 `id` | 使用计划中的任务 ID 传入 `--task-id` |
| `Plan is immutable after dispatch; ...` | 会话计划在首次分派后被修改 | 恢复原计划，或以新的会话 ID 保存修改后的计划（如果设置过 `lineage_id`，也使用新的 `lineage_id`） |
| `Task acceptance contract changed before dispatch` 或 `Plan changed before dispatch` | 运行启动期间计划被编辑 | 等计划稳定后重试 |
| `Attempt limit reached for workflow lineage and logical goal` | 计划的 `max_attempts`（默认 3，包含首次尝试）已用完 | 先检查失败的尝试，再规划新的尝试 |
| `Cannot verify a finished run; start a new run` | `oma agent verify` 在运行结束后才执行 | 使用 `oma agent begin` 开始新的运行 |
| `Choose a command, --required, or --affected` | `oma agent verify` 没有收到验证模式，或收到了多个 | 只使用 `--required`、`--affected PATH...` 或 `-- <argv>` 之一 |
| `No complete test selection for affected paths: ...` | 图中没有针对这些路径的完整测试选择 | 使用 `--required` |
| `The spawning parent finalizes managed runs; write the claim file instead` | 对由 `oma agent spawn` 或 `parallel` 启动的运行调用了 `oma agent finish` | 在注入的路径写入声明；由父级完成运行 |
| `Resume requires a session plan with task contracts` | 会话没有计划文件 | 恢复只适用于基于计划的会话；请改为重新生成该任务 |
| `A resume coordinator already owns this session` | 该会话的另一个 `oma agent resume` 正在运行，或其租约来自另一台主机 | 等待另一个恢复完成；同一主机上已死进程留下的租约会被自动回收 |
| `No graph-backed context found for <agent>` | 该智能体没有图上下文 | 修正任务定义，或沿用项目文档中说明的原生搜索路径 |
| `Dashboard failed: port 9847 is already in use. ...` | 另一个进程占用了仪表盘端口 | `DASHBOARD_PORT=8080 oma dashboard web`，或停止另一个进程 |
| `Invalid DASHBOARD_PORT: ...` | `DASHBOARD_PORT` 不是 1 到 65535 之间的整数 | 设置有效端口，或取消设置以使用 9847 |
| `Removed option <old>. Use <new>.` | 命令使用了已被移除的标志写法 | 使用消息中指出的标志 |
| `Unknown command: ... Use oma --help.` | 命令路径已被移除或改名 | 运行 `oma --help` 或 `oma describe` 查看当前路径 |
| `oma agent spawn` 以退出码 3 退出 | 供应商以 0 退出，但运行没有以 `completed` 结束 | 阅读运行记录中的 `unresolved`；请参阅[智能体结果与恢复](./agent-results-and-resume.md) |

## CLI 或安装使用了错误的文件 {#the-cli-or-install-is-using-the-wrong-files}

明确检查当前上下文：

```bash
oma doctor --json
oma doctor --profile
```

| 症状 | 原因 | 修复 |
|---------|-------|-----|
| 某项设置被忽略，或全局默认值生效 | 命令先从 `$OMA_HOME/.agents/`（默认 `~/.oma/.agents/`）读取全局默认值，然后读取最近的项目共享配置和一个本地覆盖文件。不同的上级项目根目录不会合并 | 检查 `oma doctor --json` 选择了哪些配置路径，并编辑实际被读取的文件 |
| OMA 在加载配置时停止 | 本地 CUE 和本地 YAML 文件同时存在，或本地文件格式错误。OMA 会停止，而不是默默忽略覆盖 | 删除两个本地文件之一，或修正格式错误的文件 |
| 更新后用户配置被替换 | 更新使用了 `--force`。普通更新会保留用户拥有的配置，强制模式可以替换它 | 不带 `--force` 更新，然后检查配置和生成路径 |
| `oma-config.yaml` 中的设置被忽略，`language` 或 `timezone` 显示模板值 | 旧版 `oma update` 把随发行版提供的 `oma-config.cue` 复制到了你的 YAML 旁边。CUE 优先于 YAML，因此模板值生效 | `oma update` 会在该副本仍是未修改的模板时将其删除，并保存到 `.agents/backup/stray-shared-config/`。如果你编辑过它，请只保留一个共享配置文件并删除另一个 |
| `oma doctor` 警告 `timezone: Asia/Seoul` | 旧模板把 `Asia/Seoul` 作为默认时区发布，而你的系统使用其他时区 | 删除 `timezone` 行即可跟随系统时区。要保留 `Asia/Seoul`，请在本地配置（`oma-config.local.yaml` 或 `.local.cue`）中设置 |

文件顺序请参阅[配置参考](/docs/guide/configuration-reference)。更新后检查配置和生成路径：

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` 会保持运行过程非交互。

## 安装或更新无法下载发布版本 {#an-install-or-update-cannot-download-the-release}

<!-- oma-docs:ignore-start -->
`oma install`、`oma update` 和 `oma doctor` 的修复会下载 `main` 上的 `prompt-manifest.json` 所指定的发布版本。它们先尝试 `cli-v<version>` GitHub 发布版本中的 `agent-skills.tar.gz` 资源，并用其 `.sha256` 文件校验；然后尝试该标签的源码归档；最后对该标签做浅克隆。校验和不匹配，或载荷中 `.agents/skills/_version.json` 指向另一个版本时，运行会直接停止，而不会改试其他来源。
<!-- oma-docs:ignore-end -->

| 症状 | 原因 | 修复 |
|---------|-------|-----|
| 刚发布后下载失败 | 清单指向的版本，其资源仍在发布中 | 等待几分钟后重试 |
| 需要 `main` 上尚未发布的内容 | 发布版本只安装带标签的内容 | 用 `OMA_UPDATE_CHANNEL=main oma update` 为单次运行选择启用 |

```bash
OMA_UPDATE_CHANNEL=main oma update
```

运行时会打印警告：main 分支的内容既不是带标签的发布版本，也没有经过校验和验证。

## 供应商无法启动 {#a-vendor-does-not-start}

先运行供应商自己的身份验证检查，再检查 OMA 解析出的配置档：

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

| 症状 | 原因 | 修复 |
|---------|-------|-----|
| 供应商 CLI 未通过身份验证 | 供应商会话已过期，或从未设置 | 使用 `oma doctor` 列出的确切供应商命令重新进行身份验证 |
| 模型覆盖被拒绝 | 覆盖值不是模式接受的 `owner/model` 形式，或其供应商不支持所选 CLI 传输 | 使用 `owner/model` 形式，并选择支持该传输的供应商 |
| `model_preset: free` 无法连接网关 | 解析出的网关 URL 或模型有误，或配置的 API 密钥环境变量为空 | 用 `oma doctor --profile` 检查网关 URL 和模型，然后在该环境变量中设置密钥 |
| 子进程退出时没有结果产物 | 子进程没有在注入的路径写入声明 | 检查运行目录和父级状态（见下文） |

如果省略 `free` 映射，默认值为 `http://127.0.0.1:31415/v1`、`FREELLM_API_KEY` 和模型 `auto`；绝不要把 API 密钥本身放进 YAML。

生成的子进程会收到运行身份和结果说明，在注入的路径写入声明，并报告自己的产物；父级在捕获退出码后完成托管回执。只读子进程会返回 `OMA_RESULT_JSON: ...`；该行会被记录为检查结果，但不满足可执行验证。

## 已安装钩子但没有运行 {#hooks-are-installed-but-do-not-run}

| 症状 | 原因 | 修复 |
|---------|-------|-----|
| Codex 不运行 OMA 钩子 | 钩子尚未被信任：这是首次安装，或更新改变了钩子命令字符串 | 检查 `.codex/hooks.json`，然后在 Codex 中运行 `/hooks` |

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

OMA 生成的 Codex 子进程在自己的托管调用中传递绕过标志；这不会信任你自行启动的 Codex 会话中的钩子。请参阅 [Codex 钩子信任](/docs/guide/codex-hook-trust)。

## 仪表盘为空或已断开 {#the-dashboard-is-empty-or-disconnected}

从包含会话文件的项目启动终端仪表盘：

```bash
oma dashboard terminal
```

| 症状 | 原因 | 修复 |
|---------|-------|-----|
| `No agents detected yet` | 工作流尚未在被监视的内存目录中写入 session、task 或 progress 文件，或仪表盘监视的是另一个目录 | 等待第一个 progress 文件；从项目根目录运行、传入 `--project-root <path>`，或设置 `MEMORIES_DIR` |
| 旧的 `.serena/memories/` 目录中的文件没有出现 | 仪表盘读取 `.agents/state/memories/`，不会搜索旧目录 | 将 `MEMORIES_DIR` 设置为存放这些文件的目录 |
| `oma dashboard web` 以 `port 9847 is already in use` 退出 | 另一个进程占用了该端口 | 换用其他 `DASHBOARD_PORT` |
| 重启仪表盘后网页一直显示 Disconnected | 每次启动都会创建新的访问令牌，而打开的标签页仍持有旧令牌 | 重新加载页面 |

网页仪表盘绑定到 loopback 并打印其 URL。打开它即可；页面自带用于网页 API 和 WebSocket 的令牌。

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

更多仪表盘信号请参阅[仪表盘监控](./dashboard-monitoring.md#troubleshooting-runbook)。

## 计划任务缺失或没有运行 {#a-schedule-is-missing-or-did-not-run}

检查清单和调度器状态。前两条命令是只读的；后两条会改变状态：

```bash
oma schedule list                 # read-only: synced, stale, missing-in-os, orphan-in-os
oma schedule inspect SCHEDULE_ID  # read-only: one manifest entry
oma schedule sync                 # writes: registers missing jobs and rewrites stale ones
oma schedule run SCHEDULE_ID      # executes the job now (normally invoked by the OS scheduler)
```

| 症状 | 原因 | 修复 |
|---------|-------|-----|
| `schedule list` 显示 `missing-in-os` 或 `stale` | 操作系统中的注册项缺失或已过时 | `oma schedule sync` |
| 运行日志显示 `Unknown command: schedule:run` | 该注册项写于命令改名之前 | `oma update` 会自动重新同步它；`oma schedule sync` 也会重写它 |
| `schedule list` 显示 `orphan-in-os` | 操作系统任务没有对应的清单条目 | 仅在需要删除孤立任务时运行 `oma schedule sync --prune` |
| 创建的计划任务从未注册 | 它是用 `--dry-run` 创建的，只做预览 | 不带 `--dry-run` 重新创建 |
| 重复间隔没有注册 | 该间隔需要取整 | 检查预览，然后用 `--accept-rounded` 接受取整 |
| 任务运行了但失败 | 供应商以非零退出，或日志显示 `re-auth required` | 检查 `~/.oma/schedule/runs/<id>/` 下的运行日志，并重新对供应商进行身份验证 |

## 评估或优化报告没有覆盖率 {#evaluation-or-optimization-reports-no-coverage}

| 症状 | 原因 | 修复 |
|---------|-------|-----|
| 技能评估或优化报告没有覆盖率 | `.agents/eval/<skill>/` 下的 fixture 少于五个 | 添加 fixture，直到至少有五个 |
| mock 模式拒绝已记录的 rollout | 已记录 rollout 的来源与当前技能及 fixture 哈希不匹配 | 使用 live 模式重新记录；不要把旧的 `_rollouts` 文件复制到新的技能目录，然后把它当作当前证据 |
| `--apply` 拒绝写入 | `--apply` 要求严格为正的验证结果，以及通过运行器拥有的测试拆分 | 审阅提议的 diff 期间保留默认的 `--dry-run`，并先修复失败的验证 |

被 `--apply` 修改的 OMA 拥有技能可能在之后的 `oma update` 中被覆盖。

## 结果无法完成或恢复 {#a-result-cannot-finish-or-resume}

检查运行和计划文件：

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

| 症状 | 原因 | 修复 |
|---------|-------|-----|
| 完成的声明被拒绝或降级 | 失败的回执、输入已改变、产物缺失、未解决项，或任务契约已改变 | 完成前运行 `oma agent verify RUN_ID --required`，并修复回执报告的问题 |
| 恢复后任务仍为 `blocked` | 自动恢复需要 `retry_policy: "safe"`、可重放的提示和剩余尝试次数 | 阅读 dry-run 报告中的原因。计划在首次分派后即被冻结，因此请在新会话的计划中设置 `retry_policy`，或手动重新运行该任务 |
| 恢复没有重试某个任务 | 为避免重复执行，活动进程或没有明确 partial/failed 结果的中断原生尝试会保持不变 | 等待活动进程结束，或先完成该原生尝试 |

完整生命周期请参阅[智能体结果与恢复](./agent-results-and-resume.md)。

## 寻求帮助 {#ask-for-help}

寻求帮助时，请包含相关的 `oma doctor --json` 输出、命令、会话/运行 ID 和未解决消息。不要包含凭据或机密文件的内容。请在 [github.com/first-fluke/oh-my-agent/issues](https://github.com/first-fluke/oh-my-agent/issues) 提交 issue。

## 另请参阅 {#see-also}

- [使用 OMA](./usage.md#troubleshooting)：技能缺失、CLI 缺失和工作区冲突等设置问题
- [仪表盘监控](./dashboard-monitoring.md#troubleshooting-runbook)：卡住、崩溃和断开连接的仪表盘信号
- [智能体结果与恢复](./agent-results-and-resume.md)：运行记录、声明和恢复
- [术语表](../getting-started/glossary.md)：例如[运行记录与声明](../getting-started/glossary.md#run-record-and-claim)等术语
