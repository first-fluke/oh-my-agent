---
title: 项目结构
description: oh-my-agent 安装后的详尽目录树，包含每个文件和目录的说明 —— .agents/（config、skills、workflows、agents、state、results、mcp.json）、.claude/（settings、hooks、skills 符号链接、agents）、.serena/memories/ 以及 oh-my-agent 源码仓库结构。
---

# 项目结构

安装 oh-my-agent 后，你的项目会获得三棵目录树：`.agents/`（唯一事实来源）、`.claude/`（IDE 集成层）和 `.serena/`（运行时状态）。本页详细说明每个文件及其用途。

---

## 完整目录树

```
your-project/
├── .agents/                          ← 唯一事实来源（SSOT）
│   ├── config/
│   │   └── oma-config.yaml    ← 语言、时区、CLI 映射
│   │
│   ├── skills/
│   │   ├── _shared/                  ← 所有智能体共用的资源
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
│   │   │   │   ├── reasoning-templates.md
│   │   │   │   ├── quality-principles.md
│   │   │   │   ├── vendor-detection.md
│   │   │   │   ├── session-metrics.md
│   │   │   │   ├── common-checklist.md
│   │   │   │   ├── lessons-learned.md
│   │   │   │   └── api-contracts/
│   │   │   │       ├── README.md
│   │   │   │       └── template.md
│   │   │   ├── runtime/
│   │   │   │   ├── memory-protocol.md
│   │   │   │   └── execution-protocols/
│   │   │   │       ├── claude.md
│   │   │   │       ├── gemini.md
│   │   │   │       ├── codex.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── tech-stack.md
│   │   │       ├── tailwind-rules.md
│   │   │       ├── component-template.tsx
│   │   │       ├── snippets.md
│   │   │       ├── error-playbook.md
│   │   │       ├── checklist.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── examples.md
│   │   │   │   ├── orm-reference.md
│   │   │   │   ├── checklist.md
│   │   │   │   └── error-playbook.md
│   │   │   └── stack/                 ← 由 /stack-set 生成
│   │   │       ├── stack.yaml
│   │   │       ├── tech-stack.md
│   │   │       ├── snippets.md
│   │   │       └── api-template.*
│   │   │
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── tech-stack.md
│   │   │       ├── snippets.md
│   │   │       ├── screen-template.dart
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
│   │   │       ├── iso-controls.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── anti-patterns.md
│   │   │   │   ├── checklist.md
│   │   │   │   ├── design-md-spec.md
│   │   │   │   ├── design-tokens.md
│   │   │   │   ├── prompt-enhancement.md
│   │   │   │   ├── stitch-integration.md
│   │   │   │   └── error-playbook.md
│   │   │   ├── reference/
│   │   │   │   ├── typography.md
│   │   │   │   ├── color-and-contrast.md
│   │   │   │   ├── spatial-design.md
│   │   │   │   ├── motion-design.md
│   │   │   │   ├── responsive-design.md
│   │   │   │   ├── component-patterns.md
│   │   │   │   ├── accessibility.md
│   │   │   │   └── shader-and-3d.md
│   │   │   └── examples/
│   │   │       ├── design-context-example.md
│   │   │       └── landing-page-prompt.md
│   │   │
│   │   ├── oma-pm/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── examples.md
│   │   │       ├── iso-planning.md
│   │   │       ├── task-template.json
│   │   │       └── error-playbook.md
│   │   │
│   │   ├── oma-qa/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── iso-quality.md
│   │   │       ├── checklist.md
│   │   │       ├── self-check.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-tf-infra/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── multi-cloud-examples.md
│   │   │       ├── cost-optimization.md
│   │   │       ├── policy-testing-examples.md
│   │   │       ├── iso-42001-infra.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-dev-workflow/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── validation-pipeline.md
│   │   │       ├── database-patterns.md
│   │   │       ├── api-workflows.md
│   │   │       ├── i18n-patterns.md
│   │   │       ├── release-coordination.md
│   │   │       └── troubleshooting.md
│   │   │
│   │   ├── oma-translator/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── translation-rubric.md
│   │   │       └── anti-ai-patterns.md
│   │   │
│   │   ├── oma-orchestrator/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── subagent-prompt-template.md
│   │   │   │   └── memory-schema.md
│   │   │   ├── scripts/
│   │   │   │   ├── spawn-agent.sh
│   │   │   │   ├── parallel-run.sh
│   │   │   │   └── verify.sh
│   │   │   ├── templates/
│   │   │   └── config/
│   │   │       └── cli-config.yaml
│   │   │
│   │   ├── oma-brainstorm/
│   │   │   └── SKILL.md
│   │   │
│   │   ├── oma-coordination/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       └── examples.md
│   │   │
│   │   └── oma-scm/
│   │       ├── SKILL.md
│   │       ├── config/
│   │       │   └── commit-config.yaml
│   │       └── resources/
│   │           └── conventional-commits.md
│   │
│   ├── workflows/
│   │   ├── orchestrate.md             ← 持久化：自动并行执行
│   │   ├── work.md             ← 持久化：逐步协调
│   │   ├── ultrawork.md              ← 持久化：5 阶段质量工作流
│   │   ├── plan.md                   ← PM 任务分解
│   │   ├── exec-plan.md              ← 执行计划管理
│   │   ├── brainstorm.md             ← 设计优先创意探索
│   │   ├── deepinit.md               ← 项目初始化
│   │   ├── review.md                 ← QA 审查流水线
│   │   ├── debug.md                  ← 结构化调试
│   │   ├── design.md                 ← 7 阶段设计工作流
│   │   ├── scm.md                 ← Conventional Commits
│   │   ├── tools.md                  ← MCP 工具管理
│   │   └── stack-set.md              ← 技术栈配置
│   │
│   ├── agents/
│   │   ├── backend-engineer.md        ← 子智能体定义：backend
│   │   ├── frontend-engineer.md       ← 子智能体定义：frontend
│   │   ├── mobile-engineer.md         ← 子智能体定义：mobile
│   │   ├── db-engineer.md             ← 子智能体定义：database
│   │   ├── qa-reviewer.md             ← 子智能体定义：QA
│   │   ├── debug-investigator.md      ← 子智能体定义：debug
│   │   └── pm-planner.md             ← 子智能体定义：PM
│   │
│   ├── results/plan-{sessionId}.json                      ← 生成的计划输出（由 /plan 填充）
│   ├── state/                         ← 活跃工作流状态文件
│   │   ├── orchestrate-state.json     ← （仅在工作流活跃时存在）
│   │   ├── ultrawork-state.json
│   │   └── work-state.json
│   ├── results/                       ← 智能体结果文件
│   │   └── result-{agent}.md          ← （由完成的智能体创建）
│   └── mcp.json                       ← MCP 服务器配置
│
├── .claude/                           ← IDE 集成层
│   ├── settings.json                  ← 钩子注册和权限
│   ├── hooks/
│   │   ├── triggers.json              ← 关键词到工作流的映射（11 种语言）
│   │   ├── keyword-detector.ts        ← 自动检测逻辑
│   │   ├── persistent-mode.ts         ← 持久化工作流强制执行
│   │   └── hud.ts                     ← [OMA] 状态栏指示器
│   ├── skills/                        ← 符号链接 → .agents/skills/
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Claude Code 的子智能体定义
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← 运行时状态（Serena MCP）
    └── memories/
        ├── orchestrator-session.md    ← 会话 ID、状态、阶段跟踪
        ├── task-board.md              ← 任务分配和状态
        ├── progress-{agent}.md        ← 每个智能体的进度更新
        ├── result-{agent}.md          ← 每个智能体的最终输出
        ├── session-metrics.md         ← 澄清债务和质量评分跟踪
        ├── experiment-ledger.md       ← 实验跟踪（条件性）
        ├── session-work.md      ← work 工作流会话状态
        ├── session-ultrawork.md       ← ultrawork 工作流会话状态
        ├── tool-overrides.md          ← 临时工具限制（/tools --temp）
        └── archive/
            └── metrics-{date}.md      ← 归档的会话指标
```

---

## .agents/ —— 事实来源

这是核心目录。智能体所需的一切都在这里。它是唯一影响智能体行为的目录 —— 所有其他目录都从它派生。

### config/

**`oma-config.yaml`** —— 中央配置文件，包含：
- `language`：响应语言代码（en、ko、ja、zh、es、fr、de、pt、ru、nl、pl）
- `date_format`：时间戳格式字符串（默认：`YYYY-MM-DD`）
- `timezone`：时区标识符（默认：`UTC`）
- `default_cli`：回退 CLI 供应商（gemini、claude、codex、qwen）
- `agent_cli_mapping`：每智能体 CLI 路由覆盖

### skills/

智能体专业能力所在。共 15 个目录：14 个智能体技能 + 1 个共享资源目录。

**`_shared/`** —— 所有智能体共用的资源：
- `core/` —— 路由、上下文加载、提示词结构、澄清协议、上下文预算、难度评估、推理模板、质量原则、供应商检测、会话指标、通用检查清单、经验教训、API 契约模板
- `runtime/` —— CLI 子智能体的内存协议、供应商特定的执行协议（claude、gemini、codex、qwen）
- `conditional/` —— 质量评分测量、实验账本跟踪、探索循环协议（仅在触发时加载）

**`oma-{agent}/`** —— 每智能体技能目录。每个包含：
- `SKILL.md`（约 800 字节）—— 第一层：始终加载。身份、路由、核心规则。
- `resources/` —— 第二层：按需加载。执行协议、示例、检查清单、错误手册、技术栈、代码片段、模板。
- 某些智能体有额外子目录：`stack/`（oma-backend，由 /stack-set 生成）、`reference/`（oma-design）、`examples/`（oma-design）、`scripts/`（oma-orchestrator）、`config/`（oma-orchestrator、oma-scm）。

### workflows/

14 个 Markdown 文件定义斜杠命令行为。每个文件包含：
- 带 `description` 的 YAML 前言
- 强制规则部分（响应语言、步骤排序、MCP 工具要求）
- 供应商检测指令
- 逐步执行协议
- 关卡定义（持久化工作流）

持久化工作流：`orchestrate.md`、`work.md`、`ultrawork.md`。
非持久化：`plan.md`、`exec-plan.md`、`brainstorm.md`、`deepinit.md`、`review.md`、`debug.md`、`design.md`、`scm.md`、`tools.md`、`stack-set.md`。

### agents/

7 个子智能体定义文件，用于通过 Task 工具（Claude Code）或 CLI 启动智能体。每个文件定义：
- 前言：`name`、`description`、`skills`（要加载的技能）
- 执行协议引用
- 章程预检（CHARTER_CHECK）模板
- 架构摘要
- 领域特定规则（10 条规则）
- 声明："绝不修改 `.agents/` 文件"

### plan-{sessionId}.json

由 `/plan` 工作流生成。包含结构化任务分解，含智能体分配、优先级、依赖关系和验收标准。由 `/orchestrate`、`/work` 和 `/exec-plan` 消费。

### state/

持久化工作流的活跃状态文件。这些 JSON 文件仅在持久化工作流运行时存在。删除它们（或说 "workflow done"）会停用该工作流。

### results/

智能体结果文件。由完成的智能体创建，包含状态（completed/failed）、摘要、变更的文件和验收标准检查清单。由编排器在收集阶段读取，仪表盘也用于监控。

### mcp.json

MCP 服务器配置，包括：
- 服务器定义（Serena 等）
- 内存配置：`memoryConfig.provider`、`memoryConfig.basePath`、`memoryConfig.tools`（读/写/编辑工具名称）
- `/tools` 管理的工具组定义

---

## .claude/ —— IDE 集成

此目录将 oh-my-agent 连接到 Claude Code 和其他 IDE。

### settings.json

为 Claude Code 注册钩子和权限。包含对钩子脚本及其触发条件（如 `UserPromptSubmit`）的引用。

### hooks/

**`triggers.json`** —— 关键词到工作流的映射。定义：
- `workflows`：工作流名称到 `{ persistent: boolean, keywords: { language: [...] } }` 的映射
- `informationalPatterns`：表示提问的短语（从自动检测中过滤掉）
- `excludedWorkflows`：需要显式 `/command` 调用的工作流
- `cjkScripts`：使用 CJK 脚本的语言代码（ko、ja、zh）

**`keyword-detector.ts`** —— TypeScript 钩子：
1. 扫描用户输入与触发关键词的匹配
2. 检查信息性模式
3. 注入 `[OMA WORKFLOW: ...]` 或 `[OMA PERSISTENT MODE: ...]` 到上下文

**`persistent-mode.ts`** —— 检查 `.agents/state/` 中的活跃状态文件并强化持久化工作流执行。

**`hud.ts`** —— 渲染状态栏中的 `[OMA]` 指示器，显示：模型名称、上下文使用量（颜色编码：绿/黄/红）和活跃工作流状态。

### skills/

指向 `.agents/skills/` 的符号链接。这使技能对从 `.claude/skills/` 读取的 IDE 可见，同时保持 `.agents/` 作为唯一事实来源。

### agents/

为 Claude Code 的 Agent 工具格式化的子智能体定义。引用技能文件并包含 CHARTER_CHECK 模板。

---

## .serena/memories/ —— 运行时状态

智能体在编排会话期间写入进度的位置。此目录被仪表盘监视以获取实时更新。

| 文件 | 所有者 | 用途 |
|------|-------|------|
| `orchestrator-session.md` | 编排器 | 会话元数据：ID、状态、开始时间、当前阶段 |
| `task-board.md` | 编排器 | 任务分配：智能体、任务、优先级、状态、依赖关系 |
| `progress-{agent}.md` | 该智能体 | 逐轮更新：执行的操作、读取/修改的文件、当前状态 |
| `result-{agent}.md` | 该智能体 | 最终输出：完成状态、摘要、变更的文件、验收标准 |
| `session-metrics.md` | 编排器 | 澄清债务事件、质量评分进展 |
| `experiment-ledger.md` | 编排器/QA | 质量评分活跃时的实验行 |
| `session-work.md` | work 工作流 | work 特定的会话状态 |
| `session-ultrawork.md` | ultrawork 工作流 | ultrawork 特定的阶段跟踪 |
| `tool-overrides.md` | /tools 工作流 | 临时工具限制（会话范围） |
| `archive/metrics-{date}.md` | 系统 | 归档的会话指标（30 天保留） |

内存文件路径和工具名称可在 `.agents/mcp.json` 中通过 `memoryConfig` 配置。

---

## oh-my-agent 源码仓库结构

如果你在开发 oh-my-agent 本身（而非仅使用它），该仓库是一个 monorepo：

```
oh-my-agent/
├── cli/                  ← CLI 工具源码（TypeScript，用 bun 构建）
│   ├── src/              ← 源代码
│   ├── package.json
│   └── install.sh        ← 引导安装器
├── web/                  ← 文档网站（Next.js）
│   └── content/
│       └── en/           ← 英文文档页面
├── action/               ← 用于自动化技能更新的 GitHub Action
├── docs/                 ← 翻译后的 README 和规范
├── .agents/              ← 在源码仓库中可编辑（这就是源码）
├── .claude/              ← IDE 集成
├── .serena/              ← 开发运行时状态
├── CLAUDE.md             ← Claude Code 的项目指令
└── package.json          ← 根 workspace 配置
```

在源码仓库中，`.agents/` 的修改是允许的（这就是 SSOT 例外的源码仓库本身）。关于不修改此目录的 `.agents/` 规则适用于使用者项目，而非 oh-my-agent 仓库。

开发命令：
- `bun run test` —— CLI 测试（vitest）
- `bun run lint` —— 代码检查
- `bun run build` —— CLI 构建
- 提交必须遵循 conventional commit 格式（commitlint 强制）
