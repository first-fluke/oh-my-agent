---
title: "快速开始"
description: "选择一个技能或运行时预设，然后运行一个范围明确的首次任务，并核对实际观察到的验证结果。"
sidebar_label: 快速开始
---

# 快速开始

用一个聚焦的任务来检查结果。可以在你已经在用的编码智能体中加载一个技能；需要项目钩子、专业智能体和工作流时，再安装运行时。[选择设置](./choose-setup.md)说明了可用的路径及其依赖。

## 1. 选择设置 {#1-install}

对于下面的只读 Git 任务，让你的智能体加载该技能，并阅读其说明和支持目录：

```bash
bunx skills use first-fluke/oh-my-agent@oma-scm
```

接着进行第 3 步的任务。该技能的 CLI 操作、其他技能、项目规则和外部服务仍是各自独立的依赖。加载这个技能不会运行 OMA 安装器。

### 需要时安装运行时 {#install-the-runtime-when-needed}

运行时引导程序可以准备 `bun`、`uv`、Serena、CUE 和全局 `oma` 命令。选择你已经在用的 AI CLI 或 IDE；提供方和浏览器集成取决于你打算运行的任务。

在项目目录中运行引导安装器：

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

在 Windows PowerShell 中运行：

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

设置会保留已有的响应语言，或自动检测系统语言。交互式设置会询问 CLI 供应商、[能力提供方](./glossary.md#capability-provider)、[模型预设](./glossary.md#model-preset)、项目[技能预设](./glossary.md#skill-preset)以及任何技术栈变体。首次运行时保留默认值，选择你已经在使用的供应商，并选择与该仓库最接近的项目预设。各预设包含的技能，以及[需要预设之外技能的工作流](./installation.md#workflows-that-need-skills-outside-a-preset)，请参阅[预设](./installation.md#presets)。

如果你已经有 `bun`，可以直接使用安装器：

```bash
bunx oh-my-agent@latest
```

引导脚本会安装到当前项目中。如果要进行 HOME 级别的安装，请使用 `oma install --global`。在混用项目级和全局安装前，请阅读[全局安装](../guide/global-install.md)。

## 2. 检查结果 {#2-check-the-result}

对于临时加载的技能，确认智能体已读取所选的说明，并验证任务本身。对于运行时安装，在同一项目目录中运行健康检查：

```bash
oma doctor
```

文本形式的命令会打印一份报告，其中包含 `CLI Status` 和 `Skills Status` 等小节，然后返回 shell 状态。具体的行取决于项目中安装的宿主：

```text
┌   🩺 oh-my-agent doctor
◇  CLI Status ...
◇  Skills Status ...
$ echo $?
0
```

`oma doctor` 可能会把可选集成的问题报告为警告。默认的 AgentMemory 准备工作会在 `oma install` 和 `oma update` 期间检查；安装、启动或健康检查失败会让这些命令停止。选择 `providers.semantic_memory: none` 或 `honcho`，或设置 `OMA_NO_AGENTMEMORY=1`，会跳过该准备工作。

如需机器可读的状态，`oma doctor --json` 在报告包含问题时会返回非零状态。使用 `oma doctor --profile` 可以检查每个规范智能体角色解析出的模型和 CLI。

如果 `oma` 不可用但已安装 Bun，可以不使用全局命令，直接运行同样的检查：

```bash
bunx oh-my-agent@latest doctor
```

如果仍然找不到 `oma` 命令，请打开新的 shell，或将包管理器的 bin 目录加入 `PATH`；[安装](./installation.md#method-3-global-install)介绍了如何安装 `oma` 命令。如果 `oma doctor` 报告配置无效，请修复指出的字段后再次运行。不要删除 `.agents/oma-config.yaml` 来恢复，它是用户拥有的配置文件，用于在更新之间保留设置。

## 3. 运行一个小任务 {#3-run-one-small-task}

在你的 AI 工具中打开一个现有的 Git 仓库。使用已加载的 `oma-scm` 技能，或由具名运行时预设安装的副本。如果你使用了 Custom 选择，请为本示例包含 `oma-scm`：

```text
Use oma-scm to inspect this repository's current branch and working tree. Do not edit, stage, commit, or contact remotes. Report staged, unstaged, and untracked changes, with the Git commands and exit statuses actually observed.
```

将报告的分支和变更与实际的 Git 输出进行比较。智能体应报告运行了哪些命令及其退出状态。这个只读任务不需要代码测试或构建。

普通提示不会启动工作流；启用了提示钩子时，它会添加一条仅供参考的技能提示。技能路由由宿主或所选工作流执行，因此任意宿主提示都不能保证触发钩子或使用某个特定技能。执行契约仍应检查仓库约定，遵守所要求的只读范围，并报告观察到的检查结果。具体文件和命令取决于项目。

如果任务跨越 API 和 UI 边界，请明确选择 `/work` 或 `/orchestrate`。单一领域的任务可以继续阅读[单技能执行](../guide/single-skill.md)。[使用指南](../guide/usage.md)包含更长的示例。

## 4. 在扩大规模前了解运行时默认值 {#4-know-the-runtime-defaults-before-scaling-up}

临时加载技能不会配置这些运行时默认值。需要项目钩子、提供方设置或团队工作流时，请使用[选择设置](./choose-setup.md)中的运行时路径。

OMA 默认使用 `model_preset: auto`、用于代码智能的 Serena、用于语义内存的 Agent Memory、原生网页搜索，并禁用遥测。Serena 使用共享的 `bridge` 传输，并会自动更新，除非另行配置。浏览器 DevTools MCP 需要选择启用；新的交互式设置会先提供 Aside。有关影响和覆盖键，请参阅[重要默认值](./important-defaults.md)。

如果托管任务停滞，先运行 `oma agent status <session-id> [agent-id]`，然后检查 `.agents/state/agent-runs/` 下的回执和注入的结构化声明路径。这些记录会显示运行、任务、工作区、退出码和验证状态。如果存在，`.agents/state/memories/` 下的可读 `result-*.md` 和 `progress-*.md` 文件会补充上下文。确认运行不再处于活动状态后，只重新运行最小的失败命令。[持久化工作流](./glossary.md#persistent-workflow)会一直保持活动状态，直到完成或你说出 `workflow done`；有关状态文件恢复，请参阅[工作流](../core-concepts/workflows.md#persistent-mode-mechanics)。

## 后续步骤 {#next-steps}

- [选择设置](./choose-setup.md)，了解单个技能、运行时预设或 Claude Code 插件
- [重要默认值](./important-defaults.md)，了解优先级、提供方和恢复选择
- [安装](./installation.md)，了解预设、供应商设置、全局安装和更新
- [智能体](../core-concepts/agents.md)，了解 33 个技能包和调度角色
- [工作流](../core-concepts/workflows.md)，了解规划、并行执行、QA 和持久化模式
- [故障排查](../guide/troubleshooting.md)，在安装、供应商或钩子表现不符合预期时使用
