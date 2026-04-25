---
title: "指南：图像生成"
description: oh-my-agent 图像生成完整指南 —— 通过 Codex（gpt-image-2）、Pollinations（flux/zimage，免费）和 Gemini 进行多供应商分发，支持参考图像、成本护栏、输出布局、故障排查以及共享调用模式。
---

# 图像生成

`oma-image` 是 oh-my-agent 的多供应商图像路由器。它根据自然语言提示生成图像，分发到你已认证的任何供应商 CLI，并在输出旁写入确定性 manifest，使每次运行都可复现。

该技能会在出现 *image*、*illustration*、*visual asset*、*concept art* 等关键词时自动激活，或者当其他技能需要图像作为副产物时（hero 图、缩略图、产品照片）。

---

## 何时使用

- 生成图像、插画、产品照片、概念艺术、hero/落地页视觉素材
- 在多个模型之间并排比较同一个提示（`--vendor all`）
- 在编辑器工作流（Claude Code、Codex、Gemini CLI）内部生产素材
- 让其他技能（设计、营销、文档）将图像生成管线作为共享基础设施调用

## 何时不要使用

- 编辑或修饰已有图像 —— 超出范围（使用专用工具）
- 生成视频或音频 —— 超出范围
- 从结构化数据生成内联 SVG / 矢量合成 —— 使用模板技能
- 简单的尺寸调整 / 格式转换 —— 使用图像库，而非生成管线

---

## 供应商一览

该技能以 CLI 为先：当供应商的原生 CLI 能够返回原始图像字节时，子进程路径优先于直接 API key。

| 供应商 | 策略 | 模型 | 触发条件 | 成本 |
|---|---|---|---|---|
| `pollinations` | 直接 HTTP | 免费：`flux`、`zimage`。需积分：`qwen-image`、`wan-image`、`gpt-image-2`、`klein`、`kontext`、`gptimage`、`gptimage-large` | 设置 `POLLINATIONS_API_KEY`（在 https://enter.pollinations.ai 免费注册） | `flux` / `zimage` 免费 |
| `codex` | CLI 优先 —— 通过 ChatGPT OAuth 调用 `codex exec` | `gpt-image-2` | `codex login`（无需 API key） | 计入你的 ChatGPT 套餐 |
| `gemini` | CLI 优先，回退到直接 API | `gemini-2.5-flash-image`、`gemini-3.1-flash-image-preview` | `gemini auth login` 或 `GEMINI_API_KEY` + 计费 | 默认禁用；需要计费 |

`pollinations` 是默认供应商，因为 `flux` / `zimage` 免费，所以根据关键词自动触发是安全的。

---

## 快速上手

```bash
# 免费、零配置 —— 使用 pollinations/flux
oma image generate "minimalist sunrise over mountains"

# 并行比较所有已认证的供应商
oma image generate "cat astronaut" --vendor all

# 指定供应商 + 尺寸 + 数量，跳过成本提示
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# 仅估算成本，不消费
oma image generate "test prompt" --dry-run

# 检查每个供应商的认证和安装状态
oma image doctor

# 列出已注册的供应商及其支持的模型
oma image list-vendors
```

`oma img` 是 `oma image` 的别名。

---

## 斜杠命令（在编辑器内部）

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --out ./hero "minimalist dashboard hero illustration"
```

斜杠命令会被转发到同一个 `oma image generate` 管线 —— 所有 CLI flag 在这里同样有效。

---

## CLI 参考

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|gemini|all]
  [-n 1..5]
  [--size 1024x1024|1024x1536|1536x1024|auto]
  [--quality low|medium|high|auto]
  [--out <dir>] [--allow-external-out]
  [-r <path>]...
  [--timeout 180] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--format text|json]

oma image doctor
oma image list-vendors
```

### 关键 Flag

| Flag | 用途 |
|---|---|
| `--vendor <name>` | `auto`、`pollinations`、`codex`、`gemini` 或 `all`。使用 `all` 时，每个所请求的供应商都必须已认证（严格模式）。 |
| `-n, --count <n>` | 每个供应商生成的图像数量，1–5（受墙钟时间限制）。 |
| `--size <size>` | 比例：`1024x1024`（方形）、`1024x1536`（竖版）、`1536x1024`（横版）或 `auto`。 |
| `--quality <level>` | `low`、`medium`、`high` 或 `auto`（供应商默认值）。 |
| `--out <dir>` | 输出目录。默认为 `.agents/results/images/{timestamp}/`。`$PWD` 之外的路径需要 `--allow-external-out`。 |
| `-r, --reference <path>` | 最多 10 张参考图像（PNG/JPEG/GIF/WebP，每张 ≤ 5 MB）。可重复使用或用逗号分隔。`codex` 和 `gemini` 支持；`pollinations` 拒绝。 |
| `-y, --yes` | 对预估 ≥ `$0.20` 的运行跳过成本确认提示。也可通过 `OMA_IMAGE_YES=1` 设置。 |
| `--no-prompt-in-manifest` | 在 `manifest.json` 中存储提示的 SHA-256 而非原始文本。 |
| `--dry-run` | 打印计划和成本估算，不消费。 |
| `--format text\|json` | CLI 输出格式。JSON 是供其他技能使用的集成接口。 |
| `--strategy <list>` | 仅 Gemini 的升级路径，例如 `mcp,stream,api`。覆盖 `vendors.gemini.strategies`。 |

---

## 参考图像

最多附加 10 张参考图像，用于引导风格、主体身份或构图。

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor gemini
oma image generate -r a.png,b.png "blend these styles" --vendor gemini
```

| 供应商 | 是否支持参考图 | 实现方式 |
|---|---|---|
| `codex` (gpt-image-2) | 是 | 向 `codex exec` 传递 `-i <path>` |
| `gemini` (2.5-flash-image) | 是 | 在请求中内联 base64 `inlineData` |
| `pollinations` | 否 | 以退出码 4 拒绝（需要 URL 托管） |

### 附件图像存放位置

- **Claude Code** —— `~/.claude/image-cache/<session>/N.png`，在系统消息中以 `[Image: source: <path>]` 形式呈现。会话级作用域：如果想以后复用，请复制到持久位置。
- **Antigravity** —— 工作区上传目录（IDE 会显示确切路径）
- **Codex CLI 作为宿主** —— 必须显式传入；对话内的附件不会被转发

当用户附加图像并要求基于该图像生成或编辑时，调用方智能体**必须**通过 `--reference <path>` 转发它，而不是用文字描述。如果本地 CLI 太旧不支持 `--reference`，请运行 `oma update` 后重试。

---

## 输出布局

每次运行都会写入 `.agents/results/images/`，目录带有时间戳和哈希后缀：

```
.agents/results/images/
├── 20260424-143052-ab12cd/                 # 单供应商运行
│   ├── pollinations-flux.jpg
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # --vendor all 运行
    ├── codex-gpt-image-2.png
    ├── pollinations-flux.jpg
    └── manifest.json
```

`manifest.json` 记录供应商、模型、提示（或其 SHA-256）、尺寸、质量和成本 —— 仅凭 manifest 即可复现每次运行。

---

## 成本、安全与取消

1. **成本护栏** —— 预估 ≥ `$0.20` 的运行会请求确认。可用 `-y` 或 `OMA_IMAGE_YES=1` 绕过。默认的 `pollinations`（flux/zimage）免费，因此对其会自动跳过提示。
2. **路径安全** —— `$PWD` 之外的输出路径需要 `--allow-external-out`，以避免意外写入。
3. **可取消** —— `Ctrl+C`（SIGINT/SIGTERM）会一并中止所有进行中的供应商调用和编排器。
4. **确定性输出** —— `manifest.json` 始终写入图像旁边。
5. **最大 `n` = 5** —— 这是墙钟时间约束，不是配额。
6. **退出码** —— 与 `oma search fetch` 对齐：`0` 成功、`1` 通用、`2` 安全、`3` not-found、`4` invalid-input、`5` auth-required、`6` 超时。

---

## 澄清协议

调用 `oma image generate` 之前，调用方智能体会运行此检查清单。若有任何缺失且无法推断，则先询问，或者扩写提示并展示扩写结果以供确认。

**必需：**
- **主体** —— 图像中的主要事物是什么？（物体、人物、场景）
- **场景 / 背景** —— 在哪里？

**强烈推荐（缺失且无法推断时询问）：**
- **风格** —— 写实摄影、插画、3D 渲染、油画、概念艺术、扁平矢量？
- **氛围 / 光照** —— 明亮 vs 阴郁、暖色 vs 冷色、戏剧化 vs 极简
- **使用语境** —— hero 图、图标、缩略图、产品图、海报？
- **宽高比** —— 方形、竖版还是横版

对于像 *"a red apple"* 这样简短的提示，智能体**不会**追问。相反，它会就地扩写并展示给用户：

> 用户："a red apple"
> 智能体："我会按以下方式生成：*a single glossy red apple centered on a clean white background, soft studio lighting, photorealistic, shallow depth of field, 1024×1024*。是否继续，或者你想要不同的风格 / 构图？"

当用户已经撰写了完整的创作简报（≥ 2 项：主体 + 风格 + 光照 + 构图），其提示将被原样尊重 —— 不澄清、不扩写。

**输出语言。** 生成提示以英文发送给供应商（图像模型主要在英文 caption 上训练）。如果用户使用其他语言书写，智能体会翻译并在扩写阶段展示译文，以便用户纠正任何误读。

---

## 共享调用（来自其他技能）

其他技能将图像生成作为共享基础设施调用：

```bash
oma image generate "<prompt>" --format json
```

写入 stdout 的 JSON manifest 包含输出路径、供应商、模型和成本 —— 易于解析与串联。

---

## 配置

- **项目配置：** `config/image-config.yaml`
- **环境变量：**
  - `OMA_IMAGE_DEFAULT_VENDOR` —— 覆盖默认供应商（否则为 `pollinations`）
  - `OMA_IMAGE_DEFAULT_OUT` —— 覆盖默认输出目录
  - `OMA_IMAGE_YES` —— 设为 `1` 可跳过成本确认
  - `POLLINATIONS_API_KEY` —— pollinations 供应商所需（免费注册）
  - `GEMINI_API_KEY` —— 当 gemini 供应商回退到直接 API 时所需
  - `OMA_IMAGE_GEMINI_STRATEGIES` —— gemini 的升级顺序，逗号分隔（`mcp,stream,api`）

---

## 故障排查

| 现象 | 可能原因 | 修复 |
|---|---|---|
| 退出码 `5`（auth-required） | 所选供应商未认证 | 运行 `oma image doctor` 查看哪个供应商需要登录。然后执行 `codex login` / 设置 `POLLINATIONS_API_KEY` / `gemini auth login`。 |
| `--reference` 时退出码 `4` | `pollinations` 拒绝参考图，或文件过大 / 格式错误 | 切换为 `--vendor codex` 或 `--vendor gemini`。每张参考图必须 ≤ 5 MB，且为 PNG/JPEG/GIF/WebP。 |
| `--reference` 无法识别 | 本地 CLI 已过时 | 运行 `oma update` 后重试。不要回退到文字描述。 |
| 成本确认阻塞自动化 | 运行预估 ≥ `$0.20` | 传入 `-y` 或设置 `OMA_IMAGE_YES=1`。更好的做法：切换到免费的 `pollinations`。 |
| `--vendor all` 立即中止 | 所请求的某个供应商未认证（严格模式） | 认证缺失的供应商，或选择具体的 `--vendor`。 |
| 输出写入了意料之外的目录 | 默认是 `.agents/results/images/{timestamp}/` | 传入 `--out <dir>`。`$PWD` 之外的路径需要 `--allow-external-out`。 |
| Gemini 未返回任何图像字节 | Gemini CLI 的 agentic 循环不会在 stdout 上输出原始 `inlineData`（截至 0.38） | 供应商会自动回退到直接 API。设置 `GEMINI_API_KEY` 并确保已开启计费。 |

---

## 相关

- [Skills](/docs/core-concepts/skills) —— 驱动 `oma-image` 的双层技能架构
- [CLI Commands](/docs/cli-interfaces/commands) —— 完整的 `oma image` 命令参考
- [CLI Options](/docs/cli-interfaces/options) —— 全局选项矩阵
