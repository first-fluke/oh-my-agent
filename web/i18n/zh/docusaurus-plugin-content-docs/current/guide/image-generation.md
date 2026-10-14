---
title: "指南：图像生成"
sidebar_label: 图像生成
description: oh-my-agent 图像生成完整指南，涵盖通过 Codex（gpt-image-2）、Pollinations（flux/zimage，免费）和 Gemini Code Assist 上的 Antigravity 进行多供应商分发，以及参考图像、成本护栏、输出布局、故障排查和共享调用模式。
---

# 图像生成

`oma-image` 是 oh-my-agent 的多供应商图像路由器。它根据自然语言提示生成图像，分发到你已认证的供应商 CLI，并在输出旁写入清单，记录审计或重复运行所需的输入和供应商决策。实时供应商输出仍可能变化。

当出现“generate an image”“create an image”“make a picture”“draw me …”或“image of …”等说法，提到供应商名称（`gpt-image`、`nano-banana`、`pollinations`），或其他技能需要图像作为副产物（hero 图、缩略图、产品照片）时，该技能会激活。

> **TL;DR** 你需要以下之一：`POLLINATIONS_API_KEY`（免费的 `flux` / `zimage`）、`codex login`（使用 ChatGPT 套餐中的 gpt-image-2），或已登录的 `agy`。先运行 `oma image doctor`，再运行 `oma image generate "<prompt>" --vendor pollinations`。图像和 `manifest.json` 会写入 `.agents/results/images/{timestamp}-{shortid}/`。

---

## 何时使用 {#when-to-use}

- 生成图像、插画、产品照片、概念艺术、hero 或落地页视觉素材
- 使用同一提示在多个模型间并排比较（`--vendor all`）
- 在任何加载 oma 技能的运行时（Claude Code、Codex CLI、Antigravity、Cursor 等）中生产素材
- 让其他技能（设计、营销、文档）将图像管线作为共享基础设施调用

## 何时不使用 {#when-not-to-use}

- 编辑或修饰已有图像（超出范围，使用专用工具）
- 生成视频或音频（超出范围）
- 从结构化数据生成内联 SVG 或矢量合成（使用模板技能）
- 简单调整尺寸或转换格式（使用图像库，不使用生成管线）

---

## 供应商概览 {#vendors-at-a-glance}

该技能以 CLI 为先：当供应商原生 CLI 能返回原始图像字节时，优先使用子进程路径，而不是直接 API key。

| 供应商 | 策略 | 模型 | 触发条件 | 成本 |
|---|---|---|---|---|
| `pollinations` | 直接 HTTP | 免费：`flux`、`zimage`。需积分：`qwen-image`、`wan-image`、`gpt-image-2`、`klein`、`kontext`、`gptimage`、`gptimage-large` | 设置 `POLLINATIONS_API_KEY`（可在 [enter.pollinations.ai](https://enter.pollinations.ai) 免费注册） | `flux` / `zimage` 免费 |
| `codex` | 通过 `codex exec` 以 CLI 为先（ChatGPT OAuth） | `gpt-image-2` | `codex login`（不需要 API key） | 计入 ChatGPT 套餐 |
| `antigravity` | 通过 Gemini Code Assist 订阅使用 `agy` CLI | 模型由 `agy` 内部选择 | 已安装并登录 `agy` | 通过 Code Assist 不收取单图费用 |

`--vendor` 如何为一次运行选择供应商：

| `--vendor` | 实际运行的供应商 | 输出目录 | 何时以退出码 5 结束 |
|---|---|---|---|
| `auto`（默认） | 所有通过健康检查的供应商 | 运行两个及以上时为 `{timestamp}-{shortid}-compare/` | 没有健康的供应商 |
| `all` | 所有已启用的供应商 | 运行两个及以上时为 `{timestamp}-{shortid}-compare/` | 任一请求的供应商不健康 |
| `codex`、`pollinations` 或 `antigravity` | 该供应商 | `{timestamp}-{shortid}/` | 该供应商不健康 |

内置供应商模式为 `auto`：它会并行运行**所有**通过健康检查的供应商。传入 `--vendor pollinations` 可以只走免费路径。Pollinations 的 `flux` 和 `zimage` 模型每张图免费，但仍需要 `POLLINATIONS_API_KEY`；Codex 和 Antigravity 需要各自登录。付费估算仍受成本确认护栏约束。

---

## 快速开始 {#quick-start}

第一次生成前，检查哪个供应商就绪，并在支持的路径中完成一个认证：

```bash
oma image doctor

# Pollinations: create a free account and export its key.
export POLLINATIONS_API_KEY="<pollinations-key>"

# Or authenticate an alternative provider instead.
codex login
# Sign in to Gemini Code Assist for `agy` when using --vendor antigravity.
```

```bash
# Runs every vendor whose health check passes; cost and auth depend on those vendors.
oma image generate "minimalist sunrise over mountains"

# Stay on the free Pollinations path.
oma image generate "minimalist sunrise over mountains" --vendor pollinations

# Run all configured vendors; every selected vendor must be healthy or the command stops.
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# List registered vendors and their default model (supported models: oma image doctor)
oma image vendor list
```

文本模式下运行成功时，会打印类似下面的进度（路径仅作示意）：

```text
[oma image] using: pollinations
[oma image] pollinations generating... 5s
[oma image] pollinations ok (7.4s) -> /path/to/project/.agents/results/images/20261014-101500-ab12cd/pollinations-flux-ab12cd.jpg
[oma image] manifest: /path/to/project/.agents/results/images/20261014-101500-ab12cd/manifest.json
```

---

## 用作技能 {#use-as-a-skill}

`oma-image` 是会从自然语言自动激活的技能，也可以显式调用。共有三个入口。

### 1. 自然语言（自动激活） {#1-natural-language-auto-activation}

在任何加载 oma 技能的运行时（Claude Code、Codex CLI、Antigravity、Cursor 等）中直接描述图像即可。“generate an image”“make a picture”“draw me …”或“image of …”等说法会激活该技能；按描述匹配技能的运行时，也可能在“concept art”或“hero shot”这类请求中选中它。

不需要记住 CLI 标志。用自然语言描述，技能会把它映射到正确选项：

| 你说 | 技能推断 |
|---|---|
| “使用 codex”/“使用 gpt-image-2”/“免费 flux” | `--vendor codex` / `--vendor pollinations` |
| “跨供应商比较”/“并排比较” | `--vendor all` |
| “竖版”/“横版”/“1024×1536” | `--size 1024x1536` / `--size 1536x1024` |
| “高质量”/“草稿” | `--quality high` / `--quality low` |
| “三个变体”/“给我 3 个” | `-n 3` |
| “保存到 ./hero”/“输出到 docs/assets” | `--output-dir <dir>` |
| 附加图像并说“改成夜景” | `-r <attached path>` |
| “只估算成本”/“试运行” | `--dry-run` |

示例：

> “为落地页 hero 生成一张极简山间日出图，横版，高质量。”
> “在所有供应商之间比较一张陶瓷马克杯产品照，每家生成三个变体。”
> “使用 codex 把这张水獭照片变成戏剧化的夜景。”（附带参考图）

智能体会[解析需求简报](#clarification-protocol)，用默认值补全空缺，然后使用推断出的标志调用 `oma image generate`。想精确控制每个标志值时，使用斜杠命令。

### 2. 显式斜杠命令 {#2-explicit-slash-command}

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --output-dir ./hero "minimalist dashboard hero illustration"
```

所有 CLI 标志（`--vendor`、`-n`、`--size`、`-r`、`--dry-run` 等）在斜杠命令中都有效，并会转发到同一个 `oma image generate` 管线。

### 3. 来自其他技能（共享基础设施） {#3-from-another-skill-shared-infrastructure}

其他技能（设计、营销、文档）将管线作为共享基础设施调用，并使用 JSON 输出：

```bash
oma image generate "<prompt>" --output json
```

使用 `--output json` 时，stdout 是一个 JSON 对象 `{exitCode, manifestPath, runs}`；`runs` 中的每一项报告其供应商、状态和输出文件。完整记录请读取 `manifestPath`。`--dry-run` 会在计划前打印文本头 `[oma image] dry-run plan:`，解析时请跳过这一行。

---

## CLI 参考 {#cli-reference}

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|antigravity|all]
  [-n 1..5]
  [--size WxH|auto]
  [--quality low|medium|high|auto]
  [--output-dir <dir>] [--allow-external-output]
  [-r <path>]...
  [--timeout <duration>] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--output text|json]

oma image doctor
oma image vendor list
```

### 关键标志 {#key-flags}

| 标志 | 用途 |
|---|---|
| `--vendor <name>` | `auto`、`pollinations`、`codex`、`antigravity` 或 `all`。使用 `all` 时，每个请求的供应商都必须健康（严格模式）。 |
| `-n, --count <n>` | 每个供应商的图像数量，1–5（受墙钟时间限制）。默认 1。 |
| `--size <size>` | `WxH`，每条边为 16 的倍数且介于 16 到 3840 之间，宽高比介于 1:3 到 3:1 之间（例如 `512x512`、`1024x1024`、`1024x1536`、`1536x1024`），或 `auto`。默认 `1024x1024`。 |
| `--quality <level>` | `low`、`medium`、`high` 或 `auto`（默认）。 |
| `--output-dir <dir>` | 输出目录；文件直接写入其中。默认为 `.agents/results/images/{timestamp}-{shortid}/`。`$PWD` 之外的路径需要 `--allow-external-output`。 |
| `--allow-external-output` | 允许输出目录位于 `$PWD` 之外。 |
| `--model <name>` | 覆盖本次运行中**每个**供应商的模型，因此应与单个 `--vendor` 搭配使用（例如 `--vendor pollinations --model zimage`）。`antigravity` 会忽略此项，因为模型由 `agy` 选择。 |
| `-r, --reference <path>` | 最多 10 张参考图像（PNG/JPEG/GIF/WebP，每张不超过 5 MB）。可重复指定或用逗号分隔。`codex` 和 `antigravity` 支持，`pollinations` 拒绝。 |
| `-y, --yes` | 对估算至少为 `$0.20` 的运行跳过成本确认提示。也可通过 `OMA_IMAGE_YES=1` 设置。 |
| `--no-prompt-in-manifest` | 在 `manifest.json` 中存储提示的 SHA-256，而不是原始文本。 |
| `--dry-run` | 打印计划和成本估算，不产生费用。 |
| `--output text\|json` | CLI 输出格式。JSON 是其他技能的集成接口。 |
| `--timeout <duration>` | 每张图的超时时间。默认 180 秒。 |

---

## 参考图像 {#reference-images}

最多附加 10 张参考图像，用于引导风格、主体身份或构图。

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor antigravity
oma image generate -r a.png,b.png "blend these styles" --vendor antigravity
```

| 供应商 | 参考支持 | 方式 |
|---|---|---|
| `codex`（gpt-image-2） | 是 | 向 `codex exec` 传递 `-i <path>` |
| `antigravity` | 是 | 将参考图复制到每次运行的目录，并允许 `agy` 访问 |
| `pollinations` | 否 | 以退出码 4 拒绝（需要托管 URL） |

### 附件图像存放位置 {#where-attached-images-live}

- **Claude Code**：`~/.claude/image-cache/<session>/N.png`，在系统消息中显示为 `[Image: source: <path>]`。作用域为会话；如需以后复用，请复制到持久位置。
- **Antigravity**：工作区上传目录（IDE 会显示确切路径）
- **Codex CLI 作为宿主**：必须显式传入；对话中的附件不会被转发

当用户附加图像并要求基于该图像生成或编辑时，调用方智能体**必须**通过 `--reference <path>` 转发它，而不是用文字描述。若本地 CLI 太旧而不支持 `--reference`，运行 `oma update` 后重试。

---

## 输出布局 {#output-layout}

默认情况下，每次运行都会写入 `.agents/results/images/` 下带时间戳和哈希后缀的目录；使用 `--output-dir` 时，文件直接写入该目录：

```text
.agents/results/images/
├── 20260424-143052-ab12cd/                 # one vendor ran
│   ├── pollinations-flux-ab12cd.jpg        # -1, -2, ... suffixes when -n > 1
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # two or more vendors ran
    ├── codex-gpt-image-2-7z9kqw.png
    ├── pollinations-flux-7z9kqw.jpg
    ├── antigravity-7z9kqw.jpg              # no model segment: agy picks the model
    └── manifest.json
```

`manifest.json` 记录供应商、模型、提示（或其 SHA-256）、尺寸、质量和成本，因此可以审计并重复请求。它无法让实时供应商输出完全相同的像素。

---

## 成本、安全与取消 {#cost-safety-and-cancellation}

1. **成本护栏**：估算至少为 `$0.20` 的运行会请求确认；没有交互式终端时，运行以退出码 1 结束，并在消息中提示 `--yes`。使用 `-y` 或 `OMA_IMAGE_YES=1` 绕过。只有使用 `flux` / `zimage` 的 `--vendor pollinations` 保证免费；`auto` 也可能包含已登录的 Codex。
2. **路径安全**：`$PWD` 之外的输出路径需要 `--allow-external-output`，避免意外写入。
3. **可取消**：`Ctrl+C`（SIGINT/SIGTERM）会同时中止所有进行中的供应商调用和编排器。
4. **稳定运行记录**：每次都在图像旁写入 `manifest.json`。
5. **最大 `n` = 5**：这是墙钟时间限制，不是配额。
6. **退出码**：与 `oma search fetch` 对齐：`0` 成功，`1` 通用错误，`2` 安全错误，`3` 未找到，`4` 输入无效，`5` 需要认证，`6` 超时。

---

## 智能体如何解析需求简报 {#clarification-protocol}

智能体会采用你说的内容，并用合理的创作默认值补全场景、风格、光照和宽高比。只有缺失的选择会实质改变结果时，它才会提问；你已经要求生成后，它不会停下来等你确认扩写后的提示。明确的措辞、图中文字和参考意图会按原样保留。

| 你说 | 会发生什么 |
|---|---|
| “一只红苹果” | 立即生成；智能体补全场景、风格、光照和尺寸 |
| “一只红苹果，扁平矢量图标，512x512” | 按原样使用你给出的风格和尺寸 |
| “给首页做点什么” | 就主体问一个问题，因为它会改变结果 |

要查看实际发送给供应商的内容，请检查 `manifest.json` 中的 `prompt` 字段（使用 `--no-prompt-in-manifest` 时存储为 SHA-256）。

---

## 配置 {#configuration}

- **项目配置**：`.agents/oma-config.yaml` 中的 `image:` 部分。旧版 `config/image-config.yaml` 不再读取。
- **环境变量：**
  - `OMA_IMAGE_DEFAULT_VENDOR`：覆盖配置的默认供应商（`auto`）。`--vendor` 标志本身默认为 `auto`，因此需要特定供应商时，请在每条命令中传入 `--vendor`。
  - `OMA_IMAGE_DEFAULT_OUT`：覆盖默认输出目录
  - `OMA_IMAGE_YES`：设为 `1` 可跳过成本确认
  - `POLLINATIONS_API_KEY`：pollinations 供应商所需（免费注册）

---

## 故障排查 {#troubleshooting}

| 症状 | 可能原因 | 修复 |
|---|---|---|
| 退出码 `5`（需要认证） | 所选供应商未认证 | 运行 `oma image doctor` 查看哪个供应商需要登录，然后执行 `codex login`、登录 `agy`，或设置 `POLLINATIONS_API_KEY`。 |
| 使用 `--reference` 时退出码 `4` | `pollinations` 拒绝参考图，或文件过大、格式错误 | 切换到 `--vendor codex` 或 `--vendor antigravity`。每张参考图不得超过 5 MB，格式为 PNG/JPEG/GIF/WebP。 |
| 无法识别 `--reference` | 本地 CLI 过旧 | 运行 `oma update` 后重试。不要退回到文字描述。 |
| 成本确认阻塞自动化 | 运行估算至少为 `$0.20` | 传入 `-y` 或设置 `OMA_IMAGE_YES=1`。更好的做法：切换到免费的 `pollinations`。 |
| `--vendor all` 立即中止 | 某个请求的供应商不健康（严格模式） | 安装或登录缺失的供应商，或选择具体的 `--vendor`。 |
| 输出写入意外目录 | 默认目录为 `.agents/results/images/{timestamp}-{shortid}/` | 传入 `--output-dir <dir>`。`$PWD` 之外的路径需要 `--allow-external-output`。 |
| `--out path "…" is outside $PWD. Use --allow-external-out to override.`（退出码 1） | `--output-dir` 指向项目之外 | 加上 `--allow-external-output` 重新运行（消息中仍显示旧标志名），或选择项目内的目录。 |
| 运行了多个供应商，目录名以 `-compare` 结尾 | `--vendor auto` 会运行所有健康的供应商 | 传入单个 `--vendor`，只运行一个供应商。 |
| Antigravity 健康检查通过后失败 | `agy --version` 只证明已安装，不证明已登录 | 登录 Gemini Code Assist，然后用 `oma image doctor` 和 `--vendor antigravity` 重试。 |

---

## 后续步骤 {#next-steps}

- [视频生成](./video-generation.md)：`oma-video` 复用 `oma-image` 作为视觉素材提供方
- [内容与研究工作流](./content-and-research.md)：其他内容能力及其前提条件
- [技能](../core-concepts/skills.md)：驱动 `oma-image` 的两层技能架构
- [CLI 命令：image](../cli-interfaces/commands.md#image)：完整的 `oma image` 命令参考
- [CLI 选项](../cli-interfaces/options.md)：全局选项矩阵
