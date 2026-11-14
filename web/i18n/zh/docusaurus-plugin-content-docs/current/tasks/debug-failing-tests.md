---
title: 调试失败的测试
description: 复现测试失败，隔离其原因，做出有界修复，并用项目现有的测试运行器验证回归。
---

# 调试失败的测试

当你有失败的命令、堆栈跟踪，或可重复的错误结果时，使用 `oma-debug`。

## 加载技能

让你的编码智能体运行这条命令，并阅读它的说明和支持目录：

```bash
bunx skills use first-fluke/oh-my-agent@oma-debug
```

## 提供输入

- 确切的失败命令，以及相关失败输出的完整内容。
- 预期行为、检出或 ref、运行时版本，以及所需的本地服务。
- 你怀疑的文件或近期变更，以及允许的编辑范围。

## 下达任务

这个具体示例使用本仓库的插件引导回归 fixture。其他项目请使用你自己的失败命令。

```text
Use oma-debug to investigate the plugin-bootstrap test failure. Reproduce it with:
bun run --cwd cli test --project scripts --maxWorkers 1 plugin-bootstrap.test.ts
Expected behavior: a Bash installer runs through Bash, each project has its own
wiring receipt, and failed wiring never records readiness. Establish the failure
before editing. If the test already passes, report that result rather than
inventing a repair. Limit changes to the bootstrap and relevant regression tests.
Re-run the failing case and related hook fixtures; report commands and exits.
```

## 检查结果

预期包括复现出的失败、其因果路径、限定范围的补丁，以及绑定到该失败的回归测试。报告应把不可用的环境与已诊断的代码缺陷分开。

检查回归测试在原始行为下失败，并在修复后通过。在同一环境中重新运行所述命令，然后查看相关测试的结果。如果复现仍然受阻，报告应给出确切的阻碍，以及目前较弱的证据。

## 依赖与下一步

智能体使用你项目的测试运行器和已配置的源码导航工具。该示例需要已有的 Bun 和仓库开发依赖。这些插件 fixture 在 Windows 上会跳过；请使用你的平台支持的失败测试。加载技能不会安装依赖，也不会修复缺失的服务。

实际的源码变更和 fixture 边界见[插件钩子修复示例](https://firstfluke.com/oh-my-agent/docs/examples/plugin-hook-repair/)。如需托管执行或项目钩子，请[选择包含 `oma-debug` 的运行时设置](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset)。
