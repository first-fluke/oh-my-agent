---
title: 修复插件钩子与项目引导
description: 了解 marketplace 钩子路径、Bash 准备和项目引导回执如何通过回归 fixture 得到修复。
---

# 修复插件钩子与项目引导

[`2a29d3a8`](https://github.com/first-fluke/oh-my-agent/commit/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c) 中的插件修复处理了钩子调度和引导行为。它的父提交 `82649cbd` 是这次对比的修复前状态。

## 失败机制

[旧的钩子清单](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/hooks/hooks.json) 调用 `${CLAUDE_PLUGIN_ROOT}/.claude/hooks/` 下的文件。这些路径依赖生成的文件；使用全新插件缓存的 fixture 不会把它们放进插件目录。

[旧的引导脚本](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/scripts/plugin-bootstrap.sh) 还通过 `sh -c` 运行下载的 Bash 安装器。它的成功标记放在共享的插件数据里，快速路径只检查该标记、CLI 版本，以及项目是否存在设置文件。因此，另一个带有设置文件的项目可能跳过自己的接线。

## 修复

[新的调度器](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.sh) 调用已安装的 CLI。当匹配的可执行项目钩子已经负责该事件时，marketplace 钩子会让给它，避免同一事件被调度两次。

[新的引导脚本](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.sh)：

- 通过 Bash 运行 Bash 安装器，并检查准备失败。
- 即使继承了全局安装设置，也强制进行项目安装。
- 把回执存在该项目的 `.agents/state/plugin-bootstrap.version`。
- 在复用回执之前检查配置、版本元数据、可执行包装器和已注册事件。
- 把失败安装的诊断保留在 `.agents/state/plugin-bootstrap.last-error.log`，且不记录成功回执。

## 复现回归检查

使用 `2a29d3a8eb4d760e4e4000b484c9f04761c59f5c` 的一次性检出，并确保 Bun 和仓库的开发依赖已经可用。在其根目录运行：

```bash
bun run --cwd cli test --project scripts --maxWorkers 1 \
  plugin-bootstrap.test.ts plugin-hook.test.ts plugin-install.integration.test.ts
```

这些 fixture 覆盖不同的边界：

| Fixture | 其断言检查的内容 |
|---|---|
| [引导](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.test.ts) | 仅通过 Bash 准备、各自独立的项目回执、仅 CUE 的配置、不完整的接线、版本失败，以及保留的诊断。 |
| [钩子调度](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.test.ts) | 全新缓存下的调度、处理器时间预算、载荷保留、匹配的项目钩子归属，以及该归属缺失或无效时的回退。 |
| [安装集成](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-install.integration.test.ts) | 两次项目安装、保留的用户设置、两处注册只投递一次 prompt/Stop，以及接线失败后的重试。 |

这些 fixture 会创建临时目录和假的 CLI 命令；集成 fixture 使用实际的钩子组合器。它们检查 shell 调度和已记录的效果，不进行 marketplace 安装或模型调用。这些测试套件在 Windows 上会跳过。

## 真实会话中仍需检查的内容

fixture 通过并不能说明 Claude Code 会话可用。在实际目标项目中，检查回执和配置，运行 `oma doctor`，重启会话，并演练相关的 prompt 和 Stop 行为，同时核对观察到的效果。CLI 是否可用、凭据、提供方行为，以及宿主的钩子策略，都需要各自的证据。

对另一次失败使用同样的复现、修复、验证方法时，从[调试失败的测试](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/)开始。[选择设置](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/)说明何时需要项目运行时。
