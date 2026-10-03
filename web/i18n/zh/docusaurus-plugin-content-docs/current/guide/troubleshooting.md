---
title: "指南：故障排查"
sidebar_label: 故障排查
description: "使用有来源依据的检查，诊断安装、配置、供应商、仪表盘、计划任务、评估和智能体结果故障。"
---

# 故障排查

从项目根目录或安装根目录开始，运行机器可读的诊断：

```bash
oma doctor --json
```

命令应输出 JSON，指出安装、供应商、配置和集成方面的发现。模型或每个智能体的解析出现问题时，添加 `--profile`。报告问题时保留 JSON；它包含所选路径和检查结果，不需要凭文字猜测。

## CLI 或安装使用了错误的文件

明确检查当前上下文：

```bash
oma doctor --json
oma doctor --profile
```

项目命令读取最近的 `.agents/oma-config.cue` 或 `.agents/oma-config.yaml`，然后读取一个本地覆盖文件。全局命令读取 HOME 安装根目录。如果本地 CUE 和本地 YAML 文件同时存在，请删除其中一个。如果本地文件格式错误，OMA 会停止，而不是默默忽略覆盖。请参阅[配置参考](/docs/guide/configuration-reference)。

更新后检查配置和生成路径：

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` 会保持运行过程非交互。如果用户配置意外被替换，请检查是否使用了 `--force`；普通更新会保留用户拥有的配置，强制模式可以替换它。

## 安装或更新无法下载发布版本

<!-- oma-docs:ignore-start -->
`oma install`、`oma update` 和 `oma doctor` 的修复会下载 `main` 上的 `prompt-manifest.json` 所指定的发布版本。它们先尝试 `cli-v<version>` GitHub 发布版本中的 `agent-skills.tar.gz` 资源，并用其 `.sha256` 文件校验；然后尝试该标签的源码归档；最后对该标签做浅克隆。校验和不匹配，或载荷中 `.agents/skills/_version.json` 指向另一个版本时，运行会直接停止，而不会改试其他来源。
<!-- oma-docs:ignore-end -->

刚切出发布版本后，清单可能会指向一个资源仍在发布中的版本；请等待几分钟后重试。如果要有意安装 `main` 分支上尚未发布的内容，请为这次运行显式选择启用：

```bash
OMA_UPDATE_CHANNEL=main oma update
```

运行时会打印警告：main 分支的内容既不是带标签的发布版本，也没有经过校验和验证。

## 供应商无法启动

先运行供应商自己的身份验证检查，再检查 OMA 解析出的配置档：

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

使用 `oma doctor` 列出的确切供应商命令重新进行身份验证。模型覆盖必须使用模式接受的 `owner/model` 形式，并且其供应商必须支持所选 CLI 传输。对于 `model_preset: free`，使用 `oma doctor --profile` 检查解析出的网关 URL 和模型，然后确认配置的 API 密钥环境变量中包含密钥。如果省略 `free` 映射，默认值为 `http://127.0.0.1:31415/v1`、`FREELLM_API_KEY` 和模型 `auto`；绝不要把 API 密钥本身放进 YAML。

如果子进程退出时没有结果产物，请检查运行目录和父级状态。生成的子进程会收到运行身份和结果说明，在注入的路径写入声明，并报告自己的产物；父级在捕获退出码后完成托管收据。只读子进程会返回 `OMA_RESULT_JSON: ...`；该行会被记录为检查结果，但不满足可执行验证。

## 已安装钩子但没有运行

对于 Codex，检查生成的文件并完成一次性信任流程：

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

首次安装后，以及更新改变命令字符串后，都运行 `/hooks`。OMA 生成的 Codex 子进程在自己的托管调用中传递绕过标志；这不会信任你自行启动的 Codex 会话中的钩子。请参阅 [Codex 钩子信任](/docs/guide/codex-hook-trust)。

## 仪表盘为空或已断开

从包含会话文件的项目启动终端仪表盘：

```bash
oma dashboard terminal
```

它默认读取 `.agents/state/memories/`。状态在其他位置时设置 `MEMORIES_DIR`。网页仪表盘绑定到 loopback，并打印带令牌的 URL：

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

打开命令打印的完整 URL；网页 API 和 WebSocket 都需要仪表盘令牌。如果端口已被占用，请换用其他 `DASHBOARD_PORT`。如果没有智能体出现，请检查工作流是否在所选内存目录中写入 session、task、progress 文件。仪表盘不会自动搜索旧的 `.serena/memories/` 目录。

## 计划任务缺失或没有运行

检查清单和调度器状态：

```bash
oma schedule list
oma schedule sync
oma schedule run SCHEDULE_ID
```

`schedule list` 会报告 `synced`、`stale`、`missing-in-os` 和 `orphan-in-os`。`schedule sync` 会恢复缺失的任务并重写过时的注册项（运行日志中出现 `Unknown command: schedule:run` 一行，说明该注册项写于命令改名之前；`oma update` 会自动重新同步它）；只有在需要删除孤立的操作系统任务时才添加 `--prune`。使用 `--dry-run` 创建的预览不会注册任务。对于重复间隔，检查预览后使用 `--accept-rounded` 接受 OMA 的取整。检查 `~/.agents/schedule/runs/<id>/` 下的运行日志，确认是否有非零供应商退出码或 `re-auth required`。

## 评估或优化报告没有覆盖率

技能评估和技能优化都要求 `.agents/eval/<skill>/` 下至少有五个 fixture。在 mock 模式中，已记录的 rollout 来源必须与当前技能及 fixture 哈希匹配。如果 fixture 或技能发生改变，请使用 live 模式重新记录；不要把旧的 `_rollouts` 文件复制到新的技能目录，然后把它当作当前证据。

优化时，在审阅提议的 diff 期间保留默认的 `--dry-run`。`--apply` 要求严格为正的验证结果以及通过运行器拥有的测试拆分；OMA 拥有的技能可能在之后的 `oma update` 中被覆盖。

## 结果无法完成或恢复

检查运行和计划文件：

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

完成前运行 `oma agent verify RUN_ID --required`。如果完成的声明带有失败收据、输入已改变、产物缺失、未解决项，或任务契约已改变，声明会被拒绝或降级。只有具有 `retry_policy: "safe"`、可重放提示和剩余尝试次数的任务才会自动恢复。为避免重复执行，活动进程或没有明确 partial/failed 结果的中断原生尝试会保持不变。请参阅[智能体结果与恢复](/docs/guide/agent-results-and-resume)。

寻求帮助时，请包含相关的 `oma doctor --json` 输出、命令、会话/运行 ID 和未解决消息。不要包含凭据或机密文件的内容。
