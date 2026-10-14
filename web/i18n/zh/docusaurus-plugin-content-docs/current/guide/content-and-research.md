---
title: "指南：内容与研究工作流"
sidebar_label: 概览
description: 为 PDF 和 HWP 提取、语音、学术与 Web 研究、幻灯片、图像、视频、代码讲解、图表、市场研究、回顾、翻译及学术写作选择合适的 oh-my-agent 路径，并了解各自的前置条件。
---

# 内容与研究工作流

本指南将文档、音频、研究、媒体和演示文稿工作导向负责相应任务的能力。先确定需要的产物，再使用能生成可审阅结果的最小命令或技能入口。拥有独立指南的能力会在最后一列链接到该指南；其余能力在本页说明。

| 需求 | 入口 | 前置条件 | 首个结果 | 指南 |
|---|---|---|---|---|
| 提取 PDF | `oma-pdf` 技能，或下方的 `uvx opendataloader-pdf` 命令 | `uv`（用于 `uvx`） | Markdown、文本、JSON 或简短提取报告 | [见下文](#extract-pdf-content) |
| 提取 HWP/HWPX/HWPML | `oma-hwp` 技能和 `bunx kordoc@latest` | Bun | Markdown 或结构化 JSON/分块 | [见下文](#extract-hwp-family-documents) |
| 播放语音或转录音频 | `/oma-voice` | 运行在 `127.0.0.1:17493` 上的 Voicebox 应用 | 音频和清单，或 `transcript.md` 与清单 | [见下文](#generate-speech-or-transcribe-audio) |
| 查找并验证论文 | `oma scholar` | 无；可选 `S2_API_KEY`、`OPENALEX_EMAIL` | 搜索结果、获取的 sidecar 或 lint 报告 | [见下文](#search-and-validate-scholarly-material) |
| 搜索 Web 或获取页面 | `oma-search` 技能、`oma search` | 可选 Chrome、Python `curl_cffi`、`yt-dlp`、`gh`（用 `oma search doctor` 检查） | stdout 上的 JSON | [CLI 命令：search](../cli-interfaces/commands.md#search) |
| 制作演示文稿 | `oma-slide` 技能和 `oma slide` | Chrome，或 `OMA_CHROME_PATH` | 已验证的 HTML 幻灯片和可选导出文件 | [见下文](#slides-and-presentations) |
| 生成图像 | `oma-image` 技能、`oma image generate` | `POLLINATIONS_API_KEY`、`codex login` 或已登录的 `agy` 之一 | `.agents/results/images/` 下的图像和 `manifest.json` | [图像生成](./image-generation.md) |
| 制作短视频、讲解视频或演示视频 | `/video`、`oma video` | Node.js 22+、FFmpeg，然后运行 `oma video doctor --install` | `.agents/results/videos/` 下的运行目录；`oma video render` 后得到 MP4 | [视频生成](./video-generation.md) |
| 用一个页面讲解变更或主题 | `/explain`、`oma explain` | 变更模式需要 git；PR 引用需要 `gh` | `.agents/results/explain/` 下的自包含 HTML | [代码讲解器](./code-explainer.md) |
| 交互式架构图 | `/architecture`、`oma diagram` | 无；archify 在首次使用时获取 | Mermaid 代码块，archify 解析成功时另有 `.archify.html` | [图表引擎](./diagram-engine.md) |
| 社区市场研究 | `oma-market` 技能、`oma market` | Python 3.12+ | `.agents/results/market/` 下的简报 | [市场研究](./market-research.md) |
| 汇总智能体对话 | `/recap`、`oma recap` | 无 | CLI 输出回顾 JSON；`/recap` 生成带日期的 Markdown 回顾 | [见下文](#recap-agent-conversations) |
| 翻译或审阅本地化文本 | `oma-translation` 技能 | 无 | 目标语言文本或有证据支持的审阅结果 | [见下文](#translate-or-review-localized-content) |
| 起草或审计学术文本 | `oma-academic-writing` 技能 | 无 | 草稿、修订稿或带 Claim-Evidence Map 的合规报告 | [见下文](#draft-or-audit-academic-writing) |

本页的 `oma` 命令名称都是已注册的公共命令。`uvx`、`bunx` 和 `bun` 是由所属技能记录的外部转换工具。其余[技能](../getting-started/glossary.md#skill)通过自然语言或斜杠命令进入，没有单独的 `oma pdf`、`oma hwp`、`oma voice`、`oma translation` 或 `oma academic-writing` 命令。

## 提取 PDF 内容 {#extract-pdf-content}

输入是 PDF，且输出需要供人、LLM 或检索管线读取的结构时，使用 `oma-pdf` 技能。技能会先探测文本层，再选择标准、标记结构或混合 OCR 提取方式。

快速检查文本层时，打印少量页码范围，不创建输出文件：

```bash
uvx opendataloader-pdf "<input.pdf>" -f text --pages 1-3 --to-stdout -q
```

提取并规范化 Markdown：

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf "<input.pdf>" --format markdown --output-dir "$OUT"
uvx mdformat "$OUT/<document>.md"
```

大型文档可使用 `--pages` 选择页码范围。文本层可读时，继续使用标准提取。如果存在标记结构但阅读顺序不佳，重试 `--use-struct-tree`；表格损坏时，切换到 OCR 前先尝试 `--table-method cluster` 或 `--markdown-with-html`。

对于扫描版或基于图像的 PDF，先启动混合服务器，再运行混合转换器：

```bash
# Terminal 1: leave this local server running while the conversion runs.
uvx --from "opendataloader-pdf[hybrid]" opendataloader-pdf-hybrid \
  --port 5002 --force-ocr --ocr-lang "ko,en"
```

在第二个终端中定义输出目录并运行转换器：

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf --hybrid docling-fast --hybrid-mode full \
  "<input.pdf>" --format markdown --output-dir "$OUT"
```

成功的产物是选定输出目录中的 Markdown 或文本文件，并附有页数和质量备注。加密 PDF 需要解锁后的副本或密码。大型文件可能需要使用不同页码范围和输出目录，以免重复运行覆盖相同的基本文件名。不要把 OCR 猜测当成源事实，应报告不确定或缺失的表格。

## 提取 HWP 系列文档 {#extract-hwp-family-documents}

对 `.hwp`、`.hwpx` 和 `.hwpml` 文件使用 `oma-hwp`。它通过 Bun 运行 `kordoc`，必要时再处理 Markdown 表格和 Private Use Area 字形。

```bash
OUT=".agents/results/hwp/<document>.md"
bunx kordoc@latest "<input.hwp>" -o "$OUT"

# The skill's cleanup helper; set this to the project or global oma-hwp skill directory.
HWP_SKILL_DIR=".agents/skills/oma-hwp"
bun "$HWP_SKILL_DIR/resources/flatten-tables.ts" "$OUT"
```

在全新克隆的项目中，辅助程序可能报告 `Cannot find module "turndown"`；在 `oma-hwp` 技能的 `resources/` 目录中运行 `bun install`，然后重新运行辅助程序。

批量处理时使用明确的输出目录：

```bash
bunx kordoc@latest "./incoming/*.hwpx" -d ".agents/results/hwp"
```

默认输出为 Markdown。需要结构化 AST 时使用 `bunx kordoc@latest "<input.hwp>" --format json`；需要面向检索的分块时使用 `--format chunks`。转换选项 `--dedupe-headers`、`--keep-empty-cols` 和 `--inline-images` 控制常见的表格和图像情况。将结果交给其他技能前，检查标题、嵌套或合并表格、列表、图像、脚注和链接。

`bun` 和 `bunx` 是前置条件。空输出可能表示内容是扫描图像，应将其交给支持 OCR 的工作流。加密或受 DRM 限制的材料可能不完整。即使 `kordoc` 还有其他创作和解析子命令，PDF、DOCX 和 XLSX 输入仍应交给对应技能。

## 生成语音或转录音频 {#generate-speech-or-transcribe-audio}

`oma-voice` 原生使用 MCP，并连接本地 Voicebox 服务器。在智能体中用斜杠命令调用：

```text
/oma-voice "The build is ready for review."
/oma-voice --profile prof_warm_korean "다음 단계 진행 준비됐어요"
/oma-voice transcribe ~/Downloads/standup.m4a
```

TTS 每次最多接受 5,000 个字符，并需要 Voicebox 语音配置。转录不需要 TTS 配置，但音频时长最多 30 分钟。持久化的 TTS 和 STT 工作写入 `.agents/results/voice/`；转录会生成 `transcript.md` 和 `manifest.json`。通知模式通常保留在 Voicebox Captures 中，不会写入本地音频文件。

本地 MCP 端点是 `http://127.0.0.1:17493/mcp`。首次使用时会向智能体注册 Voicebox，Voicebox 桌面应用提供语音配置。技能通过 `tools/list` 发现实际的 MCP 工具名称，然后调用 `voicebox_speak`、`voicebox_transcribe` 或 `voicebox_list_profiles`。如果 TTS 没有配置，请在 Voicebox 中创建或选择一个；是否拆分过长请求由用户决定，因为技能不会自动分块。如果服务器不可用，先检查本地健康端点并重启 Voicebox，再重试。

## 搜索并验证学术材料 {#search-and-validate-scholarly-material}

使用 `oma scholar` CLI 处理 Knows sidecar 和论文元数据。搜索与解析属于发现操作；`get` 获取记录或选定的部分；`lint` 是共享前的检查门槛。

```bash
oma scholar search "vision language action" --limit 10
oma scholar search --year-min 2024 "vision language action"
oma scholar resolve "Attention Is All You Need"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar lint paper.knows.yaml
oma scholar lint --lenient paper.knows.yaml
oma scholar lint --fail-on-warning paper.knows.yaml
```

Knows 会优先尝试，失败后使用 OpenAlex 和 Semantic Scholar。`--section` 可请求 `statements`、`evidence`、`relations`、`artifacts` 或 `citation`。本地组装期间预期存在悬空跨记录引用时使用 `--lenient`；严格 CI 门槛使用 `--fail-on-warning`。搜索结果或获取的 sidecar 只能作为发现证据，不能证明论文支持每个结论。在智能体中生成或修订 sidecar 后，再运行 `oma scholar lint`，然后分享。

如果远程服务超时，重试更宽泛的查询，或让 CLI 使用回退服务；`--always-fallback` 即使在 Knows 有命中时也会查询 OpenAlex 和 Semantic Scholar。Semantic Scholar 返回 429 可能是匿名池达到限制；稍后重试，或设置 `S2_API_KEY`。设置 `OPENALEX_EMAIL`（以及可选的 `OPENALEX_API_KEY`）以标识你的 OpenAlex 请求。如果 sidecar 出现 provenance 枚举错误，请使用 `tool`、`person` 或 `org`；如果仍有关系密度警告，只在来源确实支持时添加证据关系。

## 幻灯片与演示文稿 {#slides-and-presentations}

交付物是固定画布的演示文稿时，使用 `oma-slide`。创作技能在 1920×1080 画布中写入 HTML 片段，CLI 负责验证几何布局、打包演示文稿并导出。

```bash
DECK_DIR=".agents/results/slides/<session-id>"
oma slide create --output-dir "$DECK_DIR"
# author slide-01.html and meta.json in "$DECK_DIR"
oma slide validate --workspace "$DECK_DIR" --output json
oma slide preview --workspace "$DECK_DIR"
oma slide bundle --workspace "$DECK_DIR"
```

仅在验证后导出：

```bash
oma slide export pdf --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pdf" --mode capture
oma slide export png --workspace "$DECK_DIR" --output-dir "$DECK_DIR/out/png" --resolution 1080p
oma slide export pptx --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pptx"
```

需要单页检查时使用 `--slide <file>`，其他进程需要结果时，将 `--report-file <path>` 与 JSON 输出配合使用。`slide import pptx <file>` 会启动导入工作流；`slide asset fetch-video <url>` 会下载视频素材；`slide style list|preview|get <slug>` 会检查样式。PPTX 输出基于栅格，因此不提供可编辑的文本或形状图层。验证和导出需要 Chrome/puppeteer；可执行文件无法自动发现时设置 `OMA_CHROME_PATH`。如果验证经过三次自动修复仍无法收敛，请根据报告的几何问题编辑受影响的片段。

## 回顾智能体对话 {#recap-agent-conversations}

使用 `/recap`（或请智能体做回顾）生成基于证据的工作摘要；它会运行 `oma recap` 收集历史记录。日历日期和滚动时间窗口是不同的输入：

```bash
# A calendar day
oma recap --date "$(date +%F)" --json

# A rolling 24-hour window ending now
oma recap --json

# A rolling multi-day window, capped at 30 days
oma recap --window 7d --tool claude,codex --json
```

这些命令会打印收集到的历史记录（默认为终端文本，使用 `--json` 时为 JSON，使用 `--mermaid` 时为 Mermaid 甘特图），而 `--graph` 则改为在浏览器中打开交互式图；CLI 本身不写入任何文件。`/recap` 会把 Markdown 回顾保存在 `.agents/results/recap/` 下，通常单日回顾使用 `{date}.md`，时间范围使用 `{start-date}~{end-date}.md`。回顾按工作内容分组，分别标记已请求、进行中和已完成的工作，并记录缺失的工具历史。需要更窄范围时，使用 `--top` 或 `--sort`。如果 CLI 不可用，技能可以使用已记录的 Claude 历史回退路径，但必须说明覆盖范围缩小。

使用 `oma retro` 进行基于 Git 的工程回顾。它回答的问题不同于对话回顾，还可以通过 `--compare` 比较相邻时间窗口。

## 翻译或审阅本地化内容 {#translate-or-review-localized-content}

`oma-translation` 适用于 UI 字符串、文档、报告、营销文案或学术文本。用自然语言调用，或使用 `/oma-translation` 技能入口；没有公开的 `oma translation` 命令。

向技能提供源文本、目标区域设置、内容类型，以及任务是翻译、审阅还是源代码差异同步。技能在可用时从技能资源中加载匹配的语言配置，保留占位符、链接、Markdown 结构和受保护语法，并遵循项目现有译文和术语表。长文档或审阅还会应用翻译评分标准。如果没有目标语言配置，技能会使用共享规则，并在说明中指出这一限制。

对于文档，应在锚点和命令示例确定后翻译稳定的英文页面。CLI 名称、标志、路径、环境变量和代码块必须保持不变，只翻译周围说明，并根据英文结构验证目标页面。源文含义不明确时，应标记问题，不要默默猜测。

## 起草或审计学术写作 {#draft-or-audit-academic-writing}

使用 `oma-academic-writing` 处理英文论文、报告、文献综述、分析、执行摘要、结论和修订。选择一种模式，并提供评分标准或源文本约束：

```text
Draft a literature review in draft mode from these sources. Include a Claim-Evidence Map.
Revise this section in revise mode against the quoted rubric below.
Review this draft in review mode and return the compliance report with recommended fixes.
```

`draft` 返回正文、Writing Notes 和 Claim-Evidence Map。`revise` 返回原文与修订块及具体改动。`review` 返回关于句子结构、动词、限定语、具体性、反 AI 模式、段落清晰度、节奏和 claim-evidence 对齐的 PASS/FAIL 结果。技能会完整读取现有草稿以执行 revise/review，弱化或删除缺少支持的论断，并在英文处理后将非英语输出交给 `oma-translation`。

起草前使用 `oma scholar` 发现来源并获取 sidecar 证据。如果缺少引用或评分标准，将论断标为待定，或询问缺少的约束；不要用臆造来源填补空白。可交付的成果应是正文加证据图或审计报告，而不是没有可追溯依据的通用“润色”段落。

## 故障恢复检查表 {#recovery-checklist}

| 症状 | 下一步 |
|---|---|
| 输出为空或结构严重损坏 | 检查输入类型，然后为 PDF 选择标记结构、表格或 OCR 模式；对于 HWP，确认 Bun 并检查源文件是否只有图像页面。 |
| 本地技能无法连接 | 修改内容请求前，检查所属本地服务或 CLI（`Voicebox`、`Chrome`、`uvx`、`bunx`）。 |
| 研究结果过少 | 扩大查询范围，检查回退或来源状态，并在报告中保留不确定性。 |
| 幻灯片导出失败 | 运行 `oma slide validate --workspace <dir> --output json`，修复几何或字体问题，然后重试导出。 |
| 回顾夸大了完成情况 | 重新检查回执和产物；单独的提示或工具调用不能证明工作已完成。 |
| 翻译改动了代码语法 | 恢复受保护名称，重新运行结构检查，然后再审阅文本质量。 |
| 学术文本包含缺少支持的论断 | 删除或弱化该论断，通过 scholar 路径补充证据，然后重新运行 Claim-Evidence Map。 |

## 后续步骤 {#next-steps}

- [图像生成](./image-generation.md)、[视频生成](./video-generation.md)、[代码讲解器](./code-explainer.md)、[图表引擎](./diagram-engine.md)和[市场研究](./market-research.md)：上表中各项能力的指南
- [CLI 命令](../cli-interfaces/commands.md)和 [CLI 选项](../cli-interfaces/options.md)：完整的已注册 CLI 路径和选项别名
- [配置参考](./configuration-reference.md)：`pdf`、`hwp`、`voice` 和 `scholar` 配置区段
