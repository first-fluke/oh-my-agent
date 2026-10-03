---
title: "快速开始"
description: "从安装到验证，运行一个范围明确的任务，包含预期输出和恢复步骤。"
sidebar_label: 快速开始
---

# 快速开始

使用此页运行一个小任务，并记录具体结果。你需要一个项目目录，以及至少一个受支持的 AI CLI 或 IDE。安装器可在 macOS、Linux 或 Windows 上安装 `bun`、`uv`、Serena 和 CUE。首次提示必须使用所选的宿主集成，供应商和浏览器集成为可选项。

## 1. 安装

### 最快路径：把技能装进你的智能体

```bash
npx skills add first-fluke/oh-my-agent
```

这会把 OMA 技能包安装到检测到的智能体运行时中（Claude Code、Cursor、Codex 等）。技能教智能体如何工作。如需 Stop 钩子关卡、产物验证、独立 judge 和 `oma` CLI，请安装下面的完整脚手架。

仅安装技能时，不会提供 `oma` CLI、钩子、工作流或 judge。下面的第一个任务请使用已安装的指定技能；需要 CLI 检查时，请使用完整脚手架。

### 完整脚手架（关卡、钩子、CLI）

在项目目录中运行引导安装器：

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

在 Windows PowerShell 中运行：

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

交互式设置会询问响应语言、CLI 供应商、能力提供方、模型预设、项目技能预设以及任何技术栈变体。首次运行时保留默认值，选择你已经在使用的供应商，并选择与该仓库最接近的项目预设。

如果你已经有 `bun`，可以直接使用安装器：

```bash
bunx oh-my-agent@latest
```

引导脚本会安装到当前项目中。如果要进行 HOME 级别的安装，请使用 `oma install --global`。在混用项目级和全局安装前，请阅读[安装](./installation.md)。

## 2. 检查结果（仅限完整脚手架）

如果你安装了完整脚手架，请在同一项目目录中运行健康检查：

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

可选的 MCP、浏览器、内存或代码智能集成可能会以警告形式报告；只有使用这些能力的任务才需要它们。如需机器可读的状态，`oma doctor --json` 在报告包含问题时会返回非零状态。使用 `oma doctor --profile` 可以检查每个规范智能体角色解析出的模型和 CLI。

如果 `oma` 不可用但已安装 Bun，可以不使用全局命令，直接运行同样的检查：

```bash
bunx oh-my-agent@latest doctor
```

如果仍然找不到 `oma` 命令，请打开新的 shell，或将包管理器的 bin 目录加入 `PATH`。如果 `oma doctor` 报告配置无效，请修复指出的字段后再次运行。不要删除 `.agents/oma-config.yaml` 来恢复，它是用户拥有的配置文件，用于在更新之间保留设置。

如果只安装了技能，请跳过这项 CLI 检查，继续下面使用指定技能的任务。

## 3. 运行一个小任务

在已配置的 AI 工具中打开仓库，请求使用一个指定技能，并要求一个自包含的结果：

```text
Use the discovered `oma-docs` skill to check one existing link in this project's README. If it is stale, update only that link. Done when you report the inspected target, the exact verification command, and its exit status.
```

宿主应当识别所选技能，检查一个目标，并报告：要么对链接做了有针对性的修改，要么该链接本来就有效。对于实际运行过的检查，请附上命令输出和退出状态。仅安装技能不会增加 `/debug`、`/ralph`、钩子或工作流关卡；点名指定技能可以让这个首个任务保持在已安装的能力范围内。

为所选宿主启用关键词钩子后，它可以激活匹配的工作流。技能路由由宿主或所选工作流执行，因此任意宿主提示都不能保证触发钩子、使用某个特定技能或生成 `CHARTER_CHECK`。执行契约仍应检查仓库约定，只进行范围内的修改，并报告验证结果。具体文件和命令取决于项目。

如果任务跨越 API 和 UI 边界，请明确选择 `/work` 或 `/orchestrate`。单一领域的任务可以继续阅读[单技能执行](../guide/single-skill.md)。[使用指南](../guide/usage.md)包含更长的示例。

## 4. 在扩大规模前了解默认值

OMA 默认使用 `model_preset: auto`、用于代码智能的 Serena、用于语义内存的 Agent Memory、原生网页搜索，并禁用遥测。Serena 使用共享的 `bridge` 传输，并会自动更新，除非另行配置。浏览器 DevTools MCP 需要选择启用；新的交互式设置会先提供 Aside。有关影响和覆盖键，请参阅[重要默认值](./important-defaults.md)。

如果托管任务停滞，先运行 `oma agent status <session-id> [agent-id]`，然后检查 `.agents/state/agent-runs/` 下的收据和注入的结构化声明路径。这些记录会显示运行、任务、工作区、退出码和验证状态。如果存在，`.agents/state/memories/` 下的可读 `result-*.md` 和 `progress-*.md` 文件会补充上下文。确认运行不再处于活动状态后，只重新运行最小的失败命令。持久工作流会一直保持活动状态，直到完成或你说出 `workflow done`；有关状态文件恢复，请参阅[工作流](../core-concepts/workflows.md#persistent-mode-mechanics)。

## 后续步骤

- [重要默认值](./important-defaults.md)，了解优先级、提供方和恢复选择
- [安装](./installation.md)，了解预设、供应商设置、全局安装和更新
- [智能体](../core-concepts/agents.md)，了解 33 个技能包和调度角色
- [工作流](../core-concepts/workflows.md)，了解规划、并行执行、QA 和持久模式
