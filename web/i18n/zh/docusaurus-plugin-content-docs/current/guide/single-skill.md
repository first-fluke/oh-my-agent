---
title: "指南：单技能执行"
sidebar_label: 单技能
description: oh-my-agent 单领域任务的详细指南，涵盖适用时机、预检清单、带说明的提示模板、前端、后端、移动端和数据库任务的真实示例、预期执行流程、质量关卡检查清单以及升级信号。
---

# 单技能执行

单技能执行是快速路径：一个智能体、一个领域、一个聚焦任务。它没有编排开销和多智能体协调。宿主或选定的工作流可以将自然语言提示路由到该技能；钩子系统自身负责检测工作流，路由行为取决于所选运行时。

## 快速路径

1. 运行一次 `oma doctor`，确认选定的宿主集成。任务不使用相关供应商时，可选供应商警告不会阻塞任务。
2. 描述一个自包含的变更，明确写出 **Goal**、**Context**、**Constraints** 和 **Done When** 条件。
3. 选定技能会检查仓库；当前执行契约启用时，会声明范围并输出 `CHARTER_CHECK`，然后报告实际运行的检查。
4. 如果任务扩展到 API、UI、数据库或移动端边界，停止单技能运行并切换到 `/work` 或 `/orchestrate`。

对于停滞的受管运行，使用 `oma agent status <session-id> [agent-id]`，然后检查 `.agents/state/agent-runs/` 中的回执和注入的声明路径，再重试。供应商和恢复行为请参见[重要默认值](../getting-started/important-defaults.md)。

---

## 何时使用单技能

当你的任务满足以下所有条件时使用：

- **属于单一领域**：整个任务属于前端、后端、移动端、数据库、设计、基础设施或其他单一领域
- **自包含**：不需要跨领域 API 契约变更，前端任务不需要后端变更
- **范围明确**：你知道输出应该是什么（一个组件、一个端点、一个模式、一个修复）
- **无需协调**：其他智能体不需要在之前或之后运行

**单技能任务示例：**
- 构建一个 UI 组件
- 添加一个 API 端点
- 修复一层中的一个 Bug
- 设计一个数据库表
- 编写一个 Terraform 模块
- 翻译一组 i18n 字符串
- 创建一个设计系统章节

**切换到多智能体**（`/work` 或 `/orchestrate`）的时机：
- UI 工作需要新的 API 契约（前端 + 后端）
- 一个修复在多层之间产生级联影响（调试 + 实现智能体）
- 功能跨越前端、后端和数据库
- 第一次迭代后范围扩展到超出单一领域

单技能工作也包含测试和验收标准；仅有这些要求不意味着要用 `/ralph`。需要跨领域协调或明确要求质量流程时，参见[技能和工作流选择指南](/docs/core-concepts/workflows#choosing-a-skill-or-workflow)。

---

## 预检清单

提示之前，回答以下四个问题（它们对应[提示结构](/docs/core-concepts/skills)的四个要素）：

| 要素 | 问题 | 为什么重要 |
|------|------|----------|
| **目标** | 应该创建或更改什么具体产物？ | 防止歧义："添加一个按钮"与"添加一个带验证的表单" |
| **上下文** | 适用什么技术栈、框架和约定？ | 智能体从项目文件检测，但明确指定更好 |
| **约束** | 必须遵循什么规则？（样式、安全、性能、兼容性） | 没有约束，智能体使用可能不符合你项目的默认值 |
| **完成条件** | 你将检查什么验收标准？ | 给智能体一个目标，给你一个验证清单 |

如果提示中缺少任何要素，智能体将：
- **LOW 不确定性：** 应用默认值并列出假设
- **MEDIUM 不确定性：** 提出 2-3 个选项并按最可能的继续
- **HIGH 不确定性：** 阻塞并提问（不会编写代码）

---

## 提示模板

```text
Build <specific artifact> using <stack/framework>.
Constraints: <style, performance, security, or compatibility constraints>.
Acceptance criteria:
1) <testable criterion>
2) <testable criterion>
3) <testable criterion>
Add tests for: <critical test cases>.
```

### 模板拆解

| 部分 | 目的 | 示例 |
|------|------|------|
| `Build <specific artifact>` | 目标：创建什么 | "Build a user registration form component" |
| `using <stack/framework>` | 上下文：技术栈 | "using React + TypeScript + Tailwind CSS" |
| `Constraints:` | 智能体必须遵循的规则 | "accessible labels, no external form libraries, client-side validation only" |
| `Acceptance criteria:` | 完成条件：可验证的结果 | "1) email format validation 2) password strength indicator 3) submit disabled while invalid" |
| `Add tests for:` | 测试要求 | "valid/invalid submit paths, edge cases for email validation" |

---

## 真实示例

### 前端：登录表单

```text
Create a login form component in React + TypeScript + Tailwind CSS.
Constraints: accessible labels, client-side validation with Zod, no external form library beyond @tanstack/react-form, shadcn/ui Button and Input components.
Acceptance criteria:
1) Email validation with meaningful error messages
2) Password minimum 8 characters with feedback
3) Disabled submit button while form is invalid
4) Keyboard and screen-reader friendly (ARIA labels, focus management)
5) Loading state while submitting
Add unit tests for: valid submission path, invalid email, short password, loading state.
```

**预期执行流程：**

1. **技能路由**：宿主或工作流选择 `oma-frontend`（"form"、"component"、"Tailwind CSS" 和 "React" 等关键词是路由信号）。
2. **难度评估**：中等（2-3 个文件，需要在验证 UX 上做一些设计决策）。
3. **加载的资源：**
   - `execution-protocol.md`（始终加载）
   - `snippets.md`（表单 + Zod 模式）
   - 现有组件模式；如果技能提供，则加载 `snippets.md`
4. **执行契约（启用时可能输出 `CHARTER_CHECK`）：**
   ```
`CHARTER_CHECK`:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: form validation, accessibility, loading state, tests
   - Assumptions: Next.js App Router, `@tanstack/react-form` + Zod, shadcn/ui, FSD-lite architecture
   ```
<!-- oma-docs:ignore-start -->
5. **实现：**
   - 创建 `src/features/auth/components/login-form.tsx`（带 `"use client"` 的 Client Component）
   - 创建 `src/features/auth/utils/login-schema.ts`（Zod schema）
   - 创建 `src/features/auth/components/skeleton/login-form-skeleton.tsx`
   - 使用 shadcn/ui 的 `<Button>`、`<Input>`、`<Label>`（只读，不修改）
   - 使用 `@tanstack/react-form` 和 Zod 处理表单
   - 使用 `@/` 绝对导入
   - 每个文件包含一个组件
6. **验证：**
   - 检查清单：存在 ARIA 标签、语义化标题，键盘导航可用
   - 移动端：在 320px 视口中正确渲染
   - 性能：无 CLS
   - 测试：`src/features/auth/utils/__tests__/login-schema.test.ts` 中的 Vitest 测试文件
<!-- oma-docs:ignore-end -->

---

### 后端：REST API 端点

```text
Add a paginated GET /api/tasks endpoint that returns tasks for the authenticated user.
Constraints: Repository-Service-Router pattern, parameterized queries, JWT auth required, cursor-based pagination.
Acceptance criteria:
1) Returns only tasks owned by the authenticated user
2) Cursor-based pagination with next/prev cursors
3) Filterable by status (todo, in_progress, done)
4) Response includes total count
Add tests for: auth required, pagination, status filter, empty results.
```

**预期执行流程：**

1. **技能激活：** `oma-backend` 激活（关键词："API"、"endpoint"、"REST"）
2. **栈检测**：读取 `pyproject.toml` 或 `package.json` 确定语言和框架。如果生成的 `stack/` 参考或随附 `variants/` 存在，则从中加载约定。
3. **难度评估**：中等（2 到 3 个文件：路由、服务、仓储，加上测试）
4. **加载的资源：**
   - `execution-protocol.md`（始终加载）
<!-- oma-docs:ignore-start -->
   - 如果可用，加载匹配的 `stack/snippets.md` 或 `variants/{node,python,rust}/snippets.md`
   - 如果可用，加载匹配的 `stack/tech-stack.md` 或变体技术栈参考
<!-- oma-docs:ignore-end -->
5. **CHARTER_CHECK：**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: backend
   - Must NOT do: frontend UI, mobile screens, database schema changes
   - Success criteria: authenticated endpoint, cursor pagination, status filter, tests
   - Assumptions: existing JWT auth middleware, PostgreSQL, existing Task model
   ```
6. **实现：**
   - Repository：`TaskRepository.find_by_user(user_id, cursor, status, limit)` 使用参数化查询
   - Service：`TaskService.get_user_tasks(user_id, cursor, status, limit)`，业务逻辑包装
   - Router：`GET /api/tasks` 带 JWT 认证中间件、输入验证、响应格式化
   - 测试：未认证返回 401、分页返回正确游标、过滤有效、空结果返回 200 和空数组

---

### 移动端：设置界面

```text
Build a settings screen in Flutter with profile editing (name, email, avatar), notification preferences (toggle switches), and a logout button.
Constraints: Riverpod for state management, GoRouter for navigation, Material Design 3, handle offline gracefully.
Acceptance criteria:
1) Profile fields pre-populated from user data
2) Changes saved on submit with loading indicator
3) Notification toggles persist locally (SharedPreferences)
4) Logout clears token storage and navigates to login
5) Offline: show cached data with "offline" banner
Add tests for: profile save, logout flow, offline state.
```

**预期执行流程：**

1. **技能激活：** `oma-mobile` 激活（关键词："Flutter"、"screen"、"mobile"）
2. **难度评估：** 中等（设置界面 + 状态管理 + 离线处理）
3. **加载的资源：**
   - `execution-protocol.md`
   - `snippets.md`（界面模板、Riverpod provider 模式）
   - `screen-template.dart`
4. **CHARTER_CHECK：**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: mobile
   - Must NOT do: backend API changes, web frontend, database schema
   - Success criteria: profile editing, notification toggles, logout, offline
   - Assumptions: existing auth service, Dio interceptors, Riverpod, GoRouter
   ```
<!-- oma-docs:ignore-start -->
5. **实现：**
   - 界面：`lib/features/settings/presentation/settings_screen.dart`（带 Riverpod 的 Stateless Widget）
   - Providers：`lib/features/settings/providers/settings_provider.dart`
   - Repository：`lib/features/settings/data/settings_repository.dart`
   - 离线处理：Dio 拦截器捕获 `SocketException`，回退到缓存数据
   - 所有控制器在 `dispose()` 方法中释放
<!-- oma-docs:ignore-end -->

---

### 数据库：模式设计

```text
Design a database schema for a multi-tenant SaaS project management tool. Entities: Organization, Project, Task, User, TeamMembership.
Constraints: PostgreSQL, 3NF, soft delete with deleted_at, audit fields (created_at, updated_at, created_by), row-level security for tenant isolation.
Acceptance criteria:
1) ERD with all relationships documented
2) External, conceptual, and internal schema layers documented
3) Index strategy for common query patterns (tasks by project, tasks by assignee)
4) Capacity estimation for 10K orgs, 100K users, 1M tasks
5) Backup strategy with full + incremental cadence
Add deliverables: data standards table, glossary, migration script.
```

**预期执行流程：**

1. **技能激活：** `oma-db` 激活（关键词："database"、"schema"、"ERD"、"migration"）
2. **难度评估：** 复杂（架构决策、多实体、容量规划）
3. **加载的资源：**
   - `execution-protocol.md`
   - `document-templates.md`（交付物结构）
   - `examples.md`
   - `anti-patterns.md`（优化时审查）
4. **CHARTER_CHECK：**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: database
   - Must NOT do: API implementation, frontend UI, infrastructure
   - Success criteria: schema, ERD, indexes, capacity estimate, backup strategy
   - Assumptions: PostgreSQL, 3NF, soft delete, multi-tenant with RLS
   ```
5. **工作流：** 探索（实体、关系、访问模式、数据量估算）-> 设计（外部/概念/内部模式、约束、生命周期字段）-> 优化（查询模式的索引、分区策略、备份计划、反模式审查）
6. **交付物：**
   - 外部模式摘要（按角色的视图：管理员、项目经理、团队成员）
   - 概念模式与 ERD（Organization 1:N Project、Project 1:N Task、Organization 1:N TeamMembership 等）
   - 内部模式与物理 DDL、索引、分区
   - 数据标准表（字段命名规则、类型约定）
   - 术语表（tenant、workspace、assignee 等）
   - 容量估算表
   - 备份策略（每日全量 + 每小时增量，30 天保留）
   - 迁移脚本

---

## 质量关卡检查清单

智能体交付输出后，在接受之前验证以下项目：

### 通用检查（所有智能体）

- [ ] **行为符合验收标准**：提示中的每个标准都得到满足
- [ ] **测试覆盖正常路径和关键边界情况**：不仅仅是正常路径
- [ ] **无无关文件变更**：仅修改了与任务相关的文件
- [ ] **共享模块未被破坏**：其他代码使用的导入、类型和接口仍然有效
- [ ] **章程被遵守**："Must NOT do" 约束得到尊重
- [ ] **Lint、类型检查、构建通过**：运行项目的标准检查

### 前端特定

- [ ] 无障碍：交互元素有 `aria-label`、语义化标题、键盘导航有效
- [ ] 移动端：在 320px、768px、1024px、1440px 断点正确渲染
- [ ] 性能：无 CLS、FCP 目标达成
- [ ] 错误边界和加载骨架屏已实现
- [ ] shadcn/ui 组件未被直接修改（使用包装器）
- [ ] 使用 `@/` 绝对导入（无相对路径 `../../`）

### 后端特定

- [ ] 整洁架构保持：路由处理器中无业务逻辑
- [ ] 所有输入已验证（不信任用户输入）
- [ ] 仅参数化查询（SQL 中无字符串拼接）
- [ ] 通过集中错误模块处理自定义异常（不使用原始 HTTP 异常）
- [ ] 认证端点已限速

### 移动端特定

- [ ] 所有控制器在 `dispose()` 方法中释放
- [ ] 离线优雅处理
- [ ] 60fps 目标保持（无卡顿）
- [ ] 在 iOS 和 Android 上均已测试

### 数据库特定

- [ ] 至少 3NF（或有文档化的反规范化理由）
- [ ] 三个模式层均已文档化（外部、概念、内部）
- [ ] 完整性约束明确（实体、域、引用、业务规则）
- [ ] 反模式审查已完成

---

## 升级信号

注意以下信号，它们表明你应该从单技能切换到多智能体执行：

| 信号 | 含义 | 操作 |
|------|------|------|
| 智能体说"这需要后端变更" | 任务有跨领域依赖 | 切换到 `/work`：添加后端智能体 |
| 智能体的 CHARTER_CHECK 显示的 "Must NOT do" 项实际上是需要的 | 范围超出单一领域 | 先用 `/plan` 规划完整功能 |
| 修复级联到 3+ 个不同层的文件 | 一个修复影响多个领域 | 使用更广范围的 `/debug`，或 `/work` |
| 智能体发现 API 契约不匹配 | 前端/后端不一致 | 运行 `/plan` 定义契约，然后重新启动两个智能体 |
| 质量关卡在集成点失败 | 组件未正确连接 | 添加 QA 审查步骤：`oma agent spawn qa "Review integration"` |
| 任务从"一个组件"增长为"三个组件 + 新路由 + API" | 执行期间范围蔓延 | 停止，运行 `/plan` 分解，然后 `/orchestrate` |
| 智能体以 HIGH 澄清阻塞 | 需求根本性模糊 | 回答智能体的问题或运行 `/brainstorm` 澄清方案 |

### 一般规则

如果你发现自己对同一个智能体带修正重新启动超过两次，这个任务很可能是多领域的，需要 `/work` 或至少需要 `/plan` 步骤来正确分解。
