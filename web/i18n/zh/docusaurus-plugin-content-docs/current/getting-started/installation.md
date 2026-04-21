---
title: 安装
description: oh-my-agent 完整安装指南 —— 三种安装方式、全部六个预设及其技能列表、四个供应商的 CLI 工具要求、安装后配置、oma-config.yaml 字段说明以及 oma doctor 验证。
---

# 安装

## 前置要求

- **AI 驱动的 IDE 或 CLI** —— 至少安装以下之一：Claude Code、Gemini CLI、Codex CLI、Qwen CLI、Antigravity IDE、Cursor 或 OpenCode
- **bun** —— JavaScript 运行时和包管理器（安装脚本会在缺失时自动安装）
- **uv** —— Serena MCP 的 Python 包管理器（缺失时自动安装）

---

## 方式一：一键安装（推荐）

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

此脚本会：
1. 检测你的平台（macOS、Linux）
2. 检查 bun 和 uv，缺失时自动安装
3. 运行交互式安装程序并选择预设
4. 使用你选择的技能创建 `.agents/`
5. 设置 `.claude/` 集成层（钩子、符号链接、设置）
6. 如果检测到 Serena MCP 则进行配置

典型安装时间：不到 60 秒。

---

## 方式二：通过 bunx 手动安装

```bash
bunx oh-my-agent@latest
```

这会启动交互式安装程序，无需依赖引导。你需要已经安装了 bun。

安装程序会提示你选择一个预设，决定安装哪些技能：

### 预设

| 预设 | 包含的技能 |
|------|----------|
| **all** | oma-brainstorm、oma-pm、oma-frontend、oma-backend、oma-db、oma-mobile、oma-design、oma-qa、oma-debug、oma-tf-infra、oma-dev-workflow、oma-translator、oma-orchestrator、oma-scm、oma-coordination |
| **fullstack** | oma-frontend、oma-backend、oma-db、oma-pm、oma-qa、oma-debug、oma-brainstorm、oma-scm |
| **frontend** | oma-frontend、oma-pm、oma-qa、oma-debug、oma-brainstorm、oma-scm |
| **backend** | oma-backend、oma-db、oma-pm、oma-qa、oma-debug、oma-brainstorm、oma-scm |
| **mobile** | oma-mobile、oma-pm、oma-qa、oma-debug、oma-brainstorm、oma-scm |
| **devops** | oma-tf-infra、oma-dev-workflow、oma-pm、oma-qa、oma-debug、oma-brainstorm、oma-scm |

每个预设都包含 oma-pm（规划）、oma-qa（审查）、oma-debug（Bug 修复）、oma-brainstorm（构思）和 oma-scm（git）作为基础智能体。领域特定的预设在此基础上添加相关的实现智能体。

共享资源（`_shared/`）无论选择哪个预设都会安装。包括核心路由、上下文加载、提示结构、供应商检测、执行协议和内存协议。

### 安装后生成的内容

安装完成后，你的项目将包含：

```
.agents/
├── config/
│   └── oma-config.yaml      # 你的偏好设置
├── skills/
│   ├── _shared/                    # 共享资源（始终安装）
│   │   ├── core/                   # skill-routing、context-loading 等
│   │   ├── runtime/                # memory-protocol、execution-protocols/
│   │   └── conditional/            # quality-score、experiment-ledger 等
│   ├── oma-frontend/               # 按预设选择
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                         # 其他选定的技能
├── workflows/                      # 全部 16 个工作流定义
├── agents/                         # 子智能体定义
├── mcp.json                        # MCP 服务器配置
├── results/plan-{sessionId}.json                       # 空（由 /plan 填充）
├── state/                          # 空（用于持久化工作流）
└── results/                        # 空（由智能体运行填充）

.claude/
├── settings.json                   # 钩子和权限
├── hooks/
│   ├── triggers.json               # 关键词到工作流的映射（11 种语言）
│   ├── keyword-detector.ts         # 自动检测逻辑
│   ├── persistent-mode.ts          # 持久化工作流强制执行
│   └── hud.ts                      # [OMA] 状态栏指示器
├── skills/                         # 符号链接 → .agents/skills/
└── agents/                         # IDE 的子智能体定义

.serena/
└── memories/                       # 运行时状态（会话期间填充）
```

---

## 方式三：全局安装

如需 CLI 级别的功能（仪表板、智能体启动、诊断），请全局安装 oh-my-agent：

### Homebrew（macOS/Linux）

```bash
brew install oh-my-agent
```

### npm / bun 全局

```bash
bun install --global oh-my-agent
# 或
npm install --global oh-my-agent
```

这会全局安装 `oma` 命令，让你可以从任何目录访问所有 CLI 命令：

```bash
oma doctor              # 健康检查
oma dashboard           # 终端监控
oma dashboard:web       # Web 仪表板 http://localhost:9847
oma agent:spawn         # 从终端启动智能体
oma agent:parallel      # 并行执行智能体
oma agent:status        # 检查智能体状态
oma stats               # 会话统计
oma retro               # 回顾分析
oma cleanup             # 清理会话产物
oma update              # 更新 oh-my-agent
oma verify              # 验证智能体输出
oma visualize           # 依赖可视化
oma describe            # 描述项目结构
oma bridge              # Antigravity 的 SSE-to-stdio 桥接
oma memory:init         # 初始化内存提供者
oma auth:status         # 检查 CLI 认证状态
oma star                # 为仓库加星
```

`oma` 是 `oh-my-agent` 的缩写。两者均可作为 CLI 命令使用。

---

## AI CLI 工具安装

你至少需要安装一个 AI CLI 工具。oh-my-agent 支持四个供应商，你可以混合使用 —— 通过智能体-CLI 映射为不同智能体使用不同的 CLI。

### Gemini CLI

```bash
bun install --global @google/gemini-cli
# 或
npm install --global @google/gemini-cli
```

首次运行时自动认证。Gemini CLI 默认从 `.agents/skills/` 读取技能。

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# 或
npm install --global @anthropic-ai/claude-code
```

首次运行时自动认证。Claude Code 使用 `.claude/` 存放钩子和设置，技能通过符号链接从 `.agents/skills/` 引用。

### Codex CLI

```bash
bun install --global @openai/codex
# 或
npm install --global @openai/codex
```

安装后，运行 `codex login` 进行认证。

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

安装后，在 CLI 内运行 `/auth` 进行认证。

---

## oma-config.yaml

`oma install` 命令创建 `.agents/oma-config.yaml`。这是控制所有 oh-my-agent 行为的中心配置文件：

```yaml
# 所有智能体和工作流的响应语言
language: en

# 报告和内存文件中使用的日期格式
date_format: "YYYY-MM-DD"

# 时间戳时区
timezone: "UTC"

# 智能体启动的默认 CLI 工具
# 选项：gemini、claude、codex、qwen
default_cli: gemini

# 每个智能体的 CLI 映射（覆盖 default_cli）
agent_cli_mapping:
  frontend: claude       # 复杂 UI 推理
  backend: gemini        # 快速 API 生成
  mobile: gemini
  db: gemini
  pm: gemini             # 快速分解
  qa: claude             # 深入安全审查
  debug: claude          # 深度根因分析
  design: claude
  tf-infra: gemini
  dev-workflow: gemini
  translator: claude
  orchestrator: gemini
  commit: gemini
```

### 字段参考

| 字段 | 类型 | 默认值 | 说明 |
|------|------|-------|------|
| `language` | string | `en` | 响应语言代码。所有智能体输出、工作流消息和报告使用此语言。支持 11 种语言（en、ko、ja、zh、es、fr、de、pt、ru、nl、pl）。 |
| `date_format` | string | `YYYY-MM-DD` | 计划、内存文件和报告中时间戳的日期格式字符串。 |
| `timezone` | string | `UTC` | 所有时间戳的时区。使用标准时区标识符（例如 `Asia/Seoul`、`America/New_York`）。 |
| `default_cli` | string | `gemini` | 无智能体特定映射时的回退 CLI。在供应商解析优先级中为第 3 级。 |
| `agent_cli_mapping` | map | （空） | 将智能体 ID 映射到特定 CLI 供应商。优先级高于 `default_cli`。 |

### 供应商解析优先级

启动智能体时，CLI 供应商按以下优先级顺序确定（从高到低）：

1. 传递给 `oma agent:spawn` 的 `--model` 参数
2. `oma-config.yaml` 中该特定智能体的 `agent_cli_mapping` 条目
3. `oma-config.yaml` 中的 `default_cli` 设置
4. `cli-config.yaml` 中的 `active_vendor`（旧版回退）
5. `gemini`（硬编码的最终回退）

---

## 验证：`oma doctor`

安装和设置完成后，验证一切是否正常工作：

```bash
oma doctor
```

此命令检查：
- 所有必需的 CLI 工具已安装且可访问
- MCP 服务器配置有效
- 技能文件存在且 SKILL.md 前置元数据有效
- `.claude/skills/` 中的符号链接指向有效目标
- 钩子在 `.claude/settings.json` 中正确配置
- 内存提供者可达（Serena MCP）
- `oma-config.yaml` 是有效的 YAML 且包含必需字段

如果有任何问题，`oma doctor` 会准确告诉你需要修复什么，并附带可直接复制粘贴的命令。

---

## 更新

### CLI 更新

```bash
oma update
```

这会将全局 oh-my-agent CLI 更新到最新版本。

### 项目技能更新

项目中的技能和工作流可以通过 GitHub Action（`action/`）进行自动更新，或通过重新运行安装程序手动更新：

```bash
bunx oh-my-agent@latest
```

安装程序会检测现有安装并提供更新选项，同时保留你的 `oma-config.yaml` 和任何自定义配置。

---

## 接下来

在你的 AI IDE 中打开项目，开始使用 oh-my-agent。技能会自动检测。试试：

```
"使用 Tailwind CSS 构建一个带邮箱验证的登录表单"
```

或使用工作流命令：

```
/plan 带 JWT 和刷新令牌的认证功能
```

查看[使用指南](/docs/guide/usage)了解详细示例，或了解[智能体](/docs/core-concepts/agents)以理解每个专家的职责。
