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

## 哪个文件优先 {#which-file-wins}

加载器先从 `$OMA_HOME/.agents/`（默认为 `~/.oma/.agents/`）读取全局默认值，然后从当前目录向上遍历，在最近的项目 `.agents/` 目录处停止。在每个选定的目录中：

1. `oma-config.yaml` 提供共享值。
2. `oma-config.cue` 存在且有效时，会覆盖它设置的每个键；它未设置的 YAML 键保持不变。如果无法评估 CUE 文件，OMA 会发出警告并只使用 YAML 文件。
3. 将一个本地文件（`oma-config.local.cue` 或 `.local.yaml`）合并到共享结果之上。

项目的共享/本地结果会覆盖全局的共享/本地结果。
设置了 `OMA_MODEL_PRESET` 时，它会在所有文件层之后覆盖 `model_preset`。
完整顺序、流程图和故障排查请参阅
[配置加载](/docs/guide/oma-config-semantics#precedence-table)。

映射会递归合并。数组、标量和 `null` 会替换共享值。两个本地格式同时存在是错误。格式错误的本地文件会导致失败，这样私有覆盖不会被悄悄忽略。

不同祖先目录中的项目根不会合并。即使最近的项目 `.agents/` 为空，也仍会确立该边界。已退役的 `~/.agents/` 安装只作为迁移输入，不会被当作项目回退读取。全局默认值不会改变当前项目的身份或内存范围。

## 顶层键 {#top-level-keys}

以下键由当前运行时模式或随 OMA 发布的消费者读取。标记为 sparse 的键是有意的部分映射：省略嵌套值即可保留代码默认值。

| 键 | 类型或接受的值 | 缺省时的默认值 | 用途 |
| --- | --- | --- | --- |
| `language` | string | `en` | 工作流和技能使用的响应语言。安装会保留已有值，或在不询问的情况下按系统语言初始化。 |
| `translation_voice` | `formal`、`balanced`、`interpreter` | 随附模板中为 `balanced` | `oma-translation` 的语气选择。 |
| `date_format` | `ISO`、`US`、`EU` | 随附模板中为 `ISO`；省略时不留下显式覆盖 | 日期格式偏好。 |
| `timezone` | IANA 名称 | system time zone | 计划任务和报告使用的日期。 |
| `auto_update_cli` | boolean | `true` | 后台 CLI 版本检查；使用 `false` 退出。 |
| `telemetry` | boolean | `false` | 安装、更新和链接协调时使用的供应商遥测选择。 |
| `model_preset` | 非空字符串 | 新模板中为 `auto` | 内置或自定义模型预设。`OMA_MODEL_PRESET` 可为单个进程覆盖它。 |
| `free` | `base_url`、`api_key_env`、`model` | unset | `providers.free` 的旧写法（其中 `model` 即 `default_model`）；仍会被读取，`oma update` 会把它移走。 |
| `providers` | `docs`、`web`、`code_intelligence`、`code_intelligence_guard`、`semantic_memory`；`brave`、`exa`、`honcho` 凭据区块；其他任意 `<name>` → LLM 提供方对象 | `context7`、`native`、`serena`、`block`、`agentmemory`；无凭据或 LLM 提供方 | 选择文档、搜索、代码智能和语义内存提供方，保存它们的凭据引用，并声明智能体可以经其路由的 LLM 端点。请参阅[提供方](#providers)。 |
| `brave`、`exa`、`honcho` | 与 `providers` 下相同 | unset | `providers.brave`、`providers.exa` 和 `providers.honcho` 的旧顶层写法；仍会被读取，`oma update` 会把它们移走。 |
| `agents` | 智能体 ID → `model`，可选的 `effort`、`thinking`、`memory`；`default` → `cli`、`effort`、`thinking`、`memory` | 预设解析；`default.cli` 回退为 `claude`（提供方路由时为 `codex`） | 在所选预设之上应用的每个智能体覆盖。`effort` 为 `none`、`low`、`medium`、`high` 或 `xhigh`；`memory` 为 `user`、`project` 或 `local`。`agents.default` 为每个未自行设置这些字段的角色填入它们，它的 `cli`（`claude`、`codex`、`cursor`、`antigravity`、`qwen`、`grok`、`kimi`、`kiro`、`opencode`、`pi` 之一）就是没有其他方式选定供应商时使用的供应商：`auto` 下未检测到运行时，或提供方路由在 `--vendor`、`OMA_RUNTIME_VENDOR` 和检测到的运行时之后。`<provider>/<model-id>` 形式的模型会把该角色路由到对应的 LLM 提供方。 |
| `models` | 模型 slug → CLI 映射 | unset | 支持的供应商 CLI 的内联模型定义。 |
| `custom_presets` | 预设 → description，可选的 `extends`、`agent_defaults` | unset | 用户定义的预设；`extends` 可以继承内置预设。 |
| `vendors` | 所选供应商 ID 的 `string[]`（YAML 和 CUE） | 缺省时：`oma link` 使用所有可链接供应商，`oma update` 使用项目目录已存在的供应商 | 选择 `oma install` 和 `oma update` 投影哪些供应商集成。调度能力映射位于托管编排配置中，请参阅[供应商选择和调度元数据](#vendor-selection-and-dispatch-metadata)。 |
| `default_cli` | 供应商 ID | unset | `agents.default.cli` 的旧写法；仍会被读取，`oma update` 会把它移走。 |
| `session.quota_cap` | `tokens`、`spawn_count`、`per_vendor: map<string, integer>` | 每个省略的维度都不设上限 | 在下一次智能体生成前检查已记录的 token 用量和生成次数限制；请参阅[会话配额上限](#session-quota-caps)。 |
| `diagnostic_feedback` | `enabled`、`host_diagnostics`、`timeout_ms` | 支持的终端宿主自动启用，`false`，`1400` | 比较原生文件编辑前后的 Serena 诊断；请参阅[诊断反馈](#diagnostic-feedback)。 |
| `docs` | `auto_verify`、`check_urls`、`exclude` | `false`、`true`、`[]` | `oma docs verify` 的行为和扫描排除项。 |
| `serena` | `mode: bridge\|stdio`、`auto_update` | `bridge`、`true` | Serena MCP 传输和更新行为。 |
| `mcp.devtools_browsers` | `aside`、`chrome`、`firefox` 或 `[]` | unset = 保留现有设置 | 协调时选择浏览器 DevTools MCP。明确的空列表会移除所选浏览器条目。 |
| `video` | 技能拥有的 sparse 映射 | 技能默认值；请参阅[视频生成](/docs/guide/video-generation) | 视频路由、供应商顺序、输出、成本、限制和 HyperFrames 刷新设置。 |
| `image` | 技能拥有的 sparse 映射 | 技能默认值；请参阅[图像生成](/docs/guide/image-generation) | 图像供应商、尺寸、质量、输出、比较和成本设置。 |
| `voice` | `backend`、`notification_profile`、`asset_profile`、`output_dir`、`auto_notify_after_sec`、`max_tts_chars`、`max_stt_minutes` | `backend: auto`；其余键为技能默认值；请参阅[内容和研究工作流](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) | 语音后端（`auto`、`voicebox`、`voicestudio`；`oma video` 旁白也使用此设置）、配置档、输出和长度设置。 |
| `hwp` | `format`、`version.*`、`output.*` | 技能默认值；请参阅[内容和研究工作流](/docs/guide/content-and-research#extract-hwp-family-documents) | Kordoc 格式、版本通道和输出位置。 |
| `pdf` | `format`、`image_output`、`image_format`、`use_struct_tree`、`ocr.*`、`output.*` | 技能默认值；请参阅[内容和研究工作流](/docs/guide/content-and-research#extract-pdf-content) | PDF 提取、OCR、图像和覆盖设置。 |
| `scholar` | `base_url` | 技能默认值；请参阅[内容和研究工作流](/docs/guide/content-and-research#search-and-validate-scholarly-material) | Knows 端点主机；协议形状仍由技能拥有。 |
| `diagram` | `engine`、`explain_sidecar`、`archify.path`、`archify.quality`、`archify.open` | 技能默认值；请参阅[图表引擎](/docs/guide/diagram-engine) | Mermaid/archify 选择，以及 archify 的固定路径和质量设置。已退役的 `archify.managed`、`archify.channel` 和 `archify.check_interval_min` 会被忽略并给出提示，`oma update` 会移除它们。 |
| `market` | `path`、`python`、`save_dir` | 技能默认值；请参阅[市场研究](/docs/guide/market-research) | last30days 引擎的固定路径、解释器和结果位置。已退役的 `managed`、`channel` 和 `check_interval_min` 会被忽略并给出提示，`oma update` 会移除它们。 |

随附模板还包含由消费者拥有的区块。它们当前读取的键和默认值如下：

| 区块 | 消费者读取的键 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`、`max_age_days` | 保留 100 个会话；清理早于 50 天的 Serena 产物；`0` 禁用按年龄清理 | `oma memory gc` 的默认值；命令标志会覆盖它们。 |
| `serena_reaper` | `enabled`、`policy: lru\|idle`、`keep_warm`、`idle_minutes`、`grace_seconds` | `false`、`lru`、`2`、`10`、`90` | 控制定时 Serena LSP 清理路径。交互式 `oma serena reap` 仍需显式运行；计划的 quiet 运行需要选择启用。 |
| `refactor_guard` | `enabled`、`max_lines` | `false`、`500` | 选择启用停止钩子的行数预算，并设置每个文件的代码预算。 |
| `scm` | `conventional_commits`、`branching_strategy`、`require_pr_for_default_branch`、`co_author.*`、`forbidden_patterns`、`allowed_exceptions` | 随附模板启用约定式提交和 PR 保护，并提供模板的共同作者及文件名列表 | 管理 SCM 技能、提交钩子和密钥模式保护。在启用共同作者尾注前，用你自己的值替换模板身份值。 |

这些区块通过配置透传接受，并由相应功能或工作流解释。`serena_reaper` 解析器只读取上面所示的 snake_case 键，并忽略 camelCase。随附模板仍显示 camelCase（`keepWarm`、`idleMinutes`、`graceSeconds`），而随附的 CUE 模式会在其模式区块内拒绝 snake_case 键（`field not allowed`），因此请在 `oma-config.yaml` 或本地 YAML 覆盖文件中设置它们。添加嵌套键前请阅读对应功能指南；此页不会凭空添加所列消费者之外的键。

## 精确的嵌套对象 {#exact-nested-objects}

### 提供方 {#providers}

`providers` 为每项能力选择一个提供方：

| 键 | 接受的值 | 默认值 |
| --- | --- | --- |
| `docs` | `context7` | `context7` |
| `web` | 搜索提供方 ID（小写字母、数字、`_`、`-`），例如 `native` 或 `brave` | `native` |
| `code_intelligence` | `serena`、`gortex` | `serena` |
| `code_intelligence_guard` | `block`、`off` | `block` |
| `semantic_memory` | `agentmemory`、`honcho`、`none` | `agentmemory` |

三个保留键存放选择器的凭据或连接区块：`providers.brave` 和 `providers.exa`（`api_key_env` 或 `api_key_vault`）用于 `web`，`providers.honcho` 用于 `semantic_memory`（见[Honcho 语义内存](#honcho-semantic-memory)）。它们的旧顶层写法仍会被读取。

`providers` 下的其他任意键都是 **LLM 提供方**：兼容 OpenAI 或 Anthropic 的端点，`oma agent spawn` 可以让子 CLI 经它路由，而不是使用该 CLI 自己的账户。值是对象：

| 字段 | 接受的值 | 是否必填 | 用途 |
| --- | --- | --- | --- |
| `base_url` | 不含凭据、查询或片段的绝对 HTTP(S) URL；缺少时会追加 `/v1` | 是 | 端点。 |
| `api_key_env` | 环境变量名称 | 是（`free` 除外，它默认使用 `FREELLM_API_KEY`） | 读取密钥的位置；文件中从不存放密钥。同样，只有 `free` 可以省略 `base_url`（`http://127.0.0.1:31415/v1`）。 |
| `transport` | `chat_completions`（默认）、`responses`、`anthropic_messages`、`multi` | 否 | 端点使用的线路协议。它决定子 CLI：`chat_completions` → Codex 或 Qwen，`responses` → Codex，`anthropic_messages` → Claude，`multi`（同时提供这三种协议的网关）→ Codex、Claude 或 Qwen。 |
| `default_model` | 模型 ID | 当该提供方被用作 `model_preset` 时 | `model_preset: <name>` 下每个角色使用的模型。 |

```yaml
providers:
  code_intelligence: serena
  exaone:
    base_url: https://api.exaone.ai/v1
    api_key_env: EXAONE_API_KEY
    transport: chat_completions
    default_model: k-exaone_v2.5
agents:
  default: { effort: medium }
  backend: { model: exaone/k-exaone_v2.5 }
```

`free` 是本地 FreeLLMAPI 网关的内置提供方：每个字段都有默认值，`FREELLM_BASE_URL` 和 `FREELLM_MODEL` 会覆盖文件中的值，旧的顶层 `free:` 块仍会被读取（其中的 `model` 在这里是 `default_model`）；见[自定义 LLM 提供方](/docs/guide/per-agent-models#custom-llm-providers)。

`code_intelligence_guard` 控制 PreToolUse 搜索保护。限定在已确认的提供方排除项或项目之外路径的原生搜索，无需绕过即可放行。该保护会读取 Serena 的排除项和已启用的 gitignore 规则，或 Gortex 的排除列表；它不会根据目录名推断依赖项。

该钩子不会提及 `OMA_CI_ALLOW_NATIVE`。以 `OMA_CI_ALLOW_NATIVE=1` 为前缀的 shell 搜索，仅对项目之外的资源或保护未能识别的被忽略路径绕过保护，对项目源代码无效。

### Honcho 语义内存 {#honcho-semantic-memory}

`providers.honcho` 映射（旧的顶层 `honcho` 仍会被读取）由 `HonchoConfigSchema` 验证。键名和有效的运行时行为如下：

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

`session.quota_cap` 是部分映射。每个字段都可省略；省略的字段不会限制对应维度。值必须是不带 `_` 分隔符的非负整数（YAML 会把 `2_000_000` 读作字符串，导致该维度不设上限）。`per_vendor` 将调度供应商 ID（例如 `claude`、`codex` 或 `antigravity`）映射到 token 预算：

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

上限加载器依次检查用户 CUE 层、用户 YAML 层，然后检查随附默认值回退。在生成子进程前，OMA 按 `spawn_count`、总 `tokens`、`per_vendor` 的顺序检查。使用量大于或等于上限时就达到限制；OMA 会阻止下一次生成，并报告先达到的维度。

OMA 在一次运行开始时预留输入 token 估算。运行结束后，如果有受支持的原生记录，已记录的输入、缓存和输出用量会替换该估算，且不再另计一次生成。否则该记录会明确保持为按提示长度得出的估算。原生子智能体不在捕获范围内时，观察到的根会话用量会标为部分数据。因此 token 上限取决于能拿到的观测；它们不会中断已经在运行的子进程，也不保证计费上限。`spawn_count` 是最可预测的限制。

### 会话执行预算 {#session-execution-budget}

设置 `session.execution`，为 OMA 管理的 CLI 调度和验证限制经过的时间。使用正数 `timeout_seconds`，或带时区的 ISO 8601 `deadline`：

```yaml
session:
  execution:
    timeout_seconds: 1800
```

`oma agent spawn`、`parallel`、`review`、`resume`、`begin` 和 `verify` 命令接受 `--timeout-seconds` 或 `--deadline`。准备、执行、重试和检查共用一个绝对截止时间。已配置、继承或已持久化的截止时间里，最早的那个生效；重试和恢复不会重置时钟。省略 `session.execution` 和这两个标志时，该维度不设上限，除非父进程已经提供截止时间。

执行历史保留在 `.agents/state/executions/` 下。取消或超时会阻止该会话继续执行，并记录停止原因。这些控制只覆盖经托管 CLI 路径启动的进程。原生供应商智能体和任意 shell 任务需要宿主自己的取消机制；CPU、内存和存储上限需要提供方支持。

托管的子 CLI 会继承 `OMA_EXECUTION_DEADLINE`、`OMA_EXECUTION_STATE` 和 `OMA_EXECUTION_ID`。状态路径和执行 ID 构成一条绑定的继承引用；外来、格式错误或不匹配的账本会在写入前被拒绝。包装 OMA 子进程时，转发完整的继承环境。设置这些变量不会让无关程序也执行截止时间。

取消时，OMA 会停止准入，并尝试在限定范围内终止自己拥有的计算。日志、结果、工作树和已登记的资源元数据都会保留。删除产物或外部资源需要提出请求，或有明确的保留策略。未能完成的终止会保持可见，而不会被报告为已经完全清理。

### 诊断反馈 {#diagnostic-feedback}

在受支持的终端宿主上，OMA 比较原生文件编辑前后的错误和警告，并把新报告的诊断注入下一次工具反馈。当 Serena 是实际生效的代码智能提供方时（未指定提供方时的默认值），它使用已经在运行、且匹配当前项目的 Serena HTTP 守护进程。它从不启动守护进程，也不运行构建。Serena 自己的符号编辑不参与比较，因为它们已经提供诊断。

```yaml
diagnostic_feedback:
  enabled: true
  host_diagnostics: false
  timeout_ms: 1400
```

设置 `enabled: false` 会关闭此反馈。宿主已经提供编辑诊断时，设置 `host_diagnostics: true`；Cursor 和 Antigravity 会自动跳过。项目本地覆盖遵循常规配置层。环境变量覆盖为 `OMA_DIAGNOSTIC_FEEDBACK`、`OMA_HOST_DIAGNOSTICS` 和 `OMA_DIAGNOSTIC_FEEDBACK_TIMEOUT_MS`。

该超时适用于每一次完整的编辑前或编辑后钩子，范围是 100 到 10,000 毫秒。较慢的提供方可以使用更大的超时。查找失败或超时会跳过反馈并开始一段短冷却；这不算一次干净的诊断结果。缺少或过期的编辑前基线也会跳过反馈。每个钩子最多检查三个文件，最多报告八条新的错误或警告。

### 供应商选择和调度元数据 {#vendor-selection-and-dispatch-metadata}

在用户拥有的 `.agents/oma-config.yaml` 中，`vendors` 是所选集成 ID 的列表：

```yaml
vendors:
  - claude
  - codex
  - pi
```

列表会精确选择其中的供应商，`vendors: []` 则不选择任何供应商。没有 `vendors` 键时，`oma link` 以 OMA 可链接供应商注册表中的每个供应商为目标，而 `oma update` 只以项目目录已存在的供应商为目标。该列表控制安装/更新投影，不是按供应商划分的命令能力映射。

随附的 `.agents/oma-config.cue` 模式将 `vendors` 定义为同样的列表（`[...string]`）。旧版 CUE 模板将其定义为没有任何代码读取的 `vendors.pi` 对象（`#VendorsConfig`）：智能体调度从下方托管的编排注册表解析能力字段。如果你的 `oma-config.cue` 仍声明 `vendors?: #VendorsConfig`，请先改为 `vendors?: [...string]`，再在其中放入选择列表。

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

## 常见修改 {#common-changes}

为项目选择固定预设，同时将个人覆盖保留在本地。

**共享文件**（提交到仓库）：

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed
```

**本地覆盖文件**（被 Git 忽略）：

```yaml
# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-6.1-terra
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

## 更新和所有权规则 {#update-and-ownership-rules}

`.agents/oma-config.yaml` 由用户拥有。`oma update` 会保留现有内容，并可能在 `# Added by oma update` 标记下追加新发布的顶层模板键。`oma update --force` 可以替换用户配置、MCP 配置和 stack 目录；只有在确实要重置这些自定义内容时才使用它。本地覆盖文件仍是存放机器专属值的私有位置。

不要将 API 密钥放进此文件。使用 `api_key_env` 或 `api_key_vault` 字段，并将实际凭据保留在引用的密钥存储或环境中。

有关模型解析详情，请参阅[按智能体配置模型](/docs/guide/per-agent-models)。有关层语义和失败行为，请参阅[oma-config 语义](/docs/guide/oma-config-semantics)。
