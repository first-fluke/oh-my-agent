---
title: 为什么选择 oh-my-agent
description: 当你需要由仓库管理的智能体技能、工作流、多供应商调度和明确验证时，选择 oh-my-agent。
---

# 为什么选择 oh-my-agent

oh-my-agent 在团队已经使用的智能体 CLI 周围增加了一层由仓库管理的协调层。`.agents/` 目录保存[技能](./glossary.md#skill)、[工作流](./glossary.md#workflow)、[智能体定义](./glossary.md#agent-definition)、规则和模型配置。供应商原生文件从这个[事实来源](./glossary.md#ssot)生成，因此行为可以随项目一起审查和修改。

## 仓库需要协调层时再选择它 {#choose-it-when-the-repository-needs-the-coordination-layer}

在以下情况中，只要符合一项，OMA 就很适合：

- **使用多个智能体主机或供应商。** `model_preset: auto` 使用当前运行时的原生配置。固定预设和自定义预设可以把角色路由到其他供应商；`oma agent spawn` 负责非原生调度。
- **需要可重复的团队工作流。** `/work` 处理一个范围明确的任务，`/orchestrate` 协调委派工作，`/ultrawork` 并行执行并加入审查步骤，`/ralph` 带着明确的评审阶段重复执行任务。
- **需要由仓库管理的指令。** 技能、工作流、规则和智能体定义与代码并列保存。`oma link` 会把选定文件投影为受支持供应商的格式。
- **需要机械检查和持久结果。** 智能体运行可以写入结构化状态与结果回执，`oma verify agent <agent-type>` 和 `oma docs verify` 则提供明确检查。

如果项目只使用一个主机，也不需要共享技能、工作流或供应商路由，那么额外的 `.agents/` 文件和 CLI 命令可能不值得配置。OMA 是协调层，不会替代主机的模型、编辑器或项目自己的验收标准。

## 验证需要主动选择命令 {#verification-is-a-command-you-select}

当你需要后端、前端、移动端、QA、调试或规划角色的检查时，运行 `oma verify agent <agent-type> --workspace <path>`。验证器会把静态检查与已配置的测试、类型检查、SQL 检查或 `flutter analyze` 等命令结合起来，详见 [`cli/commands/verify/report.ts`](https://github.com/first-fluke/oh-my-agent/blob/main/cli/commands/verify/report.ts)。报告会显示每项检查的结果。检查通过并不代表功能符合产品或领域要求，因此仍需审查任务的验收标准。

选择 `/ralph` 工作流时，它会加入单独的 [judge](./glossary.md#judge) 阶段，在多次迭代中重新检查已声明的标准并记录工作流产物。它不会成为每条普通提示都会运行的关卡。加载技能也不会启动所有工作流或验证命令。

## 调度过程保持可见 {#dispatch-remains-visible}

`oma doctor --profile` 会显示每个调度角色解析出的供应商和模型。当当前主机不处理某个角色时，`oma agent spawn <agent-id> <prompt> <session-id>` 是明确的 CLI 路径。模型解析规则和供应商行为见[重要默认值](./important-defaults.md)与[按智能体配置模型](../guide/per-agent-models.md)。

只有启用了相关主机集成后，钩子才能激活工作流。原生技能路由由主机执行，工作流路由遵循选定的工作流或钩子；普通提示不能保证运行某个特定技能或关卡。

可选的协调控制项见[会话配额上限](../guide/configuration-reference.md#session-quota-caps)、[`/orchestrate` 重试和探索循环](../core-concepts/workflows.md#orchestrate)以及[工作区分配](../core-concepts/parallel-execution.md#workspace-aware-pattern)。

## 实际取舍 {#the-practical-trade-off}

OMA 为团队提供一个共同位置，用于定义路由、执行步骤、检查和输出文件。团队也需要持续维护仓库配置，并决定哪些工作流或验证命令属于验收契约。当贡献者之间的一致性比尽可能小的安装规模更重要时，这种取舍很有价值。

原始定位讨论见 [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)。

## 后续步骤 {#next-steps}

- [快速开始](./quick-start.md)：安装、检查设置，并运行一个范围明确的任务
- [重要默认值](./important-defaults.md)：安装器会启用哪些功能，以及如何修改
- [安装](./installation.md#presets)：选择能覆盖你计划使用的工作流的技能预设
- [工作流](../core-concepts/workflows.md)：何时使用 `/work`、`/orchestrate`、`/ultrawork` 和 `/ralph`
- [故障排查](../guide/troubleshooting.md)：安装、供应商和钩子问题的解决方法
