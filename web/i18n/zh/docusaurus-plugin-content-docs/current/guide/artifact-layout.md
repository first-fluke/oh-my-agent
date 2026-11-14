---
title: 产物布局
sidebar_label: 产物布局
description: OMA 把维护中的文档、执行报告和运行时状态放在哪里，以及如何迁移旧位置。
---

# 产物布局

OMA 使用三个位置：`docs/` 放维护中的项目文档，`.agents/results/` 放可读的执行报告，`.agents/state/` 放协调和执行证据。下面的路径都相对于项目根目录。

## 维护中的文档 {#maintained-documents}

| 位置 | 内容 |
|----------|---------|
| `docs/decisions/` | 方案提案、取舍和架构决策记录（ADR） |
| `docs/plans/work/` | 工作计划、进度、决策日志和技术债跟踪 |
| `docs/plans/contracts/` | 已采纳的 API 契约 |
| `DESIGN.md` | UI 设计系统：字体、颜色、间距、动效和组件 |

在决策文档中用 `Status` 字段记录 `draft`、`accepted` 或 `superseded`。被取代的决策要保留，并链接到替代它的文档，这样推理过程仍然可以查阅。在 OMA 里，`design` 指 UI 设计；技术方案和 ADR 共用 `docs/decisions/`。

用项目文档索引（例如 `docs/README.md`）链接到这些维护中的文档。产物迁移会移动已有文件；它不会创建索引，也不会改变文档状态。

## 执行报告与运行时状态 {#execution-reports-and-runtime-state}

| 位置 | 内容 |
|----------|---------|
| `.agents/results/result-*.md` | 可读的智能体和工作流结果报告 |
| `.agents/results/architecture/` | 架构分析和建议 |
| `.agents/results/bugs/` | Bug 报告 |
| `.agents/results/refactor/` | 重构计划和报告 |
| `.agents/results/security/` | 安全扫描报告 |
| `.agents/results/market/` | 市场研究简报 |
| `.agents/results/recap/` | 工作回顾 |
| `.agents/results/explain/` | HTML 讲解 |
| `.agents/results/api-contracts/` | API 契约草稿 |
| `.agents/results/plan-{sessionId}.json` | 当前任务计划 |
| `.agents/state/memories/` | 会话摘要、任务板、进度、经验教训和实验记录 |
| 运行时 `agent-runs/` | 结构化回执、声明和验证证据 |
| 运行时 `agent-plans/` | 冻结的执行计划 |

报告子目录按领域分开。可读报告是结构化证据的补充；它们本身不能证明已验证完成。参见[结果与恢复](../agent-results-and-resume/)。

当前回执和冻结计划位于活动配置档的项目状态目录。较旧的项目可能仍把它们放在 `.agents/state/` 下。这次迁移不改变它们的存储和验证绑定。

## 提升为维护中的文档 {#promote-a-maintained-document}

执行产物成为项目参考时，把它移到对应的维护位置。例如，把已采纳的契约从 `.agents/results/api-contracts/` 移到 `docs/plans/contracts/`，或把架构建议写成 `docs/decisions/` 中的决策记录。在旧位置留下链接，并更新文档索引。

如果结构化执行证据记录了原文件或其哈希，请保持该文件不动，另建一份维护版本。从项目索引链接到这份维护文档。

安装、更新和链接默认会让 Git 忽略 `.agents/results/`、`.agents/state/` 和 `docs/plans/`。`docs/decisions/` 不在这份默认忽略范围内。当团队需要把已采纳的契约或工作计划纳入版本控制时，请检查项目的 `.gitignore`。

## 迁移现有项目 {#migrate-an-existing-project}

先预览迁移：

```bash
oma docs migrate --dry-run
```

需要结构化输出时加上 `--json`。准备好后再显式应用同一次迁移：

```bash
oma docs migrate --dry-run --json
oma docs migrate
```

`oma install` 和 `oma update` 也会运行这次迁移。它会归并这些旧位置：

<!-- oma-docs:ignore-start -->
| 旧位置 | 目标 |
|-----------------|-------------|
| `docs/design-docs/` | `docs/decisions/` |
| `docs/plans/designs/` | `docs/decisions/` |
| `.agents/results/architecture/adr-*.md` 及其编写的图表附属文件 | `docs/decisions/` |
| `.agents/state/memories/result-*.md` | `.agents/results/` |
| `.serena/memories/result-*.md` | `.agents/results/` |
<!-- oma-docs:ignore-end -->

决策文档会保留其子目录结构。旧的架构 ADR 会连同编写的 `.archify.json` 和 `.archify.html` 附属文件一起移动。针对某次运行的审查、建议和验证日志仍留在结果目录。结果迁移只覆盖这两个记忆目录顶层的 `result-*.md` 文件；其他记忆文件留在原地。

迁移会保留已有的目标文件。如果另一个文件同名，它会加上来源后缀，例如 `001-cache--from-plan-designs.md`，并报告所选路径。如果这个名字也被占用，它会加上稳定的内容哈希。再次运行迁移不会产生重复副本，也不会重命名已经迁移的文件。

它会更新已移动文档、Markdown 协调笔记、`docs/**/*.md`，以及根目录 `README*.md` 和 `AGENTS.md` 中受支持的 Markdown 链接和路径引用。请对照迁移报告和 Git diff 审查这些改动。结构化运行时证据和 UI 的 `DESIGN.md` 不参与引用改写。已有的 `oma-docs:ignore-start` / `oma-docs:ignore-end` 块会保留旧路径的示例。

请查看报告中被推迟的文件。被结构化执行证据引用的结果报告会留在原路径，这样已记录的回执和哈希仍然有效。回执、声明、冻结的执行计划和其他运行时证据留在原地。迁移不会提升契约草稿、接受决策，也不会改变 UI 设计系统。
