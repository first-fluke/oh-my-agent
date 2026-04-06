---
title: 技能
description: oh-my-agent 两层技能架构完整指南 —— SKILL.md 设计、按需资源加载、所有共享资源详解、条件协议、每技能资源类型、供应商执行协议、token 节省计算和技能路由机制。
---

# 技能

技能是赋予每个智能体领域专业知识的结构化知识包。它们不仅仅是提示 —— 它们包含执行协议、技术栈参考、代码模板、错误处理手册、质量检查清单和少样本示例，以为 token 效率设计的两层架构组织。

---

## 两层设计

### 第一层：SKILL.md（约 800 字节，始终加载）

每个技能在其根目录下都有一个 `SKILL.md` 文件。当技能被引用时，它始终被加载到上下文窗口中。它包含：

- **YAML 前置元数据**，包含 `name` 和 `description`（用于路由和显示）
- **何时使用 / 何时不使用** —— 明确的激活条件
- **核心规则** —— 领域中最关键的 5-15 条约束
- **架构概览** —— 代码应如何组织
- **库列表** —— 批准的依赖及其用途
- **引用** —— 指向第二层资源的指针（永不自动加载）

前置元数据示例：

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

description 字段至关重要 —— 它包含技能路由系统用于将任务匹配到智能体的路由关键词。

### 第二层：resources/（按需加载）

`resources/` 目录包含深层执行知识。这些文件仅在以下情况下加载：
1. 智能体被显式调用（通过 `/command` 或智能体 skills 字段）
2. 当前任务类型和难度需要特定资源

这种按需加载由上下文加载指南（`.agents/skills/_shared/core/context-loading.md`）管理，它将任务类型映射到每个智能体所需的资源。

---

## 文件结构示例

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← 第一层：始终加载（约 800 字节）
└── resources/
    ├── execution-protocol.md         ← 第二层：分步工作流
    ├── tech-stack.md                 ← 第二层：详细技术规范
    ├── tailwind-rules.md             ← 第二层：Tailwind 特定约定
    ├── component-template.tsx        ← 第二层：React 组件模板
    ├── snippets.md                   ← 第二层：可复制粘贴的代码模式
    ├── error-playbook.md             ← 第二层：错误恢复流程
    ├── checklist.md                  ← 第二层：质量验证清单
    └── examples/                     ← 第二层：少样本输入/输出示例
        └── examples.md

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── examples.md
│   ├── orm-reference.md              ← 领域特定（ORM 查询、N+1、事务）
│   ├── checklist.md
│   └── error-playbook.md
└── stack/                             ← 由 /stack-set 生成（语言特定）
    ├── stack.yaml
    ├── tech-stack.md
    ├── snippets.md
    └── api-template.*

.agents/skills/oma-design/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── anti-patterns.md
│   ├── checklist.md
│   ├── design-md-spec.md
│   ├── design-tokens.md
│   ├── prompt-enhancement.md
│   ├── stitch-integration.md
│   └── error-playbook.md
├── reference/                         ← 深层参考材料
│   ├── typography.md
│   ├── color-and-contrast.md
│   ├── spatial-design.md
│   ├── motion-design.md
│   ├── responsive-design.md
│   ├── component-patterns.md
│   ├── accessibility.md
│   └── shader-and-3d.md
└── examples/
    ├── design-context-example.md
    └── landing-page-prompt.md
```

---

## 每技能资源类型

| 资源类型 | 文件名模式 | 目的 | 加载时机 |
|---------|----------|------|---------|
| **执行协议** | `execution-protocol.md` | 分步工作流：分析 -> 规划 -> 实现 -> 验证 | 始终（随 SKILL.md） |
| **技术栈** | `tech-stack.md` | 详细技术规范、版本、配置 | 复杂任务 |
| **错误手册** | `error-playbook.md` | 带"三击出局"升级的恢复流程 | 仅在出错时 |
| **检查清单** | `checklist.md` | 领域特定的质量验证 | 在验证步骤 |
| **代码片段** | `snippets.md` | 可直接复制的代码模式 | 中等/复杂任务 |
| **示例** | `examples.md` 或 `examples/` | LLM 的少样本输入/输出示例 | 中等/复杂任务 |
| **变体** | `stack/` 目录 | 语言/框架特定参考（由 `/stack-set` 生成） | 当 stack 存在时 |
| **模板** | `component-template.tsx`、`screen-template.dart` | 样板文件模板 | 创建组件时 |
| **领域参考** | `orm-reference.md`、`anti-patterns.md` 等 | 特定子任务的深层领域知识 | 任务类型特定 |

---

## 共享资源（_shared/）

所有智能体共享来自 `.agents/skills/_shared/` 的公共基础。分为三类：

### 核心资源（`.agents/skills/_shared/core/`）

| 资源 | 目的 | 加载时机 |
|------|------|---------|
| **`skill-routing.md`** | 将任务关键词映射到正确的智能体。包含技能-智能体映射表、复杂请求路由模式、智能体间依赖规则、升级规则和回合限制指南。 | 由编排器和协调技能引用 |
| **`context-loading.md`** | 定义为哪种任务类型和难度加载哪些资源。包含每个智能体的任务类型到资源映射表和条件协议加载触发器。 | 在工作流开始时（步骤 0 / 阶段 0） |
| **`prompt-structure.md`** | 定义每个任务提示必须包含的四个要素：目标、上下文、约束、完成条件。包含 PM、实现和 QA 智能体的模板。列出反模式。 | 由 PM 智能体和所有工作流引用 |
| **`clarification-protocol.md`** | 定义不确定性级别（LOW/MEDIUM/HIGH）及每级的操作。包含不确定性触发器、升级模板、每种智能体类型的必需验证项和子智能体模式行为。 | 需求模糊时 |
| **`context-budget.md`** | Token 预算管理。定义文件读取策略（使用 `find_symbol` 而非 `read_file`）、每个模型层级的资源加载预算（Flash：约 3,100 token / Pro：约 5,000 token）、大文件处理和上下文溢出症状。 | 在工作流开始时 |
| **`difficulty-guide.md`** | 将任务分类为简单/中等/复杂的标准。定义预期回合数、协议分支（快速通道 / 标准 / 扩展）和误判恢复。 | 在任务开始时（步骤 0） |
| **`reasoning-templates.md`** | 常见决策模式的结构化推理填空模板。 | 复杂决策期间 |
| **`quality-principles.md`** | 适用于所有智能体的 4 条通用质量原则。 | 在以质量为中心的工作流（ultrawork）开始时 |
| **`vendor-detection.md`** | 检测当前运行时环境的协议（Claude Code、Codex CLI、Gemini CLI、Antigravity、CLI 回退）。使用标记检查：Agent 工具 = Claude Code、apply_patch = Codex、@-语法 = Gemini。 | 在工作流开始时 |
| **`session-metrics.md`** | 澄清债务（CD）评分和会话指标追踪。定义事件类型（clarify +10、correct +25、redo +40）、阈值（CD >= 50 = RCA、CD >= 80 = 暂停）和集成点。 | 编排会话期间 |
| **`common-checklist.md`** | 复杂任务最终验证时应用的通用质量清单。 | 复杂任务的验证步骤 |
| **`lessons-learned.md`** | 过去会话经验的存储库，从澄清债务违规和被丢弃的实验自动生成。 | 错误后和会话结束时引用 |
| **`api-contracts/`** | 包含 API 契约模板和生成的契约的目录。`template.md` 定义每个端点的格式（方法、路径、请求/响应模式、认证、错误）。 | 规划跨边界工作时 |

### 运行时资源（`.agents/skills/_shared/runtime/`）

| 资源 | 目的 |
|------|------|
| **`memory-protocol.md`** | CLI 子智能体的内存文件格式和操作。定义启动时、执行期间和完成时的协议，使用可配置的内存工具（read/write/edit）。包含实验追踪扩展。 |
| **`execution-protocols/claude.md`** | Claude Code 特定的执行模式。供应商为 claude 时由 `oma agent:spawn` 注入。 |
| **`execution-protocols/gemini.md`** | Gemini CLI 特定的执行模式。 |
| **`execution-protocols/codex.md`** | Codex CLI 特定的执行模式。 |
| **`execution-protocols/qwen.md`** | Qwen CLI 特定的执行模式。 |

供应商特定的执行协议由 `oma agent:spawn` 自动注入 —— 智能体无需手动加载。

### 条件资源（`.agents/skills/_shared/conditional/`）

这些仅在执行过程中满足特定条件时加载：

| 资源 | 触发条件 | 加载方 | 大约 Token |
|------|---------|--------|-----------|
| **`quality-score.md`** | 支持质量度量的工作流中开始 VERIFY 或 SHIP 阶段 | 编排器（传递给 QA 智能体提示） | 约 250 |
| **`experiment-ledger.md`** | 建立 IMPL 基线后首次记录实验 | 编排器（内联，在基线测量后） | 约 250 |
| **`exploration-loop.md`** | 同一个关卡因同一问题失败两次 | 编排器（内联，在启动假设智能体之前） | 约 250 |

预算影响：如果 3 个全部加载约 750 token。由于是条件加载，典型会话加载 1-2 个。Flash 级别预算保持在约 3,100 token 分配内。

---

## 技能如何通过 skill-routing.md 路由

技能路由映射定义了任务如何匹配到智能体：

### 简单路由（单一领域）

包含 "Build a login form with Tailwind CSS" 的提示匹配关键词 `UI`、`component`、`form`、`Tailwind`，路由到 **oma-frontend**。

### 复杂请求路由

多领域请求遵循既定的执行顺序：

| 请求模式 | 执行顺序 |
|---------|---------|
| "Create a fullstack app" | oma-pm -> (oma-backend + oma-frontend) 并行 -> oma-qa |
| "Create a mobile app" | oma-pm -> (oma-backend + oma-mobile) 并行 -> oma-qa |
| "Fix bug and review" | oma-debug -> oma-qa |
| "Design and build a landing page" | oma-design -> oma-frontend |
| "I have an idea for a feature" | oma-brainstorm -> oma-pm -> 相关智能体 -> oma-qa |
| "Do everything automatically" | oma-orchestrator（内部：oma-pm -> 智能体 -> oma-qa） |

### 智能体间依赖规则

**可以并行运行（无依赖）：**
- oma-backend + oma-frontend（当 API 契约已预先定义时）
- oma-backend + oma-mobile（当 API 契约已预先定义时）
- oma-frontend + oma-mobile（彼此独立）

**必须顺序运行：**
- oma-brainstorm -> oma-pm（设计先于规划）
- oma-pm -> 所有其他智能体（规划先行）
- 实现智能体 -> oma-qa（实现后审查）
- oma-backend -> oma-frontend/oma-mobile（当没有预定义 API 契约时）

**QA 始终在最后**，除非用户仅请求审查特定文件。

---

## Token 节省计算

考虑一个 5 智能体编排会话（pm、backend、frontend、mobile、qa）：

**不使用渐进式披露：**
- 每个智能体加载所有资源：每个约 4,000 token
- 总计：5 x 4,000 = 20,000 token 在任何工作开始前消耗

**使用渐进式披露：**
- 所有智能体仅第一层：5 x 800 = 4,000 token
- 仅为活跃智能体加载第二层（通常同时 1-2 个）：+1,500 token
- 总计：约 5,500 token

**节省：约 72-75%**

在 flash 级别模型（128K 上下文）上，这意味着拥有 125K token 可用于工作而非 108K —— 对于复杂任务来说意义重大。

---

## 按任务难度加载资源

难度指南将任务分为三个级别，决定加载多少第二层内容：

### 简单（预期 3-5 回合）

单文件变更、需求明确、重复现有模式。

加载：仅 `execution-protocol.md`。跳过分析，使用最小检查清单直接实现。

### 中等（预期 8-15 回合）

2-3 个文件变更、需要一些设计决策、将模式应用到新领域。

加载：`execution-protocol.md` + `examples.md`。标准协议，简要分析和完整验证。

### 复杂（预期 15-25 回合）

4+ 个文件变更、需要架构决策、引入新模式、依赖其他智能体。

加载：`execution-protocol.md` + `examples.md` + `tech-stack.md` + `snippets.md`。扩展协议，带检查点、执行中进度记录和包含 `common-checklist.md` 的完整验证。

---

## 上下文加载任务映射（按智能体）

上下文加载指南提供详细的任务类型到资源映射。以下是关键映射：

### 后端智能体

| 任务类型 | 所需资源 |
|---------|---------|
| CRUD API 创建 | stack/snippets.md（路由、schema、模型、测试） |
| 认证 | stack/snippets.md（JWT、密码）+ stack/tech-stack.md |
| 数据库迁移 | stack/snippets.md（迁移） |
| 性能优化 | examples.md（N+1 示例） |
| 现有代码修改 | examples.md + Serena MCP |

### 前端智能体

| 任务类型 | 所需资源 |
|---------|---------|
| 组件创建 | snippets.md + component-template.tsx |
| 表单实现 | snippets.md（表单 + Zod） |
| API 集成 | snippets.md（TanStack Query） |
| 样式 | tailwind-rules.md |
| 页面布局 | snippets.md（网格）+ examples.md |

### 设计智能体

| 任务类型 | 所需资源 |
|---------|---------|
| 设计系统创建 | reference/typography.md + reference/color-and-contrast.md + reference/spatial-design.md + design-md-spec.md |
| 着陆页设计 | reference/component-patterns.md + reference/motion-design.md + prompt-enhancement.md + examples/landing-page-prompt.md |
| 设计审计 | checklist.md + anti-patterns.md |
| 设计令牌导出 | design-tokens.md |
| 3D / 着色器效果 | reference/shader-and-3d.md + reference/motion-design.md |
| 无障碍审查 | reference/accessibility.md + checklist.md |

### QA 智能体

| 任务类型 | 所需资源 |
|---------|---------|
| 安全审查 | checklist.md（安全章节） |
| 性能审查 | checklist.md（性能章节） |
| 无障碍审查 | checklist.md（无障碍章节） |
| 完整审计 | checklist.md（完整）+ self-check.md |
| 质量评分 | quality-score.md（条件） |

---

## 编排器提示组合

编排器为子智能体组合提示时，仅包含与任务相关的资源：

1. 智能体 SKILL.md 的核心规则部分
2. `execution-protocol.md`
3. 匹配特定任务类型的资源（来自上述映射）
4. `error-playbook.md`（始终包含 —— 恢复是必不可少的）
5. Serena 内存协议（CLI 模式）

这种有针对性的组合避免加载不必要的资源，最大化子智能体可用于实际工作的上下文空间。
