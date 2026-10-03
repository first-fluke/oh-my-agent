---
title: "指南：图像生成"
sidebar_label: 图像生成
description: oh-my-agent 图像生成完整指南，涵盖通过 Codex（`gpt-image-2`）、Pollinations（`flux`/`zimage`，免费）和 Gemini Code Assist 上的 Antigravity 进行多供应商分发，以及参考图像、成本护栏、输出布局、故障排查和共享调用模式。
---

# 图像生成

`oma-image` 是 oh-my-agent 的多供应商图像路由器。它根据自然语言提示生成图像，分发到你已认证的供应商 CLI，并在输出旁写入清单，记录审计或重复运行所需的输入和供应商决策。实时供应商输出仍可能变化。

当出现 image、illustration、visual asset、concept art 等关键词，或其他技能需要图像作为副产物（hero 图、缩略图、产品照片）时，该技能会自动激活。

---


## 何时使用

- 生成图像、插画、产品照片、概念艺术、hero 或落地页视觉素材
- 使用同一提示在多个模型间并排比较（vendor `all`）
- 在编辑器工作流（Claude Code、Codex、Gemini CLI）中生产素材
- 让其他技能（设计、营销、文档）将图像管线作为共享基础设施调用

## 何时不使用

- 编辑或修饰已有图像（超出范围，使用专用工具）
- 生成视频或音频（超出范围）
- 从结构化数据生成内联 SVG 或矢量合成（使用模板技能）
- 简单调整尺寸或转换格式（使用图像库，不使用生成管线）

---

## 供应商概览

该技能以 CLI 为先：当供应商原生 CLI 能返回原始图像字节时，优先使用子进程路径，而不是直接 API key。

| 供应商 | 策略 | 模型 | 触发条件 | 成本 |
|---|---|---|---|---|
| `pollinations` | 直接 HTTP | 免费：flux、zimage。需积分：`qwen-image`、`wan-image`、gpt-image-`2`、`klein`、`kontext`、`gptimage`、`gptimage-large` | 设置 `POLLINATIONS_API_KEY`（可在 https://enter.pollinations.ai 免费注册） | flux 或 zimage 免费 |
| `codex` | 通过 `codex exec` 使用 ChatGPT OAuth，以 CLI 为先 | gpt-image-2 | `codex login`（不需要 API key） | 计入 ChatGPT 套餐 |
| `antigravity` | 通过 Gemini Code Assist 订阅使用 `agy` CLI | 模型由 agy 内部选择 | 已安装并登录 agy | Code Assist 不收取单图费用 |

内置供应商模式为 `auto`，会运行通过健康检查的供应商。Pollinations 的 flux 和 zimage 每张图免费，但仍需要 POLLINATIONS_API_KEY；Codex 和 Antigravity 需要各自登录。付费估算仍受成本确认护栏约束。

---

## 快速开始

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
# Auto-selects the healthy provider; cost and auth depend on that provider.
oma image generate "minimalist sunrise over mountains"

# Run all configured vendors; every selected vendor must be healthy or the command stops.
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Inspect authentication and install status per vendor
oma image doctor

# List registered vendors and supported models
oma image vendor list
```


`oma img` 是 `oma image` 的别名。

---

## 用作技能

oma-image 是会从自然语言自动激活的技能，也可以显式调用。共有三个入口。

### `1`. 自然语言（自动激活）

在 Claude Code、Codex CLI 或 Gemini CLI 中直接描述图像即可。技能会匹配 image、illustration、visual asset、concept art、hero shot、thumbnail、product photo 等关键词。

不需要记住 CLI 标志。用自然语言描述，技能会把它映射到正确选项：

| 你说 | 技能推断 |
|---|---|
| "使用 codex"、"使用 gpt-image-2"、"免费 flux" | vendor codex 或 vendor pollinations |
| "跨供应商比较"、"并排比较" | vendor all |
| "肖像"、"横向"、"1024×1536" | size `1024x1536` 或 size `1536x1024` |
| "高质量"、"草稿" | quality `high` 或 quality `low` |
| "三个变体"、"给我 `3` 个" | `n` 3 |
| "保存到 ./hero"、"输出到 docs/assets" | output-dir dir |
| 附加图像并说"改成夜景" | r attached path |
| "只估算成本"、"试运行" | dry-run |

示例：

> “为落地页 hero 生成一张极简山间日出图，横向，高质量。”
> “在所有供应商之间比较一张陶瓷马克杯产品照，每家生成三个变体。”
> “使用 codex 把这张水獭照片变成戏剧化的夜景。”（附带参考图）

智能体会运行[澄清协议](#clarification-protocol)，必要时扩写提示，然后使用推断出的标志调用 `oma image generate`。想精确控制每个标志值时，再使用斜杠命令。

### 2. 显式斜杠命令

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --output-dir ./hero "minimalist dashboard hero illustration"
```


所有 CLI 标志在斜杠命令中都有效，包括 vendor、n、size、r、dry-run 等，并会转发到同一个 oma image generate 管线。

### 3. 来自其他技能（共享基础设施）

其他技能（设计、营销、文档）将管线作为共享基础设施调用，并使用 JSON 输出：

```bash
oma image generate "<prompt>" --output json
```


写入 stdout 的清单包含输出路径、供应商、模型和成本，便于解析和串联。

---

## CLI 参考

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|antigravity|all]
  [-n 1..5]
  [--size 1024x1024|1024x1536|1536x1024|auto]
  [--quality low|medium|high|auto]
  [--output-dir <dir>] [--allow-external-output]
  [-r <path>]...
  [--timeout 180] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--output text|json]

oma image doctor
oma image vendor list
```


### 关键标志

| 标志 | 用途 |
|---|---|
| vendor name | auto、pollinations、codex、antigravity 或 all。使用 all 时，每个请求的供应商都必须健康，模式严格。 |
| n、count n | 每个供应商的图像数量，1 到 `5`，受墙钟时间限制。 |
| size size | 比例：`1024x1024`（方形）、1024x1536（肖像）、1536x1024（横向）或 auto。 |
| quality level | low、`medium`、high 或 auto（供应商默认值）。 |
| output-dir dir | 输出目录。默认为 agents results images timestamp。PWD 之外的路径需要 allow-external-output。 |
| allow-external-output | 允许输出目录位于 PWD 之外。 |
| model name | 覆盖本次运行的供应商模型。antigravity 忽略此项，因为模型由 agy 选择。 |
| r、reference path | 最多 10 张参考图像（PNG/JPEG/GIF/WebP，每张不超过 5 MB）。可重复指定或用逗号分隔。codex 和 antigravity 支持，pollinations 拒绝。 |
| y、yes | 对估算至少为 `0`.20 美元的运行跳过成本确认，也可通过 `OMA_IMAGE_YES=1` 设置。 |
| no-prompt-in-manifest | 在 `manifest.json` 中存储提示的 SHA-256，而不是原始文本。 |
| dry-run | 打印计划和成本估算，不产生费用。 |
| output text 或 json | CLI 输出格式。JSON 是其他技能的集成接口。 |
| timeout duration | 每张图的超时时间。 |

---

## 参考图像

最多附加 10 张参考图像，用于引导风格、主体身份或构图。

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor antigravity
oma image generate -r a.png,b.png "blend these styles" --vendor antigravity
```


| 供应商 | 参考支持 | 方式 |
|---|---|---|
| codex（gpt-image-2） | 是 | 向 codex exec 传递 i path |
| antigravity | 是 | 将参考图复制到每次运行的目录，并允许 agy 访问 |
| pollinations | 否 | 以退出码 `4` 拒绝（需要托管 URL） |

### 附件图像存放位置

- **Claude Code**：~/.claude/image-cache/session/N.png，在系统消息中显示为 Image source path。作用域为会话；如需复用，请复制到持久位置
- **Antigravity**：工作区上传目录（IDE 会显示确切路径）
- **Codex CLI 作为宿主**：必须显式传入；对话附件不会自动转发

当用户附加图像并要求基于该图像生成或编辑时，调用方智能体必须通过 reference path 转发它，而不是在 prose 中描述。若本地 CLI 太旧而不支持 reference，运行 `oma update` 后重试。

---

## 输出布局

每次运行都会写入 agents results images 目录，并使用带时间戳和哈希后缀的目录：

```
.agents/results/images/
├── 20260424-143052-ab12cd/                 # single-vendor run
│   ├── pollinations-flux.jpg
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # --vendor all run
    ├── codex-gpt-image-2.png
    ├── pollinations-flux.jpg
    └── manifest.json
```


manifest.json 记录供应商、模型、提示（或其 SHA-256）、尺寸、质量和成本，因此可以审计并重复请求。实时供应商不会保证输出像素完全一致。

---

## 成本、安全与取消

1. **成本护栏**：估算至少为 0.20 美元的运行会请求确认。使用 y 或 `OMA_IMAGE_YES`=1 绕过。默认的 Pollinations（flux 或 zimage）免费，因此会自动跳过提示。
2. **路径安全**：PWD 之外的输出路径需要 allow-external-output，避免意外写入。
3. **可取消：**`Ctrl+C`（SIGINT/SIGTERM）会同时中止所有进行中的供应商调用和编排器。
4. **稳定运行记录**：每次都在图像旁写入 manifest.json。
5. **最大 n 等于 5**：这是墙钟时间限制，不是配额。
`6`. **退出码**：与 `oma search fetch` 对齐：0 成功，1 通用错误，2 安全错误，3 未找到，4 输入无效，5 需要认证，6 超时。

---

## 澄清协议 {#clarification-protocol}

调用 oma image generate 前，调用方智能体运行此检查清单。若有任何缺失且无法推断，则先询问，或者扩写提示并展示扩写结果供确认。

**必需：**
- **主体**：图像中的主要事物是什么（物体、人物、场景）
- **场景或背景**：在哪里

**强烈推荐（缺失且无法推断时询问）：**
- **风格**：写实、插画、3D 渲染、油画、概念艺术或扁平矢量
- **氛围或光照**：明亮或阴郁、暖色或冷色、戏剧化或极简
- **使用语境**：hero 图、图标、缩略图、产品图或海报
- **宽高比**：方形、肖像或横向

对于像“一只红苹果”这样的简短提示，智能体不会追加提问。相反，它会直接扩写并展示给用户：

> 用户：“一只红苹果”
> 智能体：“我会按以下方式生成：一只置于洁白背景中央的有光泽红苹果，柔和的工作室灯光，写实摄影，浅景深，1024×1024。是否继续，或者想要其他风格或构图？”

当用户已经撰写完整创作简报（主体、风格、光照、构图中至少两项）时，原提示会逐字保留，不澄清，也不扩写。

**输出语言**：生成提示会以英文发送给供应商，因为图像模型主要使用英文 caption 训练。如果用户用其他语言，智能体会翻译，并在扩写阶段展示译文，让用户纠正任何误解。

---

## 配置

- **项目配置**：agents/oma-config.yaml 中的 image 部分。旧版 `config/image-config.yaml` 不再读取
- **环境变量：**
  - `OMA_IMAGE_DEFAULT_VENDOR`：覆盖默认供应商，否则为 pollinations
  - `OMA_IMAGE_DEFAULT_OUT`：覆盖默认输出目录
  - OMA_IMAGE_YES：设为 1 可跳过成本确认
  - POLLINATIONS_API_KEY：pollinations 供应商所需，免费注册

---

## 故障排查

| 症状 | 可能原因 | 修复 |
|---|---|---|
| 退出码 5（需要认证） | 所选供应商未认证 | 运行 `oma image doctor` 查看哪个供应商需要登录，然后执行 codex login、登录 agy，或设置 POLLINATIONS_API_KEY |
| 在 reference 上退出码 4 | pollinations 拒绝参考图，或文件过大或格式错误 | 切换到 vendor codex 或 vendor antigravity。每张参考图不超过 5 MB，格式为 PNG/JPEG/GIF/WebP |
| 不识别 reference | 本地 CLI 过旧 | 运行 oma update 后重试，不要回退到文字描述 |
| 成本确认阻塞自动化 | 运行估算至少为 0.20 美元 | 传入 y 或设置 OMA_IMAGE_YES=1。也可切换到免费的 pollinations |
| vendor all 立即中止 | 某个所请求的供应商不健康，模式严格 | 安装或登录缺失的供应商，或选择具体供应商 |
| 输出写入意外目录 | 默认目录为 agents/results/images/timestamp | 传入 output-dir dir。PWD 之外需要 allow-external-output |
| Antigravity 健康检查通过后失败 | `agy --version` 只证明已安装，不证明已登录 | 登录 Gemini Code Assist，然后用 oma image doctor 和 vendor antigravity 重试 |

---

相关命令、路径和标识符： `~/.claude/image-cache/<session>/N.png`、`.agents/results/images/{timestamp}/`、`--allow-external-output`、`--no-prompt-in-manifest`、`.agents/oma-config.yaml`、`.agents/results/images/`、`[Image: source: <path>]`、`-r, --reference <path>`、`--vendor pollinations`、`--timeout <duration>`、`--vendor antigravity`、`--output text\|json`、`--output-dir <dir>`、`--reference <path>`、`-r <attached path>`、`--quality <level>`、`--size 1024x1536`、`--size 1536x1024`、`--vendor <name>`、`-n, --count <n>`、`--model <name>`、`--quality high`、`--vendor codex`、`--quality low`、`--size <size>`、`--vendor all`、`--reference`、`--dry-run`、`-i <path>`、`-y, --yes`、`--vendor`、`--size`、`image:`、`$0.20`、`$PWD`、`-n 3`、`-n`、`-r`、`-y`。
## 相关

- [技能](/docs/core-concepts/skills)：驱动 oma-image 的两层技能架构
- [CLI 命令](/docs/cli-interfaces/commands)：完整 oma image 命令参考
- [CLI 选项](/docs/cli-interfaces/options)：全局选项矩阵
