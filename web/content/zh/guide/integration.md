---
title: "指南：现有项目集成"
description: 将 oh-my-agent 添加到现有项目的完整指南 —— CLI 路径、手动路径、验证、SSOT 符号链接结构以及安装器的底层工作原理。
---

# 指南：现有项目集成

## 两种集成路径

有两种方式将 oh-my-agent 添加到现有项目：

1. **CLI 路径** —— 运行 `oma`（或 `npx oh-my-agent`）并按照交互式提示操作。推荐大多数用户使用。
2. **手动路径** —— 自行复制文件和配置符号链接。适用于受限环境或自定义设置。

两种路径产生相同的结果：一个 `.agents/` 目录（SSOT），IDE 特定目录通过符号链接指向它。

---

## CLI 路径：逐步操作

### 1. 安装 CLI

```bash
# 全局安装（推荐）
bun install --global oh-my-agent

# 或使用 npx 一次性运行
npx oh-my-agent
```

全局安装后，`oma`（或 `oh-my-agent`）命令可用。

### 2. 导航到项目根目录

```bash
cd /path/to/your/project
```

安装器需要从项目根目录（`.git/` 所在位置）运行。

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

- **Python** —— FastAPI/SQLAlchemy（默认）
- **Node.js** —— NestJS/Hono + Prisma/Drizzle
- **Rust** —— Axum/Actix-web
- **Other / Auto-detect** —— 稍后使用 `/stack-set` 配置

### 6. 配置 IDE 符号链接

安装器始终创建 Claude Code 符号链接（`.claude/skills/`）。如果存在 `.github/` 目录，还会自动创建 GitHub Copilot 符号链接。否则，会询问：

```
Also create symlinks for GitHub Copilot? (.github/skills/)
```

### 7. Git Rerere 设置

安装器检查是否启用了 `git rerere`（重用已记录的解决方案）。如果未启用，会提议全局启用：

```
Enable git rerere? (Recommended for multi-agent merge conflict reuse)
```

推荐启用，因为多智能体工作流可能产生合并冲突，rerere 会记住你的解决方式，下次自动应用相同的解决方案。

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
# 从注册表下载最新 tarball
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz

# 验证校验和
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz.sha256" -o agent-skills.tar.gz.sha256
sha256sum -c agent-skills.tar.gz.sha256

# 解压
tar -xzf agent-skills.tar.gz
```

### 步骤 2：复制文件到你的项目

```bash
# 复制核心 .agents/ 目录
cp -r .agents/ /path/to/your/project/.agents/

# 创建 Claude Code 符号链接
mkdir -p /path/to/your/project/.claude/skills
mkdir -p /path/to/your/project/.claude/agents

# 符号链接技能（以全栈项目为例）
ln -sf ../../.agents/skills/oma-frontend /path/to/your/project/.claude/skills/oma-frontend
ln -sf ../../.agents/skills/oma-backend /path/to/your/project/.claude/skills/oma-backend
ln -sf ../../.agents/skills/oma-qa /path/to/your/project/.claude/skills/oma-qa
ln -sf ../../.agents/skills/oma-pm /path/to/your/project/.claude/skills/oma-pm

# 符号链接共享资源
ln -sf ../../.agents/skills/_shared /path/to/your/project/.claude/skills/_shared

# 符号链接工作流路由器
for workflow in .agents/workflows/*.md; do
  name=$(basename "$workflow" .md)
  ln -sf ../../.agents/workflows/"$name".md /path/to/your/project/.claude/skills/"$name".md
done

# 符号链接智能体定义
for agent in .agents/agents/*.md; do
  name=$(basename "$agent")
  ln -sf ../../.agents/agents/"$name" /path/to/your/project/.claude/agents/"$name"
done
```

### 步骤 3：配置用户偏好

```bash
mkdir -p /path/to/your/project/.agents/config
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
default_cli: gemini

agent_cli_mapping:
  frontend: gemini
  backend: gemini
  mobile: gemini
  qa: gemini
  debug: gemini
  pm: gemini
EOF
```

### 步骤 4：初始化内存目录

```bash
oma memory:init
# 或手动：
mkdir -p /path/to/your/project/.serena/memories
```

---

## 验证清单

安装后（无论哪种路径），验证一切设置正确：

```bash
# 运行 doctor 命令进行完整健康检查
oma doctor

# CI 用的输出格式
oma doctor --json
```

doctor 命令检查：

| 检查项 | 验证内容 |
|:-------|:---------|
| **CLI 安装** | gemini、claude、codex、qwen —— 版本和可用性 |
| **认证** | 每个 CLI 的 API 密钥或 OAuth 状态 |
| **MCP 配置** | 每个 CLI 环境的 Serena MCP 服务器设置 |
| **技能状态** | 已安装哪些技能以及是否为最新版本 |

手动验证命令：

```bash
# 验证 .agents/ 目录存在
ls -la .agents/

# 验证技能已安装
ls .agents/skills/

# 验证符号链接指向正确目标
ls -la .claude/skills/

# 验证配置存在
cat .agents/oma-config.yaml

# 验证内存目录
ls .serena/memories/ 2>/dev/null || echo "Memory not initialized"

# 检查版本
cat .agents/skills/_version.json 2>/dev/null
```

---

## 多 IDE 符号链接结构（SSOT 概念）

oh-my-agent 使用唯一事实来源（SSOT）架构。`.agents/` 目录是技能、工作流、配置和智能体定义的唯一存放位置。所有 IDE 特定目录仅包含指向 `.agents/` 的符号链接。

### 目录布局

```
your-project/
  .agents/                          # SSOT —— 真实文件在这里
    agents/                         # 智能体定义文件
      backend-engineer.md
      frontend-engineer.md
      qa-reviewer.md
      ...
    config/                         # 配置
      oma-config.yaml
    mcp.json                        # MCP 服务器配置
    plan.json                       # 当前计划（由 /plan 生成）
    skills/                         # 已安装技能
      _shared/                      # 所有技能共享的资源
        core/                       # 核心协议和参考
        runtime/                    # 运行时执行协议
        conditional/                # 条件加载的资源
      oma-frontend/                 # Frontend 技能
      oma-backend/                  # Backend 技能
      oma-qa/                       # QA 技能
      ...
    workflows/                      # 工作流定义
      orchestrate.md
      work.md
      ultrawork.md
      plan.md
      ...
    results/                        # 智能体执行结果
  .claude/                          # Claude Code —— 仅符号链接
    skills/                         # -> .agents/skills/* 和 .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot —— 仅符号链接（可选）
    skills/                         # -> .agents/skills/*
  .serena/                          # MCP 内存存储
    memories/                       # 运行时内存文件
    metrics.json                    # 生产力指标
```

### 为什么使用符号链接？

- **一次更新，所有 IDE 受益。** 当 `oma update` 刷新 `.agents/` 时，每个 IDE 自动获取变更。
- **无重复。** 技能存储一次，不按 IDE 复制。
- **安全移除。** 删除 `.claude/` 不会销毁你的技能。`.agents/` 中的 SSOT 保持完整。
- **Git 友好。** 符号链接很小，diff 清晰。

---

## 安全提示和回滚策略

### 安装前

1. **提交当前工作。** 安装器创建新目录和文件。干净的 git 状态意味着你可以 `git checkout .` 撤销一切。
2. **检查现有 `.agents/` 目录。** 如果存在来自其他工具的目录，先备份。安装器会覆盖它。

### 安装后

1. **审查创建的内容。** 运行 `git status` 查看所有新文件。安装器只在 `.agents/`、`.claude/` 和可选的 `.github/` 中创建文件。
2. **选择性添加到 `.gitignore`。** 大多数团队提交 `.agents/` 和 `.claude/` 以共享设置。但 `.serena/`（运行时内存）和 `.agents/results/`（执行结果）应被 gitignore：

```gitignore
# oh-my-agent 运行时文件
.serena/
.agents/results/
.agents/state/
```

### 回滚

完全从项目中移除 oh-my-agent：

```bash
# 移除 SSOT 目录
rm -rf .agents/

# 移除 IDE 符号链接
rm -rf .claude/skills/ .claude/agents/
rm -rf .github/skills/  # 如果创建了

# 移除运行时文件
rm -rf .serena/
```

或简单地用 git 还原：

```bash
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```

---

## 仪表盘设置

安装后，你可以设置实时监控。详情参见[仪表盘监控指南](/zh/guide/dashboard-monitoring)。

快速设置：

```bash
# 终端仪表盘（监视 .serena/memories/ 的变化）
oma dashboard

# Web 仪表盘（基于浏览器，http://localhost:9847）
oma dashboard:web
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

- `core/` —— 技能路由、上下文加载、提示词结构、质量原则、供应商检测、API 契约。
- `runtime/` —— 内存协议、每供应商的执行协议。
- `conditional/` —— 仅在特定条件满足时加载的资源（质量评分、探索循环）。

### 5. 工作流安装

`installWorkflows()` 将所有工作流文件复制到 `.agents/workflows/`。这些是 `/orchestrate`、`/work`、`/ultrawork`、`/plan`、`/exec-plan`、`/brainstorm`、`/deepinit`、`/review`、`/debug`、`/design`、`/commit`、`/tools` 和 `/stack-set` 的定义。

### 6. 配置安装

`installConfigs()` 将默认配置文件复制到 `.agents/config/`，包括 `oma-config.yaml` 和 `mcp.json`。如果这些文件已存在，除非使用 `--force`，否则保留（不覆盖）。

### 7. 技能安装

对于每个选中的技能，`installSkill()` 将技能目录复制到 `.agents/skills/{skill-name}/`。如果选择了变体（如 Python 用于 backend），还会设置包含语言特定资源的 `stack/` 目录。

### 8. 供应商适配

`installVendorAdaptations()` 为所有支持的供应商（Claude、Codex、Gemini、Qwen）安装 IDE 特定文件：

- 智能体定义（`.claude/agents/*.md`）
- 钩子配置（`.claude/hooks/`）
- 设置文件
- CLAUDE.md 项目指令

### 9. CLI 符号链接

`createCliSymlinks()` 从 IDE 特定目录创建指向 SSOT 的符号链接：

- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}.md` -> `../../.agents/workflows/{workflow}.md`
- `.claude/agents/{agent}.md` -> `../../.agents/agents/{agent}.md`
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}`（如果启用了 Copilot）

### 10. 全局工作流

`installGlobalWorkflows()` 安装可能需要全局使用的工作流文件（项目目录之外）。

### 11. Git Rerere + MCP 配置

如上文 CLI 路径所述，安装器可选配置 git rerere 和 MCP 设置。
