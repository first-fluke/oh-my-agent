---
title: "重要默认值"
description: "影响路由、模型选择、提供方、更新、遥测、浏览器 MCP、Serena 传输和工作流恢复的 oh-my-agent 默认值。"
sidebar_label: 重要默认值
---

# 重要默认值

默认值的目标是让首个项目可以使用，同时保持用户拥有的配置稳定。默认值在运行时解析，因此省略某个键和明确设置空值可能产生不同的行为。当脚手架可以运行却与预期不同时，从这里开始排查。

## 影响首次运行的默认值

| 区域 | 默认值 | 影响 | 覆盖方式 |
|---|---|---|---|
| 响应语言 | `en` | 除非项目配置选择了其他受支持语言，否则智能体和工作流使用英语。宿主或工作流支持时，明确的用户或会话语言指令仍可覆盖项目默认值。 | `.agents/oma-config.yaml` 或 `.cue` 中的 `language` |
| 模型路由 | `auto` | 使用当前运行时的原生智能体配置。设置了 `default_cli` 时，未知运行时回退到它。 | `model_preset`、`default_cli` 或 `agents.<id>` |
| 代码智能 | `serena` | 新安装会尝试安装 Serena，并接入其 MCP 配置。 | `providers.code_intelligence: gortex` 或 `serena` |
| 代码搜索保护 | `block` | 只要配置了代码智能提供方，PreToolUse 钩子就会拒绝原生 `Grep`/`Glob` 和递归 shell 搜索（`rg`、`grep -r`、`find -name`），并引导智能体改用提供方的工具。仅限已确认排除项或项目之外路径的搜索会被放行。该钩子不会提示针对项目源代码的绕过方式。 | `providers.code_intelligence_guard: off` |
| 语义内存 | `agentmemory` | 可用时选择 Agent Memory 作为语义内存。 | `providers.semantic_memory: honcho` 或 `none` |
| 网页搜索 | `native` | 除非选择了提供方，否则搜索使用运行时的原生网页通道。 | `providers.web` |
| 文档提供方 | `context7` | 技能请求文档查找时使用 Context7 提供方。 | `providers.docs` |
| 遥测 | disabled | OMA 在链接时写入供应商退出设置。 | `telemetry: true` |
| CLI 自动更新 | enabled | 除非禁用，否则 CLI 会检查更新。 | `auto_update_cli: false` |
| 日期格式 | `ISO` | 项目未设置格式时使用 ISO 风格格式。 | `date_format: US` 或 `EU` |
| 时区 | system time zone | 省略 `timezone` 时，计划任务和报告时间遵循宿主时区。 | `timezone: Australia/Sydney`（或其他 IANA 名称） |
| Serena 传输 | `bridge` | 会话共享一个按项目划分的 Serena 服务器；bridge 不可用时回退到会话本地 stdio。 | `serena.mode: stdio` |
| Serena 自动更新 | enabled | `oma update` 会在可能时升级本地 Serena 工具。 | `serena.auto_update: false` |
| 浏览器 DevTools MCP | unset | 保留现有浏览器条目；新的交互式安装会提供 `aside`。 | `mcp.devtools_browsers: [aside]`、`[chrome]`、`[firefox]` 或 `[]` |
| Serena Reaper | scheduled path disabled | `serena_reaper.enabled: false` 会让定期回收保持停用。交互式 `oma serena reap` 仍会运行。 | `serena_reaper.enabled: true` 加 `oma serena reaper enable` |

提供方名称和默认值来自运行时加载器与安装器提示。安装器生成的配置文件包含可用区块的注释；使用这些注释作为与版本对应的模式指南。

## 配置优先级

OMA 从当前工作目录向上查找最近的 `.agents/` 目录。存在时读取 `oma-config.cue`；如果共享 CUE 评估失败，则回退到 `oma-config.yaml`。项目本地覆盖文件可以是 `oma-config.local.cue` 或 `oma-config.local.yaml`，它会合并到上层；两种本地覆盖文件只能保留一个。`OMA_MODEL_PRESET` 可以为单个进程覆盖 `model_preset`。本地配置无效时会停止加载，不会悄悄选择其他值。

在固定预设顺序之前，模型路由有两个特殊情况：

- `model_preset: auto` 使用当前运行时的原生智能体和模型配置。明确的 `agents.<id>` 覆盖仍优先；未知运行时可以使用 `default_cli`。
- `model_preset: free` 时，子进程通过本地 FreeLLMAPI 网关生成。`free.model` 选择网关模型并替换每个智能体的模型固定值；省略它时使用 `FREELLM_MODEL`，或使用提供方回退值 `auto`。

对于固定或自定义预设，有效优先级如下：

1. `agents.<id>` 的显式覆盖。
2. 匹配的 `model_preset` 条目，包括内置预设或 `custom_presets`。
3. 当某个角色没有条目时，使用预设的 `orchestrator` 条目。
4. 前面各层无法解析计划时，使用 `default_cli` 作为供应商回退值。

`free` 预设为三个提供方设置提供默认值：`base_url` 为 `http://127.0.0.1:31415/v1`，`api_key_env` 为 `FREELLM_API_KEY`（兼容别名 `FREELLMAPI_API_KEY` 也接受），`model` 为 `auto`。所选环境变量中仍必须有可用 API 密钥；不存在供应商回退。需要保持机器本地时，将这些值写入 `oma-config.local.yaml`，或使用 `FREELLM_BASE_URL` 和 `FREELLM_MODEL` 进行进程级覆盖。

## 后果容易被忽略的默认值

省略 `mcp.devtools_browsers` 键表示“保留当前浏览器条目”。明确的空列表会在协调时移除浏览器条目。浏览器 MCP 进程按智能体会话运行，因此仅在任务需要驱动浏览器时启用它们。

默认的 Serena `bridge` 模式会在多个智能体共用项目时减少重复的语言服务器进程。如果本地 bridge 无法启动，或严格的进程隔离更重要，应选择 `stdio` 进行恢复。Serena 会在下一次工具调用时自我修复语言服务器子进程；内存回收器是独立的，正常使用不必启用它。

默认遥测设置为退出。设置 `telemetry: true` 后，下一次链接或更新会移除 OMA 的供应商退出条目，这可能重新启用依赖遥测的供应商功能。此设置控制供应商集成变更，不会改变 OMA 为自身记账而写入的会话成本文件。

## 恢复路径

| 症状 | 先检查 | 恢复方式 |
|---|---|---|
| 供应商文件过期 | `oma doctor` 和 `oma link --dry-run` | 编辑 `.agents/` 后运行 `oma link <vendor>`；保留 SSOT 作为来源。 |
| 模型不被接受 | `oma doctor --profile` | 切换到 `auto`，使用内置预设，或在 `models:` 下定义模型 slug。 |
| Serena 工具超时 | `oma doctor` 和提供方区块 | 尝试 `serena.mode: stdio`；如果问题是内存压力，使用 `oma serena reap --dry-run` 预览。 |
| 持久工作流无法停止 | `.agents/state/*-state.json` | 说出 `workflow done`；只有在工作流未清理时才检查状态文件。 |
| 计划回收器没有动作 | `oma doctor` 的 Serena Reaper 区块 | 设置 `serena_reaper.enabled: true`，然后运行 `oma serena reaper enable`。 |
| 本地配置导致启动失败 | `oma doctor` 的错误路径 | 修复或移除本地覆盖；不要同时创建 `.cue` 和 `.yaml` 覆盖文件。 |

继续阅读[安装](./installation.md)、[按智能体配置模型](../guide/per-agent-models.md)或[OMA 配置语义](../guide/oma-config-semantics.md)。
