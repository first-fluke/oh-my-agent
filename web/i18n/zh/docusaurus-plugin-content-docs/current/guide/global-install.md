---
title: "指南：全局安装"
sidebar_label: 全局安装
description: 将 oh-my-agent 安装到 OMA 全局主目录（`~/.oma/`），而不是每个项目中，让所有项目共享同一套技能、工作流和规则。涵盖 `oma install --global`、`oma update --global`、`oma uninstall --global`、`OMA_HOME` 覆盖、通过 `oma doctor` 检测双重安装，以及平台注意事项（拒绝 sudo、CI、WSL 和 cwd=HOME 防护）。
---

## 什么是全局安装？ {#what-is-a-global-install}

默认情况下，`oma install` 将所有内容限定在当前项目目录：SSOT 位于 `<cwd>/.agents/`，供应商配置写入 `<cwd>/.claude/`、`<cwd>/.codex/` 等位置。**全局安装**（`oma install --global`）则把 oh-my-agent 安装到 OMA 全局主目录，这样打开任何项目时都能使用同一套技能、工作流和规则，无需重复安装。SSOT 位于 `~/.oma/.agents/`；供应商配置仍位于 `~/.claude/`、`~/.codex/` 等位置。

## 项目安装与全局安装对比 {#project-vs-global-comparison}

| 方面 | 项目（`oma install`） | 全局（`oma install --global`，默认 OMA 主目录） |
|--------|------------------------|--------------------------------|
| SSOT 位置 | `<cwd>/.agents/` | `~/.oma/.agents/` |
| 供应商配置 | `<cwd>/.claude/`、`<cwd>/.codex/` 等 | `~/.claude/`、`~/.codex/` 等 |
| 锁文件 | `<cwd>/.agents/_install.lock` | `~/.oma/.agents/_install.lock` |
| 元数据 | `<cwd>/.agents/skills/_version.json`（schemaVersion 2） | `~/.oma/.agents/skills/_version.json`（schemaVersion 2） |
| 使用场景 | 按项目定制 | 所有项目的个人默认设置 |
| oma-config.yaml 作用域 | 特定项目 | 全局用户基线 |

两种模式可以共存。`oma doctor` 会报告两种安装，并标记它们之间的漂移。

全局安装成功后，验证用户根目录下的文件和解析后的配置：

```bash
oma doctor --global --json
oma doctor --global --profile
```

第一条命令报告安装与供应商健康状态，配置命令显示智能体使用的模型计划。请保留 `--global`（或 `-g`）：不带它时，两条命令都会检查当前目录中的项目，并把该项目的配置叠加在全局默认值之上。

## 首次运行设置 {#first-run-setup}

在某台机器上首次运行 `oma install --global` 时，安装器会在继续前显示说明：

```text
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.oma/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.oma/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

确认后继续。安装器随后按照项目安装的相同交互流程运行（语言、模型预设、项目类型、供应商选择）。

安装成功后显示后续步骤：

```text
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## 注意事项 {#caveats}

### 拒绝 sudo {#sudo-refused}

在任何模式下使用 `sudo` 运行 `oma install` 都会立即退出：

```text
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

请以普通用户身份、不带 `sudo` 运行命令。

### CI 环境 {#ci-environments}

在 CI 流水线中运行 `oma install --global` 会修改 CI runner 的 HOME 目录，通常不合适。如果确实需要（例如引导流水线），oma 会发出警告：

```text
Running `oma install --global` in CI. This will modify the CI user's HOME. Proceeding because --yes / non-interactive mode is set.
```

当 `CI` 为 `true` 或 `1` 时会出现该警告。这些值本身已让安装以非交互方式运行，因此它会使用默认值继续，不会等待输入。在 CI 之外，`--yes` 或 `OMA_YES=1` 提供相同的非交互行为。

### WSL：Linux HOME 与 Windows USERPROFILE {#wsl-linux-home-vs-windows-userprofile}

oma 检测到运行在 Windows Subsystem for Linux 中时，会打印：

```text
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

WSL 安装和 PowerShell 安装彼此独立。如果希望两侧都覆盖，请分别在 WSL 和 PowerShell 中运行一次 `oma install --global`。

### cwd = HOME 保护（项目模式） {#cwd--home-guard-project-mode}

`oma link` 和 `oma update`（不带 `--global`）在当前目录是 HOME 时会拒绝运行。此时项目模式的 `<cwd>/.claude/settings.json` 就是 `~/.claude/settings.json`，也就是你的全局 Claude Code 设置；项目范围的渲染会把其中的 `$HOME/.claude/hooks/...` 命令改写为 `$CLAUDE_PROJECT_DIR/...`，使没有自带 `.claude/hooks/` 的项目里所有钩子和状态栏都失效。如需操作全局安装，请改用 `oma link --global` / `oma update --global`，或先 `cd` 进入某个项目。

如果当前目录是 HOME，却运行了不带 `--global` 的 `oma install`，oma 会发出警告：

```text
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

在非交互或 CI 模式下，这会自动中止。如果要进行全局用户安装，请使用 `--global`。

## 重新链接全局安装 {#relinking-a-global-install}

`oma link` 会从 SSOT 重新生成供应商原生文件，而不会重新安装。与 `install` 和 `update` 一样，它根据安装上下文解析目标；要协调 `~/.oma/.agents/`，请传入 `--global`。它可从任意目录运行，不要求当前目录是 `$HOME`：

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.oma/.agents/oma-config.yaml)
oma link opencode --global
```

不带 `--global` 时，`oma link` 目标是 `<cwd>/.agents/`。因此，全局安装后在项目内运行它会报告找不到那里的 `.agents/` 目录。

## 卸载 {#uninstall}

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

卸载命令会区分 oma 所有的文件和用户所有的文件。它只移除 `.agents/state/` 下 `managed-skills.json` 中记录为 OMA 托管的技能；`<!-- oma:generated -->` 标记用于识别生成的 Copilot 提示文件。用户所有的内容（`oma-config.yaml`、`mcp.json`，以及未记录为托管的技能）永远不会被删除。请先运行 `--dry-run` 查看确切列表。

要卸载项目安装，省略 `--global`：

```bash
oma uninstall [--dry-run]
```

## OMA_HOME 覆盖 {#oma_home-override}

将 `OMA_HOME` 设置为绝对路径，即可迁移 OMA 拥有的全局数据：

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` 是全局存储根目录，不是项目安装目标。使用上面的值时，全局定义位于 `/tmp/oma-test/.agents/`；项目安装和链接仍使用 `<cwd>/.agents/`。供应商原生设置和身份验证保留在 `OMA_HOME` 之外。全局 OpenCode 集成文件写入实际 HOME 目录下的 `~/.config/opencode/`。

`OMA_STATE_HOME` 是配置档/L1/项目运行时存储的显式例外：它必须是绝对路径，并包含 `u/`。未设置时，配置档跟随 `OMA_HOME`。`XDG_CONFIG_HOME` 不再迁移 OMA 状态，也不会改变 OMA 的 OpenCode 输出路径。OS Keychain 密钥、AgentMemory/Honcho 数据和托管工具链缓存仍归各自现有的所有者管理。

## 全局存储布局 {#global-storage-layout}

全局数据默认位于 `~/.oma` 下。设置了 `OMA_HOME` 时，请用它的值替换 `~/.oma`：

| 数据 | 位置 |
|---|---|
| 全局定义、配置、安装元数据 | `~/.oma/.agents/` |
| 计划清单、捕获的环境、运行日志 | `~/.oma/schedule/` |
| 全局备份 | `~/.oma/backup/` |
| Serena 注册表、锁、日志 | `~/.oma/state/serena/` |
| 保管库键名索引 | `~/.oma/state/vault-index.json` |
| 配置档、L1 会话、项目运行时 | `~/.oma/u/<profile>/`（设置了 `OMA_STATE_HOME` 时为 `<OMA_STATE_HOME>/u/<profile>/`） |

全局配置提供默认值。最近的项目 `.agents/oma-config.*` 及其本地覆盖文件会覆盖这些默认值；不同祖先目录中的项目根不会合并。
完整顺序请参阅[配置加载](./oma-config-semantics.md#precedence-table)。
项目选择 `semantic_memory: none` 时，即使全局配置选择了 AgentMemory，内存也保持禁用。

## 现有安装 {#existing-installations}

主目录迁移会把 OMA 拥有的数据从 `~/.agents/` 和 `~/.config/oma/` 复制到新布局。原始文件会保留，但经过验证、已转换为发现链接的 OMA 技能目录除外：在旧路径变为指向已迁移技能的链接之前，其原始内容会归档到 `~/.oma/backup/legacy-global-skills/`。已存在的目标文件不会被覆盖；冲突和正在使用的数据会被报告以便重试。保管库索引会合并键名，但不会把密钥值移出 OS 钥匙串。用户技能和外部链接保持原位；供应商身份验证文件不会被移动。运行时读取方只使用新路径。

```bash
oma home migrate --dry-run --json
oma home migrate --json
oma schedule sync
```

全局安装和更新会在写入全局文件之前运行迁移。项目安装/更新使用统一的根目录，不会迁移无关的全局数据。迁移不会改变操作系统的作业注册；如果存在计划任务，请在迁移后运行 `oma schedule sync`。活动的服务或运行器可能会推迟部分数据；请结束这些进程后重新运行迁移。

## 另请参阅 {#see-also}

- [配置加载](./oma-config-semantics.md)：全局、项目和本地配置文件如何合并
- [现有项目集成](./integration.md)：项目模式的安装、验证和回滚
- [自动更新](./automated-updates.md)：从 CI 运行 `oma update`
