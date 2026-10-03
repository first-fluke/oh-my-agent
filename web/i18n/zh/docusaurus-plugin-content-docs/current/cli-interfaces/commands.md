---
title: "CLI 命令"
description: "CLI 全部命令的完整参考，涵盖语法、选项、示例，并按类别组织。"
sidebar_label: CLI 命令
---

# CLI 命令

全局安装（`bun install --global oh-my-agent`）后，使用 `oma` 或 `oh-my-agent`。如果不想安装、只需临时使用一次，运行 `npx oh-my-agent`。

将环境变量 `OH_MY_AG_OUTPUT_FORMAT` 设为 `json`，即可让支持此功能的命令强制输出机器可读格式。这等同于为每个命令传入 `--json`。

## 从任务开始

选择能回答当前问题的最小命令。下面的每个命令都会打印路径或报告，检查后再进入下一步。

| 任务 | 从这里开始 | 预期结果 |
|:-----|:-----------|:----------------|
| 安装或修复项目 | 先运行 `oma install`，再运行 `oma doctor` | 安装好的资源和健康报告；如果要排查模型解析问题，使用 `oma doctor --profile`。 |
| 供智能体查找命令或选项 | `oma describe` 或 `oma describe "image generate"` | 描述参数、选项和嵌套命令的 JSON。 |
| 生成图像 | `oma image generate "<prompt>" --output json` | 图像路径，以及 `.agents/results/images/` 下的清单。 |
| 规划或渲染视频 | `oma video generate "<brief>" --dry-run` | 包含规划产物的运行目录；编写好组合之后再进行合成和渲染。 |
| 制作交互式代码讲解 | `/explain` | `.agents/results/explain/` 下经过校验、自包含的 HTML 产物。 |
| 解析图表引擎 | `oma diagram resolve --output json` | 选中的 Mermaid 或 archify 引擎及选择原因。 |
| 研究社区信号 | `oma market detect-trap "<topic>"` | 预检结果；只有通过后，才继续执行 `oma market resolve --output json` 和上游运行。 |
| 转换或查看论文 | `oma scholar search "<query>"` | 来自 Knows、OpenAlex 或 Semantic Scholar 的搜索结果；用 `oma scholar get` 获取 sidecar。 |
| 制作幻灯片 | `oma slide create --output-dir <dir>` | 可在其中编写、校验、打包和导出的工作目录。 |
| 检查文档漂移 | `oma docs verify --json` | 结构化的失效引用报告，以及重新生成的引用索引。 |

已签入的注册表是此命令映射的来源。下面的规范发现名称来自 `oma describe` 返回的路径；交互式帮助可能显示兼容性别名，例如 `slide new`、`slide viewer`、`image list-vendors` 或 `video list-providers`。

## 当前命令范围

此映射让下面的长参考内容更易扫描，也便于发现不常用的命令族。要查看确切的参数语法，请使用各命令族的 `--help` 或 `oma describe <path>`；完整的注册表标志矩阵见 [CLI 选项](./options.md)。

|命令族|注册路径|
|:-------|:-----------------|
| `install` | `install` |
| `describe` | `describe` |
| `uninstall` | `uninstall` |
| `update` | `update`, `update mcp` |
| `link` | `link` |
| `intel` | `intel`, `intel suggest` |
| `market` | `market`, `market detect-trap`, `market resolve`, `market update`, `market run` |
| `doctor` | `doctor` |
| `profile` | `profile`, `profile list`, `profile show`, `profile create`, `profile use`, `profile run` |
| `retro` | `retro` |
| `recap` | `recap` |
| `docs` | `docs`, `docs verify`, `docs sync`, `docs i18n`, `docs lint` |
| `emit` | `emit` |
| `cleanup` | `cleanup` |
| `bridge` | `bridge` |
| `verify` | `verify`, `verify agent`, `verify triggers` |
| `vault` | `vault`, `vault store`, `vault get`, `vault list`, `vault delete` |
| `star` | `star` |
| `visualize` | `visualize` |
| `search` | `search`, `search providers`, `search web`, `search fetch`, `search meta`, `search media`, `search archive`, `search trust`, `search code`, `search doctor`, `search api`, `search api fetch`, `search api search`, `search rss`, `search rss fetch`, `search rss google` |
| `harness` | `harness`, `harness eval`, `harness incident`, `harness feedback`, `harness evolution enable`, `harness evolution status`, `harness evolution disable`, `harness evolution run` |
| `slide` | `slide`, `slide validate`, `slide bundle`, `slide edit`, `slide doctor`, `slide create`, `slide preview`, `slide export`, `slide export pdf`, `slide export png`, `slide export pptx`, `slide import`, `slide import pptx`, `slide asset`, `slide asset fetch-video`, `slide style`, `slide style list`, `slide style preview`, `slide style get` |
| `scholar` | `scholar`, `scholar search`, `scholar resolve`, `scholar get`, `scholar lint` |
| `image` | `image`, `image generate`, `image doctor`, `image vendor`, `image vendor list` |
| `video` | `video`, `video generate`, `video doctor`, `video compose`, `video render`, `video provider`, `video provider list` |
| `serena` | `serena`, `serena reap`, `serena reaper`, `serena reaper enable`, `serena reaper disable` |
| `explain` | `explain`, `explain validate` |
| `diagram` | `diagram`, `diagram resolve`, `diagram update`, `diagram archify` |
| `help` | `help` |
| `version` | `version` |
| `dashboard` | `dashboard`, `dashboard terminal`, `dashboard web` |
| `auth` | `auth`, `auth status` |
| `hook` | `hook`, `hook run`, `hook probe` |
| `state` | `state`, `state emit`, `state migrate`, `state get`, `state list`, `state repair`, `state verify`, `state decisions`, `state decisions list`, `state inject-log`, `state inject-log list`, `state inject-log get`, `state summary`, `state heal-check`, `state activate`, `state archive`, `state purge` |
| `ralph` | `ralph`, `ralph verify` |
| `goal` | `goal`, `goal set` |
| `stats` | `stats`, `stats get`, `stats reset` |
| `agent` | `agent`, `agent context`, `agent resume`, `agent begin`, `agent verify`, `agent finish`, `agent spawn`, `agent status`, `agent parallel`, `agent review` |
| `model` | `model`, `model check`, `model probe`, `model propose` |
| `memory` | `memory`, `memory keys`, `memory init`, `memory setup`, `memory daemon`, `memory daemon status`, `memory daemon start`, `memory daemon stop`, `memory daemon restart`, `memory service`, `memory service install`, `memory service uninstall`, `memory status`, `memory retry`, `memory retry drain`, `memory import`, `memory maintain`, `memory maintain backup`, `memory maintain prune`, `memory maintain vacuum`, `memory gc`, `memory upgrade` |
| `skill` | `skill`, `skill audit`, `skill lint`, `skill eval`, `skill optimize`, `skill meta-optimize`, `skill procedure`, `skill evolution-stats`, `skill promotions`, `skill rollback` |
| `schedule` | `schedule`, `schedule create`, `schedule list`, `schedule delete`, `schedule run`, `schedule sync` |

当命令把剩余参数交给其他工具时，注册表会有意不限定它的选项。`market run` 和 `diagram archify` 就属于这种情况；在执行会修改状态或访问网络的操作之前，请先阅读解析出的上游工具帮助。

---

## 设置与安装

### install（安装）

不带参数运行 `oma` 会启动交互式安装器。`oma install` 是显式形式，并接受用于选择提供方的选项。

```
oma
oma install
oma install --web-search native --code-intelligence gortex --semantic-memory agent-memory
```

省略 `--web-search`、`--code-intelligence` 和 `--semantic-memory` 时，会沿用已保存的提供方选择。选中 Honcho 提供方时，`--honcho-url` 和 `--honcho-workspace` 用于配置新的 Honcho 连接。根级 `-y, --yes` 标志会跳过提示并使用默认值；`--global` 以 HOME 安装为目标。

**功能**：
1. 检查是否存在旧版 `.agent/` 目录，如果找到，则迁移到 `.agents/`。
2. 检测相互冲突的同类工具，并提示是否删除。
3. 提示选择项目类型（All、Fullstack、Frontend、Backend、Mobile、DevOps、Custom）。
4. 如果选择了 Backend，提示选择语言变体（Python、Node.js、Rust、Other）。
5. 询问是否创建 GitHub Copilot 符号链接。
6. 从注册表下载最新的 tarball。
7. 安装共享资源、工作流、配置和选定的技能。
8. 为选定的供应商安装供应商适配（项目本地设置；不会静默写入 HOME 级别的供应商配置）。
9. 创建 CLI 符号链接。
10. 提供推荐的**全局** Git 配置（确认后才启用）：
    - `rerere.enabled=true`：在多智能体合并时复用冲突解决结果
    - `init.defaultBranch=main`：让新仓库使用一致的默认分支
    - 使用 `--yes` 或在 CI 中运行时完全跳过（改为打印手动修复提示）
11. 在适用时提供 MCP 配置。
12. 如果 `gh` 已通过身份验证，询问是否在 GitHub 上为仓库加星。

**示例**：
```bash
cd /path/to/my-project
oma
# Follow the interactive prompts
```

### doctor（诊断） {#doctor}

检查 CLI 安装、MCP 配置和技能状态。

```
oma doctor [--json] [--output <format>] [--profile]
```

**选项**：

|标志|说明|
|:-----|:-----------|
| `--json` | 以 JSON 格式输出 |
| `--output <format>` | 输出格式（`text` 或 `json`） |
| `--profile` | 显示配置档健康矩阵。根据当前生效的 `model_preset` 和 `agents:` 覆盖项，列出每个智能体解析出的模型 slug、CLI 和身份验证状态。参见[按智能体配置模型](../guide/per-agent-models.md)。 |

**检查内容**：
- CLI 安装情况：agy、claude、codex、qwen（版本和路径）。
- 每个 CLI 的身份验证状态。
- MCP 配置：`~/.gemini/settings.json`、`~/.claude.json`、`~/.codex/config.toml`。
- 已安装的技能：有哪些技能及其状态。
- 内存存储目录：`.agents/state/memories/` 是否存在以及文件数量（较旧的项目会回退到旧版 `.serena/memories/` 路径）。
- 双重安装标记（项目与全局）及相关警告。
- 推荐的**全局** Git 配置（JSON 中的 `gitRecommended`）：
  - `rerere.enabled=true`
  - `init.defaultBranch=main`
  - 每处不一致都会计入 `totalIssues`
- 项目供应商上下文文件（已安装 Codex、Qwen 或 Claude Code ≥ 2.1.277 时，检查 `AGENTS.md` 中的 OMA 区块）。
- AgentMemory、状态与钩子的健康情况、Serena 回收器诊断，以及相关的问题计数。

**自动修复**：如果检测到缺少技能，`doctor` 会以交互方式提供安装。如果推荐的 Git 配置缺失或有误，它会提供与 install/update 相同的可选全局修复。

**示例**：
```bash
# Interactive text output
oma doctor

# JSON output for CI pipelines
oma doctor --json

# Pipe to jq for specific checks
oma doctor --json | jq '.clis[] | select(.installed == false)'

# Inspect the profile resolution matrix
oma doctor --profile
```

### update（更新）

从注册表将技能更新到最新版本。

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
```

**选项**：

|标志|说明|
|:-----|:-----------|
| `-f, --force` | 覆盖用户自定义的配置文件（`oma-config.yaml`、`mcp.json`、`stack/` 目录） |
| `--with-new-skills` | 安装此版本新增的技能；不使用时，只刷新已安装的技能。 |
| `--ci` | 以非交互式 CI 模式运行（跳过提示，输出纯文本） |
| `-y, --yes` | 跳过提示。供应商范围不变：除非提供 `--all` 或 `--vendor`，否则只更新已存在的供应商目录。 |
| `--all` | 创建或更新所有受支持的项目级供应商。 |
| `--vendor <vendors>` | 创建或更新指定的供应商。接受逗号分隔的列表，例如 `claude,qwen`。 |

**功能**：
1. 从注册表获取 `prompt-manifest.json`，检查最新版本。
2. 与 `.agents/skills/_version.json` 中的本地版本比较。
3. 如果已是最新版本，直接退出。
4. 下载并解压最新的 tarball。
5. 保留用户自定义的文件（使用 `--force` 时除外）。
6. 将新文件复制到 `.agents/`，覆盖原有文件。
7. 恢复保留的文件。
8. 更新供应商适配并刷新符号链接。默认只处理项目中已存在的供应商目录。
9. 提供推荐的**全局** Git 配置（与 install 相同的可选项：`rerere.enabled`、`init.defaultBranch`）。使用 `--yes` 或 `--ci` 时跳过。

**示例**：
```bash
# Standard update (preserves config)
oma update

# Force update (resets all config to defaults)
oma update --force

# CI mode (no prompts, no spinners)
oma update --ci

# CI mode with force
oma update --ci --force

# Update existing vendors without prompts
oma update --yes

# Create/update every supported project-scoped vendor
oma update --all

# Create/update only Claude and Qwen integrations
oma update --vendor claude,qwen

# Also refresh browser MCP selections
oma update mcp --ci
```

`oma update mcp` 有自己的 `--yes`、`--ci`、`--all` 和 `--vendor <vendors>` 选项。它为所选的项目级供应商选择受支持的浏览器 MCP 服务器（Aside、Chrome DevTools 或 Firefox DevTools）。

### uninstall（卸载）

预览或删除选定安装根目录中由 OMA 管理的文件：

```
oma uninstall --dry-run
oma uninstall --yes
```

`--dry-run` 只列出将删除的内容，不修改文件。`--yes` 跳过确认提示。根据注册的命令说明，此命令会保留 `oma-config.yaml`、`mcp.json` 和用户编写的技能。如果预览中包含你仍需要的文件，请停止操作，并保留试运行输出以供审查。

### link（链接） {#link}

以 `.agents/` 为事实来源重新生成供应商原生文件，无需重新安装。

```
oma link [vendors...] [--global]
```

**示例**：

```bash
# Regenerate all configured vendors
oma link

# Regenerate only Claude and Codex files
oma link claude codex

# Regenerate the HOME install (~/.agents/) from any directory
oma link opencode --global
```

不使用 `--global` 时，link 以 `<cwd>/.agents/` 为目标；使用时，则以 `~/.agents/`（或 `OMA_HOME`）为目标。参见[全局安装](../guide/global-install.md)。

**功能**：
1. 根据 `.agents/agents/` 重建供应商原生智能体文件
2. 为所选供应商刷新钩子和本地设置
3. 为每个已配置的供应商（包括 Claude Code 在内）重新生成 `AGENTS.md` 集成区块。从不创建 `CLAUDE.md` 和 `GEMINI.md`，也不会在其中写入 OMA 区块。Claude Code ≥ 2.1.277 原生读取 `AGENTS.md`，但只要存在 `CLAUDE.md` 就会忽略它，所以当用户自有的 `CLAUDE.md` 存在时，link 会追加一行 `@AGENTS.md` 导入；检测到该版本后，`oma update` 还会移除 `CLAUDE.md` 中旧版的 OMA 区块
4. 在需要时刷新 Cursor MCP 关联和 CLI 技能符号链接

编辑 `.agents/agents/`、`.agents/workflows/`、`.agents/rules/` 或钩子定义后，运行此命令。

**模型行为**：
- 同供应商原生调度使用生成的供应商智能体文件中定义的模型。
- 外部回退调度使用 `.agents/skills/oma-orchestration/config/cli-config.yaml` 中各供应商的 `default_model`。

**调度行为**：
- 如果目标供应商与当前运行时一致，并且当前运行时支持原生角色智能体，OMA 会使用原生调度。
- 否则，OMA 回退到 `oma agent spawn`。

### setup（工作流）

`/setup` 工作流（在智能体会话内调用）以交互方式配置语言、CLI 安装、MCP 连接以及智能体与 CLI 的映射。它与 `oma`（安装器）不同：`/setup` 用于配置已经安装好的实例。

---

## 监控与指标

### dashboard（仪表盘）

启动终端仪表盘，实时监控智能体。

```
oma dashboard terminal
```

没有选项。监视当前目录中的 `.agents/state/memories/`（较旧的项目会回退到旧版 `.serena/memories/` 路径）。用方框绘制字符渲染界面，显示会话状态、智能体表格和活动动态。每次文件变更都会刷新。按 `Ctrl+C` 退出。

可以用 `MEMORIES_DIR` 环境变量覆盖内存目录。

**示例**：
```bash
# Standard usage
oma dashboard terminal

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal
```

### dashboard web（Web 仪表盘）

启动 Web 仪表盘。

```
oma dashboard web
```

在 `http://localhost:9847` 上启动 HTTP 服务器，并通过 WebSocket 连接推送实时更新。在浏览器中打开此 URL 即可查看仪表盘。

**环境变量**：

|变量|默认|说明|
|:---------|:--------|:-----------|
| `DASHBOARD_PORT` | `9847` | HTTP/WebSocket 服务器的端口 |
| `MEMORIES_DIR` | `{cwd}/.agents/state/memories` | 内存目录的路径（较旧的项目会回退到旧版 `{cwd}/.serena/memories`） |

**示例**：
```bash
# Standard usage
oma dashboard web

# Custom port
DASHBOARD_PORT=8080 oma dashboard web
```

### stats（统计）

查看生产力指标。

```
oma stats get [--json] [--output <format>]
oma stats reset [--json] [--output <format>]
```

**选项**：

|标志|说明|
|:-----|:-----------|
| `--json` | 以 JSON 格式输出 |
| `--output <format>` | 输出格式（`text` 或 `json`） |

**跟踪的指标**：
- 会话数量
- 使用过的技能（含使用频率）
- 已完成的任务
- 会话总时长
- 变更的文件数、新增行数、删除行数
- 最后更新时间戳

**成本遥测**（汇总 `.agents/state/memories/` 下所有 `session-cost-*.md` 文件）：
- 输入 token 总数（按提示词字符数近似估算，暂不统计输出 token）
- 启动总次数
- 按保守的各供应商输入 token 费率表估算的美元费用（Claude $3/M、Codex $5/M、Gemini $0.3/M、Qwen $0/M、Cursor $5/M、Antigravity $0.3/M）
- 按供应商细分（token · 启动次数 · 美元）

这个估算值只是下限，并非精确的计费金额。在 `.agents/oma-config.yaml` 中配置 `session.quota_cap`，即可在启动时强制执行硬性预算；这些上限属于质量优先的整套工具，详见“快速开始”中的“为什么选择 oh-my-agent”页面。

指标存储在 `.agents/state/metrics.json` 中；如果存在旧版 `.serena/metrics.json`，也会读取。数据来自 Git 统计和内存文件。

**示例**：
```bash
# View current metrics
oma stats get

# JSON output
oma stats get --json

# Reset all metrics
oma stats reset
```

### recap（回顾）

回顾 Claude、Codex、Qwen 和 Cursor 会话中的 AI 工具对话历史。

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

**选项**：

|标志|说明|默认|
|:-----|:-----------|:--------|
| `--window <period>` | 时间窗口：`1d`、`3d`、`7d`、`2w`、`30d` | `1d` |
| `--date <date>` | 指定日期（`YYYY-MM-DD`）；优先于 `--window` | |
| `--tool <tools>` | 逗号分隔的过滤条件：`grok,claude,codex,qwen,cursor,antigravity` | 全部 |
| `--top <n>` | 显示前 N 个项目或主题 | |
| `--sort <metric>` | 按 `count` 或 `duration` 排序 | `count` |
| `--mermaid` | 输出为 Mermaid 甘特图 | |
| `--graph` | 在浏览器中打开交互式图形 | |
| `--json` / `--output <format>` |机器可读输出| `text` |

**示例**：

```bash
oma recap                                     # Today (1d)
oma recap --window 7d                         # Last week
oma recap --date 2026-04-20 --tool grok,claude
oma recap --window 7d --mermaid > week.mmd
oma recap --window 30d --graph                # Interactive browser graph
```

### retro（复盘）

查看包含指标和趋势的工程复盘。

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

**参数**：

|参数|说明|默认|
|:---------|:-----------|:--------|
| `window` | 分析的时间窗口（例如 `7d`、`2w`、`1m`） | 最近 7 天 |

**选项**：

|标志|说明|
|:-----|:-----------|
| `--json` | 以 JSON 格式输出 |
| `--output <format>` | 输出格式（`text` 或 `json`） |
| `--interactive` | 交互模式，可手动录入 |
| `--compare` | 将当前窗口与之前等长的窗口比较 |

**显示内容**：
- 可直接分享的摘要（单行指标）
- 摘要表格（提交、变更文件、新增/删除行数、贡献者）
- 与上次复盘相比的趋势（如果存在之前的快照）
- 贡献者排行榜
- 提交时间分布（按小时的直方图）
- 工作会话
- 提交类型细分（feat、fix、chore 等）
- 热点（变更最频繁的文件）

**示例**：
```bash
# Last 7 days (default)
oma retro

# Last 30 days
oma retro 30d

# Last 2 weeks
oma retro 2w

# Compare with previous period
oma retro 7d --compare

# Interactive mode
oma retro --interactive

# JSON for automation
oma retro 7d --json
```

---

## 会话与本地配置档

### state list（列出状态）

列出当前项目的 OMA 工作流会话。显式启用全局发现时，会列出所选本地配置档中所有项目的会话：

```bash
oma state list
oma state list --all-projects --json
oma state list --all-projects --project /path/to/project
oma state list --all-projects --search migration
```

`--all-projects` 是只读的，不能与会话激活或维护操作组合使用。普通的会话读写仍限定在各自的项目范围内。其他仓库中的旧版会话必须先迁移到主目录存储，才会出现在汇总列表中。

### profile（配置档）

管理 `~/.oma/u/<slot>/` 下的本地存储配置档。槽位是非负十进制整数，与模型预设和提供方登录账户相互独立。

```bash
oma profile list --json
oma profile create 1
oma profile show
eval "$(oma profile use 1 --shell zsh)"
oma profile show
oma profile run 1 -- oma state list --all-projects --json
```

`profile use` 会打印 shell 激活代码；用 eval 执行后，会在当前 shell 中设置 `OMA_PROFILE`。单独运行时，它不会修改父 shell，不会改变已在运行的应用，也不会另存一个仅供 CLI 使用的默认值。从已激活的 shell 启动的 CLI 命令和供应商钩子会继承同一配置档。默认配置档为 `0`；`OMA_STATE_HOME` 可覆盖存储根目录。`profile run <slot> -- <command> [args...]` 只为这条命令及其子进程选择配置档。分隔符确保 `--help`、`--json` 等子命令选项留给子命令处理。

---

## 智能体管理

### agent spawn（生成智能体）

生成一个子智能体进程。

```
oma agent spawn <agent-id> <prompt> <session-id> [--vendor <vendor>] [-w <workspace>] [--isolation <mode>]
```

**参数**：

|参数|必填|说明|
|:---------|:---------|:-----------|
| `agent-id` | 是 | 智能体类型，取值为以下之一：`orchestrator`、`architecture`、`qa`、`pm`、`backend`、`frontend`、`mobile`、`db`、`debug`、`refactor`、`docs`、`tf-infra`、`explore` |
| `prompt` | 是 | 任务说明。可以是内联文本，也可以是文件路径。 |
| `session-id` | 是 | 会话标识符（格式：`session-YYYYMMDD-HHMMSS`） |

**选项**：

|标志|说明|
|:-----|:-----------|
| `--vendor <vendor>` | 覆盖 CLI 供应商：`antigravity`、`claude`、`codex`、`cursor`、`opencode`、`qwen`、`grok`、`pi` |
| `-w, --workspace <path>` | 智能体的工作目录。省略时根据 monorepo 配置自动检测。 |
| `--resumed-from <run-id>` | 将这次重试关联到前一次运行的 ID。 |
| `--task-id <id>` | 会话计划中的任务 ID。默认为智能体 ID。 |
| `--isolation <mode>` | 单次启动的隔离模式。目前支持 `worktree`：在 `${tmpdir}/oma-worktrees/{sessionId}/{agentId}` 创建新的 Git 工作树（分支为 `oma/{sessionId}/{agentId}`），并在其中运行智能体。退出后工作树会保留，并打印合并或丢弃命令供人工审查（不会自动合并）。 |
| `--read-only` | 将启动的智能体限制为只能使用非破坏性工具（不附加自动批准标志）。`oma skill eval --live` 在内部为两个评估分支都使用此选项。 |
| `--fallback-vendors <vendors>` | 选择启用一条有序的回退链，以逗号分隔，最多包含三个已配置的 CLI 供应商。只有出现可识别的配额、速率限制或暂时性故障，并且有新的安全交接检查点时，才会继续执行。 |

**供应商解析顺序**：`--vendor` 标志 > `oma-config.yaml` 中的 `agents:` 覆盖项 > 当前 `model_preset` 的智能体默认值。

**提示词解析**：如果提示词参数是已存在文件的路径，则使用文件内容作为提示词；否则按内联文本处理。供应商专用的执行协议会自动追加到提示词中。

**退出码**：

|代码|含义|
|:-----|:--------|
| `0` | 供应商进程以 0 退出，且工作区下存在会话结果产物。 |
| `3` | 供应商进程以 0 退出，但在工作区下**没有写入会话结果产物**（例如 agy 写入了它自己的受信任根目录，而不是 `-w` 指定的目录）。会话轨迹中会追加一条 `blocker.raised` 事件，`agent status` 报告 `no-artifact`。不要把这次启动视为已完成。 |
| 其他 | 供应商进程本身失败，其退出码会原样传出。 |

**示例**：
```bash
# Inline prompt, auto-detect workspace
oma agent spawn backend "Implement /api/users CRUD endpoint" session-20260324-143000

# Prompt from file, explicit workspace
oma agent spawn frontend ./prompts/dashboard.md session-20260324-143000 -w ./apps/web

# Override vendor to Claude
oma agent spawn backend "Implement auth" session-20260324-143000 --vendor claude -w ./api

# Allow a prepared task handoff to another configured vendor
oma agent spawn backend "Implement auth" session-20260324-143000 --vendor claude --fallback-vendors codex,qwen -w ./api

# Mobile agent with auto-detected workspace
oma agent spawn mobile "Add biometric login" session-20260324-143000

# Run inside an isolated git worktree (useful for hypothesis spawns or
# when parallel agents would touch shared files)
oma agent spawn backend "Try a Drizzle-based rewrite" session-20260324-143000 --isolation worktree
```

**供应商故障转移**：回退候选必须在已安装的 CLI 配置中有对应的供应商条目。每次尝试都使用目标供应商的模型配置，并且同样要经过现有的会话配额检查。`pi` 多提供方代理不在这一初版供应商回退功能的范围内。此功能不会创建额外的提供方凭据或付费 API 路由。

启用故障转移后，任务会收到指令，在 `.agents/results/` 下准备本次运行专属的安全交接记录。后继运行会先读取这份记录并检查工作区，再继续完成剩余工作。如果配额耗尽时没有可用的检查点，运行会停止，并留下一条待审查（needs-review）记录。取消、普通任务失败和已完成的运行都不会触发新的尝试。`--read-only` 也不能免除检查点要求。

会话事件会记录切换原因以及来源和目标供应商；每次尝试都有独立的运行标识，后继运行会链接到其前驱。此机制适用于 `oma agent spawn` 启动的子进程，不会自动切换供应商应用中已有的交互式对话。省略 `--fallback-vendors` 时，仍按通常的单供应商方式执行。

### agent status（智能体状态）

检查一个或多个子智能体的状态。

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

**参数**：

|参数|必填|说明|
|:---------|:---------|:-----------|
| `session-id` | 是 | 要检查的会话 ID |
| `agent-ids` | 否 | 以空格分隔的智能体 ID 列表。省略时不输出任何内容。 |

**选项**：

|标志|说明|默认|
|:-----|:-----------|:--------|
| `-r, --root <path>` | 检查内存文件时使用的根路径 | 当前目录 |

**状态值**：
- `completed`：结果文件存在（状态标头可选）。
- `running`：PID 文件存在，且进程仍在运行。
- `crashed`：PID 文件存在但进程已终止，或者找不到 PID 文件和结果文件。
- `no-artifact`：供应商进程以 0 退出，但没有在工作区下写入会话结果产物（静默写到了错误位置，参见 `agent spawn` 的退出码 `3`）。应视为启动失败。

**输出格式**：每个智能体一行：`{agent-id}:{status}`

**示例**：
```bash
# Check specific agents
oma agent status session-20260324-143000 backend frontend

# Output:
# backend:running
# frontend:completed

# Check with custom root
oma agent status session-20260324-143000 qa -r /path/to/project
```

### agent parallel（并行智能体）

并行运行多个子智能体。

```
oma agent parallel [tasks...] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

**参数**：

|参数|必填|说明|
|:---------|:---------|:-----------|
| `tasks` | 是 | YAML 任务文件路径，或内联任务规格（需配合 `--inline`） |

**选项**：

|标志|说明|
|:-----|:-----------|
| `--vendor <vendor>` | 为所有智能体覆盖 CLI 供应商 |
| `-i, --inline` | 内联模式：以 `agent:task[:workspace]` 参数形式指定任务 |
| `--no-wait` | 后台模式（启动智能体后立即返回） |

**YAML 任务文件格式**：
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional, auto-detected if omitted
- agent: frontend
task: "Build user dashboard"
workspace: ./web
```

**内联任务格式**：`agent:task` 或 `agent:task:workspace`（workspace 必须以 `./` 或 `/` 开头）。

**结果目录**：`.agents/results/parallel-{timestamp}/` 包含每个智能体的日志文件。

**示例**：
```bash
# From YAML file
oma agent parallel tasks.yaml

# Inline mode
oma agent parallel --inline "backend:Implement auth API:./api" "frontend:Build login:./web"

# Background mode (no wait)
oma agent parallel tasks.yaml --no-wait

# Override vendor for all agents
oma agent parallel tasks.yaml --vendor claude
```

### agent review（智能体审查）

使用外部 AI CLI（codex、claude、qwen 或 grok）运行代码审查。

```
oma agent review [--vendor <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**选项**：

|标志|说明|
|:-----|:-----------|
| `--vendor <vendor>` | 要使用的 CLI 供应商：`codex`、`claude`、`qwen` 或 `grok`。如果从配置解析出的供应商不受支持，则默认使用 `codex`。 |
| `-p, --prompt <prompt>` | 自定义审查提示词。省略时使用默认的代码审查提示词。 |
| `-w, --workspace <path>` | 要审查的路径。默认为当前工作目录。 |
| `--no-uncommitted` | 跳过未提交变更的审查。设置后只审查本会话中已提交的变更。 |

**功能**：
- 根据环境或最近的 Git 活动自动检测当前会话 ID。
- 对于 `codex`：使用原生的 `codex review` 子命令。
- 对于 `claude`、`qwen`：构造基于提示词的审查请求，并用审查提示词调用 CLI。
- 默认审查工作目录中未提交的变更。
- 使用 `--no-uncommitted` 时，只审查当前会话中已提交的变更。

**示例**：
```bash
# Review uncommitted changes with default vendor
oma agent review

# Review with codex (uses native codex review command)
oma agent review --vendor codex

# Review with claude using a custom prompt
oma agent review --vendor claude -p "Focus on security vulnerabilities and input validation"

# Review a specific path
oma agent review -w ./apps/api

# Review only committed changes (skip working tree)
oma agent review --no-uncommitted

# Review committed changes in a specific workspace with qwen
oma agent review --vendor qwen -w ./apps/web --no-uncommitted
```

### goal set（设置目标） {#goal-set}

为处于活动状态的持久工作流（orchestrate、ultrawork、work、ralph）附加目标契约。契约由持久模式的 Stop 钩子以机械方式强制执行，是否完成不再由模型自行判断。

```
oma goal set [--workflow <name>] [--session-id <id>] [--gate <keyword>] [--budget-minutes <n>] [--description <text>]
```

**选项**：

|标志|说明|
|:-----|:-----------|
| `--gate <keyword>` | 确定性停止关卡：`typecheck`、`test` 或 `lint`。对应 package.json 中的同名脚本，以 argv 数组形式运行，不经过 shell。设置后，Stop 钩子**只有在这个脚本通过时**才允许工作流结束；失败时会阻止结束，并附上输出末尾，让智能体知道要修复什么。自由格式的命令会被拒绝：关卡值保存在智能体可写的状态文件中，如果执行其中的任意字符串，就会绕过权限层。 |
| `--budget-minutes <n>` | 从工作流激活时开始计算的挂钟时间预算。超出后，Stop 钩子会停用工作流，并允许如实报告部分完成后停止（由机器判定，在会话事件轨迹中记录为带有 `gate: "budget"` 的 `gate.failed`）。 |
| `--description <text>` | 面向人的目标说明，仅供参考。 |
| `--workflow <name>` | 多个持久工作流同时处于活动状态时，指定目标工作流。 |
| `--session <id>` | 目标状态文件的会话 ID 后缀。 |

**行为说明**：
- 关卡通过 → 工作流停用，发出 `gate.passed`，允许停止。
- 关卡失败和超时（硬性上限 60 秒）都会计入强化次数上限（5 次），因此始终失败的关卡不会永远阻止停止；2 小时的过期失效机制仍是最后一道保障。
- 没有目标契约时，持久模式的行为与以前完全相同（只有强化提示）；契约完全由用户选择启用。

**示例**：
```bash
# After starting /ultrawork: require typecheck to pass before the session may end
oma goal set --gate typecheck

# Bound an autonomous run: stop honestly after 2 hours even if incomplete
oma goal set --workflow ultrawork --gate test --budget-minutes 120
```

---

## 计划智能体

### schedule create（创建计划任务）

注册计划智能体任务。`--cron` 和 `--every` 必须且只能指定一个。

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>]
```

**参数**：

|参数|必填|说明|
|:---------|:---------|:-----------|
| `agent-id` | 是 | 智能体类型：`backend`、`frontend`、`mobile`、`qa`、`debug`、`pm` |
| `prompt` | 是 | 触发时传给智能体的任务说明 |

**选项**：

|标志|说明|
|:-----|:-----------|
| `--cron "<expr>"` | 五字段 cron 表达式（例如 `"0 9 * * *"`）。不能与 `--every` 同时使用。 |
| `--every "<phrase>"` | 自然语言间隔：`5m`、`2h`、`1d`、`every 20m`、`every 5 minutes`。会取整到最近的可由 cron 表达的步长，并打印提示。不能与 `--cron` 同时使用。 |
| `--vendor <vendor>` | 传给 `oma agent spawn` 的 CLI 供应商覆盖值：`antigravity`、`claude`、`codex`、`cursor`、`opencode`、`qwen`、`grok`、`pi`。默认自动检测。 |
| `-w, --workspace <path>` | 智能体的工作目录。默认为注册时的当前目录。 |
| `--once` | 一次性模式：触发一次后自行移除。 |
| `--expires-after <duration>` | N 天后自动让重复任务过期（`0` 表示无限期）。 |
| `--env <KEY1,KEY2>` | 将指定的环境变量捕获到 `~/.agents/schedule/env/<id>`（权限 0600），以便运行时注入。只捕获列出的键，绝不会转储整个环境。 |

**功能**：
1. 解析并校验 cron 表达式（或将 `--every` 短语转换为 cron）。
2. 将任务写入 `~/.agents/schedule/schedules.json`（全局清单，权限 0600）。
3. 向操作系统调度器（launchd / systemd --user / schtasks）注册任务。操作系统任务会按配置的间隔调用 `oma schedule run <id>`。

**示例**：
```bash
# Exact cron: weekdays at 9 AM
oma schedule create qa-reviewer "Run QA review on latest changes" --cron "0 9 * * 1-5"

# Natural language: every 2 hours
oma schedule create backend "Check for slow queries" --every "2h"

# One-shot, pinned vendor and workspace
oma schedule create pm "Generate sprint plan" --cron "0 9 * * 1" --once --vendor claude -w /path/to/project

# Capture specific env vars for the job
oma schedule create backend "Sync external data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

完整演练参见[计划智能体指南](../guide/scheduled-agents.md)。

### schedule list（列出计划任务）

按项目分组列出所有项目的计划任务及操作系统漂移状态。

```
oma schedule list [--json]
```

**选项**：

|标志|说明|
|:-----|:-----------|
| `--json` | 以 JSON 格式输出 |

**漂移状态**：`synced`（清单与操作系统一致）、`stale`（操作系统中的注册项调用了当前 CLI 已不再接受的命令；运行 `schedule sync` 重写，`oma update` 会自动完成）、`missing-in-os`（运行 `schedule sync` 修复）、`orphan-in-os`（操作系统中有清单里没有的任务；运行 `schedule sync --prune` 移除）。

**示例**：
```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

### schedule delete（删除计划任务）

从清单和操作系统调度器中删除计划任务。

```
oma schedule delete <id>
```

**参数**：

|参数|必填|说明|
|:---------|:---------|:-----------|
| `id` | 是 | 来自 `schedule list` 的任务 ID（格式：`sch_<base32-12>`） |

**示例**：
```bash
oma schedule delete sch_abc123def456
```

### schedule run（运行计划任务）

按 ID 执行计划任务。这是操作系统调度器在触发时调用的入口。通常不需要手动调用，但可以用来调试任务。

```
oma schedule run <id>
```

**功能**：
1. 在清单中查找 `<id>`（找不到时以非零状态退出）。
2. 从 `~/.agents/schedule/env/<id>` 加载捕获的环境变量并注入。
3. 调用 `oma agent spawn <agentId> <prompt> <sessionId> --vendor <vendor> -w <workspace>`。
4. 将结果写入 `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`。
5. 更新清单中的 `lastFiredAt`；如果是 `--once` 任务，则自行移除。
6. 身份验证过期时会明确报错：以非零状态退出，并向 stderr 打印 `re-auth required: <vendor>`。绝不会静默地报告成功。

**示例**：
```bash
# Invoke manually to debug a job
oma schedule run sch_abc123def456
```

### schedule sync（同步计划任务）

将清单重新同步到操作系统调度器。系统迁移或操作系统调度器重置后，可用它修复漂移。

```
oma schedule sync [--prune]
```

**选项**：

|标志|说明|
|:-----|:-----------|
| `--prune` | 同时移除操作系统中存在、但清单中没有的任务（orphan-in-os）。不使用 `--prune` 时，只报告孤立任务，不移除。 |

**示例**：
```bash
# Repair missing-in-os jobs
oma schedule sync

# Repair missing-in-os AND remove orphans
oma schedule sync --prune
```

---

## 内存管理

### memory init（初始化内存）

初始化协调内存存储架构。

```
oma memory init [--json] [--output <format>] [--force]
```

**选项**：

|标志|说明|
|:-----|:-----------|
| `--json` | 以 JSON 格式输出 |
| `--output <format>` | 输出格式（`text` 或 `json`） |
| `--force` |覆盖空或现有架构文件|

**功能**：创建 `.agents/state/memories/` 目录结构及初始架构文件，智能体和工作流通过这些文件读写协调状态。

**示例**：
```bash
# Initialize memory
oma memory init

# Force overwrite existing schema
oma memory init --force
```

---

## 集成与工具

### auth status（身份验证状态）

检查所有受支持 CLI 的身份验证状态。

```
oma auth status [--json] [--output <format>]
```

**选项**：

|标志|说明|
|:-----|:-----------|
| `--json` | 以 JSON 格式输出 |
| `--output <format>` | 输出格式（`text` 或 `json`） |

**检查**：GitHub CLI（`gh`）、Antigravity CLI（`agy`）、Gemini CLI、Claude CLI、Codex CLI、Cursor CLI、Qwen CLI。

**示例**：
```bash
oma auth status
oma auth status --json
```

### bridge（桥接）

将 MCP stdio 代理到按项目共享的 Serena 服务器。

```
oma bridge [url] [--context <name>]
```

**参数**：

|参数|必填|说明|
|:---------|:---------|:-----------|
| `url` | 否 | 连接到调用方自行管理的端点，而不是解析共享守护进程 |
| `--context` | 否 | 守护进程使用的 Serena 上下文（默认 `ide`）；守护进程按此值区分 |

**功能**：每个供应商的 serena MCP 条目默认都运行此命令，你不需要手动调用。Serena 的 stdio 传输会为每个智能体会话分配独立的 Python 进程和一整套语言服务器栈，因此开销随打开的会话数增长。bridge 把它收敛为每个项目一个服务器：根据工作目录解析项目根目录；如果没有正在运行的服务器，就启动一个用 `--project` 固定项目的 Serena HTTP 服务器，然后把会话代理到这个服务器上。

固定 `--project` 很重要：不带此参数启动的服务器会公开 `activate_project` 工具，任何会话都能借此切换项目，影响其他所有会话。

**架构**：
```
session A --stdio--> oma bridge --.
                                   >-- HTTP --> one Serena server (+ LSPs)
session B --stdio--> oma bridge --'
```

**生命周期**：第一个会话启动服务器，之后的会话复用它，每个代理都会把自己注册为客户端。最后一个会话断开后，服务器会保持预热 10 分钟，在此期间重启的会话会重新连接；否则，下一个启动的 bridge 会关闭它。如果无法连接共享服务器，代理会回退到会话本地的 stdio serena。

在 `.agents/oma-config.yaml` 中设置 `serena.mode: stdio` 可停用此功能。

**示例**：
```bash
# Connect to a server you manage yourself
oma bridge http://localhost:12341/mcp
```

### verify（验证）

根据预期标准验证子智能体输出。

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

**`verify agent` 参数**：

|参数|必填|说明|
|:---------|:---------|:-----------|
| `agent-type` | 是 | 取值为以下之一：`backend`、`frontend`、`mobile`、`qa`、`debug`、`pm` |

**选项**：

|标志|说明|默认|
|:-----|:-----------|:--------|
| `-w, --workspace <path>` | 要验证的工作区路径 | 当前目录 |
| `--json` | 以 JSON 格式输出 | |
| `--output <format>` | 输出格式（`text` 或 `json`） | |

**功能**：运行指定智能体类型的验证脚本，检查构建是否成功、测试结果以及是否遵守范围限制。

`verify triggers` 根据带标签的提示词语料库衡量关键词检测器的准确率，百分比阈值即为关卡。注册路径是 `verify agent`；旧的顶层写法可能仍会出现在兼容帮助中。

**通用检查**（所有智能体类型）：
- **范围检查**：读取 `.agents/results/plan-{sessionId}.json` 中的任务范围，将 `git diff` 中的变更文件与定义的范围模式比较。如果修改了智能体分配范围之外的文件，则检查失败。
- **Charter Preflight**：验证 `result-{agent}.md` 包含正确填写的 `CHARTER_CHECK:` 块，且没有未填写的占位符。
- **硬编码机密**：扫描 `.py`、`.ts`、`.tsx`、`.js`、`.dart` 文件中类似 `password = "..."`、`api_key = "..."` 的模式（排除测试和示例文件）。
- **TODO/FIXME 注释**：统计 `TODO`、`FIXME`、`HACK`、`XXX` 注释（发现任何一条都会警告）。

**按智能体类型的附加检查**：

|智能体类型|附加检查|
|:-----------|:-----------------|
| `backend` | Python 语法校验（`py_compile`）、SQL 注入检测（f-string + SQL 关键字）、Python 测试执行（`pytest`） |
| `frontend` | TypeScript 编译（`tsc --noEmit`）、内联样式检测（`style={{`）、`any` 类型使用情况（超过 3 处则失败）、前端测试（`vitest`） |
| `mobile` | Flutter/Dart 分析（`flutter analyze` 或 `dart analyze`）、Flutter 测试（`flutter test`） |
| `qa` | 自检验证 |
| `debug` | 根据检测到的项目类型运行 Python 测试或前端测试 |
| `pm` | 校验 `.agents/results/plan-{sessionId}.json` 是否存在且为有效 JSON |

**输出格式**：
每项检查都会报告 `PASS`、`FAIL`、`WARN` 或 `SKIP`，并附带详细信息。只有没有任何检查失败时，总体结果才是 `ok: true`。

**示例**：
```bash
# Verify backend output in default workspace
oma verify agent backend

# Verify frontend in specific workspace
oma verify agent frontend -w ./apps/web

# JSON output for CI
oma verify agent backend --json
```

### hook（钩子）

通过集中式 oma 钩子路由器（design 019）分发供应商钩子事件。这是每个供应商生成的 `oma-hook.sh` 包装脚本调用的标准 ABI，也可以直接用它单独调试或测试处理器链。

```
oma hook run --vendor <v> --event <nativeEvent> [--matcher <tool>]
```

**选项**：

|标志|必填|说明|
|:-----|:---------|:-----------|
| `--vendor <v>` | 是 | 供应商标识，取值为以下之一：`antigravity`、`claude`、`codex`、`commandcode`、`cursor`、`grok`、`kimi`、`kiro` 或 `qwen`。（`pi` 供应商在这里**无效**：它使用进程内的 `installPiExtension` 桥接，而不是 `oma hook run`。） |
| `--event <e>` | 是 | 在供应商设置中注册的原生钩子事件名称（例如 `UserPromptSubmit`、`PreToolUse`、`Stop`） |
| `--matcher <m>` | 否 | 从钩子注册中转发的可选工具名称或匹配器（例如 `Bash`） |

**stdin / stdout 契约**：
- **stdin**：供应商原生的 JSON 负载（与供应商传给钩子进程的对象相同）。
- **stdout**：处理器触发时，输出供应商方言的 JSON（kiro 的提示事件则为纯文本）；没有处理器产生输出时为空。
- **退出码**：始终为 `0`（故障开放：错误写入 stderr，智能体永远不会被阻塞）。

**运行时数据流**：
```
vendor fires: oma-hook.sh --vendor claude --event UserPromptSubmit
  stdin: {"prompt":"...","cwd":"/project","sessionId":"..."}
  → oma hook resolves handler chain from .agents/hooks/variants/claude.json
  → runs: keyword-detector → state-boundary → skill-injector (in-process)
  → merges HandlerResult values (context: concat; pre_tool: last mutate wins; stop: any block)
  → emits vendor dialect to stdout
  → exit 0
```

**单独调试处理器链**：

```bash
# Test what keyword-detector injects for a given prompt (Claude)
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a Bash pre_tool block (Claude)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement (Codex)
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor codex --event Stop

# Test an Antigravity BeforeTool event
echo '{"tool_name":"run_shell_command","tool_input":{"command":"cat /etc/passwd"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor antigravity --event BeforeTool
```

stdout 为空表示处理器链对此事件没有执行任何操作。stdout 上的 JSON 对象就是智能体会话将收到的供应商方言内容。

**范围说明**：
- `statusLine`/hud 条目不经过 `oma hook run` 路由（热路径显示仍直接走 `bun` 路径）。
- pi 供应商使用进程内的 `installPiExtension` 桥接，而不是 `oma hook run`。
- 项目安装与全局安装并存造成的重复投递，会在 `oma hook run` 内部被丢弃（由不同的 `oma-hook.sh` 包装脚本启动的相同负载）；不同的事件，包括并行的工具调用，始终会运行。

路由器实现参见 `cli/commands/hook/command.ts`（内部称为“design 019”），按供应商的兼容性矩阵参见 `cli/commands/hook/probe/`。

**示例**：
```bash
# Inspect Claude keyword-detection output for a real prompt
echo '{"prompt":"plan the new checkout feature","cwd":"'$(pwd)'"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Verify a Qwen Stop event fires the persistent-mode block
echo '{"cwd":"'$(pwd)'"}' | oma hook run --vendor qwen --event Stop

# Check Antigravity hook output format
echo '{"prompt":"brainstorm","cwd":"'$(pwd)'"}' \
  | oma hook run --vendor antigravity --event BeforeAgent
```

---

### hook probe（探测钩子）

探测各供应商的钩子兼容性，并打印覆盖矩阵。

```
oma hook probe [--vendor <list>] [--output <fmt>] [--hooks-dir <dir>]
```

**选项**：

|标志|说明|默认|
|:-----|:-----------|:--------|
| `--vendor <list>` | 要探测的供应商，以逗号分隔 | 所有受支持的供应商 |
| `--output <fmt>` | 输出格式：`text`、`md` 或 `json` | `text` |
| `--hooks-dir <dir>` | 覆盖 `.agents/hooks/core` 目录 | 自动检测 |

**检查内容**：针对每个供应商，探测核心钩子脚本（`keyword-detector`、`persistent-mode` 等）是否存在，以及变体 JSON 是否正确地将事件映射到处理器链。任何供应商报告 `failed` 状态时，退出码为 `1`。

**示例**：
```bash
# Text matrix for all vendors
oma hook probe

# Markdown matrix (useful in CI PR comments)
oma hook probe --output md

# JSON for programmatic consumption
oma hook probe --output json | jq '.results[] | select(.status == "failed")'

# Probe a subset of vendors
oma hook probe --vendor claude,codex,antigravity
```

---

### vault（密钥库）

在操作系统钥匙串（macOS 钥匙串、Linux Secret Service 或 Windows 凭据管理器）中管理 API 密钥和其他机密，底层由 `@napi-rs/keyring` 提供支持。值永远不会出现在 shell 历史或环境文件中；`~/.config/oma/vault-index.json` 只记录键名，因此 `oma vault list` 可以列出条目而不暴露机密值。

```
oma vault store <name> [--value <value>]
oma vault get <name>
oma vault list [--json]
oma vault delete <name>
```

**子命令**：

| 子命令 | 说明 |
|:------------|:-----------|
| `store <name>` | 提示输入机密值（输入内容隐藏），并以 `name` 为名写入操作系统钥匙串。`--value <value>` 以内联方式接受值，用于非交互场景（会出现在 shell 历史中；建议使用提示输入）。 |
| `get <name>` | 将存储的值原样打印到 stdout，不加任何修饰，便于在 shell 中使用：`export ANTHROPIC_API_KEY=$(oma vault get anthropic)`。键不存在时以退出码 `2` 退出。 |
| `list` | 列出已存储的键名及其 `createdAt` 时间戳。永远不会显示值。 |
| `rm <name>` | 从钥匙串和索引中删除这项机密。 |

**键名规则**：1 到 64 个字符，取自 `[A-Za-z0-9._-]`。示例：`anthropic`、`openai-prod`、`github_pat`、`sentry.dsn`。

**原生依赖**：`@napi-rs/keyring` 原生模块采用延迟加载；如果加载失败（例如在没有 `libsecret` 或 `gnome-keyring` 的无头 Linux 上），命令会给出明确的错误和安装提示，而不是静默回退。

**示例**：
```bash
# Store with a hidden interactive prompt
oma vault store anthropic

# Non-interactive (note: value is visible in shell history)
oma vault store openai --value sk-test-...

# Use in a shell pipeline
export ANTHROPIC_API_KEY=$(oma vault get anthropic)
oma agent spawn backend "Refactor /api/auth" session-20260517-150000

# List entries (names only)
oma vault list

# Remove
oma vault delete anthropic
```

### cleanup（清理） {#cleanup}

清理孤立的子智能体进程和临时文件。

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**选项**：

|标志|说明|
|:-----|:-----------|
| `--dry-run` | 显示将清理的内容，不做任何修改 |
| `-y, --yes` | 跳过确认提示，清理全部内容 |
| `--json` | 以 JSON 格式输出 |
| `--output <format>` | 输出格式（`text` 或 `json`） |

**清理内容**：
- 系统临时目录中的孤立 PID 文件（`/tmp/subagent-*.pid`）。
- 孤立的日志文件（`/tmp/subagent-*.log`）。
- **孤立的 Serena 语言服务器**：MCP 客户端（例如 Claude）退出后，它的 `serena start-mcp-server` 进程会被重新挂到 init 下，其 LSP 子进程（`tsserver`、`pyright` 等，占用数百 MB）在没有客户端的情况下继续运行。这些进程由此命令回收。*空闲但仍处于连接状态*的情况由 [`serena reap`](#serena) 单独处理。
- `.gemini/antigravity/` 下的 Gemini Antigravity 目录（brain、implicit、knowledge）。

**示例**：
```bash
# Preview what would be cleaned
oma cleanup --dry-run

# Clean with confirmation prompts
oma cleanup

# Clean everything without prompts
oma cleanup --yes

# JSON output for automation
oma cleanup --json
```

### serena（Serena） {#serena}

回收 Serena 按项目启动的语言服务器所占用的内存。Serena 会为每个打开的项目启动一套 LSP 栈（`tsserver`、`pyright` 等，约 300 MB），并在整个会话期间保持预热；同时打开多个项目时，占用会不断累积。回收器会终止空闲的 LSP 子进程；Serena 会自我修复，在下一次工具调用时重新启动它们（无需重启）。

```
oma serena reap [--dry-run] [--quiet]
oma serena reaper enable [--dry-run]
oma serena reaper disable [--dry-run]
```

**子命令**：

|命令|说明|
|:--------|:-----------|
| `serena reap` | 立即回收一次空闲的 LSP。交互式运行总会执行；`--quiet`（计划任务使用的路径）则遵循 `enabled` 选择启用设置。 |
| `serena reap --dry-run` | 预览回收目标和预计释放的内存，不会终止任何进程。 |
| `serena reaper enable` | 安装每 5 分钟运行一次 `serena reap --quiet` 的后台任务（launchd / systemd timer / Windows 任务计划程序）。 |
| `serena reaper disable` | 移除后台任务。 |

**策略**：`lru`（默认）让最近最活跃的 `keepWarm` 个项目保持预热，回收其余项目；`idle` 回收空闲时间超过 `idleMinutes` 的所有项目。`graceSeconds` 时间窗口用于保护正在进行的工具调用。

**配置**（`.agents/oma-config.yaml`，需选择启用，默认禁用）：

```yaml
serena_reaper:
  enabled: false     # gates the scheduled (--quiet) path; interactive reap always runs
  policy: lru        # lru | idle
  keepWarm: 2        # LRU: keep this many most-recently-active projects warm
  idleMinutes: 10    # idle threshold / LRU secondary floor
  graceSeconds: 90   # in-flight protection; SIGTERM→SIGKILL window
```

诊断信息（每个项目的 KEEP/REAP 状态和活动信号来源）由 [`oma doctor`](#doctor) 显示。孤立的（客户端已退出的）Serena LSP 由 [`oma cleanup`](#cleanup) 回收，不受此设置影响。

**示例**：
```bash
# See what would be reclaimed across all open projects
oma serena reap --dry-run

# Reap idle LSPs once, right now
oma serena reap

# Turn on automatic 5-minute background reaping
#   (set serena_reaper.enabled: true in oma-config.yaml first)
oma serena reaper enable

# Turn it back off
oma serena reaper disable
```

### visualize（可视化）

将项目结构可视化为依赖图。

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

`viz` 是 `visualize` 的内置别名。

**选项**：

|标志|说明|
|:-----|:-----------|
| `--json` | 以 JSON 格式输出 |
| `--output <format>` | 输出格式（`text` 或 `json`） |

**功能**：分析项目结构，生成依赖图，展示技能、智能体、工作流和共享资源之间的关系。

**示例**：
```bash
oma visualize
oma viz --json
```

### search（搜索）

机械式搜索原语，涵盖抓取、元数据、RSS、媒体、代码和信任评分。别名为 `oma s`。所有子命令都向 stdout 输出 JSON（每行一个对象，或使用 `--pretty` 美化输出）。

```
oma search <subcommand> ...
oma s <subcommand> ...
```

**子命令**：

|子命令|用途|
|:-----------|:--------|
| `fetch <url>` | 通过自动升级的策略流水线抓取 URL（api → probe → impersonate → browser → archive） |
| `api <url>` | 通过匹配的平台 API 处理器抓取（Phase 0） |
| `api:search <query>` | 在支持关键词搜索的平台上并行展开搜索（`--platforms <list>`） |
| `meta <url>` | 提取 OGP / JSON-LD / Schema.org 元数据 |
| `rss <url>` | 发现并解析 RSS / Atom feed |
| `rss:google <query>` | 为查询构建 Google News RSS URL |
| `media <url>` | 通过 `yt-dlp` 提取媒体元数据（支持 1858 个站点） |
| `archive <url>` | 通过 AMP / archive.today / Wayback 回退抓取 |
| `trust <domain>` | 解析域名的信任级别和评分 |
| `code <query>` | 通过 `gh`（GitHub）或 `glab`（GitLab）搜索代码 |
| `doctor` | 检查依赖（Chrome、`python3` + `curl_cffi`、`yt-dlp`、`gh`） |

**URL/查询类子命令的通用选项**：

|标志|说明|默认|
|:-----|:-----------|:--------|
| `--timeout <seconds>` | 每种策略的超时时间 | `15`（`media` 为 `30`） |
| `--locale <value>` | `Accept-Language` 请求头 | `en-US,en;q=0.9` |
| `--pretty` | 美化输出 JSON | `false` |

**`fetch` 额外选项**：

|标志|说明|
|:-----|:-----------|
| `--only <strategies>` | 要运行的策略，以逗号分隔（`api,probe,impersonate,browser,archive`） |
| `--skip <strategies>` | 要跳过的策略，以逗号分隔 |
| `--include-archive` | 追加 archive 策略作为最后的回退 |

**`media` 额外选项**：

|标志|说明|
|:-----|:-----------|
| `--subs` | 写入字幕 |
| `--sub-lang <list>` | 字幕语言，以逗号分隔（默认：`en`） |
| `--format <spec>` | yt-dlp 格式规格 |

**`code` 额外选项**：

|标志|说明|默认|
|:-----|:-----------|:--------|
| `--host <github\|gitlab>` |主机| `github` |
| `--language <lang>` | 语言过滤 | |
| `--repo <owner/repo>` | 限定到某个仓库 | |
| `--limit <n>` | 最大结果数 | `20` |

**退出码**：`0` 正常，`1` 错误，`2` 被阻止，`3` 未找到，`4` 输入无效，`5` 需要身份验证，`6` 超时。

**示例**：

```bash
# Auto-escalating fetch
oma search fetch https://example.com/article --pretty

# Force a single strategy
oma search fetch https://example.com --only browser

# Cross-platform keyword search via API handlers
oma search api search "RAG patterns" --platforms hackernews,reddit

# Find a repo's trust score
oma search trust github.com

# Code search (defaults to GitHub)
oma search code "useEffect cleanup" --language ts --limit 10

# Verify your local dependencies
oma search doctor
```

注册表还提供以下显式发现辅助命令：

```bash
# Inspect which providers are registered without making a network request
oma search providers --json

# Use the selected web provider with bounded output
oma search web "latest browser automation" --limit 10 --timeout 30s --pretty

# Fetch metadata and feeds directly
oma search meta https://example.com/article --pretty
oma search media https://example.com/video --subs --sub-lang en --pretty
oma search archive https://example.com/article --pretty

# Platform API and RSS routes
oma search api fetch https://example.com/article --pretty
oma search api search "RAG patterns" --platforms hackernews,reddit --pretty
oma search rss fetch https://example.com/feed.xml --pretty
oma search rss google "browser automation"
```

即使不加 `--json`，`search` 也会输出 JSON。`--pretty` 只改变呈现方式，不改变结果架构。`search web` 接受 `--provider`、`--limit`、`--timeout`、`--json` 和 `--pretty`。如果某个策略被阻止或缺少依赖，请对照上面的退出码表，并在更换策略前重新运行 `oma search doctor`。

### image（图像）

多供应商 AI 图像生成，根据身份验证状态并行调度。别名为 `oma img`。

```
oma image <subcommand> ...
oma img <subcommand> ...
```

**子命令**：

|子命令|用途|
|:-----------|:--------|
| `generate <prompt...>` | 通过 `pollinations`（flux/zimage，免费）、`codex`（通过 ChatGPT OAuth 使用 gpt-image-2）或 `antigravity`（通过 Gemini Code Assist 订阅使用 nano-banana，无需密钥）生成图像 |
| `doctor` | 检查每个供应商的身份验证和安装状态 |
| `vendor list` | 列出已注册的供应商和支持的模型 |

**`image generate` 选项**：

|标志|说明|默认|
|:-----|:-----------|:--------|
| `--vendor <name>` | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all` | `auto` |
| `--size <size>` | 任意 `WxH`，边长须能被 16 整除且介于 16 到 3840 之间，宽高比介于 1:3 到 3:1 之间；也接受 `auto`。 | 供应商默认 |
| `--quality <level>` | `low` \| `medium` \| `high` \| `auto` |供应商默认|
| `-n, --count <n>` | 图像数量（1..5） | `1` |
| `--output-dir <path>` |输出目录| `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | 允许输出路径位于 `$PWD` 之外 | `false` |
| `--model <name>` | 供应商专用的模型覆盖；`antigravity` 会忽略此选项，因为它的模型不对外公开。 | 供应商默认 |
| `--timeout <duration>` | 每张图像的超时时间 | 供应商默认 |
| `-r, --reference <path>` | 参考图像；可重复指定，也可用逗号分隔。`codex` 和 `antigravity` 支持，`pollinations` 会拒绝。每张须为不超过 5MB 的 PNG/JPEG/GIF/WebP（按魔数字节校验），最多 10 张。 | |
| `-y, --yes` |跳过成本确认| `false` |
| `--no-prompt-in-manifest` | 存储提示词的 SHA256，而不是原始文本 | `false` |
| `--dry-run` | 打印计划和成本估算，不实际执行 | `false` |
| `--output <format>` | CLI 输出格式：`text` \| `json` | `text` |

每次运行都会在生成的图像旁写入 `manifest.json`，记录供应商、模型、提示词（或其哈希）、尺寸、质量和成本。

**示例**：

```bash
# Free, no-config generation
oma image generate "minimalist sunrise over mountains"

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# All vendors in parallel for comparison
oma image generate "cat astronaut" --vendor all

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Use a reference image to guide style / subject (codex or antigravity)
oma image generate "same otter in dramatic lighting" --vendor codex -r ~/Downloads/otter.jpeg

# Multiple references (repeatable or comma-separated)
oma image generate "blend these styles" --vendor antigravity -r a.png -r b.png
oma image generate "blend these styles" --vendor antigravity -r a.png,b.png

# Per-vendor doctor check
oma image doctor --output json
```

### video（视频）

规划、编写并渲染短视频、讲解视频和演示视频。`generate` 会创建简述、脚本、渲染规格和运行清单；要渲染出真实的 MP4，还需要组合和可用的合成器。

```
oma video generate "three ways to reduce build times" --mode shorts --dry-run --output json
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --output json
oma video doctor --output json
oma video provider list --output json
oma video compose <runDir> --output json
oma video render <runDir> --output json
```

`generate` 接受 `--mode shorts|explainer|demo`、`--aspect`、`--locale`、`--captions`、`--visual`、`--voice`、`--music`、`--duration`、`--compositor hyperframes|mpt`、`--capture`、`--source file|web`、`--url`、`--device`、`--ready-selector`、`--show-cursor`、`--polish`、`--capture-timeout` 和 `--capture-stop duration:<seconds>|selector:<css>`。浏览器采集使用 `--source web --url <url>`；默认为 `--source file`。`--output-dir` 选择运行根目录，`--allow-external-output` 允许使用 `$PWD` 之外的路径，`--max-usd` 设置成本上限，`-y, --yes` 跳过成本确认，`--seed` 稳定规划输入，`--timeout` 限制每次视觉和音乐提供方调用的时长，`--script` 注入由智能体编写的 `script.json`，`--no-brief-in-manifest` 只存储简述的哈希，而不存储原文。`--dry-run` 在规划完成后停止。`--output text|json` 控制 CLI 输出信封。

`doctor` 检查缓存的 HyperFrames/MPT 工具链，接受 `--install`、`--upgrade`、`--install-mpt` 和 `--install-strudel`。`provider list` 报告提供方的可用性和密钥状态。`compose` 为运行搭建或刷新组合，并报告编写契约；`render` 对输出执行 lint、渲染和探测。缺少合成器、组合或工具链依赖都会报错。仅供测试使用的 `OMA_VIDEO_MOCK=1` 路径是唯一的占位模式；正常运行绝不会用文本或极小的文件冒充 MP4。

成功时的 JSON 输出包含 `runDir`、`manifestPath`、`scriptPath` 和 `renderSpecPath`；清单记录所选的提供方、输入和生成的素材。运行 `compose` 后，按照生成的 `AUTHORING.md` 编写组合，然后重新运行 `render`。如果缺少提供方密钥，运行 `oma video doctor`；如果采集失败，检查 URL、选择器、设备和超时设置；如果渲染失败，先修复组合诊断中报告的问题再重试。

### star（Star）

在 GitHub 上为 oh-my-agent 加星。

```
oma star
```

没有选项。需要已安装 `gh` CLI 并完成身份验证。会为 `first-fluke/oh-my-agent` 仓库加星。

**示例**：
```bash
oma star
```

### describe（描述）

以 JSON 形式描述 CLI 命令，用于运行时内省。

```
oma describe [command-path]
```

**参数**：

|参数|必填|说明|
|:---------|:---------|:-----------|
| `command-path` | 否 | 要描述的命令。省略时描述根程序。 |

**功能**：输出一个 JSON 对象，包含命令的名称、说明、参数、选项和子命令。AI 智能体用它了解可用的 CLI 功能。

**示例**：
```bash
# Describe all commands
oma describe

# Describe a specific command
oma describe "agent spawn"

# Describe a subcommand
oma describe "agent:parallel"
```

---

## 研究与产物命令

当输出是研究产物、演示文稿或报告时，这些命令族很有用。这里有意写得很简短；链接的指南会说明工作流和恢复方式。

### intel suggest（智能建议）

根据市场和仓库信号建议产品工作：

```
oma intel suggest --topic "developer onboarding" --target ./my-product --dry-run
oma intel suggest --config .agents/intel.yaml --json
```

`--config` 提供完整配置。一次性运行时，用 `--topic`、`--target`、`--repos`、`--since` 和 `--last-commits` 选择输入。`--output-dir` 控制本地报告的位置，`--fixture` 提供本地 JSON fixture，用于确定性审查。`--create-issue` 会把已接受的候选提交为 GitHub issue，需要已配置的目标并经过确认；搭配 `--base-repo <owner/name>` 选择仓库，只有在已获批准的自动化环境中才搭配 `--yes`。`--dry-run` 和 `--json` 是安全的检查方式。

### market（市场研究）

market 命令族会把工作交给解析出的上游 `last30days` 引擎。先运行关卡和解析器：

```
TOPIC="browser automation pain points"
oma market detect-trap "$TOPIC"
oma market resolve --output json
oma market run "$TOPIC" --days 30 --emit=compact
```

遇到关键词陷阱或过于宽泛的主题时，`market detect-trap` 会以退出码 2 退出，并给出重新表述的建议；只有当用户明确希望继续时，才用 `--force` 绕过这道关卡。`market resolve` 接受 `--refresh` 和 `--offline`，`market update` 会刷新受管引擎的缓存。`market run` 会把剩余参数传给解析出的 Python 引擎；提供了主题时，还会根据 `market.save_dir` 添加 `--save-dir`。选择上游标志前，请先阅读[市场研究](../guide/market-research.md)；其 `--help` 输出来自受管引擎，会随发布版本变化。

### docs（文档）

使用 docs 命令族检查文档漂移。这些命令以生成报告为主；`sync` 会为宿主智能体列出候选文档，本身不会编辑文件。

```
oma docs verify --json
oma docs verify --no-urls --report-file .agents/results/docs-drift.md
oma docs sync HEAD~3..HEAD --json
oma docs i18n --json --min-severity HIGH
oma docs lint --json --locales ko,ja
```

`verify` 检查本地引用并重新生成 `docs/generated/doc-refs.json`；`--urls-sync` 会等待可选的 `lychee` URL 检查完成。`sync` 默认使用暂存区的变更，没有暂存变更时改用 `HEAD~1..HEAD`，并输出 `{doc, changedFiles, matchedRefs}` 形式的候选。`i18n` 报告英文原文与译文之间的结构漂移，`lint` 报告译文的风格问题。这些子命令都不会自动编辑文档。

### slide（幻灯片）

`oma slide` 处理由 1920×1080 HTML 幻灯片片段组成的工作目录。最小可行流程如下：

```
oma slide create --output-dir .agents/results/slides/demo
# author slide-01.html and meta.json in that directory
oma slide validate --workspace .agents/results/slides/demo --output json
oma slide preview --workspace .agents/results/slides/demo
oma slide bundle --workspace .agents/results/slides/demo
```

质量关卡会报告溢出、重叠和字号方面的问题。用 `--slide <file>` 检查单张幻灯片，用 `--report-file <path>` 搭配 JSON 输出。通过校验后再导出：

```
oma slide export pdf --workspace <dir> --output-file <file> --mode capture
oma slide export png --workspace <dir> --output-dir <dir> --resolution 1080p
oma slide export pptx --workspace <dir> --output-file <file>
```

PPTX 导出仍处于实验阶段，基于栅格图像实现。`slide import pptx <file>`、`slide asset fetch-video <url>` 和 `slide style list|preview|get <slug>` 用于处理输入素材和发现样式。编写方面的决策和固定舞台的约束，参见 [oma-slide](../guide/content-and-research.md#slides-and-presentations)。

### scholar（学术检索）

搜索论文和工作元数据，并在共享前验证 sidecar：

```
oma scholar search "vision language action" --limit 10
oma scholar resolve "Attention Is All You Need"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar lint paper.knows.yaml
```

`search` 可以用 `--year-min` 限制 OpenAlex 结果，用 `--always-fallback` 强制使用回退提供方。`get --section` 接受 `statements`、`evidence`、`relations`、`artifacts` 或 `citation`。`lint --lenient` 会把悬空的跨记录引用降级为警告；`--fail-on-warning` 让警告在 CI 中也算失败。CLI 先搜索 Knows，再回退到 OpenAlex 和 Semantic Scholar；它不会向上游提交 sidecar。

### explain（解释）

`/explain` 是编写工作流，CLI 负责校验已创建的产物：

```
oma explain validate .agents/results/explain/2026-09-09-change.html
oma explain validate --input-dir .agents/results/explain --output json --report-file .agents/results/explain/report.json
```

传入文件或 `--input-dir`，二者只能选其一。校验涵盖自包含 HTML 契约，并以机器可读的格式报告失败；它不评判讲解内容是否准确。参见[代码讲解器](../guide/code-explainer.md)。

### diagram（图表）

在工作流输出结构图之前，先解析引擎：

```
oma diagram resolve --output json
oma diagram resolve --engine mermaid --offline
oma diagram update
oma diagram archify validate architecture <stem>.archify.json --quality showcase --json
oma diagram archify deliver architecture <stem>.archify.json <stem>.archify.html --quality showcase --json
```

`diagram resolve` 接受 `--engine auto|archify|mermaid`、`--refresh` 和 `--offline`。`diagram update` 刷新受管的 archify 副本。`diagram archify` 把剩余参数转发给解析出的上游可执行文件，并传回其退出码。Mermaid 仍是 Markdown 中的事实来源；HTML 是派生产物。参见[图表引擎](../guide/diagram-engine.md)。

## 状态、模型与内存检查

以下命令族用于查看持久的工作流状态，以及模型和提供方诊断。对清理类操作，优先使用 `--dry-run`；结果要交给其他程序处理时，使用 `--json`。

### state（状态）

```
oma state list --json
oma state list --all-projects --project /path/to/project --search migration
oma state get <session-id> --json
oma state verify --workflow work --checkpoint complete --json
oma state archive --older-than 90d --dry-run --json
oma state purge --older-than 90d --dry-run --json
```

`state emit` 记录一条带有显式类别和会话元数据的 L1 事件。`state migrate` 把旧版会话迁移到所选配置档。`state repair` 修复格式错误的状态文件。`state decisions list` 和 `state inject-log list|get` 用于查看必需的决策和注入审计条目。`state activate`、`state archive` 和 `state purge` 是显式操作；旧的布尔操作标志会被拒绝。这些命令会改变本地状态，因此请先审查试运行结果，再执行归档或清除。

### model（模型）

```
oma model check --json
oma model check --owner openai --fail-on-drift
oma model probe openai/gpt-5 --timeout 30s --json
oma model propose --owner anthropic --json
```

`model check` 将注册表与供应商的实时列表比较，并可以探测新的候选模型。`model probe` 用对应供应商的 CLI 测试单个 slug。`model propose` 输出 `oma-config` 的 `models:` 补丁；只有在确实要修改配置时才使用 `--write`。即使注册表条目有效，供应商的可用性和配额也可能导致探测失败。

### agent evidence commands（智能体证据命令）

原生智能体运行使用有证据支持的流程：

```
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
oma agent context docs --difficulty Medium
oma agent begin docs docs "$SESSION_ID" --workspace .
# Use the runId and claimPath printed by begin.
oma agent verify "<run-id>" --required
oma agent finish "<run-id>" "<claim-path>"
```

`agent context` 加载按图选出的上下文；`begin` 启动一次运行，并打印生成的运行 ID 和声明文件路径；`verify` 接收这个运行 ID，执行固定的检查（`--required`），或用 `--affected` 缩小检查范围；`finish` 接收运行 ID 和声明文件路径。`agent resume --dry-run` 报告已就绪和可复用的任务，`agent resume --max-attempts <n>` 只重试计划允许的任务。计划和声明的结构参见[智能体结果与恢复](../guide/agent-results-and-resume.md)。这些命令服务于 OMA 执行契约；普通的用户工作可以改用 `agent spawn`、`agent parallel` 或 `agent review`。

### memory（内存）

```
oma memory status --json
oma memory keys --kind connection --dry-run --json
oma memory init --json
oma memory setup --endpoint http://127.0.0.1:8000 --dry-run --json
oma memory import --source claude --since 7d --dry-run --json
oma memory gc --scope project --keep 20 --dry-run --json
```

`memory keys` 配置 Honcho 连接或嵌入凭据；`--dry-run` 只预览写入位置，不读取也不写入密钥。`memory setup` 准备 AgentMemory 端点，并可选择用 `--install` 安装或用 `--start` 启动它。`memory daemon` 和 `memory service` 管理本地进程或操作系统服务集成。`memory maintain backup|prune|vacuum`、`memory retry drain`、`memory upgrade` 和 `memory gc` 属于维护操作；执行前请先检查它们的 JSON 或试运行输出。

## 技能管理

### skills audit（技能审计）

检查已安装技能是否存在描述重叠、黑洞式泛化和库规模导致的路由衰减。

```
oma skill audit [--json] [--output <format>]
```

**选项**：

|标志|说明|
|:-----|:-----------|
| `--json` | 以 JSON 格式输出，供 CI/CD 使用 |
| `--output <format>` | 输出格式（`text` 或 `json`） |

**检查内容**：
- **两两描述相似度**：计算每对已安装技能之间的 TF-IDF 余弦相似度。≥ 60% 时警告，≥ 75% 时失败。
- **黑洞检测**：如果某个技能与其他所有技能的平均相似度是正向离群值（≥ 均值 + 1.5 × 标准差），就会标记它，因为这说明其描述过于泛化，可能劫持路由。
- **库规模衰减**：安装的技能超过 60 个时发出警告（路由准确率会随库的增长按对数衰减）。
- **聚焦检查**：技能膨胀成大杂烩时发出警告，即参考文档超过 20 个（指 `SKILL.md` 以外的 `.md` 文件，不含 vendored 目录树），或 `SKILL.md` 正文超过 25,000 个字符。聚焦的技能比大杂烩式的技能包效果更好（SkillsBench，arXiv:2602.12670）；解决办法是拆分，而不是删除。

**退出码**：`0` 表示所有发现都在警告区间内或没有发现；`1` 表示至少有一对技能落在失败区间。

**示例**：
```bash
oma skill audit
oma skill audit --json | jq '.findings'
```

### skills lint（技能检查）

检测单个技能的编写异味，即单个 `SKILL.md` 内部的质量缺陷；`skills audit` 检查的则是技能*之间*的关系。依据 arXiv:2607.01456 的技能异味分类法（在实际使用中的 SKILL.md 文件里，超过 99% 至少带有一种异味）。

```
oma skill lint [--skill <id>] [--json] [--output <format>]
```

**选项**：

|标志|说明|
|:-----|:-----------|
| `--skill <id>` | 只检查单个技能 |
| `--json` | 以 JSON 格式输出，供 CI/CD 使用 |
| `--output <format>` | 输出格式（`text` 或 `json`） |

**通用异味**（适用于所有技能）：

| 异味 | 严重程度 | 含义 |
|:------|:---------|:--------|
| `missing-name` | fail | frontmatter 中的 `name` 缺失或为空 |
| `missing-description` | fail | frontmatter 中的 `description` 缺失或为空；路由依赖此字段 |
| `weak-description` | warn | description 少于 40 个字符，信息太少，不足以支撑路由 |
| `body-too-long` | warn | SKILL.md 正文超过 500 行；应将细节移到 `resources/`，通过渐进式披露加载 |
| `template-placeholder` | warn | 代码片段之外残留了 `{Placeholder}` 文本 |
| `broken-reference` | fail | 引用了不存在的 `resources/`、`config/`、`scripts/` 或 `assets/` 文件 |

**SSL-lite 异味**（当技能的声明名称或公开的目录/别名名称以 `oma-` 开头时，即使没有 `## Scheduling` 也必须进行 SSL-lite 校验；没有前缀的别名不能绕过声明为 `oma-` 的名称。普通的无前缀技能通过包含 `## Scheduling` 选择使用该格式）：

| 异味 | 严重程度 | 含义 |
|:------|:---------|:--------|
| `ssl-structure` | fail | 顶层章节偏离了 `Scheduling / Structural Flow / Logical Operations / References` |
| `canonical-path` | fail | `### Canonical command path` 或 `### Canonical workflow path` 并非恰好只有一个 |
| `missing-boundaries` | warn | 没有 `### When NOT to use`；缺少边界的技能会劫持路由 |
| `empty-failure-recovery` | warn | `### Failure and recovery` 缺失或为空（列表项或表格行均可）；应按 SkillLens 的做法写明失败机制 |

**退出码**：`0` 表示没有 fail 级别的异味；`1` 表示至少有一个 fail 级别的异味。

**示例**：
```bash
oma skill lint
oma skill lint --skill oma-scholar
oma skill lint --json | jq '.smells'
```

### skills eval（技能评估）

衡量每个技能的效用：加载某个技能后，保留集任务的结果是否真的变好？它是与 `skills audit`（衡量描述边界的重叠）相对应的*效用*评估。`audit` 问的是“两个技能是否重复？”，`eval` 问的是“这个技能有没有帮助？”

```
oma skill eval [--skill <id>] [--mock | --live] [--record] [--yes]
                [--task-dir <path>] [--max-tasks <n>] [--require-coverage]
                [--json] [--output <format>]
```

**选项**：

|标志|说明|
|:-----|:-----------|
| `--skill <id>` | 要评估的技能 ID（简单名称，不能包含路径分隔符）。默认为 `_all`。 |
| `--mock` | 重放 `_rollouts/` 中已记录的 rollout（默认；确定性，不调度 LLM）。可安全用于 CI。 |
| `--live` | 实时调度智能体：通过 `oma agent spawn --read-only` 为每个任务启动两个分支（基线和处理）。会打印成本预览，除非使用 `--yes`，否则请求确认。 |
| `--record` | 将捕获的实时 rollout（包括 judge 判定）写入 `_rollouts/`，供以后 `--mock` 重放。仅在搭配 `--live` 时有意义。 |
| `--yes` | 跳过成本预览的确认提示。仅在搭配 `--live` 时有意义。 |
| `--task-dir <path>` | 覆盖任务 fixture 目录（必须位于工作区根目录内）。默认：`.agents/eval/<skill>/`。 |
| `--max-tasks <n>` | 限制评估的任务数量（按确定性的排序顺序截取）。 |
| `--require-coverage` | 找到的任务少于 5 个时以非零状态退出（避免 CI 在没有覆盖时也悄悄显示通过）。 |
| `--json` | 以 JSON 格式输出，供 CI/CD 使用 |
| `--output <format>` | 输出格式（`text` 或 `json`） |

**工作原理**：

对 `.agents/eval/<skill>/` 中的每个任务 fixture：
1. **基线分支**：在不加载技能的情况下调度任务提示词。
2. **处理分支**：把 `SKILL.md` 加到提示词开头，然后调度。
3. 每个分支都由其检查器评分（默认为 judge；也可选择确定性的 assert 或 regex）。
4. `utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)`。

**决策**：

| 决策 | 条件 |
|:---------|:---------|
| `pass` | `utilityLift ≥ 5%` |
| `warn` | `0% < utilityLift < 5%` |
| `fail` | `utilityLift ≤ 0%`（退出码 1） |
| `insufficient` | 可评分任务少于 5 个（仅在使用 `--require-coverage` 时退出码为 1） |

**推荐模式**：用 `--live` 搭配 judge 检查器，衡量技能的实际效用。用 `--mock` 离线重放已记录的 judge 判定，或运行确定性的 `assert`/`regex` 契约检查。

**环境变量**：无论使用什么标志，`OMA_SKILLEVAL_MOCK=1` 都会强制使用 mock 模式。

**退出码**：`0` 表示 pass 或 warn；`1` 表示 fail，或在使用 `--require-coverage` 时覆盖不足（insufficient）。

**示例**：
```bash
# Dry-run on recorded rollouts (CI-safe)
oma skill eval --skill oma-scholar

# Live run with cost preview
oma skill eval --skill oma-scholar --live

# Live run, record results for future mock replay, skip prompt
oma skill eval --skill oma-scholar --live --record --yes

# JSON output for CI
oma skill eval --skill oma-scholar --json

# Fail CI when no tasks exist
oma skill eval --skill oma-scholar --require-coverage

# Limit to 10 tasks
oma skill eval --skill oma-scholar --max-tasks 10
```

`.agents/eval/` 的 fixture 格式和检查器类型参见[技能效用评估指南](../guide/skill-eval.md)。

---

### skills opt（技能优化）

以 WikiSkill 风格的持久演进方式优化技能的 `SKILL.md`。Maintainer 把可观察到的 rollout 证据整理成有范围的知识，Proposer 生成有边界的添加、删除和替换编辑，被拒绝的结果会跨运行保留。候选必须在保留集验证拆分上严格提升；`--apply` 还要求在运行器拥有的最终测试拆分上严格提升。研究依据：WikiSkill（arXiv:2608.27454）。

```
oma skill optimize [--skill <id>] [--dry-run | --apply] [--mock | --live]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes] [--json] [--output <format>]
```

**选项**：

|标志|默认|说明|
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | 要优化的技能 ID（简单名称，不能包含路径分隔符）。 |
| `--dry-run` | **是**（默认） | 提议编辑并打印 diff，不修改 `SKILL.md`；生成的演进证据仍会记录。 |
| `--apply` | 无 | 应用已接受的编辑；原子写入前先备份原文件，并且只写入经过验证的改进。 |
| `--mock` | **是**（默认） | 重放已记录的优化器编辑和评估判定（确定性、离线）。可安全用于 CI。 |
| `--live` | 无 | 实时调度 LLM 优化器，每个 epoch 都会产生真实的模型调用。会打印成本预览，除非使用 `--yes`，否则提示确认。 |
| `--max-epochs <n>` | `8` | 最大优化 epoch 数。 |
| `--edits-per-epoch <k>` | `4` | 每个 epoch 提议的候选编辑数。 |
| `--lr <chars>` | `600` | 文本学习率预算：每次编辑允许的最大净字符变化。 |
| `--yes` | 无 | 跳过成本预览确认（仅搭配 `--live`）。 |
| `--json` | 无 | 以 JSON 格式输出，供 CI/CD 使用。 |
| `--output <format>` | `text` | 输出格式（`text` 或 `json`）。 |

**硬性依赖**：`.agents/eval/<skill>/` 中至少需要 5 个任务 fixture。数量不足时会报错并给出明确信息。如何编写 fixture，参见[技能效用评估指南](../guide/skill-eval.md)。

**训练/验证/测试拆分**：fixture 按 60/20/20 确定性地拆分。Maintainer 和 Proposer 只能看到 TRAIN 证据，候选选择使用保留的 VALIDATION 任务，运行器拥有的 TEST 拆分在演进结束前保持隐藏。只有验证提升和最终测试提升都严格提高时，`--apply` 才会写入。

**SSOT 注意事项**：ID 以 `oma-` 开头的技能会被 `oma update` 覆盖。对这些技能，不建议使用 `--apply`，请使用默认的 `--dry-run`，并把提议的 diff 提交到上游。用户编写的技能可以放心应用。

**退出码**：`0` 表示优化完成；`1` 表示 fixture 不足或参数无效。

**示例**：
```bash
# Propose edits (dry-run, mock — does not change SKILL.md, fully offline)
oma skill optimize --skill oma-scholar --mock --dry-run

# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --mock --apply

# Live optimizer with cost preview
oma skill optimize --skill oma-scholar --live

# Live optimizer, skip confirmation, apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes

# JSON output for CI
oma skill optimize --skill oma-scholar --json

# Tune epochs and edits budget
oma skill optimize --skill oma-scholar --max-epochs 4 --edits-per-epoch 2 --lr 300
```

完整的端到端演练，以及 SSOT 和过拟合防护的细节，参见[技能优化指南](../guide/skill-opt.md)。

---

### harness eval（harness 评估）

在成对、隔离的仓库任务上，比较候选 `.agents/` 覆盖层与当前的 OMA harness。目标智能体和供应商路由保持不变；确定性检查会为每个分支产生的文件和输出评分。

```
oma harness eval --suite <path> --candidate <path> [--mock | --live]
                 [--record] [--record-file <path>] [--yes]
                 [--timeout-minutes <n>] [--require-coverage]
                 [--json] [--output <format>]
```

|标志|说明|
|:-----|:------------|
| `--suite <path>` | 必需的套件 YAML。套件和 fixture 工作区都必须位于项目根目录内。 |
| `--candidate <path>` | 必需的候选根目录，其中包含限定范围的 `.agents/` 覆盖层。 |
| `--mock` | 重放哈希匹配的已记录运行（默认；确定性、离线）。 |
| `--live` | 通过套件的目标智能体运行基线分支和候选分支。 |
| `--record` | 保存实时运行，供以后 mock 重放。需要搭配 `--live`。 |
| `--record-file <path>` | 覆盖记录路径；路径必须位于项目根目录内。 |
| `--yes` | 跳过实时运行的成本确认。 |
| `--timeout-minutes <n>` | 每个分支的超时时间，基线和候选相同。默认：`15`。 |
| `--require-coverage` | 可评分的成对任务少于五个时，以非零状态退出。 |
| `--json` | 以 JSON 格式输出完整的评估结果。 |
| `--output <format>` | 输出格式（`text` 或 `json`）。 |

**决策关卡**：通过需要至少 5 个成对任务、至少 5 个百分点的提升，并且没有任何回归。只要出现回归就判定失败。覆盖低于最低要求时为 `insufficient`，仅在使用 `--require-coverage` 时以非零状态退出。

**隔离**：在临时的候选分支中，候选文件只能替换 `.agents/agents`、`.agents/rules`、`.agents/skills` 和 `.agents/workflows` 中的内容。钩子、配置、状态、评估 fixture、符号链接、供应商变体、对受保护的智能体执行 frontmatter 的修改，以及 fixture 自带的供应商 harness 文件，都会被拒绝。分支如果在执行期间修改受保护的定义，就会判定失败。实时评估拒绝基于 HOME 的供应商发现。主智能体路由固定不变；目前尚未强制固定嵌套子智能体的模型。

```bash
# Generate a live measurement and recording
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --live --record

# Replay the same measurement in CI
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --mock --require-coverage --json
```

套件架构、支持的检查、隔离模型和当前限制，参见 [Harness 评估指南](../guide/harness-eval.md)。

### harness incident promote（晋升事故）

为失败智能体当时执行的技能，把已捕获的事故转成回归 fixture。

```
oma harness incident promote <id> [--skill <id>] [--draft] [--force] [--json]
```

### harness feedback（harness 反馈）

晋升每个尚未晋升的事故；加上 `--live` 或 `--apply` 时，还会针对扩大后的套件优化每个受影响的技能。

```
oma harness feedback [--scan-runs] [--live] [--apply] [--max-epochs <n>] [--incident <ids...>] [--json]
```

参见[事故回归用例指南](../guide/harness-incidents.md)。

---

### help（帮助）

显示帮助信息。

```
oma help
```

显示包含所有可用命令的完整帮助文本。

### version（版本）

显示版本号。

```
oma version
```

输出当前 CLI 版本后退出。

---

## 环境变量

| 变量 | 说明 | 使用方 |
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | 设为 `json`，让所有支持的命令强制输出 JSON | 所有带 `--json` 标志的命令 |
| `DASHBOARD_PORT` | Web 仪表盘的端口 | `dashboard web` |
| `MEMORIES_DIR` | 覆盖内存目录路径 | `dashboard`, `dashboard web` |
| `OMA_SKILLEVAL_MOCK` | 设为 `1` 时，无论使用什么标志，`oma skill eval` 都强制使用 mock 模式 | `skills eval` |
| `OMA_HOOK_DEDUP` | 设置为 `0` 可禁用 `oma hook run` 中的重复投递抑制。 | `hook` |
| `OMA_HOOK_DEDUP_DIR` | 覆盖用于抑制重复钩子投递的私有 claim 目录（默认：`$XDG_RUNTIME_DIR/oma-hook-dedup`，否则为 `<tmpdir>/oma-hook-dedup-<uid>`）。 | `hook` |

---

## 别名

|别名|完整命令|
|:------|:------------|
| `viz` | `visualize` |
