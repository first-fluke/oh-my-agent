---
title: "指南：现有项目集成"
sidebar_label: 现有项目
description: 将 oh-my-agent 添加到现有项目的完整指南，涵盖 CLI 路径、手动路径、验证、SSOT 符号链接结构，以及安装器的底层工作原理。
---

# 指南：现有项目集成

## 两种集成路径

有两种方式将 oh-my-agent 添加到现有项目：

1. **CLI 路径**：运行 `oma`（或 `npx oh-my-agent`）并按照交互式提示操作。推荐大多数用户使用。
2. **手动路径**：自行复制文件和配置符号链接。适用于受限环境或自定义设置。

两种路径产生相同结果：一个 `.agents/` 目录（SSOT），以及由它生成的供应商原生文件，例如 `.claude/agents/`、`.codex/agents/` 和 `.qwen/agents/`。

---

## CLI 路径：逐步操作

### 1. 安装 CLI

```bash
# Global install (recommended)
bun install --global oh-my-agent

# Or use npx for one-time runs
npx oh-my-agent
```

全局安装后，`oma`（或 `oh-my-agent`）命令可用。

### 2. 导航到项目根目录

```bash
cd /path/to/your/project
```

请从要配置的项目目录运行安装器。OMA 会相对于安装根目录写入 SSOT；虽然建议使用 Git 仓库来审查和回滚，但安装器并不要求仓库存在。

### 3. 运行安装器

```bash
oma
```

默认命令（无子命令）启动交互式安装器。

### 4. 选择项目类型

安装器提供以下预设：

| 预设 | 包含的技能 |
|:-----|:----------|
| **All** | 所有可用技能 |
| **Fullstack** | Frontend + Backend + PM + QA |
| **Frontend** | React/Next.js 技能 |
| **Backend** | Python/Node.js/Rust 后端技能 |
| **Mobile** | Flutter/Dart 移动端技能 |
| **DevOps** | Terraform + CI/CD + 工作流技能 |
| **Custom** | 从完整列表中选择单个技能 |

### 5. 选择后端语言（如适用）

如果选择了包含 backend 技能的预设，会询问语言变体：

- **Python**：FastAPI/SQLAlchemy（默认）
- **Node.js**：NestJS/Hono + Prisma/Drizzle
- **Rust**：Axum/Actix-web
- **Other / Auto-detect**：稍后使用 `/stack-set` 配置

### 6. 配置 IDE 符号链接

安装器始终创建 Claude Code 符号链接（`.claude/skills/`）。它还会生成所选供应商的原生智能体文件、钩子、设置和集成文件；当前供应商系列包括 Antigravity、Claude、Codex、Cursor、Kiro、Kimi、Qwen，以及 pi 和 OpenCode 的扩展路径。如果存在 `.github/` 目录，还可以自动创建 GitHub Copilot 符号链接。选择 **ZCode** 时，会通过 `.zcode/commands/*.md` 符号链接暴露工作流斜杠命令（只有工作流，不包含智能体文件或钩子）。否则，会询问：

```
Also create symlinks for GitHub Copilot? (.github/skills/)
```

### 7. 推荐的全局 git 配置

在 `oma install` 和 `oma update` 接近结束时，CLI 会检查两个有助于多智能体工作流的**全局** git 设置：

| 键 | 目标值 | 原因 |
|:----|:--------------|:----|
| `rerere.enabled` | `true` | 重用已记录的解决方案。多智能体合并经常遇到相同冲突，rerere 会重放之前的修复 |
| `init.defaultBranch` | `main` | 为新仓库统一默认分支名称 |

```
Enable git rerere? (Recommended for multi-agent merge conflict reuse) (unset)
Set git init.defaultBranch to main? (Recommended global default) (currently "master")
```

接受后会运行等效命令：

```bash
git config --global rerere.enabled true
git config --global init.defaultBranch main
```

非交互路径（`--yes`、`--ci`、`CI=true`）不会写入全局 git 配置，只会打印跳过提示和手动修复命令。

`oma doctor` 会在 **Git Config** 下报告相同检查，将不匹配计为问题，在 `--json` 输出中以 `gitRecommended` 暴露，并可交互式应用修复。

### 8. MCP 配置

如果存在 Antigravity IDE MCP 配置（`~/.gemini/antigravity/mcp_config.json`），安装器会提议配置 Serena MCP 桥接：

```
Configure Serena MCP with bridge? (Required for full functionality)
```

如果接受，会设置：

```json
{
  "mcpServers": {
    "serena": {
      "command": "npx",
      "args": ["-y", "oh-my-agent@latest", "bridge", "http://localhost:12341/mcp"],
      "disabled": false
    }
  }
}
```

类似地，如果存在 Gemini CLI 设置（`~/.gemini/settings.json`），会提议以 HTTP 模式为 Gemini CLI 配置 Serena：

```json
{
  "mcpServers": {
    "serena": {
      "url": "http://localhost:12341/mcp"
    }
  }
}
```

### 9. 完成

安装器显示安装摘要：
- 已安装技能列表
- 技能目录位置
- 已创建的符号链接
- 跳过的项目（如有）

---

## 手动路径

适用于交互式 CLI 不可用的环境（CI 流水线、受限 shell、企业机器）。

### 步骤 1：下载和解压

```bash
# Download the latest tarball from the registry
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz

# Verify checksum
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz.sha256" -o agent-skills.tar.gz.sha256
sha256sum -c agent-skills.tar.gz.sha256

# Extract
tar -xzf agent-skills.tar.gz
```

### 步骤 2：复制文件到你的项目

```bash
# Copy the core .agents/ directory
cp -r .agents/ /path/to/your/project/.agents/

# Regenerate vendor-native files from the SSOT
cd /path/to/your/project
oma link
```

`oma link` 会从 SSOT 重新生成 `.claude/`、`.codex/`、`.qwen/` 以及其他供应商原生文件。运行时只有当前运行时供应商与该智能体的目标供应商一致时，OMA 才使用原生分发；混合供应商设置仍然可用，但不匹配的智能体会回退到外部 `oma agent spawn`。

在 Qwen Code 中，生成的 Markdown 定义位于 `.qwen/agents/`。通过 Agent 工具的 `subagent_type` 选择 OMA 角色，例如 `backend-engineer`。在 Qwen Code 中使用 `/agents manage` 查看可用的定义。原生智能体与 CLI 启动使用相同的[结果生命周期](./agent-results-and-resume.md)：`oma agent begin`、`oma agent verify` 和 `oma agent finish`。使用 `model_preset: free` 时，请使用 `oma agent spawn`，这样子进程才能获得网关配置。

Qwen Code 与其他供应商使用相同的 `code-intelligence-primer`。与 Claude Code 一样，它在 `SessionStart` 和 `UserPromptSubmit` 上注册共享的 primer：指引每个会话注入一次，并在上下文压缩后再次注入。primer 遵循已配置的提供方（Serena 或 Gortex），包含延迟加载工具的指引，并在提供方不可用或超时时允许回退到原生搜索。Qwen 不会另外添加代码搜索拦截或提供方结果跟踪。

更新 CLI 后，运行 `oma link qwen` 重新生成钩子设置和包装脚本，然后启动新的 Qwen 会话。钩子输出测试验证的是集成契约，并不保证模型会选择哪个工具。

### 步骤 3：配置用户偏好

```bash
mkdir -p /path/to/your/project/.agents
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
model_preset: antigravity
EOF
```

### 步骤 4：初始化内存目录

```bash
oma memory init
# Or manually:
mkdir -p /path/to/your/project/.agents/state/memories
```

---

## 验证清单

安装后（无论哪种路径），验证一切设置正确：

```bash
# Run the doctor command for a full health check
oma doctor

# Check output format for CI
oma doctor --json
```

doctor 命令检查：

| 检查项 | 验证内容 |
|:-------|:---------|
| **CLI 安装** | agy、claude、codex、qwen：版本和可用性 |
| **认证** | 每个 CLI 的 API 密钥或 OAuth 状态 |
| **MCP 配置** | 每个 CLI 环境的 Serena MCP 服务器设置 |
| **技能状态** | 已安装哪些技能以及是否为最新版本 |

```bash
# Verify .agents/ directory exists
ls -la .agents/

# Verify skills are installed
ls .agents/skills/

# Verify symlinks point to correct targets
ls -la .claude/skills/

# Verify config exists
cat .agents/oma-config.yaml

# Verify memory directory
ls .agents/state/memories/ 2>/dev/null || echo "Memory not initialized"

# Check version
cat .agents/skills/_version.json 2>/dev/null
```

手动验证命令：

---

## 多 IDE 符号链接结构（SSOT 概念）

oh-my-agent 使用唯一事实来源（SSOT）架构。`.agents/` 目录是技能、工作流、配置和智能体定义的唯一存放位置。所有 IDE 特定目录仅包含指向 `.agents/` 的符号链接。

### 目录布局

```
your-project/
  .agents/                          # SSOT — the real files live here
    agents/                         # Agent definition files
      backend-engineer.md
      frontend-engineer.md
      qa-reviewer.md
      ...
    config/                         # Shipped auxiliary config files
      ...
    oma-config.yaml                 # User-owned project configuration
    mcp.json                        # MCP server configuration
    results/plan-{sessionId}.json    # Current plan (generated by /plan)
    skills/                         # Installed skills
      _shared/                      # Shared resources across all skills
        core/                       # Core protocols and references
        runtime/                    # Runtime execution protocols
        conditional/                # Conditionally-loaded resources
      oma-frontend/                 # Frontend skill
      oma-backend/                  # Backend skill
      oma-qa/                       # QA skill
      ...
    workflows/                      # Workflow definitions
      orchestrate.md
      work.md
      ultrawork.md
      plan.md
      ...
    state/                          # Runtime coordination state
      memories/                     # Coordination artifacts (progress-*, result-*, task-board, session-cost-*)
    results/                        # Agent execution results
  .claude/                          # Claude Code — symlinks only
    skills/                         # -> .agents/skills/* and .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot — symlinks only (optional)
    skills/                         # -> .agents/skills/*
  .zcode/                           # ZCode — workflow commands only (optional)
    commands/                       # -> .agents/workflows/*
  .serena/                          # Serena MCP storage (separate from OMA state)
    memories/                       # Serena's own onboarding memories
    metrics.json                    # Productivity metrics
```

### 为什么使用符号链接？

`oma update` 刷新 `.agents/` 后，所有指向它的 IDE 都会获取更新。技能只保存一份，不需要按 IDE 复制。删除 `.claude/` 不会删除技能，SSOT 仍保留在 `.agents/` 中。符号链接体积小，在 Git 中也容易审查差异。

---

## 安全提示和回滚策略

### 安装前

1. **提交当前工作。** 安装器创建新目录和文件。干净的 git 状态意味着你可以 `git checkout .` 撤销一切。
2. **检查现有 `.agents/` 目录。** 如果存在来自其他工具的目录，先备份。安装器会覆盖它。

### 安装后

1. **审查创建的内容。** 运行 `git status` 查看所有新文件。安装器只在 `.agents/`、`.claude/` 和可选的 `.github/` 中创建文件。
2. **选择性添加到 `.gitignore`。** 大多数团队提交 `.agents/` 和 `.claude/` 以共享设置。安装或更新会自动把运行时条目追加到根目录 `.gitignore`（`.antigravitycli/`、`.agents/results/`、`.agents/state/`、`.agents/backup/`、`docs/plans/`），请确认这些条目已写入。多数团队会提交 `.agents/` 和 `.claude/` 来共享设置。`.serena/` 由 Serena 通过内部 `.serena/.gitignore` 管理，你可以提交共享项目配置 `.serena/project.yml`，也可以完全忽略该目录：

```gitignore
# optional — ignore Serena entirely (runtime memory)
.serena/
```

### 回滚

```bash
# Remove the SSOT directory
rm -rf .agents/

# Remove IDE symlinks
rm -rf .claude/skills/ .claude/agents/
rm -rf .github/skills/  # if created

# Remove runtime files
rm -rf .serena/
```

完全从项目中移除 oh-my-agent：

或简单地用 git 还原：

```bash
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```

---

## 仪表盘设置

安装后，你可以设置实时监控。详情参见[仪表盘监控指南](/docs/guide/dashboard-monitoring)。

快速设置：

```bash
# Terminal dashboard (watches .agents/state/memories/ for changes)
oma dashboard terminal

# Web dashboard (browser-based; OMA prints a tokenized loopback URL)
oma dashboard web
```

---

## 安装器的底层工作原理

运行 `oma`（安装命令）时，以下是具体发生的事情：

### 1. 旧版迁移

安装器检查旧的 `.agent/` 目录（单数形式），如果找到则迁移到 `.agents/`（复数形式）。这是为从早期版本升级的用户做的一次性迁移。

### 2. 竞品检测

安装器扫描竞争工具，提议移除以避免冲突。

### 3. Tarball 下载

安装器从 oh-my-agent GitHub releases 下载最新发布的 tarball。该 tarball 包含完整的 `.agents/` 目录，含所有技能、共享资源、工作流、配置和智能体定义。

### 4. 共享资源安装

`installShared()` 将 `_shared/` 目录复制到 `.agents/skills/_shared/`。包括：

- `core/`：技能路由、上下文加载、提示词结构、质量原则、供应商检测、API 契约。
- `runtime/`：内存协议、每供应商的执行协议。
- `conditional/`：仅在特定条件满足时加载的资源（质量评分、探索循环）。

### 5. 工作流安装

`installWorkflows()` 将所有工作流文件复制到 `.agents/workflows/`。这些是 `/orchestrate`、`/work`、`/ultrawork`、`/plan`、`/brainstorm`、`/deepinit`、`/review`、`/debug`、`/design`、`/scm`、`/tools` 和 `/stack-set` 的定义。

### 6. 配置安装

`installConfigs()` 会将辅助文件复制到 `.agents/config/`，创建 `.agents/mcp.json`，并引导用户拥有的 `.agents/oma-config.yaml` 或 `.agents/oma-config.cue`。除非使用 `--force`，否则保留现有用户文件；`oma update` 也会保留用户配置，并在需要时追加新的顶层模板键。

### 7. 技能安装

对于每个选中的技能，`installSkill()` 将技能目录复制到 `.agents/skills/{skill-name}/`。如果选择了变体（如 Python 用于 backend），还会设置包含语言特定资源的 `stack/` 目录。

### 8. 供应商适配

`installVendorAdaptations()` 会为所选且受支持的供应商安装 IDE 特定文件：

- 智能体定义（`.claude/agents/*.md`、`.codex/agents/*.toml`、`.gemini/agents/*.md`）
- 钩子配置（`.claude/hooks/`、`.codex/hooks.json`）
- 设置文件和共享的供应商集成文档（仅 `AGENTS.md`，包括 Claude Code ≥ 2.1.277）。`CLAUDE.md` 和 `GEMINI.md` 永远不会获得 OMA 区块；已存在的用户自有 `CLAUDE.md` 只会收到一行 `@AGENTS.md` 导入，以免 Claude Code 跳过 `AGENTS.md`

Codex 会将钩子置于一次性信任步骤之后，因此 `.codex/hooks.json` 在你通过 Codex `/hooks` 浏览器完成一次审查前不会运行。详情请参见 [Codex Hook Trust](/docs/guide/codex-hook-trust)。

### 9. CLI 符号链接

`createCliSymlinks()` 从 IDE 特定目录创建指向 SSOT 的符号链接：

- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}.md` -> `../../.agents/workflows/{workflow}.md`
供应商原生智能体文件由 `.agents/agents/` 经 `oma link`、`oma install` 或 `oma update` 生成，不会直接创建符号链接。
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}`（如果启用了 Copilot）

### 10. 全局工作流

`installGlobalWorkflows()` 安装可能需要全局使用的工作流文件（项目目录之外）。

### 11. Git Rerere + MCP 配置

如上文 CLI 路径所述，安装或更新会根据交互式同意可选配置**全局** git 设置（`rerere.enabled`、`init.defaultBranch`），并在适用时配置 MCP 设置。
