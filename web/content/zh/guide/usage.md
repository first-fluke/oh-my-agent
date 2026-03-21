---
title: 使用指南
description: 完整使用指南，包括示例、工作流、仪表盘操作和故障排除。
---

# 如何使用 AI IDE 多代理技能

> 如果您不确定从何开始，请先输入 `/coordinate <您的任务提示>`。

## 快速开始

1. **在 AI IDE 中打开**
   ```bash
   cd /path/to/oh-my-agent
   ```

2. **技能会自动检测。** IDE 扫描 `.agents/skills/` 并索引所有可用技能。

3. **在 IDE 中聊天。** 描述您想要构建的内容。

---

## 使用示例

### 示例 1：简单的单领域任务

**您输入：**
```
"Create a login form component with email and password fields using Tailwind CSS"
```

**执行过程：**
- IDE 检测到匹配 `oma-frontend`
- 技能自动加载（渐进式披露）
- 您获得一个包含 TypeScript、Tailwind、表单验证的 React 组件

### 示例 2：复杂的多领域项目

**您输入：**
```
"Build a TODO app with user authentication"
```

**执行过程：**

1. **Workflow Guide 激活** — 检测到多领域复杂性
2. **PM Agent 规划** — 创建带优先级的任务拆解
3. **您通过 CLI 启动代理**：
   ```bash
   oma agent:spawn backend "JWT authentication API" session-01 &
   oma agent:spawn frontend "Login and TODO UI" session-01 &
   wait
   ```
4. **代理并行工作** — 将输出保存到知识库
5. **您协调** — 检查 `.agents/brain/` 的一致性
6. **QA Agent 评审** — 安全/性能审计
7. **修复与迭代** — 使用修正内容重新启动代理

### 示例 3：缺陷修复

**您输入：**
```
"There's a bug — clicking login shows 'Cannot read property map of undefined'"
```

**执行过程：**

1. **oma-debug 激活** — 分析错误
2. **找到根因** — 组件在数据加载前对 `todos` 执行 map 操作
3. **提供修复** — 添加加载状态和空值检查
4. **编写回归测试** — 确保缺陷不再出现
5. **发现相似模式** — 主动修复其他 3 个组件

### 示例 4：基于 CLI 的并行执行

```bash
# 单个代理（自动检测工作区）
oma agent:spawn backend "Implement JWT auth API" session-01

# 并行代理
oma agent:spawn backend "Implement auth API" session-01 &
oma agent:spawn frontend "Create login form" session-01 &
oma agent:spawn mobile "Build auth screens" session-01 &
wait
```

**实时监控：**
```bash
# 终端（另开终端窗口）
bunx oh-my-agent dashboard

# 或浏览器
bunx oh-my-agent dashboard:web
# → http://localhost:9847
```

---

## 实时仪表盘

### 终端仪表盘

```bash
bunx oh-my-agent dashboard
```

使用 `fswatch`（macOS）或 `inotifywait`（Linux）监控 `.serena/memories/`。显示包含会话状态、代理状态、回合数和最新活动的实时表格。当记忆文件变更时自动更新。

**依赖项：**
- macOS：`brew install fswatch`
- Linux：`apt install inotify-tools`

### Web 仪表盘

```bash
bun install          # 仅首次需要
bunx oh-my-agent dashboard:web
```

在浏览器中打开 `http://localhost:9847`。功能特性：

- **实时更新** — 通过 WebSocket（事件驱动，非轮询）
- **自动重连** — 连接断开时自动恢复
- **Serena 风格 UI** — 紫色主题色调
- **会话状态** — ID 和 running/completed/failed 状态
- **代理表格** — 名称、状态（带彩色圆点）、回合数、任务描述
- **活动日志** — 来自进度和结果文件的最新变更

服务端使用 chokidar 监控 `.serena/memories/`，带 100ms 防抖。仅变更的文件触发读取 — 不进行全量扫描。

---

## 核心概念

### 渐进式披露
IDE 自动将请求匹配到技能。您无需手动选择技能。只有所需的技能会加载到上下文中。

### Token 优化的技能设计
每个技能采用双层架构以最大化 Token 效率：
- **SKILL.md**（约 40 行）：身份标识、路由、核心规则 — 立即加载
- **resources/**：执行协议、示例、检查清单、错误手册 — 按需加载

共享资源位于 `_shared/`（非技能），被所有代理引用：
- 带四步工作流的思维链执行协议
- 用于中端模型引导的少样本输入/输出示例
- 带有"三振出局"升级机制的错误恢复手册
- 用于结构化多步分析的推理模板
- Flash/Pro 模型层级的上下文预算管理
- 通过 `verify.sh` 进行自动化验证
- 跨会话经验教训积累

### CLI 代理启动
使用 `oma agent:spawn` 通过 CLI 运行代理。遵循 `user-preferences.yaml` 中的 `agent_cli_mapping` 为每种代理类型选择合适的 CLI（gemini、claude、codex、qwen）。工作区从常见 monorepo 约定自动检测，也可通过 `-w` 显式设置。

### 知识库
代理输出存储在 `.agents/brain/`。包含规划、代码、报告和协调笔记。

### Serena 记忆
结构化运行时状态位于 `.serena/memories/`。编排器写入会话信息、任务看板、每代理进度和结果。仪表盘监控这些文件。

### 工作区
代理可在独立目录中工作以避免冲突。工作区从常见 monorepo 约定自动检测：
```
./apps/api   or ./backend   → Backend Agent 工作区
./apps/web   or ./frontend  → Frontend Agent 工作区
./apps/mobile or ./mobile   → Mobile Agent 工作区
```

---

## 可用技能

| 技能 | 自动激活场景 | 输出 |
|------|-------------|------|
| oma-coordination | 复杂的多领域项目 | 分步代理协调 |
| oma-pm | "plan this"、"break down" | `.agents/plan.json` |
| oma-frontend | UI、组件、样式 | React 组件、测试 |
| oma-backend | API、数据库、认证 | API 端点、模型、测试 |
| oma-mobile | 移动应用、iOS/Android | Flutter 页面、状态管理 |
| oma-brainstorm | 构思、概念探索 | 设计文档 |
| oma-db | 数据库、模式、ERD、迁移 | 模式设计、查询调优 |
| oma-dev-workflow | CI/CD、git hooks、monorepo 配置 | 工作流配置、自动化 |
| oma-tf-infra | Terraform、云基础设施 | IaC 模块、状态管理 |
| oma-translator | 翻译、多语言内容 | 保留语气的翻译文本 |
| oma-qa | "review security"、"audit" | 带优先级修复建议的 QA 报告 |
| oma-debug | 缺陷报告、错误消息 | 修复后的代码、回归测试 |
| oma-orchestrator | CLI 子代理执行 | 结果保存在 `.agents/results/` |
| oma-commit | "commit"、"커밋해줘" | Git 提交（按功能自动拆分） |

---

## 工作流命令

在 AI IDE 聊天中输入以下命令以触发分步工作流：

| 命令 | 描述 |
|------|------|
| `/brainstorm` | 设计优先的构思与概念探索 |
| `/coordinate` | 通过 CLI 进行多代理编排，提供分步引导 |
| `/deepinit` | 深度项目初始化与代码库分析 |
| `/exec-plan` | 执行并追踪现有规划文件 |
| `/orchestrate` | 基于 CLI 的自动化并行代理执行 |
| `/plan` | PM 任务拆解与 API 契约 |
| `/review` | 完整 QA 流水线（安全、性能、无障碍、代码质量） |
| `/debug` | 结构化缺陷修复（复现 → 诊断 → 修复 → 回归测试） |
| `/setup` | 项目环境初始化与配置 |
| `/tools` | MCP 工具管理与配置 |
| `/ultrawork` | 最大并行度的五阶段门控执行 |

这些与 **技能**（自动激活）是分开的。工作流让您对多步骤流程拥有显式控制权。

---

## 典型工作流

### 工作流 A：单一技能

```
您："Create a button component"
  → AI IDE 加载 oma-frontend
  → 立即获得组件
```

### 工作流 B：多代理项目（自动）

```
您："Build a TODO app with authentication"
  → oma-coordination 自动激活
  → PM Agent 创建规划
  → 您通过 CLI 启动代理（oma agent:spawn）
  → 代理并行工作
  → QA Agent 评审
  → 修复问题，迭代
```

### 工作流 B-2：多代理项目（显式）

```
您：/coordinate
  → 分步引导工作流
  → PM 规划 → 规划评审 → 代理启动 → 监控 → QA 评审
```

### 工作流 C：缺陷修复

```
您："Login button throws TypeError"
  → oma-debug 激活
  → 根因分析
  → 修复 + 回归测试
  → 检查相似模式
```

### 工作流 D：CLI 编排与仪表盘

```
终端 1：bunx oh-my-agent dashboard:web
终端 2：oma agent:spawn backend "task" session-01 &
        oma agent:spawn frontend "task" session-01 &
浏览器：http://localhost:9847 → 实时状态
```

---

## 使用技巧

1. **具体明确** — "Build a TODO app with JWT auth, React frontend, FastAPI backend" 优于 "make an app"
2. **使用 CLI 启动** 进行多领域项目 — 不要试图在一个聊天中完成所有事情
3. **检查知识库** — 查看 `.agents/brain/` 以确保 API 一致性
4. **通过重新启动迭代** — 优化指令，而非从头开始
5. **使用仪表盘** — `bunx oh-my-agent dashboard` 或 `bunx oh-my-agent dashboard:web` 监控编排器会话
6. **分离工作区** — 为每个代理分配独立目录

---

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| 技能未在 AI IDE 中加载 | 在项目根目录打开 AI IDE，验证 `.agents/skills/` 和 `SKILL.md`，然后重启 IDE |
| 找不到 CLI | 检查 `which gemini` / `which claude`，安装缺失的 CLI |
| 代理生成不兼容的代码 | 检查 `.agents/brain/` 中的输出，引用另一代理的输出重新启动一个代理，然后使用 QA Agent 做最终一致性检查 |
| 仪表盘显示 "No agents detected" | 记忆文件尚未创建。运行编排器或手动在 `.serena/memories/` 中创建文件 |
| Web 仪表盘无法启动 | 运行 `bun install` 以安装 chokidar 和 ws |
| 找不到 fswatch | macOS：`brew install fswatch`，Linux：`apt install inotify-tools` |
| QA 报告有 50+ 个问题 | 先关注 CRITICAL/HIGH 级别，其余记录后续处理 |

---

## CLI 命令

```bash
bunx oh-my-agent                # 交互式技能安装器
bunx oh-my-agent doctor         # 检查设置并修复缺失的技能
bunx oh-my-agent doctor --json  # JSON 输出，适用于 CI/CD
bunx oh-my-agent update         # 将技能更新到最新版本
bunx oh-my-agent stats          # 查看生产力指标
bunx oh-my-agent stats --reset  # 重置指标
bunx oh-my-agent retro          # 会话回顾（经验教训与后续步骤）
bunx oh-my-agent dashboard      # 终端实时仪表盘
bunx oh-my-agent dashboard:web  # Web 仪表盘 (http://localhost:9847)
bunx oh-my-agent help           # 显示帮助
```

---

## 面向开发者（集成指南）

如果您想将这些技能集成到现有的 AI IDE 项目中，请参阅[集成到现有项目](./integration.md)了解：
- 快速三步集成
- 完整仪表盘集成
- 为您的技术栈定制技能
- 故障排除与最佳实践

---

**直接在 AI IDE 中聊天即可。** 如需监控，使用仪表盘。如需 CLI 执行，使用编排器脚本。如需集成到现有项目，请参阅[集成到现有项目](./integration.md)。
