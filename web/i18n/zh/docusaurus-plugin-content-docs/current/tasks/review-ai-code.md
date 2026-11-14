---
title: 合并前审查 AI 代码
description: 用限定范围的 diff 和可复现的发现，审查 AI 编写的代码中的缺陷、缺失检查和回归。
---

# 合并前审查 AI 代码

用 `oma-qa` 对照预期行为审查一项变更。从 diff 和项目现有的检查开始。

## 加载技能

让你的编码智能体运行这条命令，然后阅读返回的说明和支持目录：

```bash
bunx skills use first-fluke/oh-my-agent@oma-qa
```

## 提供输入

- 这项变更，或本地比较用的 ref，例如 `origin/main`。
- 预期行为，尤其是权限、数据变更和失败处理。
- 现有的 lint 和测试命令，以及任何环境限制。

## 下达任务

```text
Use oma-qa to review this branch's diff against origin/main. Focus on
authorization mistakes, unintended data changes, and regressions in error
handling. Read the affected callers and tests. Keep application source unchanged.
Run the existing focused checks that apply, without installing tools or running
a build. For each confirmed finding, give severity, file:line, the trigger,
observed evidence, and a concrete fix. Report unavailable checks separately.
```

## 检查结果

预期是按顺序排列的发现，每条都有复现步骤或决定性的代码证据、建议的修复，以及实际运行过的命令。如果没有确认缺陷，报告仍应写明检查过的范围和尚未覆盖的缺口。

打开每一处被引用的位置，确认触发条件能够到达那里。重新运行被当作证据的那项窄检查。缺少工具或未经测试的路径是验证缺口；只有审查摘要，并不能说明这项变更可以发布。

## 依赖与下一步

智能体需要能访问 diff、本地源码，以及项目现有的检查工具。浏览器、安全和性能检查需要对应的目标和工具。加载技能不会准备这些依赖。

如果确认了失败，继续阅读[调试失败的测试](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/)。如果需要项目钩子或团队工作流，请[选择包含 `oma-qa` 的运行时设置](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset)。
