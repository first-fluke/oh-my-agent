---
title: "指南：按代理配置模型"
description: 通过 oma-config.yaml 与 models.yaml 为每个代理单独指定 CLI 厂商、模型与推理强度。涵盖 agent_cli_mapping、运行时配置档、oma doctor --profile、models.yaml 以及会话配额上限。
---

# 指南：按代理配置模型

## 概述

oh-my-agent 通过 `agent_cli_mapping` 支持**按代理选择模型**的能力。每个代理（pm、backend、frontend、qa 等）都可以独立指定厂商、模型与推理强度，而不再共用同一个全局厂商。

本页内容：

1. 三文件配置层级
2. 双格式的 `agent_cli_mapping`
3. 运行时配置档预设
4. `oma doctor --profile` 命令
5. `models.yaml` 中的用户自定义 slug
6. 会话配额上限

---

## 配置文件层级

oh-my-agent 按以下优先级（由高到低）读取三份文件：

| 文件 | 用途 | 可编辑 |
|:-----|:-----|:------|
| `.agents/oma-config.yaml` | 用户覆盖 — 代理到 CLI 的映射、激活配置档、会话配额 | 是 |
| `.agents/config/models.yaml` | 用户自定义模型 slug（内置注册表的补充） | 是 |
| `.agents/config/defaults.yaml` | 内置 Profile B 基线（5 个 `runtime_profiles`，安全回退） | 否 — SSOT |

> `defaults.yaml` 属于 SSOT，请勿直接修改。所有自定义都在 `oma-config.yaml` 和 `models.yaml` 中进行。

---

## 双格式的 `agent_cli_mapping`

`agent_cli_mapping` 接受两种取值形式，方便渐进式迁移：

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # 旧格式 — 仅指定厂商（使用默认模型）
  backend:                            # 新的 AgentSpec 对象
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low
```

**旧字符串格式**：`agent: "vendor"` — 继续可用，使用该厂商的默认模型与默认 effort，匹配的运行时配置档生效。

**AgentSpec 对象格式**：`agent: { model, effort }` — 锁定具体模型 slug 与推理强度（`low`、`medium`、`high`）。

可自由混用。未声明的代理会依次回退到激活的 `runtime_profile`，再回退到 `defaults.yaml` 中顶层的 `agent_defaults`。

---

## 运行时配置档

`defaults.yaml` 预置了 Profile B 以及 5 个 `runtime_profiles`。在 `oma-config.yaml` 中选一个：

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # 见下方选项
```

| 配置档 | 所有代理路由到 | 适用场景 |
|:-------|:---------------|:---------|
| `claude-only` | Claude Code（Sonnet/Opus） | 统一使用 Anthropic 栈 |
| `codex-only` | OpenAI Codex（GPT-5.x） | 纯 OpenAI 栈 |
| `gemini-only` | Gemini CLI | Google 优先的工作流 |
| `antigravity` | 混合：impl→codex、architecture/qa/pm→claude、retrieval→gemini | 跨厂商取长补短 |
| `qwen-only` | Qwen Code | 本地 / 自托管推理 |

配置档是一次性重塑整支代理队伍的捷径，无需逐个修改。

---

## `oma doctor --profile`

`--profile` 标志会以矩阵方式输出每个代理在合并 `oma-config.yaml`、`models.yaml` 与 `defaults.yaml` 之后的厂商、模型与 effort：

```bash
oma doctor --profile
```

**示例输出：**

```
oh-my-agent — Profile Health (runtime=claude)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │
│ pm           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │
│ backend      │ openai/gpt-5.3-codex         │ codex    │ ✗ not logged in  │
│ frontend     │ openai/gpt-5.4               │ codex    │ ✗ not logged in  │
│ retrieval    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┘
```

每一行显示解析后的模型 slug（经 `oma-config.yaml` + 激活配置档 + `defaults.yaml` 三层合并）以及你是否已登录将执行该角色的 CLI。当 subagent 选了意料之外的厂商时，请先运行此命令。

---

## 在 `models.yaml` 中添加 slug

`models.yaml` 是可选文件，用来注册内置注册表中暂未收录的模型 slug——对刚发布的模型很有用。

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — GPT-5.5 Spud release candidate"
```

注册后即可在 `agent_cli_mapping` 中使用：

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

slug 是标识符，请保留厂商发布的英文原样。

---

## 会话配额上限

在 `oma-config.yaml` 中加入 `session.quota_cap`，约束失控的子代理生成：

```yaml
# .agents/oma-config.yaml
session:
  quota_cap:
    tokens: 2_000_000        # 整个会话的 token 上限
    spawn_count: 40          # 并行+串行子代理的最大数量
    per_vendor:              # 每个厂商的 token 子上限
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

达到上限后 orchestrator 会拒绝继续生成，并抛出 `QUOTA_EXCEEDED` 状态。某个字段留空或整体省略 `quota_cap` 即关闭该维度的限制。

---

## 完整示例

一份可直接使用的 `oma-config.yaml`：

```yaml
active_profile: antigravity

agent_cli_mapping:
  pm: "claude"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

运行 `oma doctor --profile` 确认解析结果，然后照常开启工作流。


## 配置文件归属

| 文件 | 归属方 | 是否可安全编辑 |
|------|--------|---------------|
| `.agents/config/defaults.yaml` | oh-my-agent 随附的 SSOT | 否 — 视为只读 |
| `.agents/oma-config.yaml` | 用户 | 是 — 在此自定义 |
| `.agents/config/models.yaml` | 用户 | 是 — 在此添加新 slug |

`defaults.yaml` 携带 `version:` 字段，以便新版 oh-my-agent 发布时可新增 runtime_profiles、新的 Profile B slug 或调整 effort 矩阵。直接修改该文件意味着你将无法自动获得这些升级。

## 升级 defaults.yaml

拉取新版 oh-my-agent 后，运行 `oma install`——安装程序会将本地 `defaults.yaml` 的版本与内置版本进行比对：

- **一致** → 无任何变更，静默通过。
- **不一致** → 警告：
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **不一致 + `--update-defaults`** → 内置版本覆盖本地版本：
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

`models.yaml` 不会被安装程序修改。`oma-config.yaml` 同样会被保留，但有一个例外：`oma install` 会根据安装过程中你回答的提示，重写 `language:` 行并刷新 `vendors:` 块。你添加的其他任何字段（例如 `agent_cli_mapping`、`active_profile`、`session.quota_cap`）均会在多次运行间保留。

## 从 5.16.0 以前的版本升级

如果你的项目早于按代理配置模型/effort 功能：

1. 在项目根目录运行 `oma install`（或 `oma update`）。安装程序会将全新的 `defaults.yaml` 放入 `.agents/config/`，并执行迁移 `003-oma-config`，自动将旧版 `.agents/config/user-preferences.yaml` 迁移到 `.agents/oma-config.yaml`。
2. 运行 `oma doctor --profile`。现有的 `agent_cli_mapping: { backend: "gemini" }` 值会通过 `runtime_profiles.gemini-only.agent_defaults.backend` 解析，矩阵将自动显示正确的 slug 和 CLI。
3. （可选）如需按代理覆盖 `model`、`effort`、`thinking` 或 `memory`，可将 `oma-config.yaml` 中的旧字符串条目升级为新的 AgentSpec 格式：
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. 如果你曾自定义过 `defaults.yaml`，`oma install` 会提示版本不一致而非直接覆盖。请将自定义内容迁移到 `oma-config.yaml` / `models.yaml`，然后运行 `oma install --update-defaults` 接受新的 SSOT。

`agent:spawn` 没有破坏性变更——旧版配置通过优雅回退持续生效，你可以按自己的节奏逐步迁移。
