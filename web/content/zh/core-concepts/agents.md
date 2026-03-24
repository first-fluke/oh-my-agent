---
title: 智能体
description: 全部 14 个 oh-my-agent 智能体的完整参考 —— 领域、技术栈、资源文件、能力、章程预检协议、两层技能加载、限定执行规则、质量关卡、工作空间策略、编排流程和运行时内存。
---

# 智能体

oh-my-agent 中的智能体是专业化的工程角色。每个智能体都有明确的领域、技术栈知识、资源文件、质量关卡和执行约束。智能体不是通用聊天机器人 —— 它们是有范围限制的工作者，严格待在自己的领域内并遵循结构化协议。

---

## 智能体分类

| 类别 | 智能体 | 职责 |
|------|-------|------|
| **构思** | oma-brainstorm | 探索想法，提出方案，产出设计文档 |
| **规划** | oma-pm | 需求分解、任务拆分、API 契约、优先级分配 |
| **实现** | oma-frontend、oma-backend、oma-mobile、oma-db | 在各自领域编写生产代码 |
| **设计** | oma-design | 设计系统、DESIGN.md、令牌、排版、色彩、动效、无障碍 |
| **基础设施** | oma-tf-infra | 多云 Terraform 部署、IAM、成本优化、策略即代码 |
| **DevOps** | oma-dev-workflow | mise 任务运行器、CI/CD、迁移、发布协调、单体仓库自动化 |
| **质量** | oma-qa | 安全审计（OWASP）、性能、无障碍（WCAG）、代码质量审查 |
| **调试** | oma-debug | Bug 复现、根因分析、最小修复、回归测试 |
| **本地化** | oma-translator | 保留语气、语域和领域术语的上下文感知翻译 |
| **协调** | oma-orchestrator、oma-coordination | 自动化和手动多智能体编排 |
| **Git** | oma-commit | 约定式提交生成、按功能拆分提交 |

---

## 详细智能体参考

### oma-brainstorm

**领域：** 规划或实现之前的设计优先构思。

**何时使用：** 探索新功能想法、理解用户意图、比较方案。在复杂或模糊的请求之前先于 `/plan` 使用。

**何时不使用：** 需求明确时（交给 oma-pm）、实现阶段（交给领域智能体）、代码审查（交给 oma-qa）。

**核心规则：**
- 设计批准前不进行实现或规划
- 一次只问一个澄清问题（不要批量提问）
- 始终提出 2-3 种方案并给出推荐选项
- 逐节设计，每一步都需要用户确认
- YAGNI —— 只设计需要的部分

**工作流：** 6 个阶段：上下文探索、提问、方案、设计、文档（保存到 `docs/plans/`）、过渡到 `/plan`。

**资源：** 仅使用共享资源（clarification-protocol、reasoning-templates、quality-principles、skill-routing）。

---

### oma-pm

**领域：** 产品管理 —— 需求分析、任务分解、API 契约。

**何时使用：** 分解复杂功能、判断可行性、确定工作优先级、定义 API 契约。

**核心规则：**
- API 优先设计：在实现任务之前定义契约
- 每个任务必须包含：智能体、标题、验收标准、优先级、依赖关系
- 最小化依赖以实现最大并行执行
- 安全和测试是每个任务的一部分（不是独立阶段）
- 任务必须可由单个智能体完成
- 输出 JSON 计划 + task-board.md 以兼容编排器

**输出：** `.agents/plan.json`、`.agents/brain/current-plan.md`、为编排器写入内存。

**资源：** `execution-protocol.md`、`examples.md`、`iso-planning.md`、`task-template.json`、`../_shared/core/api-contracts/`。

**回合限制：** 默认 10，最大 15。

---

### oma-frontend

**领域：** Web UI —— 基于 FSD-lite 架构的 React、Next.js、TypeScript。

**何时使用：** 构建用户界面、组件、客户端逻辑、样式、表单验证、API 集成。

**技术栈：**
- React + Next.js（默认服务端组件，交互时使用客户端组件）
- TypeScript（严格模式）
- TailwindCSS v4 + shadcn/ui（只读原语，通过 cva/包装器扩展）
- FSD-lite：根目录 `src/` + 功能目录 `src/features/*/`（禁止跨功能导入）

**库：**
| 用途 | 库 |
|------|-----|
| 日期 | luxon |
| 样式 | TailwindCSS v4 + shadcn/ui |
| Hooks | ahooks |
| 工具 | es-toolkit |
| URL 状态 | nuqs |
| 服务端状态 | TanStack Query |
| 客户端状态 | Jotai（尽量少用） |
| 表单 | @tanstack/react-form + Zod |
| 认证 | better-auth |

**核心规则：**
- shadcn/ui 优先，通过 cva 扩展，永远不要直接修改 `components/ui/*`
- 设计令牌 1:1 映射（永远不硬编码颜色）
- 代理优先于中间件（Next.js 16+ 使用 `proxy.ts` 而非 `middleware.ts` 处理代理逻辑）
- 超过 3 层的属性传递 —— 使用 Jotai atoms
- 必须使用 `@/` 绝对导入
- FCP 目标 < 1s
- 响应式断点：320px、768px、1024px、1440px

**资源：** `execution-protocol.md`、`tech-stack.md`、`tailwind-rules.md`、`component-template.tsx`、`snippets.md`、`error-playbook.md`、`checklist.md`、`examples/`。

**质量关卡检查清单：**
- 无障碍：ARIA 标签、语义化标题、键盘导航
- 移动端：在移动视口上验证
- 性能：无 CLS、快速加载
- 健壮性：错误边界和加载骨架屏
- 测试：逻辑由 Vitest 覆盖
- 质量：类型检查和 lint 通过

**回合限制：** 默认 20，最大 30。

---

### oma-backend

**领域：** API、服务端逻辑、认证、数据库操作。

**何时使用：** REST/GraphQL API、数据库迁移、认证、服务端业务逻辑、后台任务。

**架构：** Router（HTTP）-> Service（业务逻辑）-> Repository（数据访问）-> Models。

**栈检测：** 读取项目清单文件（pyproject.toml、package.json、Cargo.toml、go.mod 等）以确定语言和框架。如果存在 `stack/` 目录则回退到该目录，否则要求用户运行 `/stack-set`。

**核心规则：**
- 整洁架构：路由处理器中不放业务逻辑
- 使用项目的验证库验证所有输入
- 仅使用参数化查询（SQL 中禁止字符串拼接）
- JWT + bcrypt 用于认证；限制认证端点速率
- 支持异步的地方使用异步；所有签名加类型注解
- 通过集中错误模块处理自定义异常
- 显式 ORM 加载策略、事务边界、安全生命周期

**资源：** `execution-protocol.md`、`examples.md`、`orm-reference.md`、`checklist.md`、`error-playbook.md`。`stack/` 中的栈特定资源（由 `/stack-set` 生成）：`tech-stack.md`、`snippets.md`、`api-template.*`、`stack.yaml`。

**回合限制：** 默认 20，最大 30。

---

### oma-mobile

**领域：** 跨平台移动应用 —— Flutter、React Native。

**何时使用：** 原生移动应用（iOS + Android）、移动端特定 UI 模式、平台功能（相机、GPS、推送通知）、离线优先架构。

**架构：** 整洁架构：domain -> data -> presentation。

**技术栈：** Flutter/Dart、Riverpod/Bloc（状态管理）、Dio 带拦截器（API）、GoRouter（导航）、Material Design 3（Android）+ iOS HIG。

**核心规则：**
- 使用 Riverpod/Bloc 进行状态管理（复杂逻辑不使用原始 setState）
- 所有控制器在 `dispose()` 方法中释放
- Dio 带拦截器进行 API 调用；优雅处理离线状态
- 60fps 目标；在两个平台上测试

**资源：** `execution-protocol.md`、`tech-stack.md`、`snippets.md`、`screen-template.dart`、`checklist.md`、`error-playbook.md`、`examples.md`。

**回合限制：** 默认 20，最大 30。

---

### oma-db

**领域：** 数据库架构 —— SQL、NoSQL、向量数据库。

**何时使用：** 模式设计、ERD、规范化、索引、事务、容量规划、备份策略、迁移设计、向量数据库/RAG 架构、反模式审查、合规感知设计（ISO 27001/27002/22301）。

**默认工作流：** 探索（识别实体、访问模式、数据量）-> 设计（模式、约束、事务）-> 优化（索引、分区、归档、反模式）。

**核心规则：**
- 先选择模型，再选择引擎
- 关系型默认 3NF；分布式系统需文档化 BASE 权衡
- 记录所有三个模式层：外部、概念、内部
- 完整性是核心：实体、域、引用、业务规则
- 并发永远不是隐式的：定义事务边界和隔离级别
- 向量数据库是检索基础设施，不是数据源头
- 不要将向量搜索当作词法搜索的替代品

**必需交付物：** 外部模式摘要、概念模式、内部模式、数据标准表、术语表、容量估算、备份/恢复策略。向量/RAG：嵌入版本策略、分块策略、混合检索策略。

**资源：** `execution-protocol.md`、`document-templates.md`、`anti-patterns.md`、`vector-db.md`、`iso-controls.md`、`checklist.md`、`error-playbook.md`、`examples.md`。

---

### oma-design

**领域：** 设计系统、UI/UX、DESIGN.md 管理。

**何时使用：** 创建设计系统、着陆页、设计令牌、调色板、排版、响应式布局、无障碍审查。

**工作流：** 7 个阶段：设置（上下文收集）-> 提取（可选，从参考 URL）-> 增强（模糊提示增强）-> 提案（2-3 个设计方向）-> 生成（DESIGN.md + 令牌）-> 审计（响应式、WCAG、Nielsen、AI 泛滥检查）-> 交接。

**反模式强制执行（"杜绝 AI 泛滥"）：**
- 排版：默认系统字体栈；无正当理由不使用默认 Google Fonts
- 色彩：禁止紫蓝渐变、渐变球体/斑块、纯白配纯黑
- 布局：禁止嵌套卡片、仅桌面布局、千篇一律的 3 指标统计布局
- 动效：禁止到处使用弹跳缓动、动画时长不超过 800ms、必须尊重 prefers-reduced-motion
- 组件：禁止到处使用毛玻璃效果，所有交互元素需要键盘/触摸替代

**核心规则：**
- 首先检查 `.design-context.md`；缺失则创建
- 默认系统字体栈（中日韩语言使用 CJK 就绪字体）
- 所有设计至少达到 WCAG AA 标准
- 响应式优先（移动端为默认）
- 提出 2-3 个方向，获得确认

**资源：** `execution-protocol.md`、`anti-patterns.md`、`checklist.md`、`design-md-spec.md`、`design-tokens.md`、`prompt-enhancement.md`、`stitch-integration.md`、`error-playbook.md`，以及 `reference/` 目录（typography、color-and-contrast、spatial-design、motion-design、responsive-design、component-patterns、accessibility、shader-and-3d）和 `examples/`（design-context-example、landing-page-prompt）。

---

### oma-tf-infra

**领域：** 使用 Terraform 的基础设施即代码，多云。

**何时使用：** 在 AWS/GCP/Azure/Oracle Cloud 上部署、Terraform 配置、CI/CD 认证（OIDC）、CDN/负载均衡/存储/网络、状态管理、ISO 合规基础设施。

**云检测：** 读取 Terraform 提供者和资源前缀（`google_*` = GCP、`aws_*` = AWS、`azurerm_*` = Azure、`oci_*` = Oracle Cloud）。包含完整的多云资源映射表。

**核心规则：**
- 提供者无关：从项目上下文检测云
- 带版本控制和锁定的远程状态
- CI/CD 认证优先使用 OIDC
- 始终先 plan 再 apply
- 最小权限 IAM
- 为一切打标签（Environment、Project、Owner、CostCenter）
- 代码中不存放密钥
- 版本锁定所有提供者和模块
- 生产环境禁止自动批准

**资源：** `execution-protocol.md`、`multi-cloud-examples.md`、`cost-optimization.md`、`policy-testing-examples.md`、`iso-42001-infra.md`、`checklist.md`、`error-playbook.md`、`examples.md`。

---

### oma-dev-workflow

**领域：** 单体仓库任务自动化和 CI/CD。

**何时使用：** 运行开发服务器、跨应用执行 lint/format/typecheck、数据库迁移、API 生成、i18n 构建、生产构建、CI/CD 优化、提交前验证。

**核心规则：**
- 始终使用 `mise run` 任务而非直接使用包管理器命令
- 仅对变更的应用运行 lint/test
- 使用 commitlint 验证提交消息
- CI 应跳过未变更的应用
- 存在 mise 任务时不要使用直接的包管理器命令

**资源：** `validation-pipeline.md`、`database-patterns.md`、`api-workflows.md`、`i18n-patterns.md`、`release-coordination.md`、`troubleshooting.md`。

---

### oma-qa

**领域：** 质量保证 —— 安全、性能、无障碍、代码质量。

**何时使用：** 部署前的最终审查、安全审计、性能分析、无障碍合规、测试覆盖率分析。

**审查优先级顺序：** 安全 > 性能 > 无障碍 > 代码质量。

**严重级别：**
- **CRITICAL**：安全漏洞、数据丢失风险
- **HIGH**：阻碍发布
- **MEDIUM**：本迭代修复
- **LOW**：待办

**核心规则：**
- 每个发现必须包含文件:行号、描述和修复方案
- 先运行自动化工具（npm audit、bandit、lighthouse）
- 不允许误报 —— 每个发现必须可复现
- 提供修复代码，而非仅描述

**资源：** `execution-protocol.md`、`iso-quality.md`、`checklist.md`、`self-check.md`、`error-playbook.md`、`examples.md`。

**回合限制：** 默认 15，最大 20。

---

### oma-debug

**领域：** Bug 诊断与修复。

**何时使用：** 用户报告的 Bug、崩溃、性能问题、间歇性故障、竞态条件、回归 Bug。

**方法论：** 先复现，再诊断。永远不要猜测修复方案。

**核心规则：**
- 找到根因，而非仅处理症状
- 最小修复：只改必要的部分
- 每个修复都要有回归测试
- 搜索代码库中的相似模式
- 记录到 `.agents/brain/bugs/`

**使用的 Serena MCP 工具：**
- `find_symbol("functionName")` —— 定位函数
- `find_referencing_symbols("Component")` —— 查找所有用法
- `search_for_pattern("error pattern")` —— 查找相似问题

**资源：** `execution-protocol.md`、`common-patterns.md`、`debugging-checklist.md`、`bug-report-template.md`、`error-playbook.md`、`examples.md`。

**回合限制：** 默认 15，最大 25。

---

### oma-translator

**领域：** 上下文感知的多语言翻译。

**何时使用：** 翻译 UI 字符串、文档、营销文案、审查现有翻译、创建术语表。

**4 阶段方法：** 分析原文（语域、意图、领域术语、文化引用、情感内涵、修辞手法映射）-> 提取含义（去除源语言结构）-> 在目标语言中重构（自然语序、语域匹配、句子拆分/合并）-> 验证（自然度评分 + 反 AI 模式检查）。

**可选 7 阶段精炼模式**用于出版级品质：增加批判审查、修订和润色阶段。

**核心规则：**
- 先扫描现有区域设置文件以匹配惯例
- 翻译含义，而非逐字翻译
- 保留情感内涵
- 永远不要逐字翻译
- 同一篇文章中不混合语域
- 保留领域特定术语原文

**资源：** `translation-rubric.md`、`anti-ai-patterns.md`。

---

### oma-orchestrator

**领域：** 通过 CLI 启动的自动化多智能体协调。

**何时使用：** 需要多个智能体并行处理的复杂功能、自动化执行、全栈实现。

**配置默认值：**

| 设置 | 默认值 | 说明 |
|------|-------|------|
| MAX_PARALLEL | 3 | 最大并发子智能体数 |
| MAX_RETRIES | 2 | 每个失败任务的重试次数 |
| POLL_INTERVAL | 30s | 状态检查间隔 |
| MAX_TURNS（实现） | 20 | backend/frontend/mobile 的回合限制 |
| MAX_TURNS（审查） | 15 | qa/debug 的回合限制 |
| MAX_TURNS（规划） | 10 | pm 的回合限制 |

**工作流阶段：** 规划 -> 设置（会话 ID、内存初始化）-> 执行（按优先级层启动）-> 监控（轮询进度）-> 验证（自动化 + 交叉审查循环）-> 收集（汇编结果）。

**智能体间审查循环：**
1. 自审：智能体根据验收标准检查自己的差异
2. 自动验证：`oh-my-ag verify {agent-type} --workspace {workspace}`
3. 交叉审查：QA 智能体审查变更
4. 失败时：问题反馈进行修复（最多 5 次总循环迭代）

**澄清债务监控：** 追踪会话期间的用户纠正。事件评分为 clarify（+10）、correct（+25）、redo（+40）。CD >= 50 触发强制根因分析。CD >= 80 暂停会话。

**资源：** `subagent-prompt-template.md`、`memory-schema.md`。

---

### oma-commit

**领域：** 遵循约定式提交的 Git 提交生成。

**何时使用：** 完成代码变更后，运行 `/commit` 时。

**提交类型：** feat、fix、refactor、docs、test、chore、style、perf。

**工作流：** 分析变更 -> 按功能拆分（如 > 5 个文件跨不同范围）-> 确定类型 -> 确定范围 -> 编写描述（祈使句，< 72 字符，小写，无句尾点号）-> 立即执行提交。

**规则：**
- 永远不使用 `git add -A` 或 `git add .`
- 永远不提交密钥文件
- 暂存时始终指定文件
- 多行提交消息使用 HEREDOC
- Co-Author：`First Fluke <our.first.fluke@gmail.com>`

---

## 章程预检（CHARTER_CHECK）

在编写任何代码之前，每个实现智能体必须输出一个 CHARTER_CHECK 块：

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {智能体领域}
- Must NOT do: {任务范围中的 3 个约束}
- Success criteria: {可衡量的标准}
- Assumptions: {应用的默认值}
```

**目的：**
- 声明智能体将做和不做什么
- 在代码编写之前捕获范围蔓延
- 使假设对用户审查透明
- 提供可测试的成功标准

**澄清级别：**
- **LOW**：需求明确。按声明的假设继续执行。
- **MEDIUM**：部分模糊。列出选项，按最可能的方案继续。
- **HIGH**：非常模糊。设置状态为阻塞，列出问题，不编写代码。

在子智能体模式（CLI 启动）中，智能体无法直接询问用户。LOW 继续执行，MEDIUM 收窄并解释，HIGH 阻塞并返回问题给编排器转达。

---

## 两层技能加载

每个智能体的知识分为两层：

**第一层 —— SKILL.md（约 800 字节）：**
始终加载。包含前置元数据（名称、描述）、何时使用/不使用、核心规则、架构概览、库列表以及第二层资源的引用。

**第二层 —— resources/（按需加载）：**
仅在智能体活跃工作时加载，且仅加载与任务类型和难度匹配的资源：

| 难度 | 加载的资源 |
|------|----------|
| **简单** | 仅 execution-protocol.md |
| **中等** | execution-protocol.md + examples.md |
| **复杂** | execution-protocol.md + examples.md + tech-stack.md + snippets.md |

执行过程中根据需要加载额外资源：
- `checklist.md` —— 在验证步骤
- `error-playbook.md` —— 仅在发生错误时
- `common-checklist.md` —— 用于复杂任务的最终验证

---

## 限定执行

智能体在严格的领域边界内运作：

- 前端智能体不会修改后端代码
- 后端智能体不会触碰 UI 组件
- 数据库智能体不会实现 API 端点
- 智能体为其他智能体记录超出范围的依赖

当执行过程中发现属于其他领域的任务时，智能体会在其结果文件中将其记录为升级项，而不是尝试自行处理。

---

## 工作空间策略

对于多智能体项目，独立的工作空间可防止文件冲突：

```
./apps/api      → 后端智能体工作空间
./apps/web      → 前端智能体工作空间
./apps/mobile   → 移动端智能体工作空间
```

启动智能体时通过 `-w` 参数指定工作空间：

```bash
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## 编排流程

运行多智能体工作流（`/orchestrate` 或 `/coordinate`）时：

1. **PM 智能体**将请求分解为带优先级（P0、P1、P2）和依赖关系的领域特定任务
2. **初始化会话** —— 生成会话 ID，在内存中创建 `orchestrator-session.md` 和 `task-board.md`
3. **P0 任务**并行启动（最多 MAX_PARALLEL 个并发智能体）
4. **监控进度** —— 编排器每 POLL_INTERVAL 轮询 `progress-{agent}.md` 文件
5. **P1 任务**在 P0 完成后启动，依此类推
6. **验证循环**为每个完成的智能体运行（自审 -> 自动验证 -> QA 交叉审查）
7. **收集结果**从所有 `result-{agent}.md` 文件
8. **最终报告**包含会话摘要、变更文件、遗留问题

---

## 智能体定义

智能体在两个位置定义：

**`.agents/agents/`** —— 包含 7 个子智能体定义文件：
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`

这些文件定义了智能体的身份、执行协议引用、CHARTER_CHECK 模板、架构摘要和规则。通过 Task/Agent 工具（Claude Code）或 CLI 启动子智能体时使用。

**`.claude/agents/`** —— IDE 特定的子智能体定义，通过符号链接或直接复制引用 `.agents/agents/` 文件，以兼容 Claude Code。

---

## 运行时状态（Serena 内存）

编排会话期间，智能体通过 `.serena/memories/`（可通过 `mcp.json` 配置）中的共享内存文件进行协调：

| 文件 | 所有者 | 目的 | 其他 |
|------|-------|------|------|
| `orchestrator-session.md` | 编排器 | 会话 ID、状态、开始时间、阶段追踪 | 只读 |
| `task-board.md` | 编排器 | 任务分配、优先级、状态更新 | 只读 |
| `progress-{agent}.md` | 该智能体 | 逐回合进度：执行的操作、读取/修改的文件、当前状态 | 编排器读取 |
| `result-{agent}.md` | 该智能体 | 最终输出：状态（completed/failed）、摘要、变更文件、验收标准清单 | 编排器读取 |
| `session-metrics.md` | 编排器 | 澄清债务追踪、质量评分进展 | QA 读取 |
| `experiment-ledger.md` | 编排器/QA | 质量评分活跃时的实验追踪 | 全部读取 |

内存工具可配置。默认使用 Serena MCP（`read_memory`、`write_memory`、`edit_memory`），但可在 `mcp.json` 中配置自定义工具：

```json
{
  "memoryConfig": {
    "provider": "serena",
    "basePath": ".serena/memories",
    "tools": {
      "read": "read_memory",
      "write": "write_memory",
      "edit": "edit_memory"
    }
  }
}
```

仪表板（`oma dashboard` 和 `oma dashboard:web`）监控这些内存文件以实现实时监控。
