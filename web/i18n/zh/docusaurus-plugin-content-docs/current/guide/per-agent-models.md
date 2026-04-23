---
title: "指南：按代理配置模型"
description: RARDO v2.1 支持为每个代理单独指定 CLI 厂商、模型与推理强度。涵盖 agent_cli_mapping、运行时配置档、oma doctor --profile、models.yaml 以及会话配额上限。
---

# 指南：按代理配置模型

## 概述

RARDO v2.1 通过 `agent_cli_mapping` 引入了**按代理选择模型**的能力。每个代理（pm、backend、frontend、qa 等）都可以独立指定厂商、模型与推理强度，而不再共用同一个全局厂商。

本页内容：

1. 三文件配置层级
2. 双格式的 `agent_cli_mapping`
3. 运行时配置档预设
4. `oma doctor --profile` 命令
5. `models.yaml` 中的用户自定义 slug
6. 会话配额上限

---

## 配置文件层级

RARDO v2.1 按以下优先级（由高到低）读取三份文件：

| 文件 | 用途 | 可编辑 |
|:-----|:-----|:------|
| `.agents/oma-config.yaml` | 用户覆盖 — 代理到 CLI 的映射、激活配置档、会话配额 | 是 |
| `.agents/config/models.yaml` | 用户自定义模型 slug（内置注册表的补充） | 是 |
| `.agents/config/defaults.yaml` | 内置 Profile B 基线（4 个 `runtime_profiles`，安全回退） | 否 — SSOT |

> `defaults.yaml` 属于 SSOT，请勿直接修改。所有自定义都在 `user-preferences.yaml` 和 `models.yaml` 中进行。

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
    model: "anthropic/claude-sonnet-4.7"
    effort: medium
  qa:
    model: "google/gemini-3-pro"
    effort: low
```

**旧字符串格式**：`agent: "vendor"` — 继续可用,使用该厂商的默认模型与默认 effort。

**AgentSpec 对象格式**：`agent: { model, effort }` — 锁定具体模型 slug 与推理强度（`low`、`medium`、`high`）。

可自由混用。未声明的代理会回退到激活的 `runtime_profile`。

---

## 运行时配置档

`defaults.yaml` 预置了 Profile B 以及 4 个 `runtime_profiles`。在 `user-preferences.yaml` 中选一个：

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # 见下方选项
```

| 配置档 | 所有代理路由到 | 适用场景 |
|:-------|:---------------|:---------|
| `claude-only` | Claude Code（Sonnet/Opus） | 统一使用 Anthropic 栈 |
| `codex-only` | OpenAI Codex（GPT-5.x） | 纯 OpenAI 栈 |
| `gemini-only` | Gemini CLI | Google 优先的工作流 |
| `antigravity` | 混合：pm→claude、backend→codex、qa→gemini | 跨厂商取长补短 |
| `qwen-only` | Qwen CLI | 本地 / 自托管推理 |

配置档是一次性重塑整支代理队伍的捷径，无需逐个修改。

---

## `oma doctor --profile`

新增的 `--profile` 标志会以矩阵方式输出**合并三份配置文件之后**每个代理的厂商、模型与 effort：

```bash
oma doctor --profile
```

**示例输出：**

```
RARDO v2.1 — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4.7           medium   user-preferences
backend       openai    gpt-5.3-codex               high     user-preferences
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3-pro                low      profile:antigravity
architecture  claude    claude-opus-4.7             high     defaults
docs          claude    claude-sonnet-4.7           low      defaults

Session quota cap:
  tokens:       2,000,000
  spawn_count:  40
  per_vendor:   { claude: 1.2M, openai: 600K, google: 200K }
```

当子代理选了意料之外的厂商时先跑这条命令。`Source` 列会告诉你到底是哪一层配置获胜。

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
    notes: "预览版 — GPT-5.5 Spud 候选发布"
```

注册后即可在 `agent_cli_mapping` 中使用：

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

slug 是标识符,请保留厂商发布的英文原样。

---

## 会话配额上限

在 `user-preferences.yaml` 中加入 `session.quota_cap`,约束失控的子代理生成：

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

达到上限后编排器会拒绝继续生成,并抛出 `QUOTA_EXCEEDED` 状态。某个字段留空或整体省略 `quota_cap` 即关闭该维度的限制。

---

## 完整示例

一份可直接使用的 `user-preferences.yaml`：

```yaml
active_profile: antigravity

agent_cli_mapping:
  pm: "claude"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4.7"
    effort: medium
  qa:
    model: "google/gemini-3-pro"
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

跑一次 `oma doctor --profile` 确认解析结果,然后照常开启工作流。


## Config file ownership

| File | Owner | Safe to edit? |
|------|-------|---------------|
| `.agents/config/defaults.yaml` | **SSOT shipped with oh-my-agent** | ❌ Treat as read-only |
| `.agents/oma-config.yaml` | You | ✅ Customize here |
| `.agents/config/models.yaml` | You | ✅ Add new slugs here |

`defaults.yaml` carries a `version:` field so new OMA releases can add runtime_profiles, new Profile B slugs, or adjust the effort matrix. Editing it directly means you will not receive those upgrades automatically.

## Upgrading defaults.yaml

When you pull a newer oh-my-agent release, run `oma install` — the installer compares your local `defaults.yaml` version against the bundled one:

- **Match** → no change, silent.
- **Mismatch** → warning:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Mismatch + `--update-defaults`** → the bundled version overwrites yours:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

Your `user-preferences.yaml` and `models.yaml` are never touched by the installer.

## Upgrading from a pre-RARDO-v2.1 install

If your project predates the per-agent model/effort feature:

1. Run `oma install` from your project root. The installer drops a fresh `defaults.yaml` into `.agents/config/` and preserves your existing `oma-config.yaml`.
2. Run `oma doctor --profile`. Your legacy `agent_cli_mapping: { backend: "gemini" }` values are now resolved through `runtime_profiles.gemini-only.agent_defaults.backend`, so the matrix shows the correct slug and CLI automatically.
3. (Optional) Move custom agent settings from `oma-config.yaml` into the new `user-preferences.yaml` using the AgentSpec form if you want per-agent `model`, `effort`, `thinking`, or `memory` overrides:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. If you ever customized `defaults.yaml`, `oma install` will warn about the version mismatch instead of overwriting. Move your customizations into `user-preferences.yaml` / `models.yaml`, then run `oma install --update-defaults` to accept the new SSOT.

No breaking changes to `agent:spawn` — legacy configs keep working through graceful fallback while you migrate at your own pace.
