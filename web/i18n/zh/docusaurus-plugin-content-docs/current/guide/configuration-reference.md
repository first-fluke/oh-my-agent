---
title: "指南：配置参考"
sidebar_label: 配置参考
description: "支持的 OMA 配置位置、优先级、类型化键、默认值和更新所有权规则。"
---

# 配置参考

OMA 从 `.agents/oma-config.cue` 或 `.agents/oma-config.yaml` 读取配置。本地覆盖文件 `.agents/oma-config.local.cue` 或 `.agents/oma-config.local.yaml` 适合存放不应进入共享文件的机器专属设置。

在要检查其配置的项目中运行：

```bash
oma doctor --profile
```

预期结果是一个显示所选预设和每个智能体模型计划的已解析配置档。如果命令报告解析错误，请先修复最近的配置层，再更改模型设置。

## 哪个文件优先

加载器从当前目录向上遍历，在包含共享或本地配置的最近 `.agents/` 目录处停止。在该目录中：

1. 首先评估 `oma-config.cue`。
2. 共享 CUE 文件不存在或无法评估时，使用 `oma-config.yaml`。
3. 将一个本地文件（`oma-config.local.cue` 或 `.local.yaml`）合并到共享文件之上。
4. 设置了 `OMA_MODEL_PRESET` 时，它会为该进程覆盖 `model_preset`。

映射会递归合并。数组、标量和 `null` 会替换共享值。两个本地格式同时存在是错误。格式错误的本地文件会导致失败，这样私有覆盖不会被悄悄忽略。

这是最近配置层规则，不是通用的项目加 HOME 合并。全局安装读取 `~/.agents/oma-config.*`，因为 HOME 是它的安装根目录。项目命令读取最近的项目层。`auto_update_cli` 的更新检查是例外：它先检查项目，再检查 HOME，最后默认启用。

## 顶层键

以下键由当前运行时模式或随 OMA 发布的消费者读取。标记为 sparse 的键是有意的部分映射：省略嵌套值即可保留代码默认值。

| 键 | 类型或接受的值 | 缺省时的默认值 | 用途 |
| --- | --- | --- | --- |
| `language` | string | `en` | 工作流和技能使用的响应语言。 |
| `translation_voice` | `formal`、`balanced`、`interpreter` | 随附模板中为 `balanced` | `oma-translation` 的语气选择。 |
| `date_format` | `ISO`、`US`、`EU` | 随附模板中为 `ISO`；省略时不留下显式覆盖 | 日期格式偏好。 |
| `timezone` | IANA 名称 | system time zone | 计划任务和报告使用的日期。 |
| `auto_update_cli` | boolean | `true` | 后台 CLI 版本检查；使用 `false` 退出。 |
| `telemetry` | boolean | `false` | 安装、更新和链接协调时使用的供应商遥测选择。 |
| `model_preset` | 非空字符串 | 新模板中为 `auto` | 内置或自定义模型预设。`OMA_MODEL_PRESET` 可为单个进程覆盖它。 |
| `free` | `base_url`、`api_key_env`、`model` | `http://127.0.0.1:31415/v1`、`FREELLM_API_KEY`、`auto` | 预设为 `free` 时的 FreeLLMAPI 设置；`FREELLM_BASE_URL` 和 `FREELLM_MODEL` 会覆盖文件值，键名永远不包含密钥。请参阅[按智能体配置模型](/docs/guide/per-agent-models#freellmapi-preset)。 |
| `providers` | `docs`、`web`、`code_intelligence`、`code_intelligence_guard`、`semantic_memory` | `context7`、`native`、`serena`、`block`、`agentmemory` | 选择文档、搜索、代码智能和语义内存提供方。代码智能接受 `serena` 或 `gortex`；语义内存接受 `agentmemory`、`honcho` 或 `none`。`code_intelligence_guard`（`block` 或 `off`）控制 PreToolUse 搜索保护。限定在已确认的提供方排除项或项目之外路径的原生搜索，无需绕过即可放行。该保护会读取 Serena 的排除项和已启用的 gitignore 规则，或 Gortex 的排除列表；它不会根据目录名推断依赖项。该钩子不会提及 `OMA_CI_ALLOW_NATIVE`。以 `OMA_CI_ALLOW_NATIVE=1` 为前缀的 shell 搜索，仅对项目之外的资源或保护未能识别的被忽略路径绕过保护，对项目源代码无效。 |
| `brave` | `api_key_env` 或 `api_key_vault` | unset | Brave 搜索凭据引用。 |
| `honcho` | `base_url`、`workspace_id`、`project_id`、`api_key_env`、`api_key_vault`、`timeout_ms`、`max_results`、`max_tokens`、`recall_mode` | 请参阅[Honcho 详情](#honcho-semantic-memory) | Honcho 语义内存连接设置。 |
| `agents` | 智能体 ID → `model`，可选的 `effort`、`thinking`、`memory` | 由预设解析 | 在所选预设之上应用的每个智能体覆盖。effort 可为 `none`、`low`、`medium`、`high` 或 `xhigh`；memory 可为 `user`、`project` 或 `local`。 |
| `models` | 模型 slug → CLI 映射 | unset | 支持的供应商 CLI 的内联模型定义。 |
| `custom_presets` | 预设 → description，可选的 `extends`、`agent_defaults` | unset | 用户定义的预设；`extends` 可以继承内置预设。 |
| `vendors` | YAML：所选供应商 ID 的 `string[]`；CUE 模板：可选的 `vendors.pi` 回退映射 | YAML 列表中的所有可链接供应商 | 选择 `oma install` 和 `oma update` 在 YAML 中投影哪些供应商集成。调度能力映射位于托管编排配置中，请参阅[供应商选择和调度元数据](#vendor-selection-and-dispatch-metadata)。 |
| `default_cli` | string | consumer fallback | 没有模型计划解析出来时的旧版仅供应商回退。 |
| `session.quota_cap` | `tokens`、`spawn_count`、`per_vendor: map<string, integer>` | 每个省略的维度都不设上限 | 在下一次智能体生成前检查硬性 token 和生成次数限制；请参阅[会话配额上限](#session-quota-caps)。 |
| `docs` | `auto_verify`、`check_urls`、`exclude` | `false`、`true`、`[]` | `oma docs verify` 的行为和扫描排除项。 |
| `serena` | `mode: bridge\|stdio`、`auto_update` | `bridge`、`true` | Serena MCP 传输和更新行为。 |
| `mcp.devtools_browsers` | `aside`、`chrome`、`firefox` 或 `[]` | unset = 保留现有设置 | 协调时选择浏览器 DevTools MCP。明确的空列表会移除所选浏览器条目。 |
| `video` | 技能拥有的 sparse 映射 | 技能默认值；请参阅[视频生成](/docs/guide/video-generation) | 视频路由、供应商顺序、输出、成本、限制和 HyperFrames 刷新设置。 |
| `image` | 技能拥有的 sparse 映射 | 技能默认值；请参阅[图像生成](/docs/guide/image-generation) | 图像供应商、尺寸、质量、输出、比较和成本设置。 |
| `voice` | `notification_profile`、`asset_profile`、`output_dir`、`auto_notify_after_sec`、`max_tts_chars`、`max_stt_minutes` | 技能默认值；请参阅[内容和研究工作流](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) | Voicebox 配置档、输出和长度设置。 |
| `hwp` | `format`、`version.*`、`output.*` | 技能默认值；请参阅[内容和研究工作流](/docs/guide/content-and-research#extract-hwp-family-documents) | Kordoc 格式、版本通道和输出位置。 |
| `pdf` | `format`、`image_output`、`image_format`、`use_struct_tree`、`ocr.*`、`output.*` | 技能默认值；请参阅[内容和研究工作流](/docs/guide/content-and-research#extract-pdf-content) | PDF 提取、OCR、图像和覆盖设置。 |
| `scholar` | `base_url` | 技能默认值；请参阅[内容和研究工作流](/docs/guide/content-and-research#search-and-validate-scholarly-material) | Knows 端点主机；协议形状仍由技能拥有。 |
| `diagram` | `engine`、`explain_sidecar`、`archify.*` | 技能默认值；请参阅[图表引擎](/docs/guide/diagram-engine) | Mermaid/archify 选择和托管引擎设置。 |
| `market` | `managed`、`channel`、`check_interval_min`、`path`、`python`、`save_dir` | 技能默认值；请参阅[市场研究](/docs/guide/market-research) | 托管 last30days 引擎解析和结果位置。 |

随附模板还包含由消费者拥有的区块。它们当前读取的键和默认值如下：

| 区块 | 消费者读取的键 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`、`max_age_days` | 保留 100 个会话；清理早于 50 天的 Serena 产物；`0` 禁用按年龄清理 | `oma memory gc` 的默认值；命令标志会覆盖它们。 |
| `serena_reaper` | `enabled`、`policy: lru\|idle`、`keep_warm`、`idle_minutes`、`grace_seconds` | `false`、`lru`、`2`、`10`、`90` | 控制定时 Serena LSP 清理路径。交互式 `oma serena reap` 仍需显式运行；计划的 quiet 运行需要选择启用。 |
| `refactor_guard` | `enabled`、`max_lines` | `false`、`500` | 选择启用停止钩子的行数预算，并设置每个文件的代码预算。 |
| `scm` | `conventional_commits`、`branching_strategy`、`require_pr_for_default_branch`、`co_author.*`、`forbidden_patterns`、`allowed_exceptions` | 随附模板启用约定式提交和 PR 保护，并提供模板的共同作者及文件名列表 | 管理 SCM 技能、提交钩子和密钥模式保护。在启用共同作者尾注前，用你自己的值替换模板身份值。 |

这些区块通过配置透传接受，并由相应功能或工作流解释。`serena_reaper` 解析上面所示的 snake_case 键，即使旧模板注释使用 camelCase 名称。添加嵌套键前请阅读对应功能指南；此页不会凭空添加所列消费者之外的键。

## 精确的嵌套对象

### Honcho 语义内存 {#honcho-semantic-memory}

`honcho` 映射由 `HonchoConfigSchema` 验证。键名和有效的运行时行为如下：

| 键 | 形状 | 有效默认值或限制 |
| --- | --- | --- |
| `base_url` | URL 字符串 | `https://api.honcho.dev`；除 loopback HTTP 外必须使用 HTTPS。凭据、查询字符串和片段会被拒绝。 |
| `workspace_id` | 1 至 128 个字母、数字、`_` 或 `-` | 提供方启动时必填。没有已保存值时，交互式安装器写入 `oma`。 |
| `project_id` | 去除首尾空格的字符串，长度 1 至 128 | 省略表示当前 OMA 项目根目录。 |
| `api_key_env` | 环境变量名称 | `HONCHO_API_KEY`。非 loopback 端点需要此变量或 `api_key_vault`。 |
| `api_key_vault` | 保管库键名（`A-Z`、`a-z`、数字、`.`、`_`、`-`；长度 1 至 64） | 省略表示不查找保管库。如果两个凭据引用都存在，先使用环境值。 |
| `timeout_ms` | 整数 `100` 至 `30000` | `5000` 毫秒。状态或内存请求共用同一个截止时间。 |
| `max_results` | 整数 `1` 至 `50` | `8` 个召回结果。 |
| `max_tokens` | 整数 `128` 至 `16000` | 召回内容和推断上下文使用 `2000` 个 UTF-8 字节。 |
| `recall_mode` | `messages` 或 `hybrid` | 新选择由安装器写入 `messages`。省略时，除消息召回外还会启用提供方的表示请求。 |

例如，远程工作区可以使用密钥引用，而不把密钥放进 YAML：

```yaml
providers:
  semantic_memory: honcho
honcho:
  base_url: https://honcho.example.com
  workspace_id: team
  project_id: product-docs
  api_key_vault: honcho-team
  timeout_ms: 5000
  max_results: 8
  max_tokens: 2000
  recall_mode: messages
```

在交互式或非交互式设置 Honcho 且没有已保存 URL 时，安装器使用 `http://127.0.0.1:8000` 作为初始 URL。这个安装器种子值与上面的提供方运行时回退值不同。选择提供方后使用 `oma memory status`；缺少工作区或凭据时会报告不可用，而不是默默切换到另一个内存提供方。

### 会话配额上限 {#session-quota-caps}

`session.quota_cap` 是部分映射。每个字段都可省略；省略的字段不会限制对应维度。值必须是非负整数，`per_vendor` 将供应商名称映射到 token 预算：

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

上限加载器依次检查用户 CUE 层、用户 YAML 层，然后检查随附默认值回退。在生成子进程前，OMA 按 `spawn_count`、总 `tokens`、`per_vendor` 的顺序检查。使用量大于或等于上限时就达到限制；OMA 会阻止下一次生成，并报告先达到的维度。使用量是 token 记账，不是计费估算。

### 供应商选择和调度元数据 {#vendor-selection-and-dispatch-metadata}

在用户拥有的 `.agents/oma-config.yaml` 中，`vendors` 是所选集成 ID 的列表：

```yaml
vendors:
  - claude
  - codex
  - pi
```

缺少列表或列表为空时，会选择 OMA 可链接供应商注册表中的全部 ID。该列表控制安装/更新投影，不是按供应商划分的命令能力映射。

随附的 `.agents/oma-config.cue` 模式还允许包含 `command`、`prompt_flag`、`model_flag`、`default_model` 和 `thinking_flag` 字段的 `vendors.pi` 对象。该区块是 CUE 模板中的类型化回退形状；当前智能体调度路径从下方托管的编排注册表解析能力字段，因此不要用 `vendors.pi` 替代 YAML 选择列表。

托管的 `.agents/skills/oma-orchestration/config/cli-config.yaml` 包含该能力映射。每个 `vendors.<id>` 条目支持以下字段：

| 字段 | 形状 | 用途 |
| --- | --- | --- |
| `command` | 可执行字符串 | 要运行的二进制文件。 |
| `subcommand` | 字符串 | 插入选项之前的子命令，例如 `codex exec`。 |
| `prompt_flag` | 字符串，或使用 `none`/`null` 禁用 | 与提示配对的标志；禁用时使用位置提示。 |
| `auto_approve_flag` | 字符串 | 可写运行的供应商权限绕过标志。只读模式下抑制。 |
| `read_only_flag` | 字符串 | 供应商只读标志。缺少时，构建器使用供应商专属回退或发出警告。 |
| `output_format_flag` | 字符串 | 选择机器可读输出的标志。 |
| `output_format` | 字符串 | 与 `output_format_flag` 配对的值。 |
| `model_flag` | 字符串 | 与 `default_model` 配对的标志。 |
| `default_model` | 字符串 | 解析出的计划未提供模型时使用的模型值。 |
| `isolation_env` | `NAME=value` 字符串 | 可选的环境赋值；不安全的加载器/解释器键会被拒绝，`$$` 会展开为当前进程 ID。 |
| `isolation_flags` | shell 风格的参数字符串 | 拆分为 argv token 的额外隔离参数。 |

托管能力文件由 OMA 更新重新生成。模型选择请编辑用户拥有的 `agents`、`models` 和 `custom_presets` 键；只有在维护托管编排数据或调试供应商适配器时才使用此能力映射。旧模板中注释的 `vendors.pi` 对象属于回退元数据，不能替代所选供应商列表或托管调度注册表。

## 常见修改

为项目选择固定预设，同时将个人覆盖保留在本地：

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed

# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-5.4
    effort: high
```

明确选择代码智能和内存提供方：

```yaml
providers:
  code_intelligence: serena
  code_intelligence_guard: block   # off → advisory primer only, no tool denial
  semantic_memory: none
```

在更新期间保持浏览器配置不变，或有意移除它：

```yaml
# Omit mcp.devtools_browsers to leave existing browser entries unchanged.
mcp:
  devtools_browsers: []
```

## 更新和所有权规则

`.agents/oma-config.yaml` 由用户拥有。`oma update` 会保留现有内容，并可能在 `# Added by oma update` 标记下追加新发布的顶层模板键。`oma update --force` 可以替换用户配置、MCP 配置和 stack 目录；只有在确实要重置这些自定义内容时才使用它。本地覆盖文件仍是存放机器专属值的私有位置。

不要将 API 密钥放进此文件。使用 `api_key_env` 或 `api_key_vault` 字段，并将实际凭据保留在引用的密钥存储或环境中。

有关模型解析详情，请参阅[按智能体配置模型](/docs/guide/per-agent-models)。有关层语义和失败行为，请参阅[oma-config 语义](/docs/guide/oma-config-semantics)。
