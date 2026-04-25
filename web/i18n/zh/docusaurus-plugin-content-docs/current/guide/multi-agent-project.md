---
title: "指南：多智能体项目"
description: 协调跨前端、后端、数据库、移动端和 QA 的多个领域智能体的完整指南 —— 从规划到合并。
---

# 指南：多智能体项目

## 何时使用多智能体协调

你的功能跨越多个领域 —— backend API + frontend UI + 数据库 schema + 移动端客户端 + QA 审查。单个智能体无法处理全部范围，你需要各领域并行推进且互不干扰对方的文件。

多智能体协调适用于以下场景：

- 任务涉及 2 个或更多领域（frontend、backend、mobile、db、QA、debug、pm）。
- 领域之间存在 API 契约（例如，一个 REST 端点同时被 web 和 mobile 消费）。
- 你希望并行执行以缩短实际耗时。
- 你需要在所有领域的实现完成后进行 QA 审查。

如果你的任务完全在单个领域内，直接使用特定智能体即可。

---

## 完整流程：/plan 到 /review

推荐的多智能体工作流遵循严格的四步流水线。

### 步骤 1：/plan —— 需求和任务分解

`/plan` 工作流内联运行（不启动子智能体），产出结构化计划。

```
/plan
```

流程：

1. **收集需求** —— PM 智能体询问目标用户、核心功能、约束和部署目标。
2. **分析技术可行性** —— 使用 MCP 代码分析工具（`get_symbols_overview`、`find_symbol`、`search_for_pattern`）扫描现有代码库，寻找可复用代码和架构模式。
3. **定义 API 契约** —— 设计端点契约（方法、路径、请求/响应 schema、认证、错误响应），保存到 `.agents/skills/_shared/core/api-contracts/`。
4. **分解为任务** —— 将项目分解为可执行任务，每个任务包含：分配的智能体、标题、验收标准、优先级（P0-P3）和依赖关系。
5. **与用户审查计划** —— 展示完整计划供确认。没有用户明确批准，工作流不会继续。
6. **保存计划** —— 将批准的计划写入 `.agents/results/plan-{sessionId}.json` 并在内存中记录摘要。

输出的 `.agents/results/plan-{sessionId}.json` 是 `/work` 和 `/orchestrate` 的输入。

### 步骤 2：/work 或 /orchestrate —— 执行

你有两条执行路径：

| 方面 | /work | /orchestrate |
|:-----|:-----------|:-------------|
| **交互方式** | 交互式 —— 用户在每个阶段确认 | 自动化 —— 运行至完成 |
| **PM 规划** | 内置（步骤 2 运行 PM 智能体） | 需要来自 /plan 的 plan |
| **用户检查点** | 计划审查后（步骤 3） | 启动前（计划必须存在） |
| **持久化模式** | 是 —— 完成前不能终止 | 是 —— 完成前不能终止 |
| **最适用于** | 首次使用、需要监督的复杂项目 | 重复运行、定义明确的任务 |

#### /work —— 交互式多智能体流水线

```
/work
```

1. 分析用户请求并识别涉及的领域。
2. 运行 PM 智能体进行任务分解（创建 plan-\{sessionId\}.json）。
3. 向用户展示计划供确认 —— **阻塞直到确认**。
4. 按优先级层启动智能体（先 P0，然后 P1 等），同一优先级的任务并行运行。
5. 通过内存文件监控智能体进度。
6. 对所有交付物运行 QA 智能体审查（OWASP Top 10、性能、无障碍、代码质量）。
7. 如果 QA 发现 CRITICAL 或 HIGH 问题，带着 QA 发现重新启动负责的智能体。每个问题最多重复 2 次。如果同一问题持续存在，激活**探索循环** —— 生成 2-3 个替代方案，在独立工作区使用不同假设提示词启动同类型智能体，QA 对每个评分，采用最佳结果。

#### /orchestrate —— 自动并行执行

```
/orchestrate
```

1. 加载 `.agents/results/plan-{sessionId}.json`（没有计划不会继续）。
2. 初始化会话，ID 格式为 `session-YYYYMMDD-HHMMSS`。
3. 在内存目录中创建 `orchestrator-session.md` 和 `task-board.md`。
4. 按优先级层启动智能体，每个智能体获得：任务描述、API 契约和上下文。
5. 通过轮询 `progress-{agent}.md` 文件监控进度。
6. 通过 `verify.sh` 验证每个完成的智能体 —— PASS（退出码 0）接受，FAIL（退出码 1）带错误上下文重新启动（最多 2 次重试），持续失败触发探索循环。
7. 收集所有 `result-{agent}.md` 文件并编译最终报告。

### 步骤 3：agent:spawn —— CLI 级别的智能体管理

`agent:spawn` 命令是工作流内部调用的底层机制。你也可以直接使用：

```bash
oma agent:spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```

**所有标志：**

| 标志 | 说明 |
|:-----|:-----|
| `-m, --model <vendor>` | CLI 供应商覆盖（gemini/claude/codex/qwen）。覆盖所有配置。 |
| `-w, --workspace <path>` | 智能体的工作目录。如果省略，从 monorepo 配置自动检测。 |

**供应商解析顺序**（首次匹配优先）：

1. 命令行上的 `--model` 标志
2. `oma-config.yaml` 中此特定智能体类型的 `model_preset (per-agent overrides via `agents:`)`
3. `oma-config.yaml` 中的 `default_cli`
4. `cli-config.yaml` 中的 `active_vendor`
5. `gemini`（硬编码默认值）

**工作区自动检测**按以下顺序检查 monorepo 配置：pnpm-workspace.yaml、package.json workspaces、lerna.json、nx.json、turbo.json、mise.toml。每个工作区目录根据智能体类型关键词评分（例如，frontend 智能体匹配 "web"、"frontend"、"client"）。如果未找到 monorepo 配置，回退到硬编码候选路径如 `apps/web`、`apps/frontend`、`frontend/` 等。

**提示词解析：** `<prompt>` 参数可以是内联文本或文件路径。如果路径解析为现有文件，则读取其内容作为提示词。CLI 还自动注入来自 `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md` 的供应商特定执行协议。

### 步骤 4：/review —— QA 验证

```
/review
```

review 工作流运行完整 QA 流水线：

1. **确定范围** —— 询问审查什么（特定文件、功能分支或整个项目）。
2. **自动安全检查** —— 运行 `npm audit`、`bandit` 或等效工具。
3. **OWASP Top 10 手动审查** —— 注入、认证缺陷、敏感数据、访问控制、配置错误、不安全反序列化、有漏洞的组件、日志不足。
4. **性能分析** —— N+1 查询、缺失索引、无界分页、内存泄漏、不必要的重新渲染、包大小。
5. **无障碍性** —— WCAG 2.1 AA：语义 HTML、ARIA、键盘导航、颜色对比、焦点管理。
6. **代码质量** —— 命名、错误处理、测试覆盖率、TypeScript strict 模式、未使用的导入、async/await 模式。
7. **报告** —— 发现按 CRITICAL / HIGH / MEDIUM / LOW 分类，包含 `file:line`、描述和修复代码。

对于大范围，工作流委派给 QA 智能体子智能体。使用 `--fix` 选项时，进入修复-验证循环：启动领域智能体修复 CRITICAL/HIGH 问题，重新审查，最多重复 3 次。

---

## 会话 ID 策略

每个编排会话获得一个唯一标识符，格式为：

```
session-YYYYMMDD-HHMMSS
```

示例：`session-20260324-143052`

会话 ID 用于：

- 命名内存文件（`orchestrator-session.md`、`task-board.md`）
- 通过系统临时目录中的 PID 文件跟踪智能体进程（`/tmp/subagent-{session-id}-{agent-id}.pid`）
- 关联日志文件（`/tmp/subagent-{session-id}-{agent-id}.log`）
- 在 `.agents/results/parallel-{timestamp}/` 中分组结果

会话 ID 在 `/orchestrate` 的步骤 2 生成，并传递给所有启动的智能体。这确保单次运行的所有智能体、日志和 PID 文件都可以追溯到同一个会话。

---

## 每领域的工作区分配

每个智能体在隔离的工作区目录中启动，以防止文件冲突。分配遵循以下规则：

### 自动检测

当省略 `-w`（或设置为 `.`）时，CLI 通过以下方式检测最佳工作区：

1. 扫描 monorepo 配置文件（pnpm-workspace.yaml、package.json、lerna.json、nx.json、turbo.json、mise.toml）。
2. 将 glob 模式（如 `apps/*`）展开为实际目录。
3. 根据智能体类型关键词对每个目录评分：

| 智能体类型 | 关键词（按优先级排列） |
|:----------|:-------------------|
| frontend | web、frontend、client、ui、app、dashboard、admin、portal |
| backend | api、backend、server、service、gateway、core |
| mobile | mobile、ios、android、native、rn、expo |

4. 精确目录名匹配得 100 分，包含关键词得 50 分，路径包含得 25 分。
5. 最高分的目录获胜。

### 回退候选

如果不存在 monorepo 配置，CLI 按顺序检查硬编码路径：

- **frontend：** `apps/web`、`apps/frontend`、`apps/client`、`packages/web`、`packages/frontend`、`frontend`、`web`、`client`
- **backend：** `apps/api`、`apps/backend`、`apps/server`、`packages/api`、`packages/backend`、`backend`、`api`、`server`
- **mobile：** `apps/mobile`、`apps/app`、`packages/mobile`、`mobile`、`app`

如果都不匹配，智能体在当前目录（`.`）运行。

### 显式覆盖

始终可用：

```bash
oma agent:spawn frontend "Build landing page" session-id -w ./packages/web-app
```

---

## 契约优先规则

API 契约是智能体之间的同步机制。契约优先规则意味着：

1. **契约在实现开始前定义。** `/plan` 工作流的步骤 3 产出 API 契约，保存到 `.agents/skills/_shared/core/api-contracts/`。

2. **每个智能体接收其相关契约作为上下文。** 当 `/orchestrate` 在步骤 3 启动智能体时，每个智能体获得"任务描述、API 契约、相关上下文"。

3. **契约定义接口边界。** 一个契约指定：
   - HTTP 方法和路径
   - 请求体 schema（含类型）
   - 响应体 schema（含类型）
   - 认证要求
   - 错误响应格式

4. **契约违反在监控中被捕获。** `/work` 的步骤 5 使用 MCP 代码分析工具（`find_symbol`、`search_for_pattern`）验证智能体之间的 API 契约对齐。

5. **QA 审查检查契约遵守。** QA 智能体的对齐审查（ultrawork 的步骤 6）明确将实现与计划（包括 API 契约）进行对比。

**为什么这很重要：** 没有契约，backend 智能体可能返回 `{ "user_id": 1 }`，而 frontend 智能体消费 `{ "userId": 1 }`。契约优先规则从根本上消除了这类集成 bug。

---

## 合并关卡：4 个条件

在任何多智能体工作被视为完成之前，必须满足四个条件：

### 1. 构建成功

所有代码编译和构建无错误。这由验证脚本（`verify.sh`）检查，该脚本根据智能体类型运行适当的构建命令。

### 2. 测试通过

所有现有测试继续通过，新测试覆盖已实现的功能。QA 智能体在代码质量审查中审查测试覆盖率。

### 3. 仅修改计划中的文件

智能体不得修改其分配范围之外的文件。验证步骤检查是否只有与智能体任务相关的文件被修改。这防止智能体在共享代码中产生意外副作用。

### 4. QA 审查通过

QA 智能体审查中没有剩余的 CRITICAL 或 HIGH 发现。MEDIUM 和 LOW 发现可以记录为未来冲刺任务，但阻塞问题必须解决。

在 ultrawork 工作流中，这些转化为显式的**阶段关卡**（PLAN_GATE、IMPL_GATE、VERIFY_GATE、REFINE_GATE、SHIP_GATE），包含清单式的标准，全部通过才能继续。

---

## 启动示例

### 单智能体启动

```bash
# 使用 Gemini（默认）启动 backend 智能体
oma agent:spawn backend "Implement /api/users CRUD endpoint per API contract" session-20260324-143000

# 使用 Claude 启动 frontend 智能体，显式工作区
oma agent:spawn frontend "Build user dashboard with React" session-20260324-143000 -m claude -w ./apps/web

# 从提示词文件启动
oma agent:spawn backend ./prompts/auth-api.md session-20260324-143000 -w ./api
```

### 通过 agent:parallel 并行执行

使用 YAML 任务文件：

```yaml
# tasks.yaml
tasks:
  - agent: backend
    task: "Implement user authentication API with JWT tokens"
    workspace: ./api
  - agent: frontend
    task: "Build login page and auth flow UI"
    workspace: ./web
  - agent: mobile
    task: "Implement mobile auth screens with biometric support"
    workspace: ./mobile
```

```bash
oma agent:parallel tasks.yaml
```

使用内联模式：

```bash
oma agent:parallel --inline \
  "backend:Implement user auth API:./api" \
  "frontend:Build login page:./web" \
  "mobile:Implement auth screens:./mobile"
```

后台模式（不等待）：

```bash
oma agent:parallel tasks.yaml --no-wait
# 立即返回，结果写入 .agents/results/parallel-{timestamp}/
```

覆盖供应商：

```bash
oma agent:parallel tasks.yaml -m claude
```

---

## 应避免的反模式

### 1. 跳过计划

在没有 plan 的情况下启动 `/orchestrate`。工作流会拒绝继续。始终先运行 `/plan`，或使用自带规划的 `/work`。

### 2. 工作区重叠

将两个智能体分配到同一工作区目录。这导致文件冲突 —— 一个智能体的变更覆盖另一个的。始终使用独立工作区目录。

### 3. 缺少 API 契约

在未定义契约的情况下启动 backend 和 frontend 智能体。它们会对数据格式、字段名称和错误处理做出不兼容的假设。

### 4. 忽略 QA 发现

将 QA 审查视为可选。CRITICAL 和 HIGH 发现代表真实的 bug，会在生产中暴露。工作流通过循环直到无阻塞问题来强制执行。

### 5. 手动文件协调

试图手动合并智能体输出，而不是让验证和 QA 流水线处理集成。自动化流水线能捕获手动审查遗漏的问题。

### 6. 过度并行化

在 P0 任务完成前运行 P1 任务。优先级层存在是因为 P1 任务通常依赖 P0 的输出。工作流自动强制层级排序。

### 7. 跳过验证

直接使用 `agent:spawn` 而不在之后运行验证脚本。验证步骤捕获构建失败、测试回归和范围违反，否则这些问题会传播。

---

## 跨领域集成验证

所有智能体完成各自任务后，必须验证跨领域集成：

1. **API 契约对齐** —— MCP 工具（`find_symbol`、`search_for_pattern`）验证 backend 实现匹配 frontend 和 mobile 消费的契约。

2. **类型一致性** —— 跨领域共享的 TypeScript 类型、Python dataclass 或 Dart 模型必须使用一致的字段名称和类型。

3. **认证流程** —— 如果 backend 实现 JWT 认证，frontend 必须正确在 header 中发送 token，mobile 应用必须适当地存储和刷新 token。

4. **错误处理** —— 所有 API 的消费者必须处理文档化的错误响应。如果 backend 返回 `{ "error": "unauthorized", "code": 401 }`，所有客户端必须处理此格式。

5. **数据库 schema 对齐** —— 如果 database 智能体创建了迁移，backend ORM 模型必须精确匹配 schema。

QA 智能体的对齐审查（ultrawork 的步骤 6、work 的步骤 6）系统性地执行此跨领域验证。

---

## 完成标准

多智能体项目在以下条件满足时完成：

- 所有优先级层的所有智能体都已成功完成。
- 每个智能体的验证脚本通过（退出码 0）。
- QA 审查报告零 CRITICAL 和零 HIGH 发现。
- 跨领域 API 契约对齐已确认。
- 构建成功且所有测试通过。
- 最终报告已写入内存并呈现给用户。
- 用户给出最终批准（在 `/work` 和 ultrawork 的 SHIP_GATE 中）。
