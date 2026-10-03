---
title: "指南：全局安装"
sidebar_label: 全局安装
description: 将 oh-my-agent 安装到用户 HOME（`~/.agents/`），而不是每个项目中，让所有项目共享同一套技能、工作流和规则。涵盖 `oma install --global`、`oma update --global`、`oma uninstall --global`、`OMA_HOME` 覆盖、通过 `oma doctor` 检测双重安装，以及平台注意事项（拒绝 sudo、CI、WSL 和 cwd=HOME 防护）。
---

## 什么是全局安装？

默认情况下，`oma install` 将所有内容限定在当前项目目录：SSOT 位于 `<cwd>/.agents/`，供应商配置写入 `<cwd>/.claude/`、`<cwd>/.codex/` 等位置。**全局安装**（`oma install --global`）则把 oh-my-agent 安装到用户 HOME，这样打开任何项目时都能使用同一套技能、工作流和规则，无需重复安装。SSOT 位于 `~/.agents/`，供应商配置位于 `~/.claude/`、`~/.codex/` 等位置。

## 项目安装与全局安装对比

| 方面 | 项目（`oma install`） | 全局（`oma install --global`） |
|--------|------------------------|--------------------------------|
| SSOT 位置 | `<cwd>/.agents/` | `~/.agents/` |
| 供应商配置 | `<cwd>/.claude/`、`<cwd>/.codex/` 等 | `~/.claude/`、`~/.codex/` 等 |
| 锁文件 | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| 元数据 | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| 使用场景 | 按项目定制 | 所有项目的个人默认设置 |
| oma-config.yaml 作用域 | 特定项目 | 全局用户基线 |

两种模式可以共存。`oma doctor` 会报告两种安装，并标记它们之间的漂移。

全局安装成功后，验证用户根目录下的文件和解析后的配置：

```bash
oma doctor --json
oma doctor --profile
```

第一条命令报告安装与供应商健康状态，配置命令显示智能体使用的模型计划。全局安装是要检查的安装时，可从任意项目运行这些命令。

## 首次运行设置

在某台机器上首次运行 `oma install --global` 时，安装器会在继续前显示说明：

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

确认后继续。安装器随后按照项目安装的相同交互流程运行（语言、模型预设、项目类型、供应商选择）。

安装成功后显示后续步骤：

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## 注意事项

### 拒绝 sudo

在任何模式下使用 `sudo` 运行 `oma install` 都会立即退出：

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

请以普通用户身份、不带 `sudo` 运行命令。

### CI 环境

在 CI 流水线中运行 `oma install --global` 会修改 CI runner 的 HOME 目录，通常不合适。如果确实需要（例如引导流水线），oma 会发出警告：

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

设置 `--yes` 或 `OMA_YES=1` 后安装会继续。没有这些设置时，安装器显示警告并继续交互，而大多数 CI 环境会因此挂起。

### WSL：Linux HOME 与 Windows USERPROFILE

oma 检测到运行在 Windows Subsystem for Linux 中时，会打印：

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

WSL 安装和 PowerShell 安装彼此独立。如果希望两侧都覆盖，请分别在 WSL 和 PowerShell 中运行一次 `oma install --global`。

### cwd = HOME 保护（项目模式）

`oma link` 和 `oma update`（不带 `--global`）在当前目录是 HOME 时会拒绝运行。此时项目模式的 `<cwd>/.claude/settings.json` 就是 `~/.claude/settings.json`，也就是你的全局 Claude Code 设置；项目范围的渲染会把其中的 `$HOME/.claude/hooks/...` 命令改写为 `$CLAUDE_PROJECT_DIR/...`，使没有自带 `.claude/hooks/` 的项目里所有钩子和状态栏都失效。如需进行 HOME 安装，请改用 `oma link --global` / `oma update --global`，或先 `cd` 进入某个项目。

如果当前目录是 HOME，却运行了不带 `--global` 的 `oma install`，oma 会发出警告：

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

在非交互或 CI 模式下，这会自动中止。如果要进行全局用户安装，请使用 `--global`。

## 重新链接全局安装

`oma link` 会从 SSOT 重新生成供应商原生文件，而不会重新安装。与 `install` 和 `update` 一样，它根据安装上下文解析目标；要协调 `~/.agents/`，请传入 `--global`。它可从任意目录运行，不要求当前目录是 `$HOME`：

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.agents/oma-config.yaml)
oma link opencode --global
```

不带 `--global` 时，`oma link` 目标是 `<cwd>/.agents/`。因此，全局安装后在项目内运行它会报告找不到那里的 `.agents/` 目录。

## 卸载

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

卸载命令会区分 oma 所有的文件和用户所有的文件。用户内容（oma-config.yaml、mcp.json，以及没有 `<!-- oma:generated -->` 标记的自定义技能）不会被删除。

要卸载项目安装，省略 `--global`：

```bash
oma uninstall [--dry-run]
```

## OMA_HOME 覆盖

如需测试或暂存，可以把所有 oma 操作重定向到任意目录：

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` 的优先级高于 `--global` 和 `process.cwd()`。即使通过 `OMA_HOME` 指定，系统禁止路径（`/etc`、`/usr`、`/bin`、`/boot`、`/sys`、`/proc`）也会被拒绝。路径必须是绝对路径且可写。

安全的冒烟测试方式是把 `OMA_HOME` 指向空的可写目录，然后运行 `oma install --global --yes`；摘要应将该目录列为安装根目录。测试后删除该目录，再使用目标 HOME 运行正式安装。
