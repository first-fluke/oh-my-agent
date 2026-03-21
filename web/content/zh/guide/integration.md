---
title: 集成到现有项目
description: 将 oh-my-agent 技能添加到现有 AI IDE 项目的安全且无损的集成工作流。
---

# 集成到现有项目

本指南替代旧版根目录 `AGENT_GUIDE.md` 工作流，并反映当前的工作区结构（`cli` + `web`）和 CLI 行为。

## 目标

将 `oh-my-agent` 技能添加到现有项目中，且不覆盖当前资源。

## 推荐方式（CLI）

在目标项目根目录运行：

```bash
bunx oh-my-agent
```

执行内容：

- 安装或更新 `.agents/skills/*`
- 安装共享资源到 `.agents/skills/_shared`
- 安装 `.agents/workflows/*`
- 安装 `.agents/config/user-preferences.yaml`
- 可选安装全局工作流到 `~/.agents/global_workflows`

## 安全的手动方式

当您需要完全控制每个复制目录时使用此方式。

```bash
cd /path/to/your-project

mkdir -p .agents/skills .agents/workflows .agents/config

# 仅复制缺失的技能目录（示例）
for skill in oma-coordination oma-pm oma-frontend oma-backend oma-mobile oma-qa oma-debug oma-orchestrator oma-commit; do
  if [ ! -d ".agents/skills/$skill" ]; then
    cp -r /path/to/oh-my-agent/.agents/skills/$skill .agents/skills/$skill
  fi
done

# 如果缺失则复制共享资源
[ -d .agents/skills/_shared ] || cp -r /path/to/oh-my-agent/.agents/skills/_shared .agents/skills/_shared

# 如果缺失则复制工作流
for wf in coordinate.md orchestrate.md plan.md review.md debug.md setup.md tools.md; do
  [ -f ".agents/workflows/$wf" ] || cp /path/to/oh-my-agent/.agents/workflows/$wf .agents/workflows/$wf
done

# 仅在缺失时复制默认用户偏好设置
[ -f .agents/config/user-preferences.yaml ] || cp /path/to/oh-my-agent/.agents/config/user-preferences.yaml .agents/config/user-preferences.yaml
```

## 验证检查清单

```bash
# 9 个可安装技能（不含 _shared）
find .agents/skills -mindepth 1 -maxdepth 1 -type d ! -name '_shared' | wc -l

# 共享资源
[ -d .agents/skills/_shared ] && echo ok

# 7 个工作流
find .agents/workflows -maxdepth 1 -name '*.md' | wc -l

# 基本命令健康检查
bunx oh-my-agent doctor
```

## 可选仪表盘

仪表盘为可选功能，使用已安装的 CLI：

```bash
bunx oh-my-agent dashboard
bunx oh-my-agent dashboard:web
```

Web 仪表盘默认 URL：`http://localhost:9847`

## 回滚策略

集成前，在您的项目中创建一个检查点提交：

```bash
git add -A
git commit -m "chore: checkpoint before oh-my-agent integration"
```

如需撤销，按照您团队的常规流程回退该提交即可。

## 多 CLI 符号链接支持

当您运行 `bunx oh-my-agent` 时，选择技能后会看到此提示：

```text
Also develop with other CLI tools?
  ○ Claude Code (.claude/skills/)
  ○ OpenCode, Amp, Codex (.agents/skills/)
  ○ GitHub Copilot (.github/skills/)
```

选择您在 AI IDE 之外使用的其他 CLI 工具。安装器将：

1. 将技能安装到 `.agents/skills/`（AI IDE 的原生位置）
2. 从每个选定 CLI 的技能目录创建到 `.agents/skills/` 的符号链接

这确保了单一真实来源，同时允许技能在多个 CLI 工具间共用。

### 符号链接结构

```
.agents/skills/oma-frontend/      ← 源（唯一真实来源）
.claude/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/
.agents/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (OpenCode, Amp, Codex)
.github/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (GitHub Copilot)
```

安装器会跳过已存在的符号链接，如果目标位置存在真实目录则发出警告。

## 注意事项

- 除非您打算替换自定义技能，否则请勿覆盖现有的 `.agents/skills/*` 文件夹。
- 将项目特定的策略文件（`.agents/config/*`）保留在您的仓库管理下。
- 如需了解多代理编排模式，请继续阅读 [`使用指南`](./usage.md)。
