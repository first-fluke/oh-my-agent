---
title: 简介
description: 全面介绍 oh-my-agent，这个面向 AI IDE 和 CLI 的多智能体编排框架提供 33 个技能包、12 个子智能体定义、渐进式技能加载和跨 IDE 可移植性。
---

# 简介

oh-my-agent 是面向 AI IDE 和 CLI 工具的多智能体编排框架。它不让一个 AI 助手处理所有工作，而是把任务路由到 33 个技能包和 13 个规范调度角色。12 个已纳入版本控制的子智能体定义文件提供可复用的实现、审查、规划、调试、文档、研究和基础设施角色。`research-explorer.md` 映射到规范的 `explore` 角色；`orchestrator` 是运行时协调角色，没有单独的定义文件。

只有在主动调用机械检查，或选择包含这些检查的工作流时，OMA 才会运行它们。`oma verify agent <agent-type>` 会运行选定智能体类型的检查；`/ralph` 会加入有产物支撑的验证和评审循环；启用的供应商 Stop 钩子可以在配置的检查运行期间保持工作流打开。仅加载技能并不能建立验收标准，普通提示也不会自动运行每个工作流关卡。请依据工作流的验收标准和生成的文件判断任务是否完成。

整个系统位于项目内可移植的 `.agents/` 目录中。你可以在 Claude Code、Codex CLI、Antigravity CLI 或 IDE、Cursor、OpenCode 以及其他受支持工具之间切换，智能体配置会随代码一起迁移。

如果你刚开始使用 OMA，请先阅读[快速开始](./quick-start.md)，再阅读[重要默认值](./important-defaults.md)。安装会创建事实来源和供应商集成；第一次应运行的检查是 `oma doctor`，第一次任务应是一个范围明确的小型单领域改动。只有在任务需要协调时，才切换到 `/work` 或 `/orchestrate`。

---

## 多智能体范式

传统 AI 编程助手经常在一个提示上下文中同时处理前端、后端、数据库、安全和基础设施。这会造成：

- **上下文稀释**：加载所有领域的知识会浪费上下文窗口
- **职责不清**：跨领域任务没有为各部分划定明确边界
- **手动协调**：涉及多个领域的复杂功能需要由主机或用户决定交接方式

oh-my-agent 通过专业化解决这些问题：

1. **每个技能都有主要领域。** 前端技能熟悉 React/Next.js、shadcn/ui、TailwindCSS v4 和 FSD-lite 架构。后端技能熟悉 Repository-Service-Router 模式、参数化查询和 JWT 身份验证。领域在边界处可能重叠，因此应根据任务验收标准判断何时需要第二个技能或协调工作流。

2. **智能体可以并行运行。** 后端智能体构建 API 时，前端智能体可以在自己的工作区中工作。编排器通过持久的、按运行划分的文件和回执进行协调。

3. **质量指导内置其中。** 技能包含领域检查清单、错误处理手册和章程规则。章程预检会在编写代码前缩小范围；只有选定的工作流包含 QA 审查，或你明确要求时，才会运行 QA 审查。

---

## 当前目录：33 个技能、12 个定义、21 个工作流

该目录将三个容易混淆的概念分开：

- **技能**是 `.agents/skills/*/SKILL.md` 下的 33 个领域知识包。它们根据自然语言意图路由，并逐步加载资源。
- **智能体定义**是 `.agents/agents/` 下的 12 个文件。它们提供供应商原生的子智能体角色，并引用一个或多个技能。
- **工作流**是 `.agents/workflows/` 下的 21 个流程定义。其中四个会持久运行（`orchestrate`、`work`、`ultrawork` 和 `ralph`），其余工作流只生成报告，不会保持持久模式。

以下各节保留详细的技能目录。名称或描述发生变化时，以实时 `SKILL.md` 前置元数据为准。

12 个已纳入版本控制的定义文件通过别名覆盖 13 个运行时角色：`research-explorer.md` 映射到 `explore`，而 `orchestrator` 只存在于运行时。其余定义文件映射到[智能体](../core-concepts/agents.md)中列出的角色。

### 构思、架构与规划

| 智能体 | 角色 | 主要能力 |
|-------|------|---------|
| **oma-brainstorm** | 设计优先的构思 | 探索用户意图，提出 2 至 3 种并分析取舍，在编写代码前生成设计文档。六阶段工作流：上下文、问题、方案、设计、文档、过渡到 `/plan`。 |
| **oma-architecture** | 系统架构专家 | 模块、服务和职责边界，取舍分析，利益相关者综合。方法包括诊断路由、双方案设计比较、ATAM 风格分析、CBAM 风格优先级排序和 ADR 风格决策记录。默认关注成本。 |
| **oma-pm** | 产品经理 | 按优先级和依赖关系分解需求。定义 API 契约。输出 `.agents/results/plan-{sessionId}.json` 和按会话划分的任务板。支持 ISO 21500 概念、ISO 31000 风险框架和 ISO 38500 治理。 |

### 实现

| 智能体 | 角色 | 技术栈与资源 |
|-------|------|----------------------|
| **oma-frontend** | UI/UX 专家 | React、Next.js、TypeScript、TailwindCSS v4、shadcn/ui、FSD-lite 架构。库：luxon（日期）、ahooks 或 @mantine/hooks（钩子）、es-toolkit（工具）、Jotai/Zustand（客户端状态）、通过 orval 生成的钩子使用 TanStack Query（服务端状态）、@tanstack/react-form + Zod（表单）、better-auth（身份验证）、nuqs（URL 状态）。资源：`execution-protocol.md`、`tech-stack.md`、`tailwind-rules.md`、`snippets.md`、`angular-rules.md`、`error-playbook.md`、`checklist.md`。 |
| **oma-backend** | API 与服务器专家 | Clean Architecture（Router-Service-Repository-Models）。与框架无关；根据项目清单识别 Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET。身份验证使用 JWT + Argon2id。资源：`execution-protocol.md`、`orm-reference.md`、`checklist.md`、`error-playbook.md`。支持 `/stack-set` 生成特定语言的 `stack/` 参考资料。 |
| **oma-mobile** | 跨平台移动端 | Flutter、Dart、Riverpod/Bloc 状态管理、带拦截器的 Dio API 调用、GoRouter 导航。整洁架构：domain-data-presentation。Android 使用 Material Design 3，iOS 使用 HIG。目标 60fps。也支持原生 Swift iOS：SwiftUI + `@Observable`（iOS 17+）、Apple `swift-openapi-generator` API 客户端、`App/Core/Features/Shared` 项目布局。资源：`execution-protocol.md`、`tech-stack.md`、`screen-template.dart`、`screen-template.swift`、`screen-template.tsx`、`checklist.md`、`error-playbook.md`；`/stack-set` 会生成平台专用变体。 |
| **oma-db** | 数据库架构 | SQL、NoSQL 和向量数据库建模。模式设计（默认 3NF）、规范化、索引、事务、容量规划和备份策略。支持考虑 ISO 27001/27002/22301 的设计。资源：`execution-protocol.md`、`document-templates.md`、`anti-patterns.md`、`vector-db.md`、`iso-controls.md`、`checklist.md`、`error-playbook.md`。 |

### 设计

| 智能体 | 角色 | 主要能力 |
|-------|------|---------|
| **oma-design** | 设计系统专家 | 创建 DESIGN.md，包含设计令牌、排版、颜色系统、动效设计（motion/react、GSAP、Three.js）、响应式优先布局和 WCAG 2.2 合规性。七阶段工作流：设置、提取、增强、提议、生成、审计、交接。执行反模式约束（不产出“AI slop”）。可选 Stitch MCP 集成。资源：`design-md-spec.md`、`design-tokens.md`、`anti-patterns.md`、`prompt-enhancement.md`、`stitch-integration.md`，以及包含排版、颜色、空间、动效、响应式、组件、无障碍和着色器指南的 `reference/` 目录。 |

### 基础设施、DevOps 与可观测性

| 智能体 | 角色 | 主要能力 |
|-------|------|---------|
| **oma-tf-infra** | 基础设施即代码 | 跨云 Terraform（AWS、GCP、Azure、Oracle Cloud）。优先 OIDC 身份验证、最小权限 IAM、策略即代码（OPA/Sentinel）和成本优化。支持 ISO/IEC 42001 AI 控制、ISO 22301 连续性以及 ISO/IEC/IEEE 42010 架构文档。资源：`multi-cloud-examples.md`、`cost-optimization.md`、`policy-testing-examples.md`、`iso-42001-infra.md`、`checklist.md`。 |
| **oma-dev-workflow** | 单体仓库任务自动化 | mise 任务运行器、CI/CD 流水线、数据库迁移、发布协调、git 钩子和提交前验证。资源：`validation-pipeline.md`、`database-patterns.md`、`api-workflows.md`、`i18n-patterns.md`、`release-coordination.md`、`troubleshooting.md`。 |
| **oma-observability** | 基于意图的可观测性路由器 | MELT+P 信号覆盖（指标、日志、追踪、性能分析、成本、审计、隐私），传输调优（UDP/MTU、OTLP gRPC 与 HTTP、Collector 拓扑、采样），W3C Trace Context 传播，SLO 管理与燃尽率告警，事件取证（六维定位），元可观测性（自健康、时钟同步、基数、保留期）。优先 CNCF；Fluentd 已弃用，请使用 Fluent Bit 或 OTel Collector。 |

### 质量与调试

| 智能体 | 角色 | 主要能力 |
|-------|------|---------|
| **oma-qa** | 质量保证 | 安全审计（OWASP Top 10）、性能分析、无障碍性（WCAG 2.2 AA）和代码质量审查。严重性分为 CRITICAL/HIGH/MEDIUM/LOW，包含文件、行号和修复代码。支持 ISO/IEC 25010 质量特性和 ISO/IEC 29119 测试对齐。资源：`execution-protocol.md`、`iso-quality.md`、`checklist.md`、`self-check.md`、`error-playbook.md`。 |
| **oma-debug** | Bug 诊断与修复 | 先复现。进行根因分析、最小修复和强制回归测试，并扫描相似模式。使用代码智能 MCP 工具（Gortex 或 Serena）追踪符号。资源：`execution-protocol.md`、`common-patterns.md`、`debugging-checklist.md`、`bug-report-template.md`、`error-playbook.md`。 |
| **oma-refactor** | 保持行为的重构 | 由特征测试安全网保护的渐进式重构。以复杂度 × 变更率定位热点，选择代码异味和 SATD，失败时使用 Mikado 方法回退，对有状态变更使用扩展收缩，提交中不混入行为变化。优先使用 IDE 重命名、jscodeshift 或 ast-grep 等引擎变换，并通过 `uvx lizard` / `uvx radon` 记录指标。可读性是成功标准，指标只是代理。 |

### 本地化、协调与 Git

| 智能体 | 角色 | 主要能力 |
|-------|------|---------|
| **oma-translation** | 上下文感知翻译 | 六阶段流程：准备、获取、推理、执行、验证、收尾。翻译方法分四步：阅读含义与受保护语法、选择语体、用目标语言重构、在适当位置保留作者风格。每种目标语言的配置（`resources/lang/{code}.md`）记录语体和排版规则。资源：`translation-rubric.md`、`anti-ai-patterns.md`、`lang/{ko,ja,zh,en}.md`。 |
| **oma-orchestration** | 自动化多智能体协调器 | 并行启动 CLI 子智能体，通过持久的会话、任务板、进度和结果文件进行协调，并监控验证循环。可配置：MAX_PARALLEL（默认 3）、MAX_RETRIES（默认 2）、POLL_INTERVAL（默认 30s）。包含智能体间审查循环和可选的会话证据。资源：`subagent-prompt-template.md`、`memory-schema.md`。 |
| **oma-scm** | 软件配置管理（SCM）与 Git | 处理分支策略、合并/变基/冲突工作流、工作区、基线和发布状态跟踪。还指导使用安全暂存的 Conventional Commit 消息；启用时，共同作者尾注来自有效的 `scm.co_author` 配置。 |
| **oma-coordination** | 手动多智能体工作流指南 | 通过 CLI `oma agent spawn` 分步协调产品、前端、后端、移动端和 QA 智能体。先由产品经理分解任务，在独立工作区并行启动同优先级任务，监控按运行划分的进度和结果文件，在前端或移动端工作前对齐 API 与数据契约，最后进行 QA 审查。它是 `oma-orchestration` 的手动对应方案。 |

### 搜索、回顾与文档处理

| 智能体 | 角色 | 主要能力 |
|-------|------|---------|
| **oma-search** | 基于意图的搜索路由器 | 将请求路由到 Context7（文档）、原生 Web 搜索、`gh`/`glab`（代码）和本地代码智能（Gortex 或 Serena）。为所有非本地结果计算领域可信度。故障前进路由（文档→Web→获取）。标志：`--docs`、`--code`、`--web`、`--strict`、`--wide`、`--gitlab`。 |
| **oma-recap** | 跨工具工作回顾 | 分析 Grok、Claude、Codex、Gemini、Qwen、Cursor 和 Antigravity 的对话历史。解析自然语言日期或时间窗口，按工具与会话分组，提取主题，并记录 CLI 将请求窗口限制为 30 天的情况。 |
| **oma-hwp** | HWP/HWPX/HWPML → Markdown | 通过 `bunx kordoc@latest` 转换韩文文字处理文档。保留标题、表格（包括嵌套表格）、脚注、超链接和图片。通过 `flatten-tables.ts` 后处理器删除 Hancom 私有使用区字符。 |
| **oma-pdf** | PDF → Markdown | 通过 `uvx opendataloader-pdf` 转换 PDF。保留标题、表格、列表和图片；扫描文档使用 OCR 混合模式；通过 `uvx mdformat` 规范化输出。 |

### 学术与研究写作

| 智能体 | 角色 | 主要能力 |
|-------|------|---------|
| **oma-academic-writing** | 出版级英文写作 | 起草、修改和审查论文、报告、执行摘要、结论与文献综述。同时执行四项协议：句式（四种类型，变化长度和开头）、动词（从分层学术语料库替换禁用的泛化动词）、限定语（强度匹配证据）和反 AI 合规。包含先引文后判断的评审关卡、主张与证据图以及逆向提纲。模式：`draft` / `revise` / `review`。 |
| **oma-scholar** | 论文附属信息助手 | 通过 Knows `.knows.yaml` 附属规范（v0.9.0 / `paper@1`）搜索、生成、验证、审查和比较学术论文。以较少令牌访问主张、证据和关系（仅主张约 700 个令牌，完整 PDF 约 10K）。通过 knows.academy 使用 `oma scholar search/resolve/get/lint`，对 2026 年以前的论文自动回退到 OpenAlex。反编造：未知字段留空，不猜测。 |

### 安全

| 智能体 | 角色 | 主要能力 |
|-------|------|---------|
| **oma-deepsec** | 智能体驱动的漏洞扫描器 | 端到端操作 Vercel 的 `deepsec`（`bunx deepsec`）：通过 `init` 初始化 `.deepsec/` 工作区，编写项目专用的 `INFO.md`，运行考虑成本的 `scan`/`process`/`triage`/`revalidate`/`export`，通过 `process --diff` 和双作业 CI 模式为 PR 设置关卡，并编写自定义匹配器。大规模扫描前用 `--limit 50 --concurrency 5` 校准，并在付费工作前给出费用预测；成本取决于仓库大小和后端。智能体后端：`codex`（gpt-5.5）或 `claude`（claude-opus-4-8）。 |

### 文档与元工具

| 智能体 | 角色 | 主要能力 |
|-------|------|---------|
| **oma-docs** | 文档漂移检测器 | `verify` 模式确定性检查 `docs/**/*.md` 中的损坏引用（文件路径、CLI 命令、配置键、环境变量、脚本），并以 0/1 退出；`sync` 模式把 Git 差异与候选文档关联，并起草由宿主 LLM 生成的补丁建议，逐文档确认，绝不自动应用。URL 检查委托给 `lychee`；CLI 输出结构化 JSON，宿主 LLM 完成全部综合，不调用供应商 SDK。绝不修改 `.agents/`。 |
| **oma-skill-creation** | SSL-lite 技能编写专家 | 按 SSL-lite 格式创建、更新和审计 OMA 技能，要求四个章节（Scheduling / Structural Flow / Logical Operations / References）。分类技能类型，恰好插入一个内联规范路径，强制执行 `When NOT to use` 跨路由，并运行 `oma skill audit` 检查描述冲突（TF-IDF 余弦相似度达到 60% 警告、75% 失败）。把较长的变体细节放入 `resources/`。 |
| **oma-explanation** | 代码变更讲解器 | 将差异、PR、分支或提交范围转为独立的离线 HTML 讲解，包含 Background、Intuition、Code 和 Quiz。`/explain` 工作流会验证最终产物，并把它写入 `.agents/results/explain/`。 |

### 市场研究

| 智能体 | 角色 | 主要能力 |
|-------|------|---------|
| **oma-market** | 社区信号智能 | 通过 `oma market run` 运行上游 `last30days` 引擎（Reddit 真实点赞和评论、X、YouTube 字幕、TikTok、HN、Polymarket、GitHub、arXiv、Techmeme、Bluesky、Web 等）；oma 始终保持引擎为最新版本（`~/.cache/oma-market/`），每次运行都通过 `detect-trap` 关卡，分类意图（痛点 / 趋势 / 竞品 / 发现），并附加 SWOT / Porter 五力 / PESTEL 章节。在 `.agents/results/market/{slug}-{YYYYMMDD}.md` 输出一份符合 LAW 的简报。 |

### 媒体与内容生成

| 智能体 | 角色 | 主要能力 |
|-------|------|---------|
| **oma-image** | 多供应商图像路由器 | 通过 Codex（经 ChatGPT OAuth 的 `gpt-image-2`，优先 CLI）、Antigravity Gemini 系列“nano-banana”模型（通过 `agy` CLI 和 Gemini Code Assist，具体模型在内部选择）以及 Pollinations（免费 `flux`/`zimage`）进行考虑认证的并行调度。生成前执行澄清与增强协议，最多 10 张参考图，成本达到 ≥ $0.20 时触发确认，并用 `manifest.json` 保证可复现。CLI：`oma image generate`、`oma image doctor` 和 `oma image vendor list`。 |
| **oma-slide** | 动画丰富的 HTML 演示文稿生成器 | 在固定 1920×1080 舞台上创作具有特色、避免“AI slop”的演示文稿，然后确定性地验证几何布局，打包成单文件 HTML，并通过 `oma slide` CLI 导出 PDF/PNG/PPTX。提供样式预设和大胆模板，执行 CJK→Pretendard 规则，要求 `prefers-reduced-motion` 和可见焦点，并进行最多 3 次自动修复验证循环。图像交给 `oma-image`，也可选用 Canva MCP 导出/导入。 |
| **oma-video** | 短视频、讲解和演示路由器 | 通过 `oma video` CLI 创建 shorts/reels（9:16）、讲解视频（16:9）和人工录制的演示（16:9）。确定性资源总线（`script.json` → `timing.json` → `render-spec.json`）把内容送入受管的 HyperFrames 合成器；资源提供商可以使用本地回退，缺少合成或工具链，以及渲染错误都会使运行失败。人工录制不会自动处理凭据。 |
| **oma-voice** | 本地优先的 TTS 与 STT | 驱动 Voicebox MCP 服务器，在设备上生成通知、TTS 资源和转录，不进行云端调用，也不产生单次调用费用。TTS 默认输出 WAV，也可以在本地转码为 MP3；转录接受音频路径或 base64。TTS 调用上限为 5000 个字符，STT 输入上限为 30 分钟；持久化的资源或转录运行会写入清单。 |

---

## 渐进式披露模型

oh-my-agent 使用两层技能架构，避免上下文窗口耗尽：

**第一层：SKILL.md（中位数约 3,100 个令牌，路由到技能时加载）**

包含智能体身份、路由条件、核心规则以及“何时使用 / 何时不要使用”指导。智能体未主动工作时只加载这一层。

**第二层：resources/（按需加载）**

包含执行协议、技术栈参考、代码片段、错误处理手册、检查清单和示例。只有在智能体被调用执行任务时才加载，而且只加载与具体任务类型相关的资源（依据 `context-loading.md` 中的难度评估和任务到资源映射）。

在一次包含 5 个智能体的会话中测量时，简单或中等任务的技能上下文约为 17K 至 19K 个令牌，而上限为 72K，约避免了最高容量的 75%；复杂任务会加载技术栈参考，节省比例降至约 47%。详见[令牌节省计算](../core-concepts/skills.md#token-savings-math)，其中包含测量表和复现脚本。

---

## `.agents/`：唯一事实来源（SSOT）

oh-my-agent 所需的一切都位于 `.agents/` 目录中：

```
.agents/
├── oma-config.yaml         # Shared preferences and provider/model settings
├── oma-config.cue          # Optional schema-backed configuration
├── skills/                 # 33 skill directories + _shared resources
│   ├── _shared/            # Core resources used by all agents
│   └── oma-{skill}/         # Per-skill SKILL.md + resources/variants
├── workflows/              # 21 workflow definitions
├── agents/                 # 12 subagent definitions
├── results/plan-{sessionId}.json               # Generated plan output
├── state/                  # Active workflow state files
├── results/                # Agent result files
└── mcp.json                # MCP server configuration
```


`.claude/` 目录只作为 IDE 集成层存在。它包含指向 `.agents/` 的符号链接，以及用于关键词检测和 HUD 状态栏的钩子。编排期间，`.agents/state/memories/` 保存运行时协调状态；较旧项目会回退到传统的 `.serena/memories/` 路径。

这个架构使智能体配置具备以下特点：
- **可移植**：无需重新配置即可切换 IDE
- **受版本控制**：将 `.agents/` 与代码一起提交
- **可共享**：团队成员获得相同的智能体设置

---

## 支持的 IDE 与 CLI 工具

oh-my-agent 通过原生技能或提示加载，以及生成的集成文件，支持选定的 AI IDE 和 CLI：

| 工具 | 集成方式 | 并行智能体 |
|------|----------|------------|
| **Claude Code** | 原生技能 + Agent 工具 | Task 工具实现真正的并行 |
| **Antigravity CLI/IDE** | 为 `agy` 投影技能和 MCP 设置 | `oma agent spawn` |
| **Codex CLI** | 自动加载技能 | 由模型介导的并行请求 |
| **Cursor** | 通过 `.cursor/` 集成提供技能 | 手动启动 |
| **OpenCode** | 技能 + 进程内插件桥接 + 生成的子智能体（`.opencode/agents/`） | `oma agent spawn --vendor opencode` |
| **Kimi Code CLI** | `~/.kimi-code/` 中的钩子和技能（写入 HOME 需同意；也会原生读取 SSOT `.agents/skills/`）；项目范围的 Serena MCP | `oma agent spawn --vendor kimi` |

智能体启动会通过供应商检测和活动配置适配选定的供应商。同供应商运行时可以使用原生子智能体；跨供应商工作会回退到 `oma agent spawn`。调度规则见[并行执行](../core-concepts/parallel-execution.md)。

---

## 技能路由系统

发送提示时，oh-my-agent 使用技能路由图（`.agents/skills/_shared/core/skill-routing.md`）决定由哪个智能体处理：

| 领域关键词 | 路由到 |
|----------------|-----------|
| API、endpoint、REST、GraphQL、database、migration | oma-backend |
| auth、JWT、login、register、password | oma-backend |
| UI、component、page、form、screen（Web） | oma-frontend |
| style、Tailwind、responsive、CSS | oma-frontend |
| mobile、iOS、Android、Flutter、React Native、Swift、SwiftUI、app | oma-mobile |
| bug、error、crash、broken、slow | oma-debug |
| review、security、performance、accessibility | oma-qa |
| UI design、design system、landing page、DESIGN.md | oma-design |
| brainstorm、ideate、explore、idea | oma-brainstorm |
| plan、breakdown、task、sprint | oma-pm |
| automatic、parallel、orchestrate | oma-orchestration |

对于跨越多个领域的复杂请求，路由遵循既定执行顺序。例如，“创建全栈应用”会路由到：oma-pm（规划），然后 oma-backend + oma-frontend（并行实现），最后 oma-qa（审查）。

---

## HUD 状态栏

在 Claude Code 中，oh-my-agent 会在状态栏显示持久的 `[OMA]` 状态指示器，其中包括：
- 模型名称（例如 Opus、Sonnet）
- 带颜色编码的上下文使用量（绿色 < 70%，黄色 70% 至 85%，红色 > 85%）
- 活动工作流状态（如果正在运行持久工作流）

HUD 由 `.claude/hooks/hud.ts` 提供，使用 Claude Code 的 `statusLine` 钩子功能。

---

## 自动工作流检测

你不必输入 `/command` 才能触发工作流。oh-my-agent 的钩子系统会扫描 `.agents/hooks/core/triggers.json` 中定义的关键词触发器（这些触发器被内联到 `oma` 二进制文件，并由所有供应商共享），支持 11 种语言（英语、韩语、日语、中文、西班牙语、法语、德语、葡萄牙语、俄语、荷兰语和波兰语）。

- **可执行输入**（例如“规划身份验证功能”）会自动加载工作流
- **信息性输入**（例如“orchestrate 是什么？”）会被过滤，不触发工作流
- **显式 `/command`** 会跳过检测，避免重复
- **持久工作流**会在每条消息中重新注入上下文，直到你说“workflow done”

每个钩子事件都通过规范的 `oma hook run` ABI 传递：供应商触发 `oma-hook.sh --vendor <v> --event <nativeEvent>`，该命令路由到进程内处理器链，并在标准输出中产生供应商特定的方言（始终以 0 退出，故障开放）。

---

## 跨供应商支持

oh-my-agent 不局限于 Claude Code。支持钩子的供应商共享 `oma hook run` ABI，扩展供应商则使用进程内桥接：

| 供应商 | 钩子传递 | 状态栏 |
|--------|----------|--------|
| **Claude Code** | `oma-hook.sh --vendor claude --event UserPromptSubmit` / `PreToolUse` / `Stop` | `bun .claude/hooks/hud.ts`（直接调用，不变） |
| **Codex CLI** | `oma-hook.sh --vendor codex --event UserPromptSubmit` / `PreToolUse` / `Stop` | 无 |
| **Qwen Code** | `oma-hook.sh --vendor qwen --event UserPromptSubmit` / `PreToolUse` / `Stop` | 通过 `ui.statusLine` 的 `bun` 路径 |
| **Cursor** | `oma-hook.sh --vendor cursor --event beforeSubmitPrompt` / `preToolUse` | 无 |
| **Grok** | `oma-hook.sh --vendor grok --event UserPromptSubmit` / `Stop` | 无 |
| **Kiro** | `oma-hook.sh --vendor kiro --event userPromptSubmit` / `preToolUse` / `stop` | 无 |
| **Kimi Code** | `oma-hook.sh --vendor kimi --event UserPromptSubmit` / `PreToolUse` / `Stop`（`~/.kimi-code/config.toml` 中仅支持全局的 `[[hooks]]`） | 无 |
| **Antigravity** | `oma-hook.sh --vendor antigravity --event PreInvocation` / `PreToolUse` / `Stop` | 无 |
| **pi** | 进程内桥接（`installPiExtension`），不通过 `oma hook run` 路由 | 无 |

`.agents/` 目录仍是事实来源。安装会把技能、工作流、钩子和智能体定义链接或投影到你选择的供应商中；不同供应商的能力有所区别。同供应商的原生子智能体和 CLI 启动的跨供应商智能体都会从这个来源读取。

---

## 接下来

- **[安装](./installation.md)**：三种安装方式、预设、CLI 设置和验证
- **[智能体](/docs/core-concepts/agents)**：深入了解 33 个技能、13 个调度角色和章程预检
- **[技能](/docs/core-concepts/skills)**：了解两层架构
- **[工作流](/docs/core-concepts/workflows)**：了解全部 21 个工作流及其触发器和阶段
- **[使用指南](/docs/guide/usage)**：从单项任务到完整编排的真实示例
