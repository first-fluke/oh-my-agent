---
title: "用例：缺陷修复"
description: 结构化的复现-诊断-修复-回归循环，支持基于严重程度的升级机制。
---

# 用例：缺陷修复

## 信息收集格式

从可复现的报告开始：

```text
Symptom:
Environment:
Steps to reproduce:
Expected vs actual:
Logs/trace:
Regression window (if known):
```

## 严重程度分级

尽早分类以选择响应速度：

- `P0`：数据丢失、认证绕过、生产环境宕机
- `P1`：主要用户流程中断
- `P2`：功能降级但存在变通方案
- `P3`：次要/非阻塞问题

`P0/P1` 应始终涉及 QA/安全评审。

## 执行循环

1. 在最小化环境中精确复现。
2. 隔离根因（不仅仅是修补症状）。
3. 实施最小安全修复。
4. 为失败路径添加回归测试。
5. 重新检查可能存在相同故障模式的相邻路径。

## oma-debug 的提示模板

```text
Bug: <error/symptom>
Repro steps: <steps>
Scope: <files/modules>
Expected behavior: <expected>
Need:
1) root cause
2) minimal fix
3) regression tests
4) adjacent-risk scan
```

## 常见升级信号

当缺陷涉及以下内容时升级至 QA 或安全团队：

- 认证/会话/Token 刷新
- 权限边界
- 支付/交易一致性
- 高负载下的性能回归

## 修复后验证

- 原始复现场景不再失败
- 相关流程中无新错误
- 测试在修复前失败、修复后通过
- 如需热修复，回滚路径明确

## 完成标准

缺陷修复完成的条件：

- 根因已识别并记录
- 修复已通过可复现的检查验证
- 回归测试覆盖已到位
