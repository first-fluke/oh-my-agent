---
title: 使用指南
sidebar_label: 使用 OMA
description: oh-my-agent 的全面使用指南。快速上手、涵盖单任务、多领域项目、bug 修复、设计系统、CLI 并行执行和 ultrawork 的详细实战示例。所有工作流命令、多语言自动检测示例、全部 21 个技能及用例、仪表盘设置、核心概念、技巧和故障排除。
---

# 如何使用 oh-my-agent

## 快速上手

1. 在选定的 AI IDE 或 CLI 中打开项目（Claude Code、Codex CLI、Cursor、Antigravity、OpenCode、Kimi、Kiro、Qwen 或其他受支持的宿主）
2. 选定的宿主可以从 `.agents/skills/` 加载技能；启用的钩子可以从自然语言关键词检测工作流
3. 用自然语言描述想完成的事情。宿主或选定的工作流会将任务路由到相关技能
4. 对于多智能体工作，使用 `/work` 或 `/orchestrate`

单领域任务不需要任何特殊语法。参见[技能和工作流选择指南](/docs/core-concepts/workflows#choosing-a-skill-or-workflow)，在单技能、`/work`、`/orchestrate`、`/ultrawork` 和 `/ralph` 之间选择。设置请参阅[快速开始](../getting-started/quick-start.md)，更改供应商前请阅读[重要默认值](../getting-started/important-defaults.md)。

---

## 示例 1：简单单任务

**你输入：**
```
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**发生了什么：**

1. 宿主会将请求路由到 `oma-frontend`（“form”、“component” 和 “Tailwind CSS”等关键词是路由信号）
2. 第一层（SKILL.md）已加载：智能体身份、核心规则、库列表
3. 第二层资源按需加载：
   - `execution-protocol.md`：4 步工作流（分析、规划、实现、验证）
   - `snippets.md`：表单 + Zod 验证模式
   - 项目已有组件模式，以及技能提供的 `snippets.md`（如有）
4. 智能体输出 **CHARTER_CHECK**：
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: email/password validation, accessible labels, keyboard-friendly
   - Assumptions: React + TypeScript, shadcn/ui, TailwindCSS v4, @tanstack/react-form + Zod
   ```
<!-- oma-docs:ignore-start -->
5. 智能体实现：
   - `src/features/auth/components/login-form.tsx` 中的 React TypeScript 组件
   - `src/features/auth/utils/login-validation.ts` 中的 Zod 验证 schema
   - `src/features/auth/utils/__tests__/login-validation.test.ts` 中的 Vitest 测试
   - `src/features/auth/components/skeleton/login-form-skeleton.tsx` 中的加载骨架屏
<!-- oma-docs:ignore-end -->
6. 智能体运行检查清单：无障碍性（ARIA 标签、语义 HTML、键盘导航）、移动视口、性能（无 CLS）、错误边界

**预期结果：**在项目支持这些检查时，得到一个范围明确的 React 组件，并附带 TypeScript、验证、测试和无障碍证据。实际运行哪些文件和检查，由提示和选定的工作流决定。

---

## 示例 2：多领域项目

**你输入：**
```
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**发生了什么：**

1. 该请求涉及前端、后端和移动端工作。宿主智能体可以根据这个范围推荐协调方式。
2. 启用关键词检测钩子后，“Build a TODO app”会匹配配置中的 `/orchestrate` 模式，可能激活该工作流。钩子匹配的是文本，不会将请求判定为多领域任务。使用明确的命令来选择所需工作流。

**使用 `/work`（逐步进行，用户控制）：**

```
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **步骤 1：PM 智能体规划**
   - 识别领域：backend（认证 API、任务 CRUD）、frontend（登录、任务列表 UI）、mobile（Flutter 应用）
   - 定义 API 契约：`POST /auth/register`、`POST /auth/login`、`POST /auth/refresh`、`GET /tasks`、`POST /tasks`、`PUT /tasks/:id`、`DELETE /tasks/:id`
   - 创建优先级任务分解：
     - P0：Backend 认证 API、Backend 任务 CRUD API
     - P1：Frontend 登录/注册、Frontend 任务列表、Mobile 认证界面、Mobile 任务列表
     - P2：QA 审查
   - 保存到 `.agents/results/plan-{sessionId}.json`

4. **步骤 2：审查计划** 智能体展示计划，并在已有授权范围内继续执行；只有缺少关键决策或需要新增授权时才询问。

5. **步骤 3：按优先级启动智能体**
   ```bash
   # P0 层（并行）
   oma agent spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 -w ./apps/api &
   oma agent spawn db "User and task schema design" session-todo-01 &
   wait

   # P1 层（并行，在 P0 完成后）
   oma agent spawn frontend "Login, register, task list UI" session-todo-01 -w ./apps/web &
   oma agent spawn mobile "Auth and task screens" session-todo-01 -w ./apps/mobile &
   wait
   ```

6. **步骤 4：QA 智能体审查**
   - 安全：OWASP Top 10 合规（JWT 验证、CSRF、SQL 注入检查）
   - 性能：N+1 查询检查、分页验证
   - 无障碍：所有 frontend 组件的 WCAG 2.1 AA
   - 跨领域：frontend、mobile 和 backend 之间的 API 契约对齐

7. **步骤 5：迭代** 如果 QA 发现 CRITICAL 问题，带着 QA 报告重新启动负责的智能体。

---

## 示例 3：Bug 修复

**你输入：**
```
There's a bug. Clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**发生了什么：**

1. `oma-debug` 自动激活（关键词："bug"、"error"、"Cannot read property"）
2. **步骤 1：收集** 捕获错误消息和上下文
<!-- oma-docs:ignore-start -->
3. **步骤 2：复现** MCP `search_for_pattern` 在 `src/features/tasks/components/task-list.tsx` 中找到 `.map()` 调用
<!-- oma-docs:ignore-end -->
4. **步骤 3：诊断** MCP `find_referencing_symbols` 追踪数据流：
   - `useQuery` 钩子从 API 获取任务
   - 组件在数据到达前就渲染了
   - `tasks` 在加载状态时是 `undefined`
   - 根因：在 `.map()` 前缺少加载状态检查
5. **步骤 4：提出修复方案** 展示最小变更，添加加载状态检查和空值守卫
6. **步骤 5：实现**
   - 在数据获取时添加加载骨架屏
   - 添加空值检查：`tasks?.map()` 或为加载状态提前返回
   - 编写回归测试，验证组件在 `tasks` 为 undefined 时正确渲染
7. **步骤 6：类似模式扫描** MCP `search_for_pattern` 搜索其他可能对 undefined 数组调用 `.map()` 的地方
   - 在 `user-list.tsx`、`comment-list.tsx`、`notification-list.tsx` 中找到 3 个类似模式
   - 主动应用相同的修复模式
8. **步骤 7：记录** bug 报告写入内存，包含根因、修复和预防措施

---

## 示例 4：设计系统

**你输入：**
```
Design a dark premium landing page for my B2B SaaS analytics product
```

**发生了什么：**

1. `oma-design` 激活（关键词："design"、"landing page"、"dark"、"premium"）
2. **阶段 1：SETUP** 检查 `.design-context.md`。如果缺失，会询问：
   - 服务支持哪些语言？（仅英文 / + CJK）
   - 目标受众？（B2B，技术用户，25-45 岁）
   - 品牌个性？（专业 / 高端）
   - 美学方向？（暗色高端）
   - 参考网站？（用户提供示例）
   - 无障碍性？（WCAG AA）
3. **阶段 3：ENHANCE** 如果提示词模糊，将其转换为逐节规范
4. **阶段 4：PROPOSE** 展示 3 个设计方向：
   - **方向 A："午夜天文台"**，深海军蓝（#0f1729），青色强调（#22d3ee），Inter + JetBrains Mono，bento 网格布局，滚动驱动显现
   - **方向 B："碳纤界面"**，中性灰（#18181b），琥珀强调（#f59e0b），系统字体，棋盘布局，悬停驱动微交互
   - **方向 C："深空"**，纯暗（#0a0a0a），翡翠强调（#10b981），Geist + Geist Mono，全出血区域，入场动画
5. **阶段 5：GENERATE** 基于选定方向生成：
   - 包含 6 个部分（字体、颜色、间距、动效、组件、无障碍）的 `DESIGN.md`
   - CSS 自定义属性
   - Tailwind 配置扩展
   - shadcn/ui 主题变量
6. **阶段 6：AUDIT** 运行响应式（320px 最小值）、WCAG 2.2、Nielsen 启发式、AI 痕迹检测的检查
7. **阶段 7：HANDOFF** "设计完成。运行 `/orchestrate` 使用 oma-frontend 实现。"

---

## 示例 5：CLI 并行执行

```bash
# Single agent for a simple task
oma agent spawn frontend "Add dark mode toggle to the header" session-ui-01

# Three agents in parallel for a full-stack feature
oma agent spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# After editing .agents/agents/ or workflows, regenerate vendor-native files
oma link claude codex antigravity

# Monitor while agents work (separate terminal)
oma dashboard terminal        # Terminal UI with live table
oma dashboard web    # Web UI at http://localhost:9847

# After implementation, run QA
oma agent spawn qa "Review notification feature across all platforms" session-notif-01

# Check session statistics after completion
oma stats get
```

如果当前运行时与 `.agents/oma-config.yaml` 中的目标供应商一致，工作流应优先使用原生子智能体：

- Claude Code -> `.claude/agents/*.md`
- Codex CLI -> `.codex/agents/*.toml`
- Qwen Code -> `.qwen/agents/*.md`，通过 Agent 工具的 `subagent_type` 选择
- Antigravity CLI/IDE -> 通过 `agy` 使用 `oma agent spawn`

跨供应商任务和 `model_preset: free` 使用 `oma agent spawn`。原生调度仍需通过[结果生命周期](./agent-results-and-resume.md)记录验证证据。

---

## 示例 6：Ultrawork，最高质量

**你输入：**
```
/ultrawork Build a payment processing module with Stripe integration
```

**发生了什么（5 个阶段，17 个步骤，12 个隔离审查步骤）：**

**阶段 1：PLAN（步骤 1-4，PM 智能体内联）**
- 步骤 1：创建计划，含任务分解、API 契约、依赖关系
- 步骤 2：计划审查，完整性检查（所有需求是否已映射？）
- 步骤 3：元审查，自我验证审查是否充分
- 步骤 4：过度工程审查，MVP 聚焦，无不必要的复杂性
- PLAN_GATE：计划已文档化、假设已列出、工作范围已获授权

**阶段 2：IMPL（步骤 5，开发智能体启动）**
- Backend 智能体实现 Stripe 集成（webhooks、幂等性、错误处理）
- Frontend 智能体构建结账流程和支付状态 UI
- 步骤 5.2：仅在需要明确定义的测量对比时才记录基线
- IMPL_GATE：适用的不生成产物的检查和测试通过、仅修改计划中的文件；只有明确要求时才运行构建检查

**阶段 3：VERIFY（步骤 6-8，QA 智能体启动）**
- 步骤 6：对齐审查，实现是否匹配计划？
- 步骤 7：安全/Bug 审查，OWASP、npm audit、Stripe 安全最佳实践
- 步骤 8：改进/回归审查，未引入回归
- VERIFY_GATE：零 CRITICAL、零 HIGH、适用的项目测量目标已达成

**阶段 4：REFINE（步骤 9-13，重构智能体启动）**
- 步骤 9：拆分大文件（> 500 行）和函数（> 50 行）
- 步骤 10：集成/复用审查，消除重复逻辑
- 步骤 11：副作用审查，使用 `find_referencing_symbols` 追踪级联影响
- 步骤 12：完整变更审查，命名一致性、风格对齐
- 步骤 13：清理死代码
- REFINE_GATE：无未解决的实测回归、代码干净

**阶段 5：SHIP（步骤 14-17，QA 智能体启动）**
- 步骤 14：代码质量审查，lint、类型、覆盖率
- 步骤 15：UX 流程验证，端到端支付用户旅程
- 步骤 16：相关问题审查，最终级联影响检查
- 步骤 17：部署就绪，密钥管理、迁移脚本、回滚计划
- SHIP_GATE：所有检查通过，沿用已有授权。发布或部署需获得针对该操作的授权。

---

## 所有工作流命令

| 命令 | 类型 | 功能 | 何时使用 |
|------|------|------|---------|
| `/orchestrate` | 持久化 | 加载或创建计划，然后分派并行执行，同时监控和验证 | 适合自动并行协调的独立任务 |
| `/work` | 持久化 | 在授权范围内逐步完成多领域规划、实现和 QA | 跨越多个领域、需要协调交付的功能 |
| `/ultrawork` | 持久化 | 包含 5 个阶段、17 个步骤和 12 个隔离审查检查点的质量工作流 | 最高质量交付，生产关键代码 |
| `/plan` | 非持久化 | PM 驱动的任务分解、API 契约，以及在 `docs/plans/work/` 中跟踪计划工件（顺序命名 `NNN-name.md`，使用 `Status` 字段管理生命周期） | 复杂多智能体工作之前，或需要跟踪进度和决策日志的复杂功能 |
| `/brainstorm` | 非持久化 | 设计优先的构思，提出 2 到 3 个方案 | 确定实现方案之前 |
| `/deepinit` | 非持久化 | 完整项目初始化（AGENTS.md、ARCHITECTURE.md、docs/） | 在现有代码库中设置 oh-my-agent |
| `/review` | 非持久化 | QA 流水线：OWASP 安全、性能、无障碍、代码质量 | 合并代码前或部署前审查 |
| `/debug` | 非持久化 | 结构化调试：复现、诊断、修复、回归测试、扫描 | 调查 bug 和错误 |
| `/design` | 非持久化 | 7 阶段设计工作流，产出包含令牌的 DESIGN.md | 构建设计系统、着陆页、UI 重设计 |
| `/scm` | 非持久化 | Git 的 SCM 工作流（分支、合并、冲突、工作树、基线）以及自动类型和范围检测、功能拆分的 Conventional Commit 生成 | 完成代码变更后，或处理仓库配置管理任务时 |
| `/tools` | 非持久化 | MCP 工具可见性管理（启用或禁用工具组） | 控制智能体可以使用的 MCP 工具 |
| `/stack-set` | 非持久化 | 自动检测项目技术栈并生成 backend 或 mobile（Swift、Flutter、RN）参考 | 设置语言专用编码约定 |
| `/architecture` | 非持久化 | 架构诊断、方案比较和决策记录 | 审查边界或选择架构 |
| `/convert` | 非持久化 | 将文档转换路由到适当技能 | 转换 HWP/HWPX 或 PDF 源文件 |
| `/docs` | 非持久化 | 文档验证和面向 diff 的同步提案 | 检查文档是否与当前代码库一致 |
| `/explain` | 非持久化 | 生成并验证离线 HTML 代码变更讲解 | 讲解 diff、PR、分支或提交范围 |
| `/recap` | 非持久化 | 汇总受支持的 AI 工具历史中的工作 | 每日或周期回顾 |
| `/schedule` | 非持久化 | 注册重复性智能体作业 | 夜间回顾、扫描或维护 |
| `/video` | 非持久化 | 从脚本、旁白和视觉素材合成可复现视频 | 短视频、讲解视频和演示 |
| `/ralph` | 持久化 | 反复执行 ultrawork，由独立 judge 验证并提供循环安全措施 | 明确要求重复执行，直到可用程序验证的完成标准通过 |

---

## 自动检测示例

oh-my-agent 会在 11 种语言中检测工作流关键词。下面的示例展示自然语言如何触发工作流：

| 你输入 | 检测到的工作流 | 语言 |
|--------|------------------|----------|
| "plan the authentication feature" | `/plan` | 英语 |
| "do everything in parallel" | `/orchestrate` | 英语 |
| "review the code for security" | `/review` | 英语 |
| "brainstorm some ideas for the dashboard" | `/brainstorm` | 英语 |
| "design a landing page for our product" | `/design` | 英语 |
| "fix the login bug" | `/debug` | 英语 |
| "계획 세워줘" | `/plan` | 韩语 |
| "버그 수정해줘" | `/debug` | 韩语 |
| "디자인 시스템 만들어줘" | `/design` | 韩语 |
| "자동으로 실행해" | `/orchestrate` | 韩语 |
| "コードレビューして" | `/review` | 日语 |
| "計画を立てて" | `/plan` | 日语 |
| "修复这个 bug" | `/debug` | 中文 |
| "设计一个着陆页" | `/design` | 中文 |
| "revisar código" | `/review` | 西班牙语 |
| "diseña la página" | `/design` | 西班牙语 |
| "debuggen" | `/debug` | 德语 |
| "coordonner étape par étape" | `/work` | 法语 |
| "don't stop until it's done" | `/ralph` | 英语 |
| "끝까지 해" | `/ralph` | 韩语 |
| "最後までやって" | `/ralph` | 日语 |

**信息性查询会被过滤：**

| 你输入 | 结果 |
|----------|------|
| "what is orchestrate?" | 不触发工作流（信息性模式：“what is”） |
| "explain how /plan works" | 不触发工作流（信息性模式：“explain”） |
| "어떻게 사용해?" | 不触发工作流（信息性模式：“어떻게”） |
| "レビューとは何ですか" | 不触发工作流（信息性模式：“とは”） |

---

## 全部 33 个技能：快速参考

安装器的 `all` 预设遵循当前注册表。表格按主要用途分组，每个技能仍可在边界处与其他技能协作。

| 技能 | 最适用于 | 主要输出 |
|-------|---------|---------------|
| **`oma-academic-writing`** | 学术写作起草、修订和反 AI 审查 | 面向发表的 prose 以及主张与证据修订 |
| **`oma-architecture`** | 系统边界、权衡、ADR | 架构建议或决策记录 |
| **`oma-backend`** | API、认证、服务端逻辑、迁移 | 路由器/服务/仓库变更和验证 |
| **`oma-brainstorm`** | 模糊想法和方案比较 | `docs/plans/designs/` 中的设计文档 |
| **`oma-coordination`** | 手动多智能体协调 | 逐步任务与交接指导 |
| **`oma-db`** | 模式设计、ERD、查询调优、容量规划 | 模式文档、迁移和恢复计划 |
| **`oma-debug`** | Bug 复现和根因分析 | 最小修复、回归证据和模式扫描 |
| **`oma-deepsec`** | 智能体驱动的漏洞扫描 | 扫描、分诊、重新验证和门禁报告 |
| **`oma-design`** | 设计系统、着陆页、令牌 | DESIGN.md、令牌和组件指导 |
| **`oma-dev-workflow`** | CI/CD、单体仓库、迁移、发布自动化 | 工作流配置和发布检查 |
| **`oma-docs`** | 损坏引用和文档漂移 | 验证报告或面向 diff 的同步候选 |
| **`oma-explanation`** | diff、PR、分支或提交讲解 | 包含 Background、Intuition、Code、Quiz 的离线 HTML 讲解 |
| **`oma-frontend`** | UI 组件、表单、页面、Angular 或 React 样式 | 前端变更和相关检查 |
| **`oma-hwp`** | HWP/HWPX/HWPML 转换 | 带标题、表格、图像和链接的 Markdown |
| **`oma-image`** | 图像生成和视觉素材 | 带清单的可复现图像运行 |
| **`oma-market`** | 痛点、趋势、竞品和发现研究 | 遵循 LAW 的研究简报及框架 |
| **`oma-mobile`** | Flutter、React Native 和 Swift iOS 工作 | 移动端界面、状态、平台集成和测试 |
| **`oma-observability`** | 追踪、指标、日志、剖析、SLO、事件取证 | 分层可观测性建议或实现指导 |
| **`oma-orchestration`** | 自动并行智能体执行 | 协调后的计划、内存更新和结果收集 |
| **`oma-pdf`** | PDF 转换和支持 OCR 的提取 | 保持阅读顺序、表格、列表和图像的 Markdown |
| **`oma-pm`** | 需求、任务分解、API 契约 | `.agents/results/plan-{sessionId}.json` 和任务板 |
| **`oma-qa`** | 安全、性能、无障碍和质量审查 | 带严重性和修复证据的发现报告 |
| **`oma-recap`** | 跨工具工作回顾 | 保存在 `.agents/results/recap/` 中的每日或周期回顾 |
| **`oma-refactor`** | 保持行为的结构重组 | 带特征测试和质量证据的重构变更 |
| **`oma-scholar`** | 学术搜索和论文 sidecar | 经过验证的 `.knows.yaml` sidecar 操作 |
| **`oma-scm`** | Git 分支、工作树、基线和提交规范 | SCM 计划或 Conventional Commit 输出 |
| **`oma-search`** | 带信任评分的文档、网络、代码和本地搜索 | 附信任标签的路由搜索结果 |
| **`oma-skill-creation`** | 创建和审计 OMA 技能 | SSL-lite 技能文件和 `oma skill audit` 结果 |
| **`oma-slide`** | HTML 演示文稿和导出 | 经过验证的打包 HTML、PDF、PNG 或 PPTX |
| **`oma-tf-infra`** | Terraform 基础设施、IAM 和策略即代码 | Terraform 模块、计划和控制措施 |
| **`oma-translation`** | UI、文档和营销本地化 | 保留上下文的翻译内容 |
| **`oma-video`** | 短视频、讲解视频和演示 | 带素材和清单的可复现视频运行 |
| **`oma-voice`** | 本地 TTS、STT 和配音 | 带清单的音频或转录工件 |

## 仪表盘设置

### 终端仪表盘

```bash
oma dashboard terminal
```

在终端中显示实时更新的表格：
- 会话 ID 和整体状态（RUNNING / COMPLETED / FAILED）
- 每智能体行：状态、轮次计数、最新活动、已用时间
- 监视 `.agents/state/memories/` 获取实时进度更新

### Web 仪表盘

```bash
oma dashboard web
# Opens http://localhost:9847
```

功能：
- 通过 WebSocket 实时更新（无需手动刷新）
- 连接断开时自动重连
- 带颜色编码智能体指示器的会话状态（绿色=完成、黄色=运行中、红色=失败）
- 从进度和结果文件流式传输的活动日志
- 历史会话数据

### 推荐布局

使用 3 个终端：
1. **仪表盘终端：** `oma dashboard terminal`，持续监控
2. **命令终端：** 智能体启动命令、工作流命令
3. **验证终端：** 测试运行、构建日志、git 操作

---

## 核心概念解释

### 渐进式披露

技能分两层加载以节省令牌。第一层（`SKILL.md`）会在宿主路由技能时进入上下文，注入器传递的是路径而不是正文。第二层（`resources/`）只在任务需要时读取；难度设定的是软预算，而不是文件清单。节省多少取决于技能和任务，因此请实际测量，不要预设数字：[令牌节省计算](../core-concepts/skills.md#token-savings-math)提供了测量脚本，并说明其估算涵盖哪些内容。

### 令牌优化

除渐进式披露外，oh-my-agent 还通过以下方式优化令牌：

- **上下文预算管理：**不读取完整文件，使用 `find_symbol` 而不是 `read_file`
- **延迟资源加载：**仅在发生错误时加载错误处理手册，仅在验证时加载检查清单
- **基于难度分支：**简单任务跳过分析并使用最小检查清单
- **进度追踪：**智能体记录已读文件，避免重复读取

### CLI 启动

运行 `oma agent spawn` 时，CLI 会：

1. 根据显式选项、智能体覆盖项、模型预设和配置的回退项解析角色供应商
2. 从 `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md` 注入供应商专用执行协议
3. 使用 `SKILL.md` 核心规则、执行协议和任务相关资源组合智能体提示
4. 将智能体作为独立 CLI 进程启动
5. 在 `.agents/state/agent-runs/` 下记录结构化回执，并注入声明路径
6. 智能体写入结构化声明，人类可读的进度和结果 Markdown 作为补充

### 项目内存存储

智能体通过 `.agents/state/memories/` 中的持久化文件协调（旧项目回退到旧版 `.serena/memories/` 路径）。编排器写入运行范围内的会话和任务板文件。启用 Markdown 进度或结果输出时，每次运行都会写入 `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` 和 `result-{agentId}-{taskId}-{runId}-{sessionId}.md`；CLI 启动的智能体以 `.agents/state/agent-runs/` 下的结构化回执和声明为准。智能体使用原生文件工具读写这些文件，工具映射可在 `.agents/mcp.json → memoryConfig.tools` 中配置。

### 工作区

<!-- oma-docs:ignore-start -->
`agent spawn` 的 `-w` 标志将智能体隔离到指定目录。这对并行执行至关重要。没有工作区隔离，两个智能体可能同时修改同一个文件并产生冲突。标准工作区布局：`./apps/api`（backend）、`./apps/web`（frontend）、`./apps/mobile`（mobile）。
<!-- oma-docs:ignore-end -->

---

## 技巧

1. **让提示具体。**“使用 JWT 认证、React 前端、Express 后端和 PostgreSQL 构建 TODO 应用”比“做一个应用”能产生更好的结果。

2. **并行智能体使用工作区。**始终传递 `-w ./path`，防止同时运行的智能体之间出现文件冲突。

3. **启动实现智能体前锁定 API 契约。**先运行 `/plan`，让前端和后端智能体对端点形状达成一致。

4. **主动监控。**打开仪表板终端，尽早发现失败的智能体，不要等所有智能体结束后才发现问题。

5. **通过重新启动进行迭代。**如果输出不正确，带上原始任务和修正上下文重新启动，不要从头开始。

6. **让协调方式匹配任务。**单领域任务使用单技能；任务需要协调或明确要求质量流程时，参见[选择指南](/docs/core-concepts/workflows#choosing-a-skill-or-workflow)。

7. **模糊想法先用 `/brainstorm` 再用 `/plan`。**在 PM 智能体分解任务前，brainstorm 会先澄清意图和方案。

8. **在新代码库上运行 `/deepinit`。**它会创建 AGENTS.md 和 ARCHITECTURE.md，帮助所有智能体理解项目结构。

9. **配置 `model_preset`。**从 `auto` 开始，选择固定预设 `claude`、`antigravity`、`codex`、`qwen`、`cursor`、`kiro` 或 `mixed`，也可以使用带本地网关的 `free`。添加 `agents:` 覆盖项进行细粒度控制。参见[按智能体选择模型](./per-agent-models.md)。

10. **明确需要完整审查流程时使用 `/ultrawork`。**五阶段工作流会运行 12 个隔离审查步骤；仅加载技能不会运行这些检查。

---

## 故障排除

| 问题 | 原因 | 修复 |
|---------|-------|-----|
| IDE 中未检测到技能 | `.agents/skills/` 缺失或没有 `SKILL.md` 文件 | 运行安装器（`bunx oh-my-agent@latest`），检查 `.claude/skills/` 中的符号链接，然后重启 IDE |
| 启动时找不到 CLI | 选定的 AI CLI 未安装或不在 `PATH` 中 | 运行 `which <selected-cli>`（例如 `claude`、`codex`、`agy`、`qwen` 或 `kiro`），打开新 shell，或按照安装指南安装 |
| 智能体生成互相冲突的代码 | 未隔离工作区 | 使用独立工作区：`-w ./apps/api`、`-w ./apps/web` |
| 仪表盘显示“未检测到智能体” | 智能体尚未写入内存 | 等待智能体启动（第一次写入发生在第 1 回合），或检查会话 ID 是否匹配 |
| Web 仪表盘无法启动 | 未安装依赖 | 先在 `web/` 目录中运行 `bun install` |
| QA 报告有 50 多个问题 | 大型代码库的首次审查通常如此 | 优先处理 CRITICAL 和 HIGH 严重性问题。将 MEDIUM/LOW 记录到后续迭代 |
| 自动检测触发了错误工作流 | 关键词存在歧义 | 使用显式 `/command` 代替自然语言。报告误触发以便改进 |
| 持久化工作流无法停止 | 状态文件仍然存在 | 在聊天中说“工作流已完成”，或从 `.agents/state/` 手动删除状态文件 |
| 智能体因 HIGH 澄清而阻塞 | 需求过于含糊 | 提供智能体要求的具体答案，然后重新运行 |
| MCP 工具无法使用 | Serena 未配置或未运行 | 运行 `oma doctor` 检查 MCP 配置 |
| 智能体超出执行预算 | 任务对单次运行来说过于复杂 | 拆分任务，使用带有明确任务边界的工作流，或使用更窄的验收契约重试 |
| 智能体使用了错误的 CLI | 未配置 `model_preset` 或缺少智能体覆盖项 | 运行 `oma install` 进行配置，或在 `oma-config.yaml` 中设置 `model_preset`。参见[按智能体选择模型](./per-agent-models.md) |

---

对于单领域任务模式，请参见[单技能指南](./single-skill.md)。
对于项目集成细节，请参见[集成指南](./integration.md)。
