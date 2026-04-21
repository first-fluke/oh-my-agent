---
title: 使用指南
description: oh-my-agent 的全面使用指南 —— 快速上手、涵盖单任务、多领域项目、bug 修复、设计系统、CLI 并行执行和 ultrawork 的详细实战示例。所有工作流命令、多语言自动检测示例、全部 21 个技能及用例、仪表盘设置、核心概念、技巧和故障排除。
---

# 如何使用 oh-my-agent

## 快速上手

1. 在 AI 驱动的 IDE 中打开你的项目（Claude Code、Gemini CLI、Cursor、Antigravity 等）
2. 技能从 `.agents/skills/` 自动检测
3. 用自然语言描述你想做的事 —— oh-my-agent 会路由到正确的智能体
4. 对于多智能体工作，使用 `/work` 或 `/orchestrate`

以上就是全部工作流。单领域任务不需要任何特殊语法。

---

## 示例 1：简单单任务

**你输入：**
```
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**发生了什么：**

1. `oma-frontend` 技能自动激活（关键词："form"、"component"、"Tailwind CSS"）
2. 第一层（SKILL.md）已加载 —— 智能体身份、核心规则、库列表
3. 第二层资源按需加载：
   - `execution-protocol.md` —— 4 步工作流（分析、规划、实现、验证）
   - `snippets.md` —— 表单 + Zod 验证模式
   - `component-template.tsx` —— React 组件结构
4. 智能体输出 **CHARTER_CHECK**：
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: email/password validation, accessible labels, keyboard-friendly
   - Assumptions: React + TypeScript, shadcn/ui, TailwindCSS v4, @tanstack/react-form + Zod
   ```
5. 智能体实现：
   - `src/features/auth/components/login-form.tsx` 中的 React TypeScript 组件
   - `src/features/auth/utils/login-validation.ts` 中的 Zod 验证 schema
   - `src/features/auth/utils/__tests__/login-validation.test.ts` 中的 Vitest 测试
   - `src/features/auth/components/skeleton/login-form-skeleton.tsx` 中的加载骨架屏
6. 智能体运行检查清单：无障碍性（ARIA 标签、语义 HTML、键盘导航）、移动视口、性能（无 CLS）、错误边界

**输出：** 一个生产就绪的 React 组件，包含 TypeScript、验证、测试和无障碍性 —— 不只是建议。

---

## 示例 2：多领域项目

**你输入：**
```
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**发生了什么：**

1. 关键词检测识别为多领域（frontend + backend + mobile）
2. 如果你未使用工作流命令，oh-my-agent 会建议 `/work` 或 `/orchestrate`

**使用 `/work`（逐步进行，用户控制）：**

```
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **步骤 1 —— PM 智能体规划：**
   - 识别领域：backend（认证 API、任务 CRUD）、frontend（登录、任务列表 UI）、mobile（Flutter 应用）
   - 定义 API 契约：`POST /auth/register`、`POST /auth/login`、`POST /auth/refresh`、`GET /tasks`、`POST /tasks`、`PUT /tasks/:id`、`DELETE /tasks/:id`
   - 创建优先级任务分解：
     - P0：Backend 认证 API、Backend 任务 CRUD API
     - P1：Frontend 登录/注册、Frontend 任务列表、Mobile 认证界面、Mobile 任务列表
     - P2：QA 审查
   - 保存到 `.agents/results/plan-{sessionId}.json`

4. **步骤 2 —— 你审查并确认计划**

5. **步骤 3 —— 按优先级启动智能体：**
   ```bash
   # P0 层（并行）
   oma agent:spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 -w ./apps/api &
   oma agent:spawn db "User and task schema design" session-todo-01 &
   wait

   # P1 层（并行，在 P0 完成后）
   oma agent:spawn frontend "Login, register, task list UI" session-todo-01 -w ./apps/web &
   oma agent:spawn mobile "Auth and task screens" session-todo-01 -w ./apps/mobile &
   wait
   ```

6. **步骤 4 —— QA 智能体审查：**
   - 安全：OWASP Top 10 合规（JWT 验证、CSRF、SQL 注入检查）
   - 性能：N+1 查询检查、分页验证
   - 无障碍：所有 frontend 组件的 WCAG 2.1 AA
   - 跨领域：frontend、mobile 和 backend 之间的 API 契约对齐

7. **步骤 5 —— 迭代：** 如果 QA 发现 CRITICAL 问题，带着 QA 报告重新启动负责的智能体。

---

## 示例 3：Bug 修复

**你输入：**
```
There's a bug — clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**发生了什么：**

1. `oma-debug` 自动激活（关键词："bug"、"error"、"Cannot read property"）
2. **步骤 1 —— 收集：** 捕获错误消息和上下文
3. **步骤 2 —— 复现：** MCP `search_for_pattern` 在 `src/features/tasks/components/task-list.tsx` 中找到 `.map()` 调用
4. **步骤 3 —— 诊断：** MCP `find_referencing_symbols` 追踪数据流：
   - `useQuery` 钩子从 API 获取任务
   - 组件在数据到达前就渲染了
   - `tasks` 在加载状态时是 `undefined`
   - 根因：在 `.map()` 前缺少加载状态检查
5. **步骤 4 —— 提出修复方案：** 展示最小变更 —— 添加加载状态检查和空值守卫
6. **步骤 5 —— 实现：**
   - 在数据获取时添加加载骨架屏
   - 添加空值检查：`tasks?.map()` 或为加载状态提前返回
   - 编写回归测试，验证组件在 `tasks` 为 undefined 时正确渲染
7. **步骤 6 —— 类似模式扫描：** MCP `search_for_pattern` 搜索其他可能对 undefined 数组调用 `.map()` 的地方
   - 在 `user-list.tsx`、`comment-list.tsx`、`notification-list.tsx` 中找到 3 个类似模式
   - 主动应用相同的修复模式
8. **步骤 7 —— 记录：** bug 报告写入内存，包含根因、修复和预防措施

---

## 示例 4：设计系统

**你输入：**
```
Design a dark premium landing page for my B2B SaaS analytics product
```

**发生了什么：**

1. `oma-design` 激活（关键词："design"、"landing page"、"dark"、"premium"）
2. **阶段 1 —— SETUP：** 检查 `.design-context.md`。如果缺失，会询问：
   - 服务支持哪些语言？（仅英文 / + CJK）
   - 目标受众？（B2B，技术用户，25-45 岁）
   - 品牌个性？（专业 / 高端）
   - 美学方向？（暗色高端）
   - 参考网站？（用户提供示例）
   - 无障碍性？（WCAG AA）
3. **阶段 3 —— ENHANCE：** 如果提示词模糊，将其转换为逐节规范
4. **阶段 4 —— PROPOSE：** 展示 3 个设计方向：
   - **方向 A："午夜天文台"** —— 深海军蓝（#0f1729），青色强调（#22d3ee），Inter + JetBrains Mono，bento 网格布局，滚动驱动显现
   - **方向 B："碳纤界面"** —— 中性灰（#18181b），琥珀强调（#f59e0b），系统字体，棋盘布局，悬停驱动微交互
   - **方向 C："深空"** —— 纯暗（#0a0a0a），翡翠强调（#10b981），Geist + Geist Mono，全出血区域，入场动画
5. **阶段 5 —— GENERATE：** 基于选定方向生成：
   - 包含 6 个部分（字体、颜色、间距、动效、组件、无障碍）的 `DESIGN.md`
   - CSS 自定义属性
   - Tailwind 配置扩展
   - shadcn/ui 主题变量
6. **阶段 6 —— AUDIT：** 运行响应式（320px 最小值）、WCAG 2.2、Nielsen 启发式、AI 痕迹检测的检查
7. **阶段 7 —— HANDOFF：** "设计完成。运行 `/orchestrate` 使用 oma-frontend 实现。"

---

## 示例 5：CLI 并行执行

```bash
# 单智能体 —— 简单任务
oma agent:spawn frontend "Add dark mode toggle to the header" session-ui-01

# 三个智能体并行 —— 全栈功能
oma agent:spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent:spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent:spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# 在智能体工作时监控（另一个终端）
oma dashboard        # 终端 UI，实时表格
oma dashboard:web    # Web UI，http://localhost:9847

# 实现完成后，运行 QA
oma agent:spawn qa "Review notification feature across all platforms" session-notif-01

# 完成后查看会话统计
oma stats
```

---

## 示例 6：Ultrawork —— 最高质量

**你输入：**
```
/ultrawork Build a payment processing module with Stripe integration
```

**发生了什么（5 个阶段，17 个步骤，11 个审查步骤）：**

**阶段 1 —— PLAN（步骤 1-4，PM 智能体内联）：**
- 步骤 1：创建计划，含任务分解、API 契约、依赖关系
- 步骤 2：计划审查 —— 完整性检查（所有需求是否已映射？）
- 步骤 3：元审查 —— 自我验证审查是否充分
- 步骤 4：过度工程审查 —— MVP 聚焦，无不必要的复杂性
- PLAN_GATE：计划已文档化、假设已列出、用户确认

**阶段 2 —— IMPL（步骤 5，开发智能体启动）：**
- Backend 智能体实现 Stripe 集成（webhooks、幂等性、错误处理）
- Frontend 智能体构建结账流程和支付状态 UI
- 步骤 5.2：测量基线质量评分（测试、lint、类型检查）
- IMPL_GATE：构建成功、测试通过、仅修改计划中的文件

**阶段 3 —— VERIFY（步骤 6-8，QA 智能体启动）：**
- 步骤 6：对齐审查 —— 实现是否匹配计划？
- 步骤 7：安全/Bug 审查 —— OWASP、npm audit、Stripe 安全最佳实践
- 步骤 8：改进/回归审查 —— 未引入回归
- VERIFY_GATE：零 CRITICAL、零 HIGH、质量评分 >= 75

**阶段 4 —— REFINE（步骤 9-13，Debug 智能体启动）：**
- 步骤 9：拆分大文件（> 500 行）和函数（> 50 行）
- 步骤 10：集成/复用审查 —— 消除重复逻辑
- 步骤 11：副作用审查 —— 使用 `find_referencing_symbols` 追踪级联影响
- 步骤 12：完整变更审查 —— 命名一致性、风格对齐
- 步骤 13：清理死代码
- REFINE_GATE：质量评分未回退、代码干净

**阶段 5 —— SHIP（步骤 14-17，QA 智能体启动）：**
- 步骤 14：代码质量审查 —— lint、类型、覆盖率
- 步骤 15：UX 流程验证 —— 端到端支付用户旅程
- 步骤 16：相关问题审查 —— 最终级联影响检查
- 步骤 17：部署就绪 —— 密钥管理、迁移脚本、回滚计划
- SHIP_GATE：所有检查通过、用户最终批准

---

## 所有工作流命令

| 命令 | 类型 | 功能 | 何时使用 |
|------|------|------|---------|
| `/orchestrate` | 持久化 | 自动并行智能体执行，带监控和验证循环 | 需要最大并行度的大型项目 |
| `/work` | 持久化 | 逐步多领域协调，每个关卡需用户批准 | 跨多个智能体的功能，需要控制权 |
| `/ultrawork` | 持久化 | 5 阶段、17 步质量工作流，11 个审查检查点 | 最高质量交付，生产关键代码 |
| `/plan` | 非持久化 | PM 驱动的任务分解和 API 契约定义 | 任何复杂多智能体工作之前 |
| `/exec-plan` | 非持久化 | 创建和跟踪执行计划作为仓库产物 | 需要跟踪进度和决策日志的复杂功能 |
| `/brainstorm` | 非持久化 | 设计优先的创意探索，含 2-3 个方案提议 | 在确定实现方案之前 |
| `/deepinit` | 非持久化 | 完整项目初始化 —— AGENTS.md、ARCHITECTURE.md、docs/ | 在现有代码库中设置 oh-my-agent |
| `/review` | 非持久化 | QA 流水线：OWASP 安全、性能、无障碍、代码质量 | 合并代码前、部署前审查 |
| `/debug` | 非持久化 | 结构化调试：复现、诊断、修复、回归测试、扫描 | 调查 bug 和错误 |
| `/design` | 非持久化 | 7 阶段设计工作流，产出包含 token 的 DESIGN.md | 构建设计系统、着陆页、UI 重设计 |
| `/scm` | 非持久化 | Conventional Commit，含自动类型/范围检测和功能拆分 | 完成代码变更后 |
| `/tools` | 非持久化 | MCP 工具可见性管理（启用/禁用组） | 控制智能体可用的 MCP 工具 |
| `/stack-set` | 非持久化 | 自动检测项目技术栈并生成 backend 参考 | 设置语言特定的编码约定 |

---

## 自动检测示例

oh-my-agent 在 11 种语言中检测工作流关键词。以下示例展示自然语言如何触发工作流：

| 你输入 | 检测到的工作流 | 语言 |
|--------|-------------|------|
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

**信息性查询会被过滤：**

| 你输入 | 结果 |
|--------|------|
| "what is orchestrate?" | 不触发工作流（信息性模式："what is"） |
| "explain how /plan works" | 不触发工作流（信息性模式："explain"） |
| "어떻게 사용해?" | 不触发工作流（信息性模式："어떻게"） |
| "レビューとは何ですか" | 不触发工作流（信息性模式："とは"） |

---

## 全部 14 个技能 —— 快速参考

| 技能 | 最适用于 | 主要输出 |
|------|---------|---------|
| **oma-brainstorm** | "我有一个想法"，探索方案 | `docs/plans/` 中的设计文档 |
| **oma-pm** | "规划这个"，任务分解 | `.agents/results/plan-{sessionId}.json`、`task-board.md` |
| **oma-frontend** | UI 组件、表单、页面、样式 | React/TypeScript 组件、Vitest 测试 |
| **oma-backend** | API、认证、服务端逻辑、迁移 | 端点、模型、服务、测试 |
| **oma-db** | Schema 设计、ERD、查询调优、容量规划 | Schema 文档、迁移脚本、术语表 |
| **oma-mobile** | 移动应用、平台特性 | Flutter 界面、状态管理、测试 |
| **oma-design** | 设计系统、着陆页、token | `DESIGN.md`、CSS/Tailwind token、组件规范 |
| **oma-qa** | 安全审计、性能、无障碍 | 包含 CRITICAL/HIGH/MEDIUM/LOW 发现的 QA 报告 |
| **oma-debug** | Bug 调查、根因分析 | 修复的代码 + 回归测试 + 类似模式修复 |
| **oma-tf-infra** | 云基础设施供应 | Terraform 模块、IAM 策略、成本估算 |
| **oma-dev-workflow** | CI/CD、monorepo 任务、发布自动化 | mise.toml 配置、流水线定义 |
| **oma-translator** | 多语言内容、i18n 文件 | 保持语气和语域的翻译文本 |
| **oma-orchestrator** | 自动并行智能体执行 | 来自多个智能体的编排结果 |
| **oma-scm** | Git 提交 | 具有正确类型/范围的 Conventional Commits |

---

## 仪表盘设置

### 终端仪表盘

```bash
oma dashboard
```

在终端中显示实时更新的表格：
- 会话 ID 和整体状态（RUNNING / COMPLETED / FAILED）
- 每智能体行：状态、轮次计数、最新活动、已用时间
- 监视 `.serena/memories/` 获取实时进度更新

### Web 仪表盘

```bash
oma dashboard:web
# 打开 http://localhost:9847
```

功能：
- 通过 WebSocket 实时更新（无需手动刷新）
- 连接断开时自动重连
- 带颜色编码智能体指示器的会话状态（绿色=完成、黄色=运行中、红色=失败）
- 从进度和结果文件流式传输的活动日志
- 历史会话数据

### 推荐布局

使用 3 个终端：
1. **仪表盘终端：** `oma dashboard` —— 持续监控
2. **命令终端：** 智能体启动命令、工作流命令
3. **构建终端：** 测试运行、构建日志、git 操作

---

## 核心概念解释

### 渐进式披露

技能分两层加载以节省 token。第一层（SKILL.md，约 800 字节）始终存在。第二层（resources/）仅在智能体工作时加载，且仅加载与任务难度匹配的资源。与前期全量加载相比，这节省了约 75% 的 token。在 flash 级别模型（128K 上下文）上，这意味着约 125K token 可用于实际工作，而非 108K。

### Token 优化

除渐进式披露外，oh-my-agent 通过以下方式优化 token：
- **上下文预算管理** —— 不读取完整文件；使用 `find_symbol` 而非 `read_file`
- **延迟资源加载** —— 仅在出错时加载错误手册，仅在验证时加载检查清单
- **基于难度分支** —— 简单任务跳过分析，使用最小检查清单
- **进度跟踪** —— 智能体记录已读文件以防重复读取

### CLI 启动

运行 `oma agent:spawn` 时，CLI：
1. 解析供应商（使用 5 级优先级）
2. 从 `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md` 注入供应商特定的执行协议
3. 使用 SKILL.md 核心规则、执行协议和任务相关资源组合智能体提示词
4. 作为独立 CLI 进程启动智能体
5. 智能体将进度写入 `.serena/memories/progress-{agent}.md`
6. 完成后，将最终结果写入 `.serena/memories/result-{agent}.md`

### Serena 内存

智能体通过 `.serena/memories/` 中的共享内存文件进行协调。编排器写入 `orchestrator-session.md`（会话状态）和 `task-board.md`（任务分配）。每个智能体写入自己的 `progress-{agent}.md`（逐轮更新）和 `result-{agent}.md`（最终输出）。内存工具可配置 —— 默认通过 Serena MCP 使用 `read_memory`、`write_memory`、`edit_memory`。

### 工作区

`agent:spawn` 上的 `-w` 标志将智能体隔离到特定目录。这对并行执行至关重要 —— 没有工作区隔离，两个智能体可能同时修改同一文件，产生冲突。标准工作区布局：`./apps/api`（backend）、`./apps/web`（frontend）、`./apps/mobile`（mobile）。

---

## 技巧

1. **提示词要具体。** "Build a TODO app with JWT auth, React frontend, Express backend, PostgreSQL" 比 "make an app" 产生更好的结果。

2. **并行智能体使用工作区。** 始终传递 `-w ./path` 以防止同时运行的智能体之间的文件冲突。

3. **在启动实现智能体前锁定 API 契约。** 先运行 `/plan`，让 frontend 和 backend 智能体在端点格式上达成一致。

4. **主动监控。** 打开仪表盘终端尽早发现失败的智能体，而不是等到所有智能体完成后才发现问题。

5. **通过重启迭代。** 如果智能体输出不对，带上原始任务加修正上下文重新启动。不要重来。

6. **不确定时从 `/work` 开始。** 它提供逐步指导，在每个关卡获取用户确认。

7. **模糊想法时先用 `/brainstorm` 再用 `/plan`。** brainstorm 在 PM 智能体分解任务之前先澄清意图和方案。

8. **在新代码库上运行 `/deepinit`。** 它创建 AGENTS.md 和 ARCHITECTURE.md，帮助所有智能体理解项目结构。

9. **配置智能体-CLI 映射。** 将复杂推理任务（qa、debug、frontend）路由到 Claude，将快速生成任务（backend、pm）路由到 Gemini。

10. **生产关键代码使用 `/ultrawork`。** 5 阶段、11 审查步骤的工作流能捕获简单工作流遗漏的问题。

---

## 故障排除

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| IDE 中未检测到技能 | `.agents/skills/` 缺失或没有 `SKILL.md` 文件 | 运行安装器（`bunx oh-my-agent@latest`），验证 `.claude/skills/` 中的符号链接，重启 IDE |
| 启动时找不到 CLI | AI CLI 未全局安装 | `which gemini` / `which claude` —— 按安装指南安装缺失的 CLI |
| 智能体产生冲突的代码 | 无工作区隔离 | 使用独立工作区：`-w ./apps/api`、`-w ./apps/web` |
| 仪表盘显示"未检测到智能体" | 智能体尚未写入内存 | 等待智能体开始（第 1 轮时首次写入），或验证会话 ID 匹配 |
| Web 仪表盘无法启动 | 依赖未安装 | 先在 web/ 目录运行 `bun install` |
| QA 报告有 50+ 个问题 | 大型代码库首次审查的正常现象 | 先聚焦 CRITICAL 和 HIGH 严重度。将 MEDIUM/LOW 记录为未来冲刺任务。 |
| 自动检测触发了错误的工作流 | 关键词歧义 | 使用显式 `/command` 代替自然语言。报告误触发以改进。 |
| 持久化工作流无法停止 | 状态文件仍然存在 | 在聊天中说 "workflow done"，或手动从 `.agents/state/` 删除状态文件 |
| 智能体因 HIGH 澄清被阻塞 | 需求太模糊 | 提供智能体请求的具体答案，然后重新运行 |
| MCP 工具不工作 | Serena 未配置或未运行 | 使用 `oma doctor` 验证 MCP 配置 |
| 智能体超出轮次限制 | 任务对默认轮次来说太复杂 | 使用 `-t 30` 标志增加轮次，或分解为更小的任务 |
| 智能体使用了错误的 CLI | agent_cli_mapping 未配置 | 运行 `oma install` 进行配置，或直接编辑 `oma-config.yaml` |

---

有关单领域任务模式，参见[单技能指南](./single-skill.md)。
有关项目集成详情，参见[集成指南](./integration.md)。
