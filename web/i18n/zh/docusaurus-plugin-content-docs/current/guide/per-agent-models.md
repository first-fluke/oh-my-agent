---
title: "指南：按智能体配置模型"
sidebar_label: 智能体模型
description: "通过 oma-config.yaml 中的 model_preset 配置每个智能体使用的 AI 模型。本指南涵盖内置预设及其各角色模型、模型与 CLI 解析表、按智能体覆盖、内联模型定义、使用 extends 的自定义预设、oma doctor --profile、配额上限，以及 pi/OpenCode/Kimi 传输。"
---

# 指南：按智能体配置模型

## 概览 {#overview}

新安装默认使用 `model_preset: auto`。未配置的智能体使用当前供应商的原生智能体定义和模型设置。需要固定模型时选择固定预设；需要其他模型或供应商时覆盖单个智能体。重新安装和更新会保留已有的显式预设。

共享配置位于 `.agents/oma-config.yaml`；如果存在 `.agents/oma-config.cue`，其中的键会覆盖 YAML 中的同名键。可选的 Git 忽略本地文件用于覆盖当前机器的设置。

完整的顶层键和优先级说明请参阅[配置参考](/docs/guide/configuration-reference)。

本页介绍：

1. 内置预设及各角色使用的模型
2. OMA 如何为智能体解析模型和 CLI
3. 本地配置与 FreeLLMAPI（`free`）预设
4. 使用 `agents:` 映射覆盖单个智能体
5. 使用 `models:` 内联自定义模型 slug
6. 使用 `custom_presets:` 和 `extends:` 定义自定义预设
7. 使用 `oma doctor --profile` 检查解析后的配置
8. 从旧版 `agent_cli_mapping` 迁移，以及会话配额上限
9. 通过 pi、OpenCode 和 Kimi Code CLI 调度

---

## 内置预设 {#built-in-presets}

将 `model_preset` 设置为以下某个内置键：

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto
```

| 键 | 说明 | 适用场景 |
|:----|:-----------|:---------|
| `auto` | 遵循当前运行时的智能体和模型设置，不注入模型或推理强度标志 | 新安装的默认选项 |
| `free` | OMA 生成的 Codex、Claude 或 Qwen 进程使用的特殊网关模式；它独立于内置预设注册表解析。 | 本地 FreeLLMAPI 网关 |
| `antigravity` | 所有智能体使用 Antigravity CLI（`agy`）：实现、架构和 QA 使用 Gemini 4 Argon；编排、PM、文档和探索使用 Gemini 3.8 Flash。在 agy 1.1+ 上，OMA 传入 `agy models` 中的显示 ID（例如 `--model "Gemini 4 Argon (High)"`），并将 `effort` 映射到模型公开的档位。agy 1.0 没有 `--model`，因此由其自身配置决定。agy 没有 `--thinking-budget`。 | Antigravity CLI 用户 |
| `claude` | 所有智能体使用 Claude：架构使用 Opus，探索使用 Haiku，其他所有角色使用 Sonnet | Claude Max 订阅用户 |
| `codex` | 所有智能体使用 OpenAI Codex（大多数角色使用 GPT-6.1 Terra，探索使用 GPT-6 Luna），并带有推理强度级别 | ChatGPT Plus/Pro 用户 |
| `qwen` | 所有智能体使用 Qwen Code；与之匹配的 Qwen 会话可以使用生成的原生智能体，其他运行时使用 CLI 调度 | 本地或自托管推理 |
| `kiro` | 所有智能体使用 Kiro CLI；实现和架构使用 Sonnet，编排和探索使用 Haiku | Kiro 用户 |
| `cursor` | 所有智能体使用 Cursor 的 `composer-2.5`（orchestrator、qa、pm、docs、explore 使用 `composer-2.5-fast`） | Cursor Pro 或 Pro Student 用户 |
| `mixed` | orchestrator、architecture（Opus）、qa、pm 和 docs 使用 Claude；实现角色使用 Codex GPT-6.1 Terra，探索使用 GPT-6 Luna | 无需管理逐智能体配置即可使用多供应商优势 |

内置预设随 CLI 包一起提供，并在升级 `oh-my-agent` 时自动更新。`gemini` 是重定向到 `antigravity` 的兼容别名，不是当前的独立预设。不需要本地预设文件。

### 各角色的模型 {#models-per-role}

固定预设分配以下注册表 slug。表中省略了所有者前缀：前六列分别为 `antigravity/`、`anthropic/`、`openai/`、`qwen/`、`kiro/` 和 `cursor/`；`mixed` 中 Claude 模型为 `anthropic/`，GPT 模型为 `openai/`。事实来源是 `cli/platform/built-in-presets.ts`。

| 角色 | `antigravity` | `claude` | `codex` | `qwen` | `kiro` | `cursor` | `mixed` |
|:-----|:--------------|:---------|:--------|:-------|:-------|:---------|:--------|
| orchestrator, pm, docs | gemini-3.8-flash | claude-sonnet-5-5 | gpt-6.1-terra (medium) | qwen3-coder-next | claude-haiku-3-5 | composer-2.5-fast | claude-sonnet-5-5 |
| architecture | gemini-4-argon | claude-opus-5-5 | gpt-6.1-terra (high) | qwen3.7-plus (thinking) | claude-sonnet-4-5 | composer-2.5 | claude-opus-5-5 |
| qa | gemini-4-argon | claude-sonnet-5-5 | gpt-6.1-terra (high) | qwen3.7-plus (thinking) | claude-sonnet-4-5 | composer-2.5-fast | claude-sonnet-5-5 |
| backend, frontend, mobile, db, debug, refactor, tf-infra | gemini-4-argon | claude-sonnet-5-5 | gpt-6.1-terra (high) | qwen3.7-plus (thinking) | claude-sonnet-4-5 | composer-2.5 | gpt-6.1-terra (high) |
| explore | gemini-3.8-flash | claude-haiku-5-5 | gpt-6-luna (low) | qwen3-coder-next | claude-haiku-3-5 | composer-2.5-fast | gpt-6-luna (low) |

括号中的值是预设的 `effort`（Codex）或 `thinking: true`（Qwen）。预设未列出的角色（例如 `eval`）使用该预设的 `orchestrator` 条目。

---

## OMA 如何解析智能体的模型和 CLI {#how-oma-resolves-an-agents-model-and-cli}

设置了 `OMA_MODEL_PRESET` 时，它会首先替换 `model_preset`（参见[配置加载](/docs/guide/oma-config-semantics#precedence-table)）。随后解析器选择以下某一行：

| `model_preset` | 是否设置 `agents.<id>`？ | 发送给 CLI 的模型 | 运行智能体的 CLI |
|:---------------|:-------------------|:----------------------|:------------------------|
| `free` | 忽略 | `FREELLM_MODEL`，否则 `free.model`，否则 `auto`（所有角色） | `--vendor`，否则 `OMA_RUNTIME_VENDOR`，否则检测到的运行时（若为 Codex、Claude 或 Qwen），否则 `default_cli`，否则 `codex`。只接受 `codex`、`claude` 和 `qwen`。 |
| `auto` | 否 | 无。由供应商自身的智能体和会话设置决定。 | `--vendor`，否则受支持的 `OMA_RUNTIME_VENDOR`，否则检测到的运行时，否则 `default_cli`，否则 `claude`。不受支持的值会报错。 |
| `auto` | 是 | 覆盖中的 `model` | 该模型的 `cli`，然后应用下文的供应商覆盖规则 |
| 内置、别名或自定义 | 否 | 预设中该角色的条目，否则预设的 `orchestrator` 条目 | 该模型的 `cli`，然后应用下文的供应商覆盖规则 |
| 内置、别名或自定义 | 是 | 预设条目与覆盖浅合并（覆盖字段优先） | 该模型的 `cli`，然后应用下文的供应商覆盖规则 |

其余部分的作用如下：

- **预设查找。** OMA 先检查内置名称，再检查别名（`gemini` 会带警告重定向到 `antigravity`），最后检查 `custom_presets`。与内置名称同名的自定义预设会被忽略。未知名称会以 `Unknown model_preset "..."` 停止，并列出有效名称。
- **模型查找。** slug 先在 `models:` 中查找，再在内置注册表中查找。未知 slug 或带有 `api_only: true` 的规范会停止调度。
- **供应商覆盖规则。** 当 `--vendor` 或 `OMA_RUNTIME_VENDOR` 为基于模型的行指定供应商时，`pi` 总是接管（仅限真实供应商模型；参见[通过 pi 调度](#dispatching-through-pi-transport-runtime)）。其他供应商只有在列于模型的 `supports.native_dispatch_from` 中时才会接管。否则 OMA 会发出警告，并保留模型自身的 `cli`。
- **推理强度。** 对于 CLI 没有推理强度标志的模型（Claude Code），`effort` 会被丢弃并发出警告。pi 会保留它，并映射为 `--thinking`。

## 自动调度 {#auto-dispatch}

使用 `auto` 时，如果可用，OMA 使用当前运行时的原生子智能体路径。跨供应商智能体以及不支持原生调度的运行时使用 `oma agent spawn`。`auto` 不会展开成固定供应商预设。继承的计划不会注入 OMA 模型或推理强度标志。外部 CLI 进程使用该 CLI 保存的默认值，这些默认值可能不同于只在父会话中选择的模型。

`oma doctor --profile` 会对继承的智能体显示 `(vendor agent default)`，并显示显式覆盖解析出的模型。原生智能体文件保留供应商定义；自动模式下的同供应商覆盖会在安装或更新生成这些文件时应用。

## 本地配置 {#local-configuration}

在共享配置旁创建 `.agents/oma-config.local.cue` 或 `.agents/oma-config.local.yaml`，两者只能选择**一个**。安装、链接和更新会将这两个路径加入 `.gitignore`；更新即使使用 `--force` 也会保留已有的本地文件。

OMA 选择最近的项目配置目录。在该目录内，共享 CUE 中设置的键会覆盖共享 YAML 中的同名键，本地文件覆盖共享值。完整顺序见[优先级表](/docs/guide/oma-config-semantics#precedence-table)。CUE 文件会在合并前独立求值，因此共享的 `model_preset: "auto"` 可以被本地的 `"free"` 替换。对象递归合并；数组、标量和 `null` 替换共享值。本地文件格式错误、本地 CUE 缺少 CUE 可执行文件，或同时存在两种本地格式时都会报错，不会因此改用共享默认值。

命令选项和受支持的环境变量覆盖优先于生效的文件配置。`oma doctor --profile` 会显示使用了哪些文件。本地文件不会随 Git 克隆或新 worktree 一起传递。Free 模式的子进程继承 `OMA_MODEL_PRESET=free` 和解析后的网关环境，因此嵌套的 OMA 调度会保留该路由；独立启动的会话需要自己的本地配置或环境变量。安装或设置命令保存的设置仍写入共享配置；运行时本地覆盖继续优先。

## FreeLLMAPI 预设 {#freellmapi-preset}

在共享文件中保留 `model_preset: auto`，然后在本地选择加入：

```cue
// .agents/oma-config.local.cue
model_preset: "free"
free: {
    base_url:    "http://127.0.0.1:31415/v1"
    api_key_env: "FREELLM_API_KEY"
    model:       "auto"
}
```

对应的 YAML 文件为：

```yaml
# .agents/oma-config.local.yaml
model_preset: free
free:
  base_url: http://127.0.0.1:31415/v1
  api_key_env: FREELLM_API_KEY
  model: auto
```

单独启动 FreeLLMAPI，并将统一密钥导出为 `FREELLM_API_KEY`。选择默认密钥变量时，OMA 也接受上游的 `FREELLMAPI_API_KEY`；两者同时设置时，以规范变量为准。自定义 `api_key_env` 时只读取该变量。永远不要把密钥本身写入配置。`OMA_MODEL_PRESET` 会覆盖预设。`FREELLM_BASE_URL` 和 `FREELLM_MODEL` 会分别覆盖文件中的设置。示例值就是默认值，因此服务器和密钥准备就绪后，仅设置 `model_preset: free` 即可。

```bash
oma doctor --profile
oma agent spawn backend "Review the API error handling" free-review --vendor codex --read-only
```

Free 模式对所有由 OMA 调度的角色使用 `free.model`，包括已有 `agents.*.model` 固定值的角色。它不会将这些固定值解析到付费订阅中。可以选择 `auto`、网关模型 ID，或 `auto:coding` 这类命名网关链（需先在 FreeLLMAPI 中创建该链）。

传输遵循 [OMA 如何解析智能体的模型和 CLI](#how-oma-resolves-an-agents-model-and-cli) 中的 `free` 行。仅支持 Codex、Claude 和 Qwen 传输。显式选择不受支持的传输会报错。

| 传输 | 网关端点 | CLI 基础 URL |
|:--|:--|:--|
| Codex | `/v1/responses` | 包含 `/v1` |
| Claude | `/v1/messages` | 服务器根路径；OMA 会移除 `/v1` 后缀 |
| Qwen | `/v1/chat/completions` | 包含 `/v1` |

即使父进程使用同一供应商，也应使用 `oma agent spawn`。OMA 只将网关连接和凭据注入该子进程；更改预设不会改变已经打开的宿主会话或宿主原生子智能体工具的模型。Codex 通过调用参数获得自定义 Responses 供应商，而密钥留在子进程环境中。Claude 和 Qwen 会收到各自兼容的端点设置。会覆盖路由或密钥的冲突 Claude/Qwen 设置会在执行前报告；OMA 不会改写这些文件。

spawn 和 review 会在启动智能体前，先用认证请求检查 `GET /v1/models`。缺少密钥、连接失败和 HTTP 身份验证错误都会停止执行。`oma doctor --profile` 会显示生效的 URL、模型、环境覆盖、密钥是否存在以及服务器就绪状态，但不会打印密钥。就绪不代表模型有足够配额完成任务。

FreeLLMAPI 负责请求级供应商故障转移。OMA 基于显式检查点的供应商故障转移仍是独立的进程恢复机制；Free 模式中的每个后继进程仍必须使用受支持的 FreeLLMAPI 传输。不会自动返回付费供应商配置。

Free 预设配置智能体推理，不会改变现有记忆服务的嵌入配置。FreeLLMAPI 也提供 `/v1/embeddings`；单独配置向量存储时，应固定一个模型系列，以便现有向量继续使用兼容的空间。

上游参考：[客户端设置](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/clients/01-agent-clients.md)、[API 和嵌入模型系列](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md)。

## 覆盖单个智能体 {#overriding-individual-agents}

使用 `agents:` 映射在活动预设之上覆盖指定智能体。只有列出的智能体会受到影响；其余智能体在自动模式下遵循供应商设置，或遵循选定固定预设的默认值。

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto

agents:
  backend: { model: openai/gpt-6.1-terra, effort: high }
  qa:      { model: anthropic/claude-sonnet-5-5 }
```

每个条目都是一个 `AgentSpec` 对象：

| 字段 | 类型 | 必填 | 说明 |
|:------|:-----|:---------|:-----------|
| `model` | string | 是 | 模型 slug（内置或用户定义） |
| `effort` | `none` \| `low` \| `medium` \| `high` \| `xhigh` | 否 | 推理强度（不支持该能力的模型会忽略） |
| `thinking` | boolean | 否 | 启用扩展思考（取决于模型） |
| `memory` | `user` \| `project` \| `local` | 否 | 智能体的记忆范围 |

有效的智能体 ID：`orchestrator`、`architecture`、`qa`、`pm`、`backend`、`frontend`、`mobile`、`db`、`debug`、`refactor`、`docs`、`tf-infra`、`explore` 和 `eval`。内置预设没有定义 `eval`，因此除非你覆盖它，否则它使用预设的 `orchestrator` 条目。

合并采用浅层方式：覆盖中的每个字段都会替换预设中该字段的值。省略的字段保留预设值。

---

## 内联模型 slug {#inlining-model-slugs}

在 `models:` 下注册尚未进入内置注册表的模型 slug。注册后，可从 `agents:` 或 `custom_presets:` 引用该 slug。

```yaml
# .agents/oma-config.yaml
models:
  antigravity/gemini-4-argon-low:
    cli: antigravity
    cli_model: "Gemini 4 Argon (Low)"   # exact display ID from `agy models`
    auth_hint: "Requires Antigravity CLI sign-in (Google AI Pro tier)"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: true
      computer_use: false
      native_dispatch_from: [antigravity]
      api_only: false
```

在 `agents:` 中引用已注册 slug 时需要遵守两条规则：

1. **键必须使用 `owner/model` 形式。** `agents.<id>.model` 会针对 `owner/model` 模式进行校验，因此 `my-fast-model` 这样的裸键会被拒绝。请使用带斜杠的键，例如 `antigravity/gemini-4-argon-low`（或供应商自己的 `provider/model` slug）。
2. **规范必须完整且有效。** 解析时必须提供 `cli`、`cli_model`、`auth_hint` 以及 `supports` 中的每个字段。`cli` 必须是 `antigravity`、`claude`、`codex`、`commandcode`、`cursor`、`grok`、`kimi`、`kiro`、`qwen` 或 `opencode` 之一；`native_dispatch_from` 的条目必须是 `antigravity`、`claude`、`codex`、`cursor`、`kimi`、`kiro`、`opencode` 或 `qwen`。`gemini` 对两者都不是有效值。无效的规范会记录 `[model-registry] User inline model "<slug>" failed validation — falling back to core registry`；如果核心注册表中也没有该 slug，调度会以未知 slug 错误停止。

> 如果用户定义的 slug 与内置 slug 冲突，用户定义会优先，并发出警告。

---

## 自定义预设 {#custom-presets}

在 `custom_presets:` 中定义额外预设。使用 `extends:` 继承内置预设的全部智能体默认值，只覆盖需要调整的智能体。

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # base preset — partial merge
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-6.1-terra, effort: high }
      db:      { model: openai/gpt-6.1-terra, effort: high }
      # all other agents inherited from claude
```

不使用 `extends:` 时，至少要定义 `orchestrator`：预设省略的每个角色都使用其 `orchestrator` 条目。使用 `extends:` 时，只覆盖你列出的条目，其余从基础预设继承。`extends` 可以指向内置预设或另一个自定义预设，循环链会报错。与内置预设同名（例如 `claude`）的自定义预设会被忽略，以内置预设为准。

---

## `oma doctor --profile` {#oma-doctor---profile}

运行 `oma doctor --profile`，查看合并预设默认值、`custom_presets` 和 `agents:` 覆盖后的完整模型矩阵。

```bash
oma doctor --profile
```

**示例输出**（已节选：`model_preset: mixed` 并带有 `backend` 覆盖；实际运行会列出全部 13 个角色，终端会把每个部分绘制在边框内）：

```text
 Profile Health (mixed)

 Configuration sources
   shared: <project>/.agents/oma-config.yaml

 Auth Status Matrix
┌──────────────┬────────────────────────────────────┬──────────────┬────────────────┐
│ Role         │ Model                              │ CLI          │ Auth Status    │
├──────────────┼────────────────────────────────────┼──────────────┼────────────────┤
│ orchestrator │ anthropic/claude-sonnet-5-5        │ claude       │ ✓ logged in    │
│ architecture │ anthropic/claude-opus-5-5          │ claude       │ ✓ logged in    │
│ qa (preset)  │ anthropic/claude-sonnet-5-5        │ claude       │ ✓ logged in    │
│ backend (over│ openai/gpt-6.1-terra               │ codex        │ ✓ logged in    │
│ explore (pres│ openai/gpt-6-luna                  │ codex        │ ✓ logged in    │
└──────────────┴────────────────────────────────────┴──────────────┴────────────────┘

 Profile health check complete (mixed)
```

每一行显示角色、解析后的模型 slug、运行它的 CLI 以及身份验证状态。角色单元格带有来源标记：`(preset)`、`(override)`，或在 `auto` 下继承供应商设置的智能体显示 `(vendor)`。Role 列宽 14 个字符，因此较长的标记会被截断，如上所示。当子智能体选择了意外的供应商时，可以用此命令定位原因。

---

## 从旧版 `agent_cli_mapping` 迁移 {#migration-from-legacy-agent_cli_mapping}

迁移 008 会在 `oma install` 和 `oma update` 时自动运行，并原地转换旧项目：

| 旧版配置 | 迁移 008 后的结果 |
|:-------------|:--------------------------|
| 所有条目使用同一供应商（例如全部为 `claude`） | `model_preset` 设为该供应商的预设（旧版 `gemini` 映射到 `antigravity`），没有 `agents:` |
| 供应商混用 | 使用频率最高的供应商作为 `model_preset`，其他供应商转为 `agents:` 覆盖 |
| `AgentSpec` 对象值 | 原样移到 `agents:` |
| `models.yaml` 内容 | 内联到 `oma-config.yaml.models` |
| 定制的 `defaults.yaml` | 保留为 `custom_presets.user-customized`，并发出警告 |

任何更改前，原文件都会备份到 `.agents/backup/008-model-preset/<timestamp>-<pid>/`（全局安装为 `~/.oma/backup/008-model-preset/...`）。迁移具有幂等性。如果已经存在 `model_preset`，则跳过迁移。

<!-- oma-docs:ignore-start -->
迁移后，会删除 `.agents/config/defaults.yaml`、`.agents/config/models.yaml` 以及 `.agents/config/` 目录。
<!-- oma-docs:ignore-end -->

---

## 会话配额上限 {#session-quota-cap}

将 `session.quota_cap` 加入 `oma-config.yaml`，即可限制失控的子智能体生成：

```yaml
session:
  quota_cap:
    tokens: 2000000      # plain digits: YAML reads 2_000_000 as a string, which disables the cap
    spawn_count: 40
    per_vendor:          # dispatch vendor IDs (claude, codex, antigravity, ...), not model owners
      claude: 1200000
      codex: 600000
      antigravity: 200000
```

达到上限后，`oma agent spawn` 会拒绝下一次生成，并以 `[session-cost] Quota cap exceeded for session <id>: <dimension> (current: N, limit: M)` 失败。token 用量根据提示长度估算，因此 `spawn_count` 是最可预测的限制。字段规则见：[会话配额上限](/docs/guide/configuration-reference#session-quota-caps)。

---

## 完整示例 {#full-example}

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-5-5 }

models:
  antigravity/gemini-4-argon-low:
    cli: antigravity
    cli_model: "Gemini 4 Argon (Low)"   # exact display ID from `agy models`
    auth_hint: "Requires Antigravity CLI sign-in (Google AI Pro tier)"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: true
      computer_use: false
      native_dispatch_from: [antigravity]
      api_only: false

custom_presets:
  my-team:
    extends: claude
    description: "Sonnet base, Codex for backend/db"
    agent_defaults:
      backend: { model: openai/gpt-6.1-terra, effort: high }
      db:      { model: openai/gpt-6.1-terra, effort: high }

session:
  quota_cap:
    tokens: 2000000
    spawn_count: 40
```

运行 `oma doctor --profile` 确认解析结果，然后照常启动工作流。

---

## 通过 pi 调度（传输运行时） {#dispatching-through-pi-transport-runtime}

[pi](https://github.com/earendil-works/pi)（Earendil）是多供应商代理运行时，不是模型所有者；它可以在一个 CLI 下运行 Anthropic、OpenAI、Google 的真实供应商模型。oma 将 pi 视为**传输覆盖层**：`model_preset` 和 `agents:` 覆盖保持原样，pi 成为指定智能体的执行 CLI。

使用 `--vendor pi` 覆盖，将任意智能体通过 pi 调度：

```bash
oma agent spawn backend "Implement the export endpoint" <session> --vendor pi
```

具体行为如下：

- 从预设或覆盖中解析的逐智能体模型（例如 `openai/gpt-6.1-terra`）会转换为 pi 的 `--model <provider/id>` 形式，`effort` 会转换为 pi 的 `--thinking` 级别。**pi 上的逐子智能体模型与原生调度完全一致**，不同智能体可以运行不同模型。
- 智能体 persona（系统提示）会从 `.agents/agents/<id>.md` 内联，因为 pi 没有可引用的供应商侧智能体文件。
- 身份验证使用 pi 自身的配置（`~/.pi/agent/auth.json` 或环境中的供应商 API 密钥）。`oma doctor` 会在其他 CLI 旁报告 pi 的安装和身份验证状态。

**限制**：pi 只能运行真实供应商模型。CLI 专有预设（`cursor`、`kiro`、`qwen`、`antigravity`）指向只存在于各自 CLI 内的模型，因此通过 pi 调度会以明确的错误被拒绝。通过 pi 路由智能体时，请使用 `claude`、`codex` 或 `mixed`，或模型为 `anthropic/`、`openai/` 或 `google/` slug 的 `agents.<id>` 覆盖。`gemini` 是 `antigravity` 的别名，因此 pi 会拒绝它。

> pi 的模型目录随版本更新，并受身份验证限制。如果解析出的 slug 与当前 pi 安装提供的目录不匹配，请检查 `pi --list-models`。pi 对 `--model` 的匹配是模糊的，因此大多数供应商 slug 可以直接解析。

### pi 内置注册表之外的模型（例如 Z.ai GLM） {#models-outside-pis-built-in-registry-eg-zai-glm}

pi 会针对**内置模型注册表**解析 `--model`；只有在完全没有传入模型时，才会参考 `defaultProvider` 设置。以 Z.ai 为例，截至 pi 0.80.x，pi 只提供部分 GLM ID（`glm-4.7`、`glm-4.5-air`、`glm-5-turbo`、`glm-5.1`、`glm-5v-turbo`），指向任何其他 GLM ID 的预设都将无法解析。

有两种处理方式：

1. **注册表 ID**：将预设限制为注册表中的模型 ID。使用 `provider/id` 形式（例如 `zai/glm-4.7`）明确固定供应商；oma 会原样将其传递给 pi 的 `--model`。
2. **未注册 ID**：使用 pi 扩展注册这些 ID。`api` 字段必须使用 pi 的某个 **API 适配器 ID**（`openai-completions`、`anthropic-messages` 等），而不是供应商名称。供应商名称（例如 `"zai"`）或简写（例如 `"openai"`）不是适配器 ID，调度时会报错：`No API provider registered for api: …`。

```typescript
// ~/.pi/agent/extensions/zai-glm-models/index.ts  (or <project>/.pi/extensions/)
export default function (pi: ExtensionAPI) {
  pi.registerProvider("zai", {
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
    api: "openai-completions", // adapter id, NOT "zai"
    apiKey: "$ZAI_API_KEY",
    models: [
      { id: "glm-4.7-flash", api: "openai-completions", /* … */ },
      // NOTE: `models` replaces ALL existing models for the provider —
      // re-declare the built-in ids here if you still want them.
    ],
  });
}
```

在将这些 ID 接入预设前，用 `pi --list-models` 验证。

---

## 通过 OpenCode 调度 {#dispatching-through-opencode}

[OpenCode](https://opencode.ai) 是扩展型供应商：与 pi 一样，它不是模型所有者，而是运行自身目录中模型的 CLI，包括免费的 `opencode` 供应商、低成本的 `opencode-go` 订阅计划和 `opencode-zen` 网关。oma 将其集成为**进程内插件供应商**：opencode 会自动加载 `.opencode/plugins/oma/`，而不是注册设置文件钩子，并从生成的 `.opencode/agents/<id>.md` 文件解析每个智能体的 persona。

### 显式调度 {#explicit-dispatch}

使用 `--vendor opencode` 覆盖，将任意智能体通过 opencode 路由：

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor opencode
```

这会运行 `opencode run --agent pm --dir <workspace> "<prompt>"`。提示词是**末尾的位置参数**；opencode 的 `-p` 标志表示 `--password`，不是提示词。

### 按智能体配置 OpenCode 模型 {#per-agent-opencode-models}

要将指定智能体路由到 opencode 模型，请在 `models:` 下注册模型，并在 `agents:` 中引用它。需要满足两点（参见[内联模型 slug](#inlining-model-slugs)）：

1. **slug 必须使用 `owner/model` 形式。** 使用 opencode 的 `provider/model` slug 作为注册表键；`agents.<id>.model` 模式不接受裸名称。
2. **规范必须完整**，包括 `cli`、`cli_model`、`auth_hint` 以及 `supports` 中的每个字段。不完整的规范会校验失败；OMA 会记录警告并回退到核心注册表，因此智能体不会路由到 opencode。

```yaml
# .agents/oma-config.yaml
language: en
model_preset: claude          # heavier impl roles stay on Claude

models:
  opencode-go/deepseek-v4-flash:
    cli: opencode
    cli_model: opencode-go/deepseek-v4-flash
    auth_hint: "OpenCode Go subscription — run: opencode auth login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [opencode]
      api_only: false

agents:
  pm:      { model: opencode-go/deepseek-v4-flash }
  qa:      { model: opencode-go/deepseek-v4-flash }
  docs:    { model: opencode-go/deepseek-v4-flash }
  explore: { model: opencode-go/deepseek-v4-flash }
```

每个已路由的智能体都会运行 `opencode run -m opencode-go/deepseek-v4-flash
--agent <id> --dir <workspace> "<prompt>"`。这适合轻量、快速的角色（pm、qa、docs、explore）；较重的实现智能体可以继续使用 Codex、Claude 等。

### 验证模型 slug {#validating-a-model-slug}

opencode 的目录受订阅和登录状态限制，因此 oma **不会**硬编码 opencode 模型 slug。使用已安装的目录验证模型：

```bash
oma model probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model probe` 在 slug 出现在 `opencode models` 中时报告 `accepted`；不在其中时报告 `rejected`；供应商需要登录或订阅时报告 `auth_required`。

### 身份验证与生成文件 {#auth-and-generated-files}

- **身份验证：**`opencode auth login` 将凭据存入 `~/.local/share/opencode/auth.json`，每个供应商一条记录。`oma auth status` 和 `oma doctor` 在*任意*供应商存在凭据时将 opencode 报告为已认证。`oma doctor --profile` 则会按供应商识别：每一行根据注册 `cli_model` 的供应商前缀检查，因此 `cli_model: zai-coding-plan/glm-5.3` 对应检查 `zai-coding-plan` 凭据。模型没有已注册的 `provider/model` `cli_model` 时，该行会报告 `? unknown`，而不会断言认证失败。
- **生成文件：**`oma link`（或 `oma link opencode`）会为每个智能体写入一个 `.opencode/agents/<id>.md` persona 文件，以及 `.opencode/plugins/oma/` 桥接。它们从 `.agents/` SSOT 生成，不要直接编辑；重新运行 `oma link` 生成。

> **持久化工作流说明**：opencode 的 `session.idle` 事件（最接近 Claude `Stop` 钩子的对应事件）仅用于通知，无法阻止会话结束。因此，在 opencode 下，持久化工作流（orchestrate、work、ultrawork）使用**降级的 Stop 语义**；工作流会在下一条消息中强化，而不是保持会话打开。

---

## 通过 Kimi Code CLI 调度 {#dispatching-through-kimi-code-cli}

[Kimi Code CLI](https://www.kimi.com/code) 只从全局配置（`~/.kimi-code/config.toml`、`KIMI_CODE_HOME`）读取**钩子**，因此 `oma install` 和 `oma link` 会在明确同意后，将 Kimi 钩子链及其技能符号链接写入 HOME（类似 Antigravity）。Kimi 也会直接扫描 OMA 的 SSOT `.agents/skills/`，因此技能在整个项目中都能解析。**MCP** 不需要写入 HOME，且作用域为项目；它会按模式写入项目的 `<cwd>/.kimi-code/mcp.json`，或全局的 `~/.kimi-code/mcp.json`。

### 显式调度 {#explicit-dispatch-1}

使用 `--vendor kimi` 覆盖，将任意智能体通过 Kimi 路由：

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor kimi
```

这会运行 `kimi -p "<prompt>"`。Kimi 的 `-p`（非交互）模式会在 `auto` 权限策略下自动批准普通工具调用，因此 oma **不会**附加 `--yolo` 或 `--auto`（它们与 `-p` 互斥）。

### 按智能体配置 Kimi 模型 {#per-agent-kimi-models}

与 opencode 一样，oma **不会**硬编码 Kimi 模型目录（Kimi 的产品线取决于供应商和订阅）。要将指定智能体路由到 Kimi 模型，请在 `models:` 下注册带有 `cli: kimi` 的完整规范，并在 `agents:` 中引用它：

注册表键必须使用 `owner/model` 形式（`agents.<id>.model` 模式不接受裸名称），`cli_model` 是传给 `kimi --model` 的精确别名；Kimi 文档中的编码别名是 `kimi-code/kimi-for-coding`。提交前，请使用 `kimi --model <alias>` 确认订阅提供该别名。

```yaml
# .agents/oma-config.yaml
models:
  kimi-code/kimi-for-coding:
    cli: kimi
    cli_model: kimi-code/kimi-for-coding
    auth_hint: "Kimi subscription — run: kimi login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: []
      api_only: false

agents:
  pm:   { model: kimi-code/kimi-for-coding }
  docs: { model: kimi-code/kimi-for-coding }
```

每个已路由的智能体都会运行 `kimi --model kimi-code/kimi-for-coding -p "<prompt>"`。

> **持久化工作流说明**：Kimi 文档记录的阻止 Stop 路径是退出码 2 和 stderr，但 `oma hook run` 路由器始终退出 0 并输出 stdout 方言。oma 会尽力发出 `permissionDecision: "deny"`（以及 Claude 风格的 `decision: "block"`），因此持久化工作流在 Kimi 下会平稳降级。
