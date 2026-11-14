---
title: 围绕实际任务设计管理界面
description: 在保留项目技术栈和视觉契约的前提下，确定管理界面的层级、表格密度、状态和设计交接。
---

# 围绕实际任务设计管理界面

在改应用代码之前，用 `oma-design` 决定管理界面应如何支持它的用户。

## 加载技能

让你的编码智能体运行这条命令，并阅读返回的说明和支持目录：

```bash
bunx skills use first-fluke/oh-my-agent@oma-design
```

## 提供输入

- 正在运行的界面、截图，或相关组件。
- 谁在使用这个界面，以及他们需要完成的操作。
- 现有的 `DESIGN.md`、token、组件、语言，以及响应式和无障碍要求。

## 下达任务

```text
Use oma-design to define the direction for our customer-support admin.
Support agents triage a ticket table, filter by status and assignee, and open
ticket details in a drawer. Keep our React stack, existing component primitives,
brand palette, and Korean/English content. Cover loading, empty, error, keyboard
focus, and narrow-screen states. Return layout decisions and a semantic-token
handoff. Update DESIGN.md if the visual system changes. Do not edit application
code or install packages.
```

## 检查结果

预期包括针对该界面的层级和密度决定、状态行为、语义 token 映射，以及实现交接。被接受的系统设计变更应写入项目的规范 `DESIGN.md`。

对照分诊任务检查这份方案：用户能否识别下一张工单、更改筛选、打开详情，并从错误中恢复？有渲染样本时，检查键盘焦点、可读的韩语和英语文本，以及窄屏行为。只有文档的交接并不能证明浏览器和无障碍执行已经验证。

## 依赖与下一步

对于新的管理界面或产品界面方向，[路由契约](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/.agents/skills/oma-design/resources/external-design-skills.md)会选择 Interface Design。对现有界面的批评、审计和打磨选择 Impeccable；其他 Web 美术方向使用 Taste。当前操作只加载一个供应方。

这些外部说明可能还需要各自的下载或运行时工具。现有技术栈、品牌、CJK 覆盖、WCAG 目标，以及减少动效的要求仍然是约束。加载说明并不会渲染或验证界面。

实现请使用项目的前端专家。如需项目钩子和工作流，请[选择包含 `oma-design` 的运行时设置](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset)。
