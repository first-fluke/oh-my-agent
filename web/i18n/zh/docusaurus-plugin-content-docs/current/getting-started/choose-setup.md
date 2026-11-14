---
title: 选择设置
description: 为一项任务加载一个 OMA 技能、选择领域预设，或安装带运行时依赖的 Claude Code 插件。
---

# 选择设置

为你要完成的任务选择入口。

| 需要 | 入口 | 它会设置什么 |
|---|---|---|
| 在当前智能体里完成一项聚焦任务 | [加载一个技能](#load-one-skill) | 临时目录中的说明和支持文件 |
| 项目钩子、专业智能体和工作流 | [安装技能预设](#install-a-skill-preset) | 带所选技能的 OMA 运行时集成 |
| Claude Code marketplace 安装 | [安装插件](#install-the-claude-code-plugin) | OMA 插件和项目引导 |
| Copilot CLI、Kiro、Qwen Code、Hermes 或 Codex 的包安装 | [Agent Plugins 包](../guide/vendor-capabilities.md#agent-plugins-package) | 每个宿主的技能和 MCP 服务器；Copilot 还会得到智能体、命令、规则和引导钩子 |

## 加载一个技能 {#load-one-skill}

让你的编码智能体运行对应任务的命令，并阅读返回的说明。`skills use` 会打印说明及其支持目录的路径。它不会启动另一个智能体，也不会运行 OMA 安装器。

| 任务 | 命令 | 第一条请求 |
|---|---|---|
| 管理界面设计，或审查现有界面 | `bunx skills use first-fluke/oh-my-agent@oma-design` | Review our admin page's hierarchy, table density, and empty states. |
| 可复现的 bug | `bunx skills use first-fluke/oh-my-agent@oma-debug` | Reproduce this failure, fix its cause, and run the relevant check. |
| 架构决策 | `bunx skills use first-fluke/oh-my-agent@oma-architecture` | Compare keeping this job in the API with moving it to a worker. |

所选文件夹包含它引用的共享说明。该文件夹之外的依赖仍然是明确的：可能还需要另一个领域技能、项目规则、CLI 操作、浏览器工具或外部引擎。请阅读所选技能对这次操作列出的依赖。任务需要钩子或托管执行时，再安装运行时。

设计工作中，`oma-design` 会为管理界面和产品界面方向选择 Interface Design，为其他 Web 美术方向选择 Taste，为现有界面的批评、审计和打磨选择 Impeccable。项目的技术栈和 `DESIGN.md` 仍然是实现契约和设计契约。

## 安装技能预设 {#install-a-skill-preset}

先安装一次 CLI，再选择项目的技能：

```bash
bun install --global oh-my-agent
oma install --preset frontend --yes
oma doctor
```

如果 CLI 已经安装，可以从第二条命令开始。预设名称和提供方选项见 `oma install --help`。[引导安装器](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#method-1-one-liner-install)也会在交互式设置之前准备运行时依赖。

| 预设 | 首个任务 | 适用的工作流示例 |
|---|---|---|
| `frontend` | 规划一个设置页，然后实现它的表单 | `/plan`、`/design`、`/review`、`/debug` |
| `backend` | 规划一个需要认证的 API 端点 | `/plan`、`/architecture`、`/review`、`/debug` |
| `research` | 查找论文并比较它们的证据 | 请求一次带引用的文献检索 |
| `all` | 协调一项跨越 UI、API 和数据的功能 | `/orchestrate`、`/work`、`/ultrawork`、`/ralph` |

`--preset` 接受[具名预设](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#presets)。未知名称、空值或 `custom` 会在安装前被拒绝。要单独选择技能，请交互运行 `oma install` 并选择 Custom。不带 `--preset` 时，无人值守的 `--yes` 或 CI 设置会选择 `all`。

frontend 预设选择八个技能。预设选择的是技能内容；安装器仍会设置共享文件、全部工作流和智能体定义、钩子以及提供方。有些工作流需要领域预设之外的技能。使用前请查看[工作流依赖](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#workflows-that-need-skills-outside-a-preset)，或选择 `all` 以覆盖每个工作流。在已有安装上使用更小的预设，不会移除其他技能。

提供方选择与预设无关。例如，项目不需要语义记忆服务时，加上 `--semantic-memory none`。运行时还会配置的其他文件和集成，见[安装器的效果](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#what-the-installer-also-does-by-default)。

安装摘要会列出所选技能，并检查存在的技能清单，包括保留下来的技能。它会把静态的工作流和智能体引用（含条件分支）报告为被引用的技能清单。运行 `oma doctor` 可以修复任务所需、但缺失或无法读取的条目。这些检查不会验证资源内容、工具、提供方、凭据或执行。

## 安装 Claude Code 插件 {#install-the-claude-code-plugin}

在 Claude Code 内运行这些命令：

```text
/plugin marketplace add first-fluke/oh-my-agent
/plugin install oma@oh-my-agent
```

领域插件请选择 `oma-frontend@oh-my-agent`、`oma-security@oh-my-agent` 或 `oma-research@oh-my-agent`。完整的 `oma` 条目保留全部技能选择。领域条目会按匹配的预设进行引导。

插件的会话开始钩子会在需要时准备 CLI，并对当前项目运行 `oma install --yes`。这条路径会进行运行时设置。它的成功回执属于该项目，插件的事件钩子使用已安装的 CLI。插件钩子需要 Bash，在 Windows 上同样需要。引导的超时是 600 秒；失败时会报告手动设置步骤，并把项目日志保留在 `.agents/state/plugin-bootstrap.last-error.log`。只有 CLI 版本、项目配置和钩子检查都通过后，才会复用回执。引导报告完成后，重启会话。

设置过程中的配置和依赖选择，请直接使用 `oma install`。完整插件的无人值守引导使用 `all` 技能预设；每个领域插件会传入它选定的预设。更小的预设会保留项目中已经安装的其他技能。

## 检查结果 {#check-the-result}

对于已加载的技能，确认智能体读过所选说明，并报告任务实际做了哪些检查。对于运行时安装，运行 `oma doctor`，并试一下该预设的第一条请求。当所请求的任务会用到某个提供方时，doctor 对该提供方的警告就有意义。
