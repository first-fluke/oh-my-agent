---
title: "指南：oma-config.yaml 语义"
sidebar_label: 配置加载
description: 说明 OMA 如何选择 CUE 和 YAML 配置层、应用本地覆盖，以及解析少数安装上下文回退规则。支持的键和默认值请参见配置参考。
---

## 概览

配置选择规则是：从当前工作目录向上查找最近的 `.agents/` 目录：

- **共享配置：**`.agents/oma-config.cue`，或者在 CUE 缺失或无法求值时使用 `.agents/oma-config.yaml`。
- **本地配置：**`.agents/oma-config.local.cue` 或 `.agents/oma-config.local.yaml`（二选一，覆盖共享文件；请将此文件保密）。

对于普通运行时查询，OMA 不会把项目文件与 `~/.agents/oma-config.*` 合并。全局安装会读取 HOME 中的文件，因为安装根目录就是 HOME；项目命令读取最近的项目层。`auto_update_cli` 是特例：更新检查依次查看项目配置、HOME 配置，最后默认启用。完整模型请参见[配置参考](/docs/guide/configuration-reference)。

## 优先级表

| 键 | 生效规则 | 说明 |
|-----|:---:|-------|
| `OMA_MODEL_PRESET` | 最高 | 非空环境变量值会在当前进程中替换 `model_preset`。 |
| 本地文件 | 覆盖共享文件 | 普通映射递归合并；数组、标量和 `null` 替换共享值。两种本地文件格式不能同时存在。 |
| 共享 CUE | 优先 | 若 CUE 缺失或求值失败，加载器会尝试共享 YAML 文件。本地 CUE 出错会直接失败。 |
| 共享 YAML | 回退 | 没有可用的共享 CUE 文件时使用。 |
| `auto_update_cli` | 先项目，再 HOME，最后 `true` | 此更新专用回退由 `resolveAutoUpdateCli` 实现，不是通用全局层。 |

本地覆盖只需在本地文件中写入已修改的叶节点。例如，可以把本地模型选择留在共享文件之外：

```yaml
# .agents/oma-config.local.yaml
model_preset: claude
agents:
  backend:
    model: anthropic/claude-sonnet-4-6
```

请从项目目录运行命令，这样才能选择最近的 `.agents/` 目录。本地文件格式错误会明确失败；修复或移除它后再重试。

## 默认值

| 键 | 默认值 | 应用时机 |
|-----|---------|----------|
| `auto_update_cli` | `true` | 两个文件都不存在或缺少该键 |
| `serena.mode` | `bridge` | 两个文件都不存在或缺少该键 |
| `serena.auto_update` | `true` | 两个文件都不存在或缺少该键 |
| `telemetry` | `false` | 两个文件都不存在或缺少该键 |
| `language` | `en` | 两个文件都不存在或缺少该键 |
| `model_preset` | 必填 | 随附项目模板使用 `auto`；schema 要求非空值。 |
| `translation_voice` | `balanced` | 两个文件都不存在或缺少该键 |
| `timezone` | 系统时区 | 两个文件都不存在或缺少该键 |

## 读取顺序的原因

最近层规则让项目配置保持自包含。如果需要用户级基线，请进行全局安装并编辑 `~/.agents/oma-config.yaml`；项目安装仍可定义自己的最近层。

## 说明

- `oma-config.yaml` 中的 `language` 控制智能体响应语言。它不用于确定安装或更新警告消息，这些消息使用系统区域设置（`$LANG`），因为安装时尚未加载 `oma-config.yaml`。
- `auto_update_cli` 的优先级由更新命令明确实现。当项目安装和全局安装同时存在时，先读取项目值，再读取 HOME 值。
- `telemetry`（默认 `false`）映射为各供应商自己的退出选项，由 `oma install`、`oma update` 和 `oma link` 写入：Claude 使用 `DISABLE_TELEMETRY` 与 `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`，Gemini/Qwen 使用 `privacy.usageStatisticsEnabled`，Codex 使用 `analytics.enabled` 与 `feedback.enabled`，Grok 使用 `[features] telemetry`，Antigravity（agy）在 `~/.gemini/antigravity-cli/settings.json` 中使用 `enableTelemetry`。设置 `telemetry: true` 会移除 oma 为该供应商写入的退出设置，重新启用遥测。
- `diagram`（引擎 `auto` / `archify` / `mermaid`、`explain_sidecar`、`archify.managed|channel|check_interval_min|path|quality|open`）是类似 `video` / `image` 的稀疏技能覆盖段；请参见[图表引擎](/docs/guide/diagram-engine)。
- `video.hyperframes.check_interval_min` 会限制每次运行的 HyperFrames 工具链和 heygen-com/hyperframes 的最新版本检查频率（`oma video compose`、`oma update`）。
- `market`（`managed|channel|check_interval_min|path|python|save_dir`）配置 `oma market` 背后的始终最新 `last30days` 引擎；请参见[市场研究](/docs/guide/market-research)。
- 类型化运行时 schema 涵盖 `providers`、`free`、`agents`、`models`、`custom_presets`、`vendors`、`session`、`docs` 和稀疏技能段。随附模板还包含 `scm`、`memory`、`serena_reaper` 和 `mcp` 等由消费者负责的区块，其嵌套键由各自消费者管理。不要从此列表推断键，请使用[配置参考](/docs/guide/configuration-reference)和相应功能指南。
- 直接编辑 `oma-config.yaml` 是安全的。`oma install` 和 `oma update` 以正则级字段替换，并保留不由其管理的用户键（例如自定义 `agents:` 覆盖和 `session.quota_cap`）。
- `oma update` 还会在随附模板定义而你的文件缺少的顶层键前追加键值（使用模板默认值），并加上 `# Added by oma update` 标记。已有键不会修改，现有内容保持字节级不变。你主动删除的键会以模板默认值重新出现；若要退出，请显式设置该键，不要删除。
