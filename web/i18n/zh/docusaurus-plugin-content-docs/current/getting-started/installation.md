---
title: 安装
description: 安装 oh-my-agent，选择技能和能力提供商，了解生成的项目文件，配置模型与运行时默认值，并使用 oma doctor 验证设置。
---

# 安装

## 前置要求 {#prerequisites}

- **AI 驱动的 IDE 或 CLI**：至少安装一个受支持的主机，例如 Claude Code、Codex CLI、Qwen Code、Antigravity CLI（`agy`）、Cursor、OpenCode、Kimi Code CLI、Kiro、CommandCode、pi、GitHub Copilot 或 Hermes
- **bun**：JavaScript 运行时和包管理器（安装脚本缺少时会自动安装）
- **uv**：Python 包管理器（引导脚本缺少时会提供安装选项）
- **代码智能提供商**：Serena 是默认提供商。在提供商配置中选择后也支持 Gortex。安装器可以使用 `uv tool install` 引导安装 Serena；可选依赖不可用时会发出警告并继续。选择 Gortex 后，项目模式的 `oma install` 和 `oma update` 会在项目尚未被跟踪时，将其注册到 Gortex 守护进程（`gortex track`），并通过 Gortex CLI 把 OMA 生成的目录加入该项目的排除列表；不会向项目目录写入任何内容。Gortex 本身需要单独安装。

安装器按能力组织集成。钩子供应商包括 Antigravity、Claude、Codex、CommandCode、Cursor、Grok、Kimi、Kiro 和 Qwen；OpenCode 与 pi 使用扩展桥接；GitHub Copilot 和 Hermes 会获得技能链接；ZCode 会获得工作流命令。你可以选择多个供应商，但第一次任务只需要选择计划使用的主机。

---

## 方式一：一键安装 {#method-1-one-liner-install}

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

两个引导脚本的行为相同：
1. 检测平台（macOS、Linux 或 Windows）
2. 检查 bun 和 uv（以及选择的 serena），缺少时安装
3. 运行交互式安装器，选择预设和提供商
4. 使用选定的技能和配置创建 `.agents/`
5. 设置运行时集成层（针对检测到的供应商配置钩子、符号链接和设置）
6. 配置代码智能和内存 MCP 服务器

引导脚本会在可选依赖失败后继续，并报告后续命令。AgentMemory 是默认的语义记忆提供商：如果它的安装、启动或健康检查失败，`oma install` 和 `oma update` 会失败。选择 `providers.semantic_memory: none` 或 `honcho`，或设置 `OMA_NO_AGENTMEMORY=1`，会跳过 AgentMemory 的自动准备。安装器结束后运行 `oma doctor`。

---

## 方式二：通过 bunx 手动安装 {#method-2-manual-install-via-bunx}

```bash
bunx oh-my-agent@latest
```

这会启动交互式安装器，但不会执行依赖引导。你需要先安装 bun。

安装器会提示你选择[技能预设](./glossary.md#skill-preset)。当前预设定义在 `cli/constants/skill-data.ts` 的 `PRESETS` 中：

### 预设 {#presets}

选择与仓库所需工作相匹配的预设。下表中的技能名称省略了 `oma-` 前缀。

| 预设 | 适用的项目 | 包含的技能 | 数量 |
|--------|-------------------------------|-----------------|-------|
| **all** | 任何项目，或希望所有工作流开箱即用 | 注册表中的全部技能 | 33 |
| **fullstack** | 带后端和 Terraform 基础设施的 Web 与移动客户端 | architecture, brainstorm, design, frontend, backend, mobile, db, pm, qa, debug, scm, tf-infra, dev-workflow | 13 |
| **fullstack-web** | 带后端和数据库的 Web 前端 | architecture, brainstorm, design, frontend, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **fullstack-mobile** | 带后端和数据库的移动应用 | architecture, brainstorm, design, mobile, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **frontend** | 仅 Web UI | architecture, brainstorm, design, frontend, pm, qa, debug, scm | 8 |
| **backend** | 带数据库的 API 或服务 | architecture, brainstorm, backend, db, pm, qa, debug, scm, dev-workflow | 9 |
| **mobile** | 仅移动应用 | architecture, brainstorm, mobile, pm, qa, debug, scm | 7 |
| **devops** | 基础设施、CI/CD 和可观测性工作 | architecture, brainstorm, tf-infra, dev-workflow, observability, pm, qa, debug, scm | 9 |
| **research** | 论文、市场研究以及 PDF/HWP 转换 | scholar, market, pdf, hwp, academic-writing, search, translation, scm | 8 |
| **content** | 设计素材、图像、语音和文字内容 | design, image, voice, academic-writing, translation, scm | 6 |

预设是技能集合，不会为每项技能创建一个子智能体定义。`all` 预设从实时技能注册表展开，因此列表可以随着仓库增长。领域预设只包含该方向所需的技能。

### 需要预设之外技能的工作流 {#workflows-that-need-skills-outside-a-preset}

每个预设都会安装全部工作流和智能体定义，但有几个工作流会读取领域预设不安装的技能。选择领域预设前，请先查看此表：

| 工作流 | 读取的技能 | 包含该技能的预设 |
|----------|-------------|-------------------------|
| `/work`, `/orchestrate` | oma-coordination, oma-orchestration | all |
| `/ultrawork`, `/ralph` | oma-coordination；它生成的 `refactor-engineer` 智能体使用 oma-refactor | all |
| `/docs` | oma-docs | all |
| `/explain` | oma-explanation | all |
| `/security` | oma-security | all |
| `/recap` | oma-recap | all |
| `/video` | oma-video | all |
| `/convert`（PDF、HWP） | oma-pdf, oma-hwp | all, research |
| `/design` | oma-design | all, fullstack, fullstack-web, fullstack-mobile, frontend, content |
| `/architecture`, `/brainstorm`, `/plan`, `/review`, `/debug` | oma-architecture, oma-brainstorm, oma-pm, oma-qa, oma-debug | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops |
| `/scm` | oma-scm | 所有预设 |

之后要添加缺失的技能，请在项目根目录运行 `oma doctor`，接受缺失技能提示，然后选择 **Select individually**。

无论选择哪个预设，共享资源（`_shared/`）都会安装。这些资源包括核心路由、上下文加载、提示结构、供应商检测、执行协议和内存协议。

### 安装后生成的内容 {#what-gets-created}

安装后，项目会包含：

```text
.agents/
├── oma-config.yaml          # Your preferences
├── oma-config.cue           # Optional schema-backed configuration
├── mcp.json                 # MCP server configuration
├── skills/
│   ├── _shared/             # Shared resources (always installed)
│   │   ├── core/            # skill-routing, context-loading, etc.
│   │   ├── runtime/         # memory-protocol, execution-protocols/
│   │   └── conditional/     # quality-score, experiment-ledger, etc.
│   ├── oma-frontend/        # Per preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                  # Other selected skills
├── workflows/               # Workflow definitions (all 21, every preset)
├── agents/                  # Subagent definitions (all 12, every preset)
├── hooks/                   # Hook sources (core/, variants/)
├── rules/                   # Project rules
├── config/                  # Shipped defaults (defaults.yaml)
├── results/                 # Plans and agent results (populated by workflows)
└── state/                   # Persistent workflow and coordination state
    └── memories/            # Runtime coordination state

.claude/
├── settings.json            # Vendor settings, when Claude Code is selected
├── hooks/
│   ├── oma-hook.sh          # Generated wrapper for the in-process hook chain
│   └── hud.ts               # Optional [OMA] statusline indicator
├── skills/                  # Symlinks → .agents/skills/
└── agents/                  # Generated native subagent files, when supported
```

安装器只会为你选择的主机创建供应商目录。钩子源代码保留在 `.agents/hooks/core/`；生成的供应商文件是集成输出。较旧项目中，Serena 也可能使用传统的 `.serena/memories/` 目录。

---

## 方式三：全局安装 {#method-3-global-install}

如需使用 CLI 级功能（仪表盘、智能体启动和诊断），请全局安装 oh-my-agent：

:::note
本节安装的是 `oma` 命令。它不同于 `oma install --global`，后者会把技能、工作流和规则安装到 OMA 全局主目录（`~/.oma/.agents/`），供所有项目使用。请参阅[全局安装](../guide/global-install.md)。
:::

### Homebrew（macOS/Linux） {#homebrew-macoslinux}

```bash
brew install oh-my-agent
```

### npm / bun 全局安装 {#npm--bun-global}

```bash
bun install --global oh-my-agent
# or
npm install --global oh-my-agent
```

这会全局安装 `oma` 命令，让你可以从任意目录访问全部 CLI 命令：

```bash
oma doctor # Health check
oma doctor --profile # Show resolved model/CLI per dispatch role
oma dashboard terminal # Terminal monitoring
oma dashboard web # Web dashboard at http://127.0.0.1:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update installed skills from the registry
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # Proxy MCP stdio to a shared per-project Serena server
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives
oma image # Multi-vendor AI image generation
oma video # Video generation and capture
oma slide # Presentation generation and export
oma star # Star the repository
```

`oma` 是 `oh-my-agent` 的缩写。两者都可以作为 CLI 命令使用。

---

## AI CLI 工具安装 {#ai-cli-tool-installation}

你至少需要安装一个 AI CLI 工具。oh-my-agent 支持多个供应商，可以通过智能体到 CLI 的映射，为不同智能体混用不同 CLI。

### Claude Code {#claude-code}

```bash
curl -fsSL https://claude.ai/install.sh | bash
# or
npm install --global @anthropic-ai/claude-code
```

首次运行时会自动完成认证。Claude Code 使用 `.claude/` 保存钩子和设置，技能通过符号链接从 `.agents/skills/` 引入。

### Codex CLI {#codex-cli}

```bash
bun install --global @openai/codex
# or
npm install --global @openai/codex
```

安装后运行 `codex login` 完成认证。

### Qwen CLI {#qwen-cli}

```bash
bun install --global @qwen-code/qwen-code
```

安装后在 CLI 中运行 `/auth` 完成认证。

### Antigravity CLI（`agy`） {#antigravity-cli-agy}

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

首次运行时由 `agy` 处理认证。二进制文件名为 `agy`。在无头环境中，改为设置 `ANTIGRAVITY_API_KEY` 环境变量。`oma doctor` 会通过 `~/.gemini/antigravity-cli/cache/onboarding.json` 报告认证状态。

---

## oma-config.yaml {#oma-configyaml}

`oma install` 命令会创建 `.agents/oma-config.yaml`。这是所有 oh-my-agent 行为的中央配置文件：

```yaml
# Required
language: en
model_preset: auto          # follows the current runtime's native model settings

# Optional — date/time preferences
date_format: ISO
timezone: Australia/Sydney  # omit to use the system timezone

# Optional — auto-update the CLI in background
auto_update_cli: true
telemetry: false

# Optional — capability providers (defaults are context7/native/serena/agentmemory)
# providers:
#   docs: context7
#   web: native
#   code_intelligence: serena
#   code_intelligence_guard: block   # deny native Grep/Glob/rg while serena is configured (off to disable)
#   semantic_memory: agentmemory

# Optional — browser DevTools MCP. Omit to preserve the current setup.
# mcp:
#   devtools_browsers: [aside]

# Optional — partial override per agent (object-only, shallow merge)
agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.6 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-5.5, effort: high }
```

### 字段参考 {#field-reference}

| 字段 | 类型 | 必填 | 说明 |
|-------|------|----------|-------------|
| `language` | string | 是 | 响应语言代码。支持 en、ko、ja、zh、es、fr、de、pt、ru、nl、pl。 |
| `model_preset` | string | 是 | 当前[模型预设](./glossary.md#model-preset)键。`auto` 遵循当前运行时；固定键包括 `free`、`antigravity`、`claude`、`codex`、`qwen`、`cursor`、`kiro` 和 `mixed`。也可以使用自定义预设键。参见[按智能体配置模型](../guide/per-agent-models.md)。 |
| `default_cli` | string | 否 | 当显式智能体设置和选定预设未解析出供应商时，`oma agent spawn` 使用的回退 CLI。 |
| `free` | map | 否 | `model_preset: free` 时使用的 FreeLLMAPI 网关设置；请把 API 密钥放在环境变量中。 |
| `providers` | map | 否 | 能力提供商：`code_intelligence`（`serena` 或 `gortex`）、`code_intelligence_guard`（`block` 或 `off`）、`docs`（`context7`）、`web`（`native` 或 `brave`）以及 `semantic_memory`（`agentmemory`、`honcho` 或 `none`）。 |
| `date_format` | string | 否 | 时间戳格式（`ISO`、`US`、`EU`）。默认值：`ISO`。 |
| `timezone` | string | 否 | 时区标识符（例如 `Asia/Seoul`）。省略时使用主机系统时区。 |
| `auto_update_cli` | boolean | 否 | 是否允许例行 CLI 检查在后台更新。默认值：`true`（使用 `false` 退出）。 |
| `telemetry` | boolean | 否 | 是否加入供应商遥测。默认值：`false`。 |
| `agents` | map | 否 | 按智能体进行的部分覆盖（仅对象形式的 `AgentSpec`）。在预设默认值之上进行浅合并。 |
| `models` | map | 否 | 用户定义的模型 slug，过去保存在 `models.yaml` 中。 |
| `custom_presets` | map | 否 | 用户定义的预设。支持 `extends:`，可从内置预设部分继承。 |
| `mcp.devtools_browsers` | list | 否 | DevTools MCP 使用的浏览器：`aside`、`chrome` 或 `firefox`。省略时保留现有设置；`[]` 会显式停用浏览器服务器。 |
| `serena.mode` | string | 否 | `bridge` 共享项目 Serena 服务器，也是默认值；`stdio` 选择每个会话启动一个进程。 |
| `serena.auto_update` | boolean | 否 | `oma update` 是否升级 Serena。默认值：`true`。 |

> **配置格式：** 有效的 `.agents/oma-config.cue` 会作为共享配置求值。如果共享 CUE 求值失败，加载器可以回退到 `.agents/oma-config.yaml`；本地覆盖文件（`oma-config.local.cue` 或 `.yaml`）是可选的，但无效的本地意图会导致失败。`OMA_MODEL_PRESET` 会在当前进程中覆盖文件值。

### 供应商解析 {#vendor-resolution}

启动智能体时，CLI 按以下顺序解析设置：`agents.<id>`、选定的 `model_preset`、预设编排器回退值，然后是 `default_cli`。当 `model_preset: auto` 时，当前运行时的原生配置提供模型；未知运行时回退到 `default_cli`。完整矩阵见[按智能体配置模型](../guide/per-agent-models.md)。

---

## 验证：`oma doctor` {#verification-oma-doctor}

安装和设置完成后，验证各项是否正常：

```bash
oma doctor
```

此命令会检查：
- 选定的主机 CLI 已安装且可访问；可选工具会单独报告
- 已配置的 MCP 服务器条目有效（例如 Serena、Gortex、Context7 或 DevTools）
- 技能文件存在，且 SKILL.md 的前置元数据有效
- 符号链接和钩子脚本指向有效目标
- 供应商设置文件中的钩子配置正确
- 选定的代码智能和内存提供商可访问（使用 Gortex 时，还会检查当前项目是否在守护进程的跟踪集合中）
- `oma-config.cue` / `oma-config.yaml` 有效且包含必填字段

如果发现问题，`oma doctor` 会指出缺失或无效的项目，并区分第一次任务的阻塞项与可选集成警告。

要查看每个智能体解析出的模型和 CLI，请运行：

```bash
oma doctor --profile
```

完整矩阵和迁移细节见[按智能体配置模型](../guide/per-agent-models.md)。

---

## 更新 {#updating}

### CLI 更新 {#cli-update}

```bash
oma update
```

这会把全局 oh-my-agent CLI 更新到最新版本。

### 项目技能更新 {#project-skills-update}

可以通过 GitHub Action（`action/`）自动更新项目中的技能和工作流，也可以手动重新运行安装器：

```bash
bunx oh-my-agent@latest
```

安装器会检测已有安装并提供更新选项，同时保留你的 `oma-config.yaml` 和所有自定义配置。

---

## 接下来 {#what-is-next}

在选定的 AI IDE 或 CLI 中打开项目，开始使用 oh-my-agent。技能路由取决于主机；启用的钩子可以检测工作流。试试：

```text
"Build a login form with email validation using Tailwind CSS"
```

也可以使用工作流命令：

```text
/plan authentication feature with JWT and refresh tokens
```

详见[使用指南](/docs/guide/usage)，或阅读[智能体](/docs/core-concepts/agents)了解每个专家的职责。如果安装或钩子的行为不符合预期，请参阅[故障排查](../guide/troubleshooting.md)。
