---
title: "指南：Codex 钩子信任"
sidebar_label: Codex 钩子信任
description: "Codex 如何用信任拦住钩子、oh-my-agent 记录了什么才能让钩子运行，以及你仍需要自己审阅钩子的时机。"
---

# 指南：Codex 钩子信任

oh-my-agent 安装到项目时，会写入供应商原生的钩子配置，其中包括 Codex CLI 的 `.codex/hooks.json`。Codex 不会仅仅因为钩子已配置就运行它。两道批准会拦住它，而且两者都写在你的用户配置里（`$CODEX_HOME/config.toml`，默认 `~/.codex/config.toml`）。项目不能批准自己的钩子：

1. **项目信任。** 项目的 `.codex/` 目录（其中的 `config.toml` 和 `hooks.json`）只对受信任的项目加载：`[projects."<path>"] trust_level = "trusted"`。
2. **按钩子信任。** 项目范围或用户范围内的每个非托管钩子，都需要一条 `[hooks.state."<hooks.json path>:<event>:<group>:<handler>"]` 条目，其 `trusted_hash` 必须与钩子当前声明一致（命令、超时、matcher、async 标志、状态消息）。

新建或变更的钩子会在 Codex TUI 中显示 “Hooks need review”。`codex exec` 会静默地把它排除在外。

---

## oh-my-agent 为你记录的内容 {#what-oh-my-agent-records-for-you}

`oma install`、`oma update` 和 `oma link` 会为 **oh-my-agent 自己的钩子**写入这两项批准。这些处理器名为 `oma-hook-*`，或通过 `oma-hook.sh` 包装器运行。这个哈希与你选择 “Trust all and continue” 时 Codex 计算的哈希相同，因此钩子会在第一次 Codex 会话中运行，不需要 `/hooks` 这一步。之后的 oh-my-agent 版本如果改了钩子命令，会在 `oma update` 期间记录新哈希，钩子因此保持开启。

oh-my-agent 只编辑 `config.toml` 中受影响的表。它会重新读取结果；如果还会改动其他内容，就保持文件不动。它绝不会：

- 批准你自己加到同一份 `hooks.json` 里的钩子，
- 信任你标记为 `trust_level = "untrusted"` 的项目，
- 重新启用你关掉的钩子（`enabled = false`），
- 在 Codex 创建自己的主目录之前去改动 Codex。

全局安装（`~/.codex/hooks.json`）只得到按钩子的条目，因为没有可信任的项目。

---

## 你仍需自己审阅钩子的时机 {#when-you-still-review-hooks-yourself}

如果 oh-my-agent 无法记录信任，它会连同原因一起打印这条通知：

```text
⚠ Codex hooks installed/updated but not trusted (<reason>) — run codex and use /hooks to trust them (untrusted hooks do not run).
```

常见情况是它无法解析的 `config.toml`、你标记为不受信任的项目，或 Codex 还没有运行过。这时在 Codex 中打开项目，运行 `/hooks`，并启用这些钩子一次。然后运行 `oma link codex`，让之后的更新继续保持它们受信任。

---

## oh-my-agent 启动的 Codex 进程 {#codex-processes-oh-my-agent-spawns}

当 oh-my-agent 自己启动 Codex 子进程时（例如 `oma agent spawn`），它也会传入 `--dangerously-bypass-hook-trust`。该标志会在不做哈希检查的情况下运行已启用的钩子。它不会解除项目信任。该标志只适用于 oh-my-agent 启动的进程，绝不会写入你的配置。

---

## 不需要 `[features] hooks` 标志 {#no-features-hooks-flag-needed}

旧版 oh-my-agent 会在 Codex 配置中写入 `[features] codex_hooks = true`。Codex 0.124 将该标志重命名为 `hooks`，并让钩子成为稳定、默认开启的功能，因此不再需要任何标志。oh-my-agent 不会写入这两个键，并会在 `[features]` 表中发现已弃用的 `codex_hooks` 和 `child_agents_md` 标志时将其移除。

---

## 总结 {#summary}

| 情况 | 你要做什么 |
|:----------|:------------|
| 项目中的首次安装 | 无需操作：信任由安装器记录 |
| 改变了钩子命令的 `oma update` | 无需操作：新哈希已被记录 |
| 安装器打印 “not trusted (…)” | 修复该原因，或在 Codex 中运行一次 `/hooks` |
| 你加到 `.codex/hooks.json` 的钩子 | 自己在 `/hooks` 中审阅 |

## 另请参阅 {#see-also}

- [现有项目集成](./integration.md)：安装器为每个供应商写入的内容
- [全局安装](./global-install.md)：写入 `~/.codex/` 的用户级安装
