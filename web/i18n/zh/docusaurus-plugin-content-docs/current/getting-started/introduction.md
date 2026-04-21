---
title: 简介
description: oh-my-agent 的全面概述 —— 一个多智能体编排框架，将 AI 编程助手转变为专业化工程团队，拥有 21 个领域智能体、渐进式技能加载和跨 IDE 可移植性。
---

# 简介

oh-my-agent 是一个面向 AI 驱动的 IDE 和 CLI 工具的多智能体编排框架。它不再依赖单一 AI 助手处理一切，而是将工作分解给 21 个专业化智能体 —— 每个智能体都模拟真实工程团队角色，拥有自己的技术栈知识、执行协议、错误处理手册和质量检查清单。

整个系统存放在项目内的可移植 `.agents/` 目录中。在 Claude Code、Gemini CLI、Codex CLI、Antigravity IDE、Cursor 或任何其他支持的工具之间自由切换 —— 你的智能体配置随代码一同迁移。

---

## 多智能体范式

传统 AI 编程助手以通才方式运作。它们用相同的提示上下文和同等水平的专业知识处理前端、后端、数据库、安全和基础设施。这导致了：

- **上下文稀释** —— 为每个领域加载知识浪费了上下文窗口
- **质量不一致** —— 通才在任何单一领域都无法匹敌专家
- **缺乏协调** —— 跨越多个领域的复杂功能只能顺序处理

oh-my-agent 通过专业化解决这些问题：

1. **每个智能体深度掌握一个领域。** 前端智能体了解 React/Next.js、shadcn/ui、TailwindCSS v4、FSD-lite 架构。后端智能体了解 Repository-Service-Router 模式、参数化查询、JWT 认证。它们之间不存在领域重叠。

2. **智能体并行运行。** 当后端智能体构建 API 时，前端智能体已经在创建 UI。编排器通过共享内存进行协调。

3. **质量内置于流程中。** 每个智能体都有特定领域的检查清单和错误处理手册。章程预检在代码编写之前就能捕获范围蔓延。QA 审查是核心步骤，而非事后补救。

---

## 全部 21 个智能体

### 构思、架构与规划

| 智能体 | 角色 | 核心能力 |
|-------|------|---------|
| **oma-brainstorm** | 设计优先的构思 | 探索用户意图，提出 2-3 种方案并进行权衡分析，在编写任何代码之前产出设计文档。6 阶段工作流：上下文、提问、方案、设计、文档、过渡到 `/plan`。 |
| **oma-architecture** | 系统架构专家 | 模块/服务/归属边界、权衡分析、利益相关者综合。方法论：诊断路由、design-twice 对比、ATAM 风格风险分析、CBAM 风格优先级排序、ADR 风格决策记录。默认具备成本意识。 |
| **oma-pm** | 产品经理 | 将需求分解为带优先级和依赖关系的任务。定义 API 契约。输出 `.agents/results/plan-{sessionId}.json` 和 `task-board.md`。支持 ISO 21500 概念、ISO 31000 风险框架、ISO 38500 治理。 |

### 实现

| 智能体 | 角色 | 技术栈与资源 |
|-------|------|------------|
| **oma-frontend** | UI/UX 专家 | React、Next.js、TypeScript、TailwindCSS v4、shadcn/ui、FSD-lite 架构。库：luxon（日期）、ahooks（hooks）、es-toolkit（工具）、Jotai（客户端状态）、TanStack Query（服务端状态）、@tanstack/react-form + Zod（表单）、better-auth（认证）、nuqs（URL 状态）。资源：`execution-protocol.md`、`tech-stack.md`、`tailwind-rules.md`、`component-template.tsx`、`snippets.md`、`error-playbook.md`、`checklist.md`、`examples/`。 |
| **oma-backend** | API 与服务端专家 | 整洁架构（Router-Service-Repository-Models）。技术栈无关 —— 从项目清单文件检测 Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET。JWT + bcrypt 用于认证。资源：`execution-protocol.md`、`orm-reference.md`、`examples.md`、`checklist.md`、`error-playbook.md`。支持 `/stack-set` 生成特定语言的 `stack/` 参考资源。 |
| **oma-mobile** | 跨平台移动端 | Flutter、Dart、Riverpod/Bloc 状态管理、Dio 带拦截器的 API 调用、GoRouter 导航。整洁架构：domain-data-presentation。Material Design 3（Android）+ iOS HIG。60fps 目标。资源：`execution-protocol.md`、`tech-stack.md`、`snippets.md`、`screen-template.dart`、`checklist.md`、`error-playbook.md`。 |
| **oma-db** | 数据库架构 | SQL、NoSQL 和向量数据库建模。模式设计（默认 3NF）、规范化、索引、事务、容量规划、备份策略。支持 ISO 27001/27002/22301 感知设计。资源：`execution-protocol.md`、`document-templates.md`、`anti-patterns.md`、`vector-db.md`、`iso-controls.md`、`checklist.md`、`error-playbook.md`。 |

### 设计

| 智能体 | 角色 | 核心能力 |
|-------|------|---------|
| **oma-design** | 设计系统专家 | 创建包含设计令牌、排版、色彩系统、动效设计（motion/react、GSAP、Three.js）、响应式优先布局、WCAG 2.2 合规的 DESIGN.md。7 阶段工作流：设置、提取、增强、提案、生成、审计、交接。强制执行反模式检查（杜绝"AI 泛滥"）。可选 Stitch MCP 集成。资源：`design-md-spec.md`、`design-tokens.md`、`anti-patterns.md`、`prompt-enhancement.md`、`stitch-integration.md`，以及 `reference/` 目录下的排版、色彩、空间、动效、响应式、组件、无障碍和着色器指南。 |

### 基础设施、DevOps 与可观测性

| 智能体 | 角色 | 核心能力 |
|-------|------|---------|
| **oma-tf-infra** | 基础设施即代码 | 多云 Terraform（AWS、GCP、Azure、Oracle Cloud）。OIDC 优先认证、最小权限 IAM、策略即代码（OPA/Sentinel）、成本优化。支持 ISO/IEC 42001 AI 控制、ISO 22301 业务连续性、ISO/IEC/IEEE 42010 架构文档。资源：`multi-cloud-examples.md`、`cost-optimization.md`、`policy-testing-examples.md`、`iso-42001-infra.md`、`checklist.md`。 |
| **oma-dev-workflow** | 单体仓库任务自动化 | mise 任务运行器、CI/CD 管道、数据库迁移、发布协调、git hooks、提交前验证。资源：`validation-pipeline.md`、`database-patterns.md`、`api-workflows.md`、`i18n-patterns.md`、`release-coordination.md`、`troubleshooting.md`。 |
| **oma-observability** | 意图驱动的可观测性路由 | MELT+P 信号覆盖（metrics/logs/traces/profiles/cost/audit/privacy），传输层调优（UDP/MTU、OTLP gRPC vs HTTP、Collector 拓扑、采样），W3C Trace Context 传播，SLO 管理与 burn-rate 告警，事件取证（6 维定位），元可观测性（自身健康、时钟同步、基数、保留期）。CNCF 优先；Fluentd 已弃用（使用 Fluent Bit 或 OTel Collector）。 |

### 质量与调试

| 智能体 | 角色 | 核心能力 |
|-------|------|---------|
| **oma-qa** | 质量保证 | 安全审计（OWASP Top 10）、性能分析、无障碍性（WCAG 2.1 AA）、代码质量审查。严重程度：CRITICAL/HIGH/MEDIUM/LOW，包含文件:行号和修复代码。支持 ISO/IEC 25010 质量特性和 ISO/IEC 29119 测试对齐。资源：`execution-protocol.md`、`iso-quality.md`、`checklist.md`、`self-check.md`、`error-playbook.md`。 |
| **oma-debug** | Bug 诊断与修复 | 复现优先方法论。根因分析、最小修复、强制回归测试、相似模式扫描。使用 Serena MCP 进行符号追踪。资源：`execution-protocol.md`、`common-patterns.md`、`debugging-checklist.md`、`bug-report-template.md`、`error-playbook.md`。 |

### 本地化、协调与 Git

| 智能体 | 角色 | 核心能力 |
|-------|------|---------|
| **oma-translator** | 上下文感知翻译 | 4 阶段翻译方法：分析原文、提取含义、在目标语言中重构、验证。保留语气、语域和领域术语。反 AI 模式检测。支持批量翻译（i18n 文件）。可选的 7 阶段精炼模式适用于出版级品质。资源：`translation-rubric.md`、`anti-ai-patterns.md`。 |
| **oma-orchestrator** | 自动化多智能体协调器 | 通过 CLI 并行启动子智能体，通过 MCP 内存协调，监控进度，运行验证循环。可配置：MAX_PARALLEL（默认 3）、MAX_RETRIES（默认 2）、POLL_INTERVAL（默认 30 秒）。包含智能体间审查循环和澄清债务监控。资源：`subagent-prompt-template.md`、`memory-schema.md`。 |
| **oma-scm** | 约定式提交 | 分析变更，确定类型/范围，在适当时按功能拆分，生成约定式提交格式的提交消息。Co-Author：`First Fluke <our.first.fluke@gmail.com>`。 |

### 搜索、回顾与文档处理

| 智能体 | 角色 | 核心能力 |
|-------|------|---------|
| **oma-search** | 意图驱动的搜索路由 | 将查询路由到 Context7（文档）、原生网络搜索、`gh`/`glab`（代码）、Serena（本地）。所有非本地结果均带域信任度评分。失败则前进的路由（docs→web→fetch）。标志：`--docs`、`--code`、`--web`、`--strict`、`--wide`、`--gitlab`。 |
| **oma-recap** | 跨工具工作回顾 | 分析来自 Claude、Codex、Gemini、Qwen 和 Cursor 的对话历史。解析自然语言的日期/窗口输入，按工具+会话分组，提取主题，渲染用于站会、周回顾和工作日志的日/期间摘要。 |
| **oma-hwp** | HWP/HWPX/HWPML → Markdown | 通过 `bunx kordoc@latest` 进行韩文字处理器文档转换。保留标题、表格（含嵌套）、脚注、超链接、图像。通过 `flatten-tables.ts` 后处理器去除 Hancom 私用区域字符。 |
| **oma-pdf** | PDF → Markdown | 通过 `uvx opendataloader-pdf` 进行 PDF 文档转换。保留标题、表格、列表、图像；对扫描 PDF 使用 OCR 混合模式；通过 `uvx mdformat` 规范化输出。 |

---

## 渐进式披露模型

oh-my-agent 使用两层技能架构来防止上下文窗口耗尽：

**第一层 —— SKILL.md（约 800 字节，始终加载）：**
包含智能体的身份、路由条件、核心规则以及"何时使用/何时不使用"指南。当智能体不在活跃工作时，这是唯一加载的内容。

**第二层 —— resources/（按需加载）：**
包含执行协议、技术栈参考、代码片段、错误处理手册、检查清单和示例。这些仅在智能体被调用执行任务时加载，且即便如此，也只加载与特定任务类型相关的资源（基于 `context-loading.md` 中的难度评估和任务-资源映射）。

与预先加载所有内容相比，这种设计节省了大约 75% 的 token。对于 flash 级别模型（128K 上下文），总资源预算约为 3,100 个 token —— 仅占上下文窗口的 2.4%。

---

## .agents/ —— 唯一真实来源（SSOT）

oh-my-agent 所需的一切都存放在 `.agents/` 目录中：

```
.agents/
├── config/                 # oma-config.yaml
├── skills/                 # 22 个技能目录（21 个智能体 + _shared）
│   ├── _shared/            # 所有智能体使用的核心资源
│   └── oma-{agent}/        # 每个智能体的 SKILL.md + resources/
├── workflows/              # 16 个工作流定义
├── agents/                 # 9 个子智能体定义
├── results/plan-{sessionId}.json               # 生成的计划输出
├── state/                  # 活跃工作流状态文件
├── results/                # 智能体结果文件
└── mcp.json                # MCP 服务器配置
```

`.claude/` 目录仅作为 IDE 集成层存在 —— 它包含指向 `.agents/` 的符号链接，以及用于关键词检测和 HUD 状态栏的钩子。`.serena/memories/` 目录在编排会话期间保存运行时状态。

这种架构意味着你的智能体配置：
- **可移植** —— 切换 IDE 无需重新配置
- **版本可控** —— 将 `.agents/` 与代码一起提交
- **可共享** —— 团队成员获得相同的智能体配置

---

## 支持的 IDE 和 CLI 工具

oh-my-agent 可与任何支持技能/提示加载的 AI 驱动 IDE 或 CLI 配合使用：

| 工具 | 集成方式 | 并行智能体 |
|------|---------|----------|
| **Claude Code** | 原生技能 + Agent 工具 | Task 工具实现真正并行 |
| **Gemini CLI** | 从 `.agents/skills/` 自动加载技能 | `oma agent:spawn` |
| **Codex CLI** | 自动加载技能 | 模型协调的并行请求 |
| **Antigravity IDE** | 自动加载技能 | `oma agent:spawn` |
| **Cursor** | 通过 `.cursor/` 集成技能 | 手动启动 |
| **OpenCode** | 技能加载 | 手动启动 |

智能体启动会通过供应商检测协议自动适配每个供应商，该协议检查供应商特定标记（例如 Claude Code 的 `Agent` 工具，Codex CLI 的 `apply_patch`）。

---

## 技能路由系统

当你发送提示时，oh-my-agent 使用技能路由映射（`.agents/skills/_shared/core/skill-routing.md`）确定由哪个智能体处理：

| 领域关键词 | 路由至 |
|-----------|-------|
| API、endpoint、REST、GraphQL、database、migration | oma-backend |
| auth、JWT、login、register、password | oma-backend |
| UI、component、page、form、screen（web） | oma-frontend |
| style、Tailwind、responsive、CSS | oma-frontend |
| mobile、iOS、Android、Flutter、React Native、app | oma-mobile |
| bug、error、crash、broken、slow | oma-debug |
| review、security、performance、accessibility | oma-qa |
| UI design、design system、landing page、DESIGN.md | oma-design |
| brainstorm、ideate、explore、idea | oma-brainstorm |
| plan、breakdown、task、sprint | oma-pm |
| automatic、parallel、orchestrate | oma-orchestrator |

对于跨越多个领域的复杂请求，路由遵循既定的执行顺序。例如，"创建一个全栈应用"路由至：oma-pm（规划）然后 oma-backend + oma-frontend（并行实现）然后 oma-qa（审查）。

---

## 接下来

- **[安装](./installation.md)** —— 三种安装方式、预设、CLI 设置和验证
- **[智能体](/docs/core-concepts/agents)** —— 深入了解全部 21 个智能体和章程预检
- **[技能](/docs/core-concepts/skills)** —— 两层架构详解
- **[工作流](/docs/core-concepts/workflows)** —— 全部 16 个工作流及触发器和阶段
- **[使用指南](/docs/guide/usage)** —— 从单任务到完整编排的真实示例
