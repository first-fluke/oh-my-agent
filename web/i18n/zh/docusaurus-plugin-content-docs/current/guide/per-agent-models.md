---
title: "指南：按智能体配置模型"
description: 通过 oma-config.yaml 中的 model_preset 配置每个智能体使用的 AI 模型。涵盖七个内置预设、按智能体覆盖、内联模型定义、使用 extends 的自定义预设、oma doctor --profile，以及从旧版 agent_cli_mapping 的迁移。
---

# 指南：按智能体配置模型

## 概览

`model_preset` 是控制每个智能体使用哪个模型的唯一概念。从七个内置预设中选一个，所有智能体（pm、backend、frontend、qa 等）都会自动接入对应厂商生态中合适的模型。如有需要，可单独覆盖某些智能体。当团队使用非标准组合时，可定义额外的预设。

所有配置都集中在一个文件中：`.agents/oma-config.yaml`。

本页涵盖以下内容：

1. 七个内置预设
2. 通过 `agents:` 映射覆盖单个智能体
3. 使用 `models:` 内联自定义模型 slug
4. 使用 `custom_presets:` 和 `extends:` 定义自定义预设
5. 通过 `oma doctor --profile` 查看解析后的配置
6. 从旧版 `agent_cli_mapping` 的迁移

---

## 内置预设

将 `model_preset` 设置为以下七个内置键之一：

```yaml
# .agents/oma-config.yaml
language: en
model_preset: gemini
```

| 键 | 描述 | 适用场景 |
|:----|:-----------|:---------|
| `antigravity` | 所有智能体使用 Antigravity CLI（`agy`）：实现/架构类角色使用 Gemini 3.1 Pro，编排和检索类角色使用 Gemini 3.5 Flash。模型选择由 `agy` 内部配置驱动，不暴露 `--model` 或 `--thinking-budget` 参数。 | Antigravity CLI 用户 |
| `claude` | 所有智能体使用 Claude（Sonnet/Opus） | Claude Max 订阅用户 |
| `codex` | 所有智能体使用带 effort 等级的 OpenAI Codex（GPT-5.x） | ChatGPT Plus/Pro 用户 |
| `gemini` | 所有智能体使用 Gemini CLI，实现类角色启用 thinking | Google AI Pro 用户 |
| `qwen` | 所有智能体通过 Qwen Code 进行外部路由；二元 thinking（无 effort 等级） | 本地 / 自托管推理 |
| `cursor` | 所有智能体使用 Cursor `composer-2.5`（orchestrator/qa/pm/docs/retrieval 使用 `composer-2.5-fast`） | Cursor Pro / Pro Student 订阅者 |
| `mixed` | 混合：实现类角色用 Codex，architecture/qa/pm 用 Claude，retrieval 用 Gemini | 跨厂商发挥各自优势，无需逐个智能体配置 |

内置预设随 CLI 包一起发布，并在升级 `oh-my-agent` 时自动更新。无需维护任何本地文件。

---

## 覆盖单个智能体

使用 `agents:` 映射在当前预设之上覆盖特定智能体。仅你列出的智能体会被影响，其余继续使用预设默认值。

```yaml
# .agents/oma-config.yaml
language: en
model_preset: gemini

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

每条配置都是一个 `AgentSpec` 对象：

| 字段 | 类型 | 必填 | 描述 |
|:------|:-----|:---------|:-----------|
| `model` | string | 是 | 模型 slug（内置或用户定义） |
| `effort` | `low` \| `medium` \| `high` | 否 | 推理强度（不支持的模型会忽略） |
| `thinking` | boolean | 否 | 启用扩展思考（取决于具体模型） |
| `memory` | `user` \| `project` \| `local` | 否 | 智能体的记忆作用域 |

有效的智能体 ID：`orchestrator`、`architecture`、`qa`、`pm`、`backend`、`frontend`、`mobile`、`db`、`debug`、`tf-infra`、`retrieval`。

合并采用浅合并方式：你覆盖中的每个字段会替换预设中对应字段的值。未填写的字段会保留预设值。

---

## 内联模型 slug

将尚未在内置注册表中的模型 slug 注册到 `models:` 下。注册后即可在 `agents:` 或 `custom_presets:` 的任何位置使用。

```yaml
# .agents/oma-config.yaml
models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports:
      native_dispatch_from: [gemini]
      thinking: true
```

> 如果用户定义的 slug 与内置 slug 冲突，以用户定义为准，并会输出警告。

---

## 自定义预设

在 `custom_presets:` 中定义额外的预设。使用 `extends:` 从内置预设继承所有智能体默认值，仅覆盖你关心的智能体。

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # base preset — partial merge
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # all other agents inherited from claude
```

如果不使用 `extends:`，则必须为全部 11 个智能体角色提供 `agent_defaults`。使用 `extends:` 时，仅覆盖你列出的条目，其余从基础预设继承。

---

## `oma doctor --profile`

运行 `oma doctor --profile` 可查看完全解析后的模型矩阵（即合并预设默认值、`custom_presets` 和 `agents:` 覆盖之后的结果）。

```bash
oma doctor --profile
```

**示例输出：**

```
oh-my-agent — Profile Health (preset=mixed)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┬──────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │ Source   │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┼──────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │ (preset) │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ backend      │ openai/gpt-5.5         │ codex    │ ✗ not logged in  │ (override)│
│ retrieval    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┴──────────┘
```

每一行展示解析后的模型 slug 以及来源（`(preset)` 或 `(override)`）。当某个子智能体选了意料之外的厂商时，可用此命令排查。

---

## 从旧版 `agent_cli_mapping` 迁移

迁移 008 会在 `oma install` 和 `oma update` 时自动运行，对旧版项目原地完成转换：

| 旧版配置 | 迁移 008 之后的结果 |
|:-------------|:--------------------------|
| 所有条目使用同一厂商（例如全部为 `gemini`） | `model_preset: gemini`，无 `agents:` |
| 多厂商混合 | 出现频率最高的厂商成为 `model_preset`，其余落入 `agents:` 覆盖 |
| `AgentSpec` 对象值 | 原样移入 `agents:` |
| `models.yaml` 内容 | 内联到 `oma-config.yaml.models` |
| 自定义过的 `defaults.yaml` | 保留为 `custom_presets.user-customized` 并附带警告 |

在任何变更之前，原文件会备份到 `.agents/.backup-pre-008-{timestamp}/`。该迁移是幂等的：若 `model_preset` 已存在，则跳过执行。

迁移完成后，`.agents/config/defaults.yaml`、`.agents/config/models.yaml` 以及 `.agents/config/` 目录会被删除。

---

## 会话配额上限

`session.quota_cap` 保持不变。将其加入 `oma-config.yaml`，可限制子智能体失控生成：

```yaml
session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

当达到上限时，编排器会拒绝继续生成子智能体，并返回 `QUOTA_EXCEEDED` 状态。

---

## 完整示例

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports: { native_dispatch_from: [gemini], thinking: true }

custom_presets:
  my-team:
    extends: claude
    description: "Sonnet base, Codex for backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
```

运行 `oma doctor --profile` 确认解析结果，然后照常启动工作流。
