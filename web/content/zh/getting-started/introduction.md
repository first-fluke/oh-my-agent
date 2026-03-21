---
title: 简介
description: oh-my-agent 是什么以及多代理协作的工作原理。
---

# 简介

oh-my-agent 是面向 AI IDE 的多代理编排器。它将请求路由到专业化技能，并通过 Serena 记忆来协调各代理。

## 您将获得

- 基于请求的技能路由
- 基于工作流的执行，用于规划/评审/调试
- CLI 编排，实现代理并行运行
- 实时仪表盘，用于会话监控

## 代理角色

| 代理 | 职责 |
|------|------|
| oma-coordination | 协调复杂的多领域项目 |
| oma-pm | 规划与架构拆解 |
| oma-frontend | React/Next.js 实现 |
| oma-backend | API/数据库/认证实现 |
| oma-mobile | Flutter/移动端实现 |
| oma-qa | 安全/性能/无障碍评审 |
| oma-debug | 根因分析与回归安全修复 |
| oma-brainstorm | 设计优先的构思与概念探索 |
| oma-db | 数据库建模、模式设计和查询调优 |
| oma-dev-workflow | 开发工作流优化与 CI/CD |
| oma-tf-infra | Terraform 基础设施即代码配置 |
| oma-translator | 上下文感知的多语言翻译 |
| oma-orchestrator | 基于 CLI 的子代理编排 |
| oma-commit | 约定式提交工作流 |

## 项目结构

- `.agents/skills/`：技能定义与资源
- `.agents/workflows/`：显式工作流命令
- `.serena/memories/`：运行时编排状态
- `cli/cli.ts`：命令接口的唯一真实来源

## 渐进式披露

1. 识别请求意图
2. 仅加载所需的技能资源
3. 使用专业化代理执行
4. 通过 QA/调试循环验证和迭代
