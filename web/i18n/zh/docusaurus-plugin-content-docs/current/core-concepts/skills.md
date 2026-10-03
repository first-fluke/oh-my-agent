---
title: 技能
description: OMA 33 个技能的两层架构完整指南，涵盖 SKILL.md 路由、按需资源、共享与条件协议、供应商执行、令牌测量和路由机制。
---

# 技能

技能是为调度角色提供领域指导的结构化知识包。它们包含执行协议、技术栈参考、代码模板、错误处理手册、质量检查清单，以及技能提供的示例，并按为节省令牌而设计的两层架构组织。

---

## 两层设计

### 第一层：SKILL.md（在技能路由后加载）

每个技能的根目录都有一个 `SKILL.md` 文件。技能被路由后，该文件会进入上下文窗口。注入器钩子传递的是**路径引用**，而不是文件正文，因此未路由的技能除了 `description` 外不会产生额外开销。文件包含：

- **YAML 前置元数据**，包含 `name` 和 `description`（用于路由和显示）
- **何时使用 / 何时不使用**：明确的激活条件
- **核心规则**：该领域最关键的 5 到 15 条约束
- **架构概览**：代码应如何组织
- **库列表**：已批准的依赖及其用途
- **引用**：指向第二层资源的指针（不会自动加载）

前置元数据示例：

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

`description` 字段很关键，因为技能路由系统使用其中的路由关键词将任务匹配到智能体。

### 第二层：resources/（按需加载）

`resources/` 目录包含深入的执行知识。只有满足以下条件时才会加载其中的文件：

1. 宿主或工作流已选择该技能，例如通过原生技能匹配或显式命令
2. 当前任务满足相应参考资料的加载条件

这种按需加载由上下文加载指南（`.agents/skills/_shared/core/context-loading.md`）控制，该指南区分入口指令与按任务选定的参考资料。

---

## 文件结构示例

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Layer 1: loaded when routed
└── resources/
    ├── execution-protocol.md         ← Layer 2: step-by-step workflow
    ├── tech-stack.md                 ← Layer 2: detailed technology specs
    ├── angular-rules.md              ← Layer 2: Angular-specific conventions
    ├── snippets.md                   ← Layer 2: copy-paste code patterns
    ├── error-playbook.md             ← Layer 2: error recovery procedures
    └── checklist.md                  ← Layer 2: quality verification checklist

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── orm-reference.md              ← Domain-specific (ORM queries, N+1, transactions)
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Shipped language seeds / generated references
    ├── node/
    ├── python/
    └── rust/

.agents/skills/oma-mobile/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── tech-stack.md
│   ├── screen-template.dart
│   ├── screen-template.swift         ← Swift native iOS screen template
│   ├── screen-template.tsx            ← React Native screen template
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Stack schema and generated platform references
    ├── README.md
    └── stack.schema.json

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
└── reference/                         ← Deep reference material
    ├── typography.md
    ├── color-and-contrast.md
    ├── spatial-design.md
    ├── motion-design.md
    ├── responsive-design.md
    ├── component-patterns.md
    ├── accessibility.md
    └── shader-and-3d.md
```

---

## 每种技能资源的类型

| 资源类型 | 文件名模式 | 用途 | 加载时机 |
|--------------|-----------------|-------------|-------------|
| **执行协议** | `execution-protocol.md` | 分步工作流：分析 -> 规划 -> 实现 -> 验证 | 所选操作需要其命令或契约细节时 |
| **技术栈** | `tech-stack.md` | 详细技术规范、版本和配置 | 所选框架或技术栈决策 |
| **错误处理手册** | `error-playbook.md` | 带有“三次失败”升级的恢复流程 | 仅在出错时 |
| **检查清单** | `checklist.md` | 领域专用的质量验证 | 验证步骤 |
| **代码片段** | `snippets.md` | 可直接复制的代码模式 | 不熟悉的实现方式或输出形态 |
| **示例** | `examples.md` 或 `examples/` | 面向 LLM 的少样本输入输出示例 | 不熟悉的实现方式或输出形态 |
| **变体** | `variants/` 目录 | 语言或框架专用参考。后端提供 `node`、`python` 和 `rust` 种子，移动端提供模式，并可接收生成的平台参考资料。 | 存在匹配的技术栈时 |
| **模板** | `component-template.tsx`、`screen-template.dart` | 样板文件模板 | 创建组件时 |
| **领域参考** | `orm-reference.md`、`anti-patterns.md` 等 | 特定子任务的深入领域知识 | 按任务类型 |

---

## 共享资源（_shared/）

所有智能体都共享 `.agents/skills/_shared/` 中的公共基础。这些资源分为三类：

### 核心资源（`.agents/skills/_shared/core/`）

| 资源 | 用途 | 加载时机 |
|------|------|---------|
| **`skill-routing.md`** | 按任务结果、归属和实际依赖路由；没有强制的智能体链，也没有回合配额。 | 由编排技能和协调技能引用 |
| **`context-loading.md`** | 所属技能的入口、按条件加载的参考资料，以及运行时加载边界。 | 组合上下文时 |
| **`prompt-structure.md`** | 指导不熟悉任务的交接，涵盖目标、上下文、真实约束和验收证据；直接任务没有强制模板。 | 由 PM 智能体和所有工作流引用 |
| **`clarification-protocol.md`** | 根据上下文确定常规细节，仅在缺少关键信息或授权时才询问。 | 需求不明确时 |
| **`context-budget.md`** | 文件大小估算、实际提示测量、限定范围的读取和检查点。 | 长任务或上下文开销诊断 |
| **`difficulty-guide.md`** | 根据依赖关系和验证需求，选择规划深度和交付物。 | 任务分解需要难度估计时 |
| **`quality-principles.md`** | 范围、可维护性、证据，以及与任务相称的验证指导。 | 以质量为重点的工作流（ultrawork）开始时 |
| **`vendor-detection.md`** | 检测当前运行时环境的协议（Claude Code、Codex CLI、Antigravity、Cursor、Kiro、Qwen 和 CLI 回退）。使用宿主标记和配置的供应商状态。 | 工作流开始时 |
| **`session-metrics.md`** | 可选的会话证据，不含对话或评估器罚分。 | 被要求的复盘或实质性纠正 |
| **`common-checklist.md`** | 适用的跨领域检查；没有全局行数限制，也没有一刀切的异常捕获要求。 | 跨领域审查（相关时） |
| **`lessons-learned.md`** | 记录并应用有证据支持、带版本和触发条件的经验教训；不设自动 RCA 阈值。 | 出错后和会话结束时引用 |
| **`api-contracts/`** | 可选的契约模板。复用项目现有模式；生成的契约位于技能源码之外。 | 规划跨边界工作时 |

### 运行时资源（`.agents/skills/_shared/runtime/`）

| 资源 | 用途 |
|----------|---------|
| **`memory-protocol.md`** | CLI 子智能体的内存文件格式和操作。定义使用可配置内存工具（read、write、edit）的启动、执行中和完成协议，并包含实验追踪扩展。 |
| **`execution-protocols/claude.md`** | Claude Code 专用执行模式。供应商为 claude 时由 `oma agent spawn` 注入。 |
| **`execution-protocols/antigravity.md`** | Antigravity CLI（`agy`）执行模式。 |
| **`execution-protocols/codex.md`** | Codex CLI 专用执行模式。 |
| **`execution-protocols/commandcode.md`** | CommandCode 执行模式。 |
| **`execution-protocols/grok.md`** | Grok 执行模式。 |
| **`execution-protocols/kimi.md`** | Kimi Code 执行模式。 |
| **`execution-protocols/kiro.md`** | Kiro 执行模式。 |
| **`execution-protocols/opencode.md`** | OpenCode 扩展的执行模式。 |
| **`execution-protocols/pi.md`** | pi 扩展的执行模式。 |
| **`execution-protocols/qwen.md`** | Qwen CLI 专用执行模式。 |

供应商专用的执行协议会由 `oma agent spawn` 自动注入 CLI 子智能体。原生子智能体使用所选供应商的集成规则。

### 条件资源（`.agents/skills/_shared/conditional/`）

只有执行过程中满足特定条件时才会加载这些资源：

| 资源 | 触发条件 | 加载方 |
|---------------------|-----------------|---------|
| **`quality-score.md`** | 需要已定义的基线或实验对比 | 编排器（传递给 QA 智能体提示） |
| **`experiment-ledger.md`** | 建立 IMPL 基线后首次记录实验 | 编排器（在基线测量后内联） |
| **`exploration-loop.md`** | 多次恢复失败，且有值得在预算内测试的替代方案 | 编排器（启动假设智能体前内联） |

这些资源会推迟加载，直到各自的触发条件成立。仅凭难度不会注入它们。

---

## 技能如何通过 skill-routing.md 路由

技能路由映射定义任务如何匹配到智能体：

### 简单路由（单一领域）

包含“使用 Tailwind CSS 构建登录表单”的提示会匹配 `UI`、`component`、`form` 和 `Tailwind` 关键词，并路由到 **oma-frontend**。

### 复杂请求路由

多领域请求遵循既定的执行顺序：

| 请求模式 | 执行顺序 |
|---------|---------|
| “创建全栈应用” | oma-pm ->（oma-backend + oma-frontend）并行 -> oma-qa |
| “创建移动应用” | oma-pm ->（oma-backend + oma-mobile）并行 -> oma-qa |
| “修复问题并审查” | oma-debug -> oma-qa |
| “设计并构建着陆页” | oma-design -> oma-frontend |
| “我有一个功能想法” | oma-brainstorm -> oma-pm -> 相关智能体 -> oma-qa |
| “自动完成所有工作” | oma-orchestration（内部：oma-pm -> 智能体 -> oma-qa） |

### 智能体间依赖规则

**可以并行运行（没有依赖）：**
- oma-backend + oma-frontend（API 契约已预先定义时）
- oma-backend + oma-mobile（API 契约已预先定义时）
- oma-frontend + oma-mobile（彼此独立时）

**必须顺序运行：**
- oma-brainstorm -> oma-pm（先设计，再规划）
- oma-pm -> 所有其他智能体（先规划）
- 实现智能体 -> oma-qa（实现后审查）
- oma-backend -> oma-frontend/oma-mobile（没有预定义 API 契约时）

**QA 始终最后运行**，除非用户只要求审查特定文件。

---

## 令牌节省计算 {#token-savings-math}

先测量，再声称节省：

```bash
bun scripts/measure-skill-context.ts
bun scripts/measure-skill-context.ts --skills oma-pm,oma-backend,oma-frontend --json
oma agent context backend --difficulty Simple
```

该脚本为文件大小场景报告估算值，计算方式是 UTF-8 字节数除以 4。`routed` 只有入口；`simple`、`medium` 和 `complex` 会加入假设存在的协议、示例和技术栈文件，用于对比。保留这些名称是为了兼容脚本，不是预加载指令。`all` 是资源大小的上限，不是运行时配置。全新检出时可能用一个平台种子作为大小代理值，并不会加载每个平台。

上下文命令会显示实际注入的任务上下文。它不包含对话的其余部分，也不包含全部宿主或运行时指令。要测量指定模型上的总输入令牌数、延迟和成本，请使用组装好的提示或用量遥测。不要根据仓库大小或生成的镜像计数推断这些指标。

## 按任务加载资源 {#resource-loading-by-task}

每个难度级别都从所属技能开始。引用图是参考资料索引；相邻关系不授权加载其他专业技能、错误处理手册或条件实验工作流。

加载器为 Simple / Medium / Complex 分别设定 1,500 / 4,000 / 8,000 个估算令牌的软预算。超出预算的入口仍会保留，并报告超出部分。辅助参考资料保持推迟加载，除非在其任务触发条件确定后明确选定。必需的入口绝不会用更小的无关文档替换。

验证取决于任务风险和项目要求。难度标签不要求完整的测试套件、固定的预检响应，也不要求对已获授权的工作再次批准。

## 上下文加载任务映射（按智能体）

以下示例列出任务需要时可查阅的参考资料。请使用所属技能当前的索引，只选取适用的章节：

### 后端智能体

| 任务类型 | 所需资源 |
|-----------|-------------------|
| CRUD API 创建 | 存在时使用匹配的 `variants/{node,python,rust}/snippets.md` |
| 身份验证 | 存在时使用匹配变体的 `snippets.md` + `tech-stack.md` |
| 数据库迁移 | 存在时使用匹配变体的 `snippets.md` |
| 性能优化 | `orm-reference.md` 和技能提供的匹配示例 |
| 修改现有代码 | 项目代码智能提供程序和相关执行资源 |

### 前端智能体

| 任务类型 | 所需资源 |
|-----------|-------------------|
| 创建组件 | `snippets.md` + 项目现有组件模式 |
| 实现表单 | `snippets.md`（表单 + Zod） |
| API 集成 | `snippets.md`（TanStack Query） |
| 样式处理 | `tailwind-rules.md` |
| 页面布局 | `snippets.md`（网格） |

### 设计智能体

| 任务类型 | 所需资源 |
|-----------|-------------------|
| 创建设计系统 | `reference/typography.md` + `reference/color-and-contrast.md` + `reference/spatial-design.md` + `design-md-spec.md` |
| 设计着陆页 | `reference/component-patterns.md` + `reference/motion-design.md` + `prompt-enhancement.md` |
| 设计审计 | `checklist.md` + `anti-patterns.md` |
| 导出设计令牌 | `design-tokens.md` |
| 3D / 着色器效果 | `reference/shader-and-3d.md` + `reference/motion-design.md` |
| 无障碍审查 | `reference/accessibility.md` + `checklist.md` |

### QA 智能体

| 任务类型 | 所需资源 |
|-----------|-------------------|
| 安全审查 | `checklist.md`（安全章节） |
| 性能审查 | `checklist.md`（性能章节） |
| 无障碍审查 | `checklist.md`（无障碍章节） |
| 完整审计 | `checklist.md`（完整）+ `self-check.md` |
| 已定义指标的对比 | 条件资源 `quality-score.md` |

---

## 编排器提示组合

编排器为子智能体组合提示时，只包含与任务相关的资源：

1. 所属技能的 SKILL.md 路径（CLI 调度已注入正文）
2. 所选操作对应的 execution-protocol 章节（需要时）
3. 与特定任务类型匹配的资源（来自上述映射）
4. 相关的 error-playbook 章节（仅在观察到失败之后）
5. 内存协议（CLI 模式）

这种定向组合避免加载不必要的资源，使子智能体有更多上下文空间处理实际工作。

---

## 会话证据与复盘审查

会话记录会收录实质性纠正、范围变更、返工和已裁定的审查发现，并附上证据。必要的澄清不计罚分。原有的 CD 和 EA 加权评分，以及由阈值触发的 RCA 规则已经移除；它们是提示指令，不是 CLI 计算出的指标。

尽量使用已有的任务结果。在配置的协调存储下，单独的 `session-metrics-{sessionId}.md` 是可选的。重复失败或被要求的复盘可能值得记录经验教训，但普通的检查失败或有争议的发现不会自动构成经验教训。保留历史日志，不要把它们改写成新格式。

`oma stats` 报告生产力指标，以及已记录的用量和成本摘要。`oma retro` 把实际发生的关卡、阻塞和决策缺失事件归纳为建议。两者都不会根据这些 Markdown 工件计算 CD/EA 评分。

## 任务分解与上下文恢复

围绕依赖关系和可独立验证的行为制定计划。固定的迭代数量、文件数量和回合估计都不决定审查深度，也不决定任务是否完成。把测试和错误处理与它们验证的行为放在一起。

遇到实际观察到的停滞或有用上下文丢失时，先保存已完成的工作、剩余的验收标准、相关路径和验证证据，再恢复或重新调度。保留已有工作，避免重复启动仍在运行的尝试。仅凭回合与进度之比不要求重置。

## 条件度量与探索

已定义的基线或实验对比会启用度量指导，仅有测试或 lint 则不会。记录可比较的指标，并附上单位、方法、修订版本和证据。必需的正确性和安全检查仍然保持独立。OMA 没有默认的综合评分公式、字母等级关卡，也没有由评分触发的回滚。

真正的实验会记录假设、基线与候选方案的证据、必需的检查、决策，以及归属该实验的文件。反复失败可能值得在现有恢复预算内测试另一种机制。隔离实验改动，保留无关改动，并在恢复关卡之前验证集成后的候选方案。
