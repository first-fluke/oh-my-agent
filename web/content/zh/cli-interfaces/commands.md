---
title: 命令
description: cli/cli.ts 中的完整命令接口。
---

# 命令

以下命令接口与 `cli/cli.ts` 中的当前实现保持一致。

## 核心命令

```bash
oma                         # 交互式安装器
oma dashboard               # 终端仪表盘
oma dashboard:web           # Web 仪表盘 (:9847)
oma usage:anti              # Antigravity 用量配额
oma update                  # 从注册中心更新技能
oma doctor                  # 环境/技能诊断
oma stats                   # 生产力指标
oma retro                   # 回顾报告
oma cleanup                 # 清理孤立资源
oma bridge [url]            # MCP stdio -> 可流式 HTTP
```

## 代理命令

```bash
oma agent:spawn <agent-id> <prompt> <session-id>
oma agent:status <session-id> [agent-ids...]
```

## 记忆与验证

```bash
oma memory:init
oma verify <agent-type>
```
