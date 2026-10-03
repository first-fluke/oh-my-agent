---
title: "CLI 选项"
description: "CLI 全部选项的详尽参考，涵盖全局标志、输出控制、按命令选项和实际使用模式。"
sidebar_label: CLI 选项
---

# CLI 选项

## 全局选项

以下选项可用于根命令 `oma` / `oh-my-agent`：

| 标志 | 说明 |
|:-----|:-----------|
| `-g, --global` | 作用于 HOME 安装（`~/.agents/`），而不是 `<cwd>/.agents/` |
| `-y, --yes` | 在所选命令支持确认时跳过提示；命令自身的安全检查仍然有效 |
| `-V, --version` | 输出版本号并退出 |
| `-h, --help` | 显示命令的帮助信息 |

所有子命令也都支持 `-h, --help`，用于显示各自的帮助文本。

`--global` 会为整个进程设置安装根目录，因此无论从哪个目录运行，`install`、`update`、`link` 和 `uninstall` 都会解析到 `~/.agents/`。`OMA_HOME=<abs-path>` 可以覆盖此设置，参见[全局安装](../guide/global-install.md)。

---

## 输出选项 {#output-options}

许多命令支持机器可读输出，供 CI/CD 流水线和自动化使用。请求 JSON 输出有三种方式，按优先级从高到低排列如下：

### 1. --json 标志

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

`--json` 标志只在声明支持它的具体命令路径上可用。不要根据命令族推断是否支持：例如，`image`、`video` 和 `slide` 的叶子命令在注册表列出时提供 `--output`，而 `search` 有自己的 JSON 流。本页末尾的注册表矩阵是按路径列出的权威清单。

### 2. --output 标志

```bash
oma stats get --output json
oma doctor --output text
```

`--output` 标志接受 `text` 或 `json`。它提供与 `--json` 相同的功能，还允许你显式请求文本输出（适用于环境变量已设为 json，但某个命令需要文本输出的情况）。

**验证**：如果提供的格式无效，CLI 会抛出：`Invalid output format: {value}. Expected one of text, json`。

### 3. OH_MY_AG_OUTPUT_FORMAT 环境变量

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

将此环境变量设为 `json` 后，所有支持 JSON 输出的命令都会强制输出 JSON。只识别 `json`；其他任何值都会被忽略，并默认输出文本。

**解析顺序**：`--json` 标志 > `--output` 标志 > `OH_MY_AG_OUTPUT_FORMAT` 环境变量 > `text`（默认）。

### 支持 JSON 输出的命令

| 命令 | `--json` | `--output` | 备注 |
|:--------|:---------|:----------|:------|
| `doctor` | 是 | 是 | 包含 CLI 检查、MCP 状态和技能状态 |
| `stats` | 是 | 是 | 完整的指标对象 |
| `retro` | 是 | 是 | 包含指标、作者和提交类型的快照 |
| `cleanup` | 是 | 是 | 已清理项的列表 |
| `auth status` | 是 | 是 | 每个 CLI 的身份验证状态 |
| `memory init` | 是 | 是 | 初始化结果 |
| `verify agent` / `verify triggers` | 是 | 是 | 每项检查的验证结果 |
| `visualize` | 是 | 是 | JSON 格式的依赖图 |
| `describe` | 始终为 JSON | 不适用 | 始终输出 JSON（内省命令） |
| `recap` | 是 | 是 | 按工具/会话划分的对话历史 |
| `image generate` / `image doctor` / `image vendor list` | 不适用 | 是 | 使用 `--output json`；`vendor list` 是规范的发现路径 |
| `video generate` / `video doctor` / `video compose` / `video render` / `video provider list` | 不适用 | 是 | 使用 `--output json` 获取运行信封或就绪报告 |
| `explain validate` | 是 | 是 | 产物校验报告 |
| `diagram resolve` / `diagram update` | 是 | 是 | 引擎解析结果或托管缓存结果 |
| `market resolve` / `market update` | 是 | 是 | 托管研究引擎的状态 |
| `docs verify` / `docs sync` / `docs i18n` / `docs lint` | 是 | 不适用 | 每个 docs 路径使用各自的报告选项 |
| `search ...` | 始终为 JSON | 不适用 | 所有 `search` 子命令都以流式输出 JSON；需要便于人工阅读时使用 `--pretty` |

---

## 按命令配置的选项

### install（安装）

```
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

交互式安装器会将所选的提供方设置写入 `.agents/oma-config.yaml`。提供方标志用于选择网页搜索、代码智能和语义内存集成；选中 Honcho 提供方时，`--honcho-url` 和 `--honcho-workspace` 用于配置 Honcho 内存服务。安装流程请求确认时，根级 `-y, --yes` 标志生效。

### doctor（诊断）

```
oma doctor [--json] [--output <format>] [--profile]
```

| 标志 | 说明 | 默认值 |
|:-----|:-----------|:--------|
| `--json` | 输出 JSON，而不是格式化文本。 | `false` |
| `--output <format>` | 显式指定输出格式（`text` 或 `json`）。参见[输出选项](#output-options)。 | `text` |
| `--profile` | 显示配置档健康矩阵（每个智能体根据当前 `model_preset` 和 `agents:` 覆盖项解析出的模型 slug、CLI 和身份验证状态）。参见[按智能体配置模型](../guide/per-agent-models.md)。 | `false` |

### update（更新）

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

| 标志 | 短标志 | 说明 | 默认值 |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | 更新时覆盖用户自定义的配置文件。影响范围：`oma-config.yaml`、`mcp.json` 和 `stack/` 目录。不使用此标志时，这些文件会在更新前备份，并在更新后恢复。 | `false` |
| `--with-new-skills` | | 安装自当前安装以来新加入注册表的技能。 | `false` |
| `--ci` | | 以非交互式 CI 模式运行。跳过所有确认提示，使用纯文本控制台输出，不显示加载指示器和动画。在 stdin 不可用的 CI/CD 流水线中必须使用。 | `false` |
| `--yes` | `-y` | 跳过提示。除非同时使用 `--all` 或 `--vendor`，否则不会创建缺失的供应商目录。 | `false` |
| `--all` | | 创建或更新所有受支持的项目级供应商。 | `false` |
| `--vendor <vendors>` | | 创建或更新以逗号分隔列出的供应商，例如 `claude,qwen`。 | 仅限已有的供应商目录 |

`oma update mcp` 在选择浏览器 MCP 服务器时使用相同的 `--yes`、`--ci`、`--all` 和 `--vendor` 控制项，但不使用 `--force` 或 `--with-new-skills`。

**使用 --force 时的行为：**
- `oma-config.yaml` 会替换为注册表中的默认版本。
- `mcp.json` 会替换为注册表中的默认版本。
- 后端 `stack/` 目录（各语言专用资源）会被替换。
- 无论是否使用此标志，其他所有文件都会更新。

**使用 --ci 时的行为：**
- 启动时不调用 `console.clear()`。
- 用普通的 `console.log` 代替 `@clack/prompts`。
- 跳过竞品检测提示。
- 出错时抛出异常，而不是调用 `process.exit(1)`。

**供应商范围：**
- `oma update` 只更新已存在的供应商目录。
- `oma update --yes` 使用相同的供应商范围，但不显示提示。
- `oma update --all` 创建或更新所有受支持的项目级供应商。
- `oma update --vendor claude,qwen` 只创建或更新列出的供应商。

### stats（统计）

```
oma stats get [--json] [--output <format>]
oma stats reset
```

| 标志 | 说明 | 默认值 |
|:-----|:-----------|:--------|
| `--json` | 以 JSON 输出重置结果。 | `false` |
| `--output <format>` | 输出 `text` 或 `json`。 | `text` |

`oma stats reset` 是重置命令。旧写法 `oma stats get --reset` 已不属于当前公开的命令接口。

### retro（复盘）

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| 标志 | 说明 | 默认值 |
|:-----|:-----------|:--------|
| `--interactive` | 交互模式，可手动录入数据。会提示补充无法从 git 收集的上下文（例如心情、重要事件）。 | `false` |
| `--compare` | 将当前时间窗口与前一个等长窗口对比。显示变化量指标（例如提交 +12、新增行数 -340）。 | `false` |

**窗口参数格式：**
- `7d`：7 天
- `2w`：2 周
- `1m`：1 个月
- 省略时使用默认值（7 天）

### cleanup（清理）

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| 标志 | 短标志 | 说明 | 默认值 |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | 预览模式。列出所有将被清理的项，但不做任何更改。无论发现什么，退出码都是 0。 | `false` |
| `--yes` | `-y` | 跳过所有确认提示，不经询问直接清理全部内容。适用于脚本和 CI。 | `false` |

**清理内容：**
1. 孤立的 PID 文件：所引用的进程已不再运行的 `/tmp/subagent-*.pid`。
2. 孤立的日志文件：与已终止 PID 对应的 `/tmp/subagent-*.log`。
3. Gemini Antigravity 目录：`.gemini/antigravity/brain/`、`.gemini/antigravity/implicit/`、`.gemini/antigravity/knowledge/`。这些目录会随时间累积状态，可能变得很大。

### agent spawn（启动智能体）

```
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| 标志 | 短标志 | 说明 | 默认值 |
|:-----|:------|:-----------|:--------|
| `--resumed-from` | 无 | 将重试关联到前一次运行的 ID。 | |
| `--fallback-vendors` | 无 | 显式指定的回退供应商链，按顺序排列并以逗号分隔。 | |
| `--task-id` | 无 | 会话计划中的任务 ID。 | 智能体 ID |
| `--vendor` | 无 | 覆盖 CLI 供应商。运行时接受 `antigravity`、`claude`、`codex`、`cursor`、`opencode`、`qwen`、`grok` 或 `pi`。 | 从配置解析 |
| `--workspace` | `-w` | 智能体的工作目录。省略或设为 `.` 时，CLI 会根据 monorepo 配置文件（pnpm-workspace.yaml、package.json、lerna.json、nx.json、turbo.json、mise.toml）自动检测工作区。 | 自动检测或 `.` |
| `--isolation` | 无 | 隔离模式：`worktree` 会为每次启动创建一个 Git 工作树；默认值为 `none`。 | `none` |
| `--read-only` | 无 | 将启动的智能体限制为只能使用非破坏性工具，并且不附加自动批准标志。 | `false` |

**验证：**
- `agent-id` 必须是以下之一：`backend`、`frontend`、`mobile`、`qa`、`debug`、`pm`。
- `session-id` 不得包含 `..`、`?`、`#`、`%` 或控制字符。
- `vendor` 必须是以下之一：`antigravity`、`claude`、`codex`、`cursor`、`opencode`、`qwen`、`grok`、`pi`。

**供应商特定行为：**

| 供应商 | 命令 | 自动批准标志 | 提示词标志 |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| claude | `claude` | （无） | `-p` |
| codex | `codex` | `--sandbox workspace-write` | （无；提示词为位置参数） |
| cursor | `cursor-agent` | 因供应商而异 | `-p` |
| opencode | `opencode` | 因供应商而异 | `-p` |
| qwen | `qwen` | `--yolo` | `-p` |
| grok | `grok` | 因供应商而异 | `-p` |
| pi | `pi` | `--read-only` 模式下不附加 | 提示词为位置参数 |

这些默认值可以在 `.agents/skills/oma-orchestration/config/cli-config.yaml` 中覆盖。

Codex 保持其 workspace-write 沙箱。oma 会启用网络访问，并把项目根目录、OMA 状态主目录（`~/.oma`）和已有的包管理器缓存添加为可写目录。`oma update` 会替换 `cli-config.yaml`，因此请用 `OMA_CODEX_SANDBOX` 设置持久的模式：`read-only`、`workspace-write`（默认）或 `danger-full-access`（无沙箱、无审批）。

### agent status（智能体状态）

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

| 标志 | 短标志 | 说明 | 默认值 |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | 用于定位内存文件（`.agents/state/memories/result-{agent}.md`）和 PID 文件的根路径。 | 当前工作目录 |

**状态判定逻辑：**
1. 如果 `.agents/state/memories/result-{agent}.md` 存在：读取 `## Status:` 标题。没有此标题时报告 `completed`。
2. 如果 `/tmp/subagent-{session-id}-{agent}.pid` 处存在 PID 文件：检查此 PID 是否存活。存活时报告 `running`，已终止时报告 `crashed`。
3. 如果两个文件都不存在：报告 `crashed`。

### agent parallel（并行智能体）

```
oma agent parallel [tasks...] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

| 标志 | 短标志 | 说明 | 默认值 |
|:-----|:------|:-----------|:--------|
| `--vendor` | 无 | 覆盖所有启动的智能体使用的 CLI 供应商。 | 按智能体从配置解析 |
| `--inline` | `-i` | 将任务参数解释为 `agent:task[:workspace]` 字符串，而不是文件路径。 | `false` |
| `--no-wait` | | 后台模式。启动所有智能体后立即返回，不等待其完成。PID 列表和日志保存到 `.agents/results/parallel-{timestamp}/`。 | `false`（等待完成） |

**内联任务格式**：`agent:task` 或 `agent:task:workspace`
- 如果最后一个以冒号分隔的片段以 `./` 或 `/` 开头，或者等于 `.`，就将其识别为工作区。
- 示例：`backend:Implement auth API:./api` 表示 agent=backend、task="Implement auth API"、workspace=./api。
- 示例：`frontend:Build login page` 表示 agent=frontend、task="Build login page"、workspace 自动检测。

**YAML 任务文件格式：**
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional
- agent: frontend
task: "Build user dashboard"
```

### recap（回顾）

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| 标志 | 说明 | 默认值 |
|:-----|:-----------|:--------|
| `--window <period>` | 时间窗口：`1d`、`3d`、`7d`、`2w`、`30d`。设置了 `--date` 时忽略。 | `1d` |
| `--date <date>` | 指定日期（`YYYY-MM-DD`），优先于 `--window`。 | |
| `--tool <tools>` | 按工具筛选会话，多个值以逗号分隔：`grok`、`claude`、`codex`、`qwen`、`cursor`、`antigravity`。 | 所有工具 |
| `--top <n>` | 摘要中只显示前 N 个项目/主题。 | 不限 |
| `--sort <metric>` | 按 `count` 或 `duration` 对会话排序。 | `count` |
| `--mermaid` | 输出 Mermaid 甘特图，而不是默认摘要。 | `false` |
| `--graph` | 在浏览器中打开交互式图表。与 `--mermaid` 互斥。 | `false` |

> **注意**：根据已安装的技能生成供应商规则文件（例如 `.cursor/rules`）由 [`oma link <vendor>`](./commands.md#link) 负责，没有单独的 `export` 命令。

### search（搜索）

```
oma search <subcommand> [...]
```

`search` 命令组自带 JSON 输出（没有 `--json` / `--output` 标志）。在 URL/查询类子命令上可以用 `--pretty` 美化输出结果，其他行为由下列子命令专属选项控制：

| 子命令 | 主要选项 |
|:-----------|:---------------|
| `fetch <url>` | `--only`、`--skip`、`--include-archive`、`--timeout`、`--locale`、`--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`、`--locale`、`--pretty` |
| `api:search <query>` | `--platforms <list>`、`--timeout`、`--locale`、`--pretty` |
| `rss:google <query>` | `--locale`（默认 `en-US`） |
| `media <url>` | `--subs`、`--sub-lang <list>`（默认 `en`）、`--format <spec>`、`--timeout`（默认 `30`）、`--pretty` |
| `code <query>` | `--host <github\|gitlab>`（默认 `github`）、`--language`、`--repo`、`--limit`（默认 `20`）、`--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | 无（检查 Chrome / `python3 curl_cffi` / `yt-dlp` / `gh` 二进制是否可用） |

**退出码**：`0` 正常，`1` 错误，`2` 被拦截，`3` 未找到，`4` 输入无效，`5` 需要身份验证，`6` 超时。可在脚本中据此区分暂时性拦截和无效输入。

### image（图像）

```
oma image <subcommand> [...]
```

输出格式由各子命令的 `--output <text|json>` 控制。

`image generate` 接受以下选项：

| 标志 | 短标志 | 说明 | 默认值 |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`。`auto` 根据当前的 `image:` 配置和可用的身份验证解析供应商。 | `auto` |
| `--size <size>` | | `WxH`，两边都须能被 16 整除，取值 16 到 3840，宽高比在 1:3 到 3:1 之间；也可以是 `auto`。 | 供应商默认值 |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`。 | 供应商默认值 |
| `--count <n>` | `-n` | 图像数量，1 到 5。 | `1` |
| `--output-dir <dir>` | | 输出目录。除非设置了 `--allow-external-output`，否则必须位于 `$PWD` 内。 | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | | 允许 `--output-dir` 路径位于 `$PWD` 之外。 | `false` |
| `--model <name>` | | 覆盖供应商专属的模型。antigravity 的模型由 `agy` 选择。 | 供应商默认值 |
| `--timeout <duration>` | | 每张图像的超时时间，取值为时长。 | 供应商默认值 |
| `--reference <path>` | `-r` | 用于迁移风格或主体的参考图像。可重复使用（`-r a.png -r b.png`），也可以用逗号分隔。会校验大小（≤5MB）、格式（通过魔数识别 PNG/JPEG/GIF/WebP）和数量（≤10）。`codex` 和 `antigravity` 支持此选项；`pollinations` 会以退出码 4 拒绝。 | |
| `--yes` | `-y` | 跳过成本确认提示。 | `false` |
| `--no-prompt-in-manifest` | | 在 `manifest.json` 中存储提示词的 SHA256，而不是原文。 | `false` |
| `--dry-run` | | 打印计划和成本估算，但不实际执行。 | `false` |
| `--output <format>` | | `text` \| `json`。 | `text` |

`image doctor` 和 `image vendor list` 接受 `--output <text|json>`。`image list-vendors` 仍保留为帮助别名；`vendor list` 是规范的发现路径。

### video（视频）

```
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate` 接受以下规划和采集控制选项：`--mode`、`--aspect`、`--locale`、`--captions`、`--visual`、`--voice`、`--music`、`--duration`、`--compositor`、`--capture`、`--source`、`--url`、`--device`、`--ready-selector`、`--show-cursor`、`--polish`、`--capture-timeout` 和 `--capture-stop`。它还接受 `--output-dir`、`--allow-external-output`、`--max-usd`、`--seed`、`--timeout`、`--script`、`--dry-run`、`--yes`、`--output` 和 `--no-brief-in-manifest`。浏览器采集使用 `--source web --url <url>`；默认来源为 `file`。正常渲染需要已编写的组合和可用的合成器；占位内容仅限 `OMA_VIDEO_MOCK=1` 测试路径使用。

`video doctor` 报告或配置 HyperFrames/MPT/Strudel 工具链。`compose` 准备本次运行的组合契约，`render` 负责 lint、渲染和输出探测。`provider list` 报告提供方和密钥状态。运行清单和恢复步骤请参阅[视频生成](../guide/video-generation.md)。

### memory init（初始化内存）

```
oma memory init [--json] [--output <format>] [--force]
```

| 标志 | 说明 | 默认值 |
|:-----|:-----------|:--------|
| `--force` | 覆盖 `.agents/state/memories/` 中为空或已存在的 schema 文件。不使用此标志时，不会改动已有文件。 | `false` |

### verify（验证）

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| 标志 | 短标志 | 说明 | 默认值 |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | 要验证的工作区目录路径。 | 当前工作目录 |

**智能体类型**：`backend`、`frontend`、`mobile`、`qa`、`debug`、`pm`。

`verify triggers` 根据带标签的语料库衡量关键词检测器的准确率。百分比阈值起关卡作用；CI 作业需要逐条检查发现项时，请使用 JSON 输出。旧写法 `oma verify <agent-type>` 只是兼容性帮助形式，`verify agent` 才是已注册的路径。

---

## 实际示例

### CI 流水线：更新并验证

```bash
# Update in CI mode, then run doctor to verify installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### 自动收集指标

```bash
# Collect metrics as JSON and pipe to a monitoring system
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### 批量运行智能体并监控状态

```bash
# Start agents in background
oma agent parallel tasks.yaml --no-wait

# Check status periodically
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
```

### 测试后在 CI 中清理

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### 工作区感知验证

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### 冲刺评审中的对比复盘

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare

# Save as JSON for sprint report
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### 完整健康状态检查脚本

```bash
#!/bin/bash
set -e

echo "=== oh-my-agent Health Check ==="

# Check CLI installations
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'

# Check auth status
oma auth status --json | jq -r '.[] | "\(.name): \(.status)"'

# Check metrics
oma stats get --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'

echo "=== Done ==="
```

### 通过 describe 实现智能体内省

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```
## 完整公共选项注册表

下面的矩阵由已签入的公共命令注册表生成。它是本页的覆盖索引：带 `—` 的行没有命令专属选项，共享的根标志和帮助别名已在上文说明。值语法发生变化时，运行 `oma describe "<path>"` 查看运行时帮助。

| 命令路径 | 公共选项 | 用途 |
|---|---|---|
| `install` | `--web-search <provider>, --code-intelligence <provider>, --semantic-memory <provider>, --honcho-url <url>, --honcho-workspace <id>` | 安装 oh-my-agent 技能和配置 |
| `describe` | `—` | 以 JSON 形式描述 CLI 命令，用于运行时内省 |
| `uninstall` | `--dry-run, -y, --yes` | 移除 oh-my-agent 自有的文件（保留 oma-config.yaml、mcp.json 和用户编写的技能） |
| `update` | `-f, --force, --with-new-skills, --ci, -y, --yes, --all, --vendor <vendors>` | 从注册表将技能更新到最新版本 |
| `update mcp` | `-y, --yes, --ci, --all, --vendor <vendors>` | 选择浏览器 MCP 服务器（Aside、Chrome DevTools、Firefox DevTools） |
| `link` | `--dry-run` | 从 .agents/ SSOT 重新生成供应商文件（.claude/、.cursor/ 等） |
| `intel` | `—` | 产品情报流水线：调研、差距分析、PRD、issue 提案 |
| `intel suggest` | `--config <path>, --topic <topic>, --target <target>, --repos <repos>, --since <window>, --last-commits <n>, --output-dir <path>, --dry-run, --fixture <path>, --create-issue, --base-repo <owner/name>, --yes, --json, --output <format>` | 根据市场/代码情报建议高价值的产品工作 |
| `market` | `—` | 基于社区信号的市场研究，由始终保持最新的 last30days 引擎驱动 |
| `market detect-trap` | `--force` | 拒绝关键词陷阱查询的预检 |
| `market resolve` | `--refresh, --offline, --json, --output <format>` | 报告 oma 将运行的 last30days 引擎（托管的最新版、固定版本或本地副本）及其使用的 Python |
| `market update` | `--json, --output <format>` | 将最新的 last30days 发布版下载到 oma 的托管缓存（~/.cache/oma-market/last30days） |
| `market run` | `—` | 使用给定参数运行 last30days 引擎（scripts/last30days.py）；--save-dir 默认为 market.save_dir |
| `doctor` | `--profile, --heal-check <agentType>, --json, --output <format>` | 检查 CLI 安装、MCP 配置和技能状态 |
| `profile` | `—` | 管理本地 OMA 执行配置档 |
| `profile list` | `--json, --output <format>` | 列出本地配置档 |
| `profile show` | `--json, --output <format>` | 显示本地配置档 |
| `profile create` | `--json, --output <format>` | 创建本地配置档 |
| `profile use` | `--shell <shell>, --json, --output <format>` | 打印用于激活已有配置档的 shell 代码 |
| `profile run` | `—` | 为子进程设置 OMA_PROFILE 后运行一条命令 |
| `retro` | `--interactive, --compare, --json, --output <format>` | 附带指标与趋势的工程复盘 |
| `recap` | `--window <period>, --date <date>, --tool <tools>, --top <n>, --sort <metric>, --mermaid, --graph, --json, --output <format>` | 回顾 AI 工具的对话历史 |
| `docs` | `—` | 文档漂移检测：验证引用，并为受 diff 影响的文档提出更新 |
| `docs verify` | `--json, --report-file <path>, --no-urls, --urls-sync` | 从文档中提取 L2 引用并报告失效的目标。副作用是重新生成 docs/generated/doc-refs.json。退出码：0 = 无问题，1 = 发现失效引用。URL 链接检查交由 `lychee` 完成（安装：brew install lychee）。 |
| `docs sync` | `--json` | 根据 git diff 列出引用了已变更文件的文档。宿主 LLM（技能运行时）应读取此列表和 diff，并按照 SKILL.md 契约提出补丁；CLI 从不自动编辑文档。默认 diff 范围：--cached（已暂存的更改），回退为 HEAD~1..HEAD。 |
| `docs i18n` | `--json, --min-severity <level>` | 检测英文源文档（web/docs）与 i18n 译文（web/i18n/{lang}/...）之间的漂移。为每一对文档输出结构信号（行数、标题数、最后提交时间戳），供宿主 LLM 判断哪些译文需要 diff 同步补丁。CLI 从不编辑译文。 |
| `docs lint` | `--json, --locales <list>` | 检查译文文档中内容层面的反模式（例如 CJK 译文中的破折号）。它按照 oma-translation SKILL.md § Stage 4 检查风格和反模式，与 `oma docs i18n`（结构漂移）互为补充。CLI 从不自动修复，只报告问题，交由宿主 LLM 重新组织。 |
| `emit` | `--target <target>, --output-dir <path>, --json, --output <format>` | 从 .agents/ SSOT 生成符合标准的产物（Agent Skills 规范、Agent Plugins 包、Claude Code 插件市场、AGENTS.md、cli/ 范围的供应商文档） |
| `cleanup` | `--dry-run, -y, --yes, --json, --output <format>` | 清理孤立的子智能体进程和临时文件 |
| `bridge` | `--context <name>` | 将 MCP stdio 代理到按项目共享的 Serena 服务器（按需启动） |
| `verify` | `—` | 验证子智能体输出（backend/frontend/mobile/qa/debug/pm），或衡量关键词检测器的触发准确率 |
| `verify agent` | `-w, --workspace <path>, --json, --output <format>` |  |
| `verify triggers` | `--corpus <path>, --max-false-fire <pct>, --max-missed-fire <pct>, --json, --output <format>` | 根据带标签的提示词语料库衡量关键词检测器的触发准确率 |
| `vault` | `—` | 在操作系统密钥链中管理 API 密钥和机密（macOS Keychain / Linux Secret Service / Windows Credential Manager） |
| `vault store` | `--value <value>` | 将机密存储在 <name> 名下（交互式密码提示） |
| `vault get` | `—` | 将存储的值打印到 stdout（用法：export KEY=$(oma vault get <name>)） |
| `vault list` | `--json` | 列出已存储的机密名称（从不显示值） |
| `vault delete` | `—` | 从密钥链和索引中移除机密 |
| `star` | `—` | 在 GitHub 上为 oh-my-agent 加星标 |
| `visualize` | `--focus <node-or-path>, --affected <paths...>, --json, --output <format>` | 将项目结构可视化为依赖图 |
| `search` | `—` | 机械式搜索原语：fetch、meta、rss、media、trust、code |
| `search providers` | `--json, --pretty` | 列出已注册的搜索提供方，并在不发起网络调用的情况下检查选择结果 |
| `search web` | `--provider <id>, --limit <n>, --timeout <duration>, --json, --pretty` | 使用所选的网页提供方搜索（Brave 有 CLI 适配器） |
| `search fetch` | `--only <strategies>, --skip <strategies>, --include-archive, --timeout <duration>, --locale <value>, --pretty` | 通过自动升级的策略流水线获取 URL |
| `search meta` | `--timeout <duration>, --locale <value>, --pretty` | 从 URL 提取 OGP / JSON-LD / Schema.org 数据 |
| `search media` | `--subs, --sub-lang <list>, --format <spec>, --timeout <duration>, --pretty` | 通过 yt-dlp 提取媒体元数据（支持 1858 个网站） |
| `search archive` | `--timeout <duration>, --locale <value>, --pretty` | 通过 AMP / archive.today / Wayback 获取 |
| `search trust` | `--pretty` | 解析域名的信任级别/评分 |
| `search code` | `--host <github\|gitlab>, --language <lang>, --repo <owner/repo>, --limit <n>, --pretty` | 通过 gh / glab 搜索代码 |
| `search doctor` | `—` | 检查依赖（Chrome、python3 curl_cffi、yt-dlp、gh） |
| `search api` | `—` |  |
| `search api fetch` | `--timeout <duration>, --locale <value>, --pretty` | 通过匹配的平台 API 获取（Phase 0） |
| `search api search` | `--platforms <list>, --timeout <duration>, --locale <value>, --pretty` | 在支持关键词搜索的各平台上扇出搜索 |
| `search rss` | `—` |  |
| `search rss fetch` | `--timeout <duration>, --locale <value>, --pretty` | 发现并解析 URL 对应的 RSS/Atom 订阅源 |
| `search rss google` | `--locale <value>` | 为查询构建 Google News RSS URL |
| `harness` | `—` | 在隔离的仓库任务上评估 OMA harness 覆盖层 |
| `harness eval` | `--suite <path>, --candidate <path>, --mock, --live, --record, --record-file <path>, --yes, --timeout <duration>, --require-coverage, --json, --output <format>` | 比较候选 .agents 覆盖层与当前基线 |
| `harness incident promote` | `--skill <id>, --draft, --force, --json, --output <format>` | 从已捕获的事故派生技能回归 fixture |
| `harness feedback` | `--live, --apply, --max-epochs <n>, --incident <ids...>, --scan-runs, --json, --output <format>` | 晋升事故并优化受影响的技能 |
| `harness evolution enable` | `--max-dispatches <n>, --cron <expr>, --mode <mode>, --json, --output <format>` | 启用项目受预算约束的计划反馈周期；模式为 apply 或 propose |
| `harness evolution status` | `--json, --output <format>` | 显示配置、计划、待办工作、冲突和上一个周期 |
| `harness evolution disable` | `--json, --output <format>` | 禁用项目的计划反馈周期 |
| `harness evolution run` | `--json, --output <format>` | 按已启用项目保存的模式和预算运行一个周期 |
| `slide` | `—` | HTML 演示文稿工具包：搭建、校验、导出和编辑 1920×1080 幻灯片 |
| `slide validate` | `--workspace <path>, --output <format>, --slide <file>, --report-file <path>` | 几何质量关卡：通过 puppeteer-core 渲染幻灯片，并检查溢出、重叠和字号 |
| `slide bundle` | `--workspace <path>, --output-file <path>, --inline-fonts` | 将各幻灯片文件合并为单个自包含的 .html 交付物 |
| `slide edit` | `--workspace <path>, --port <n>` | 打开浏览器 bbox 编辑器（127.0.0.1 上的 node:http 服务器，调度到 oma 智能体运行器） |
| `slide doctor` | `—` | 探测必需依赖（chrome、puppeteer-core）和可选依赖（yt-dlp、pptxgenjs） |
| `slide create` | `--output-dir <path>, --force` | 搭建新的幻灯片工作目录，包含起始 HTML、assets/ 和 meta.json |
| `slide preview` | `--workspace <path>` | 构建 viewer.html（deck-stage Web 组件 + 演讲者备注面板，按 `n` 切换） |
| `slide export` | `—` |  |
| `slide export pdf` | `--workspace <path>, --output-file <path>, --mode <mode>` | 通过 puppeteer-core 将幻灯片导出为 PDF |
| `slide export png` | `--workspace <path>, --output-dir <path>, --resolution <res>` | 通过 puppeteer-core 将每张幻灯片导出为 PNG 图像 |
| `slide export pptx` | `--workspace <path>, --output-file <path>` | [EXPERIMENTAL] 通过 pptxgenjs 导出为 PPTX（基于栅格，渐变会被栅格化） |
| `slide import` | `—` |  |
| `slide import pptx` | `--workspace <path>` | 通过 officeparser（bunx，尽力而为）将 .pptx 文件导入为幻灯片片段 |
| `slide asset` | `—` |  |
| `slide asset fetch-video` | `--workspace <path>, --output-name <name>` | 通过 yt-dlp 将视频下载到 ./assets/，并打印本地引用 |
| `slide style` | `—` | 浏览并获取设计风格预设 |
| `slide style list` | `—` | 列出可用的风格预设（内置预设 + bold-template 索引） |
| `slide style preview` | `—` | 在终端中预览风格预设 |
| `slide style get` | `--refresh` | 获取 bold template 的 design.md（始终使用最新 main；缓存用于离线回退） |
| `scholar` | `—` | Knows.academy 论文 sidecar（回退到 OpenAlex + Semantic Scholar） |
| `scholar search` | `--limit <n>, --year-min <year>, --always-fallback` | 搜索论文（knows.academy → OpenAlex → Semantic Scholar） |
| `scholar resolve` | `—` | 在 knows.academy、OpenAlex、Semantic Scholar 中查找最佳论文匹配 |
| `scholar get` | `--section <name>` | 获取 sidecar（knows record_id）或作品元数据（W-id、DOI、arXiv:<id>、CorpusId:<n>、S2 paperId） |
| `scholar lint` | `--lenient, --fail-on-warning` | 校验 .knows.yaml 或 .knows.json sidecar（v0.9.0） |
| `image` | `—` | 多供应商 AI 图像生成：感知身份验证状态的并行调度 |
| `image generate` | `--vendor <name>, --size <size>, --quality <level>, -n, --count <n>, --output-dir <path>, --allow-external-output, --model <name>, --timeout <duration>, -r, --reference <path>, -y, --yes, --no-prompt-in-manifest, --dry-run, --output <format>` | 通过 pollinations（flux/zimage，免费）、codex（gpt-image-2，ChatGPT OAuth）或 antigravity（通过 `agy` CLI 使用 gemini nano-banana，登录 Gemini Code Assist 后免费）生成图像 |
| `image doctor` | `--output <format>` | 检查每个供应商的身份验证和安装状态 |
| `image vendor` | `—` |  |
| `image vendor list` | `--output <format>` | 列出已注册的供应商及其支持的模型 |
| `video` | `—` | 短视频、讲解视频和演示视频生成 |
| `video generate` | `--mode <mode>, --aspect <aspect>, --locale <lang>, --captions <style>, --visual <mode>, --voice <profile>, --music <mode>, --duration <sec>, --compositor <name>, --capture <path>, --source <kind>, --url <url>, --device <name>, --ready-selector <css>, --show-cursor, --polish, --capture-timeout <sec>, --capture-stop <mode>, --output-dir <path>, --allow-external-output, --max-usd <n>, --seed <n>, --timeout <duration>, -y, --yes, --dry-run, --script <path>, --output <format>, --no-brief-in-manifest` | 根据简述生成视频运行目录 |
| `video doctor` | `--output <format>, --install, --upgrade, --install-mpt, --install-strudel` | 检查视频提供方和合成器是否就绪 |
| `video compose` | `--output <format>, --refresh, --offline` | 基于最新工具链和 heygen-com/hyperframes 为本次运行搭建 HyperFrames 项目；打印编写契约 |
| `video render` | `--output <format>` | 根据 render-spec.json 重新渲染运行目录 |
| `video provider` | `—` |  |
| `video provider list` | `--output <format>` | 列出视频提供方及其可用性 |
| `serena` | `—` | Serena MCP 语言服务器生命周期工具 |
| `serena reap` | `--dry-run, --quiet` | 终止空闲的 Serena LSP 子进程以回收内存（Serena 会在下次工具调用时自愈） |
| `serena reaper` | `—` |  |
| `serena reaper enable` | `--dry-run` | 安装周期性运行的 Serena Reaper 计划任务（每 5 分钟运行一次） |
| `serena reaper disable` | `--dry-run` | 卸载周期性运行的 Serena Reaper 计划任务 |
| `explain` | `—` | explain 产物的管理和质量校验工具 |
| `explain validate` | `--input-dir <path>, --output <format>, --report-file <path>, --json` | 校验自包含的 explain HTML 报告产物 |
| `diagram` | `—` | 图表引擎辅助工具（archify 交互式 HTML，或回退到 Mermaid） |
| `diagram resolve` | `--engine <engine>, --refresh, --offline, --json, --output <format>` | 报告工作流应使用哪种图表引擎，以及 archify 所在的位置 |
| `diagram update` | `--json, --output <format>` | 将最新的 archify 发布版下载到 oma 的托管缓存（~/.cache/oma-diagram/archify） |
| `diagram archify` | `—` | 在禁用更新检查的情况下运行已安装的 archify CLI（doctor \| guide \| validate \| deliver \| visual-check …） |
| `help` | `—` | 显示帮助信息 |
| `version` | `—` | 显示版本号 |
| `dashboard` | `—` |  |
| `dashboard terminal` | `—` | 启动终端仪表盘（实时监控智能体） |
| `dashboard web` | `—` | 在 http://127.0.0.1:9847 上启动 Web 仪表盘 |
| `auth` | `—` |  |
| `auth status` | `--json, --output <format>` | 检查所有受支持 CLI 的身份验证状态 |
| `hook` | `—` |  |
| `hook run` | `--vendor <v>, --event <e>, --matcher <m>` | 通过集中式 oma 钩子路由器分发供应商钩子事件（design 019） |
| `hook probe` | `--vendor <list>, --output <format>, --hooks-dir <dir>` | 探测各供应商的 L1 钩子兼容性并打印矩阵（D63） |
| `state` | `—` |  |
| `state emit` | `--session-id <id>, --category <category>, --vendor <vendor>, --vendor-sid <vendorSid>, --parent-event-id <eventId>, --causality-key <key>, --ts <iso>, --no-mirror, --json, --output <format>` | 追加一条 OMA L1 工作流事件 |
| `state migrate` | `--include-active, --dry-run, --json, --output <format>` | 将旧版会话迁移到主目录配置档，并删除已验证的原始文件 |
| `state get` | `--json, --output <format>` | 按 ID 检查单个 OMA L1 会话 |
| `state list` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | 检查 OMA L1 工作流状态 |
| `state repair` | `--dry-run, --json, --output <format>` | 修复 OMA L1 工作流状态文件 |
| `state verify` | `--workflow <workflow>, --checkpoint <checkpoint>, --session-id <id>, --category <category>, --no-emit-missing, --json, --output <format>` | 验证工作流检查点所需的 L1 事件 |
| `state decisions` | `—` |  |
| `state decisions list` | `--json, --output <format>` | 列出必需的 L1 decision.made 检查点 |
| `state inject-log` | `—` |  |
| `state inject-log list` | `--entry <file>, --json, --output <format>` | 列出或查看按边界记录的注入审计日志（D52） |
| `state inject-log get` | `--json, --output <format>` | 列出或查看按边界记录的注入审计日志（D52） |
| `state summary` | `--category <category>, --json, --output <format>` | 将会话摘要导出到协调存储 |
| `state heal-check` | `--agent <agentType>, --json, --output <format>` | 检查是否允许某个智能体自愈 |
| `state activate` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | 检查 OMA L1 工作流状态 |
| `state archive` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | 检查 OMA L1 工作流状态 |
| `state purge` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | 检查 OMA L1 工作流状态 |
| `ralph` | `—` |  |
| `ralph verify` | `--session-id <id>, --newer-than <iso>, --no-emit, --json, --output <format>` | 验证 ralph EXEC 产物（防规避关卡，ralph.md Step 1.3） |
| `goal` | `—` |  |
| `goal set` | `--workflow <name>, --session-id <id>, --gate <keyword>, --budget-minutes <n>, --description <text>, --json, --output <format>` | 为活动中的持久工作流附加目标契约（确定性停止关卡 / 实际耗时预算） |
| `stats` | `—` |  |
| `stats get` | `--json, --output <format>` | 查看生产力指标 |
| `stats reset` | `--json, --output <format>` | 查看生产力指标 |
| `agent` | `—` |  |
| `agent context` | `--project-root <path>, --difficulty <level>` | 为原生调度提示词加载按图选择的上下文 |
| `agent resume` | `--project-root <path>, --dry-run, --max-attempts <count>` | 恢复可以安全续跑的未完成任务，并复用当前的验收证据 |
| `agent begin` | `--project-root <path>, -w, --workspace <path>` | 开始一次有证据支撑的原生智能体运行 |
| `agent verify` | `--project-root <path>, --required, --affected <paths...>` | 执行 -- 之后的验证 argv，并记录其真实退出码 |
| `agent finish` | `--project-root <path>` | 根据验证收据校验原生智能体的结果 |
| `agent spawn` | `--resumed-from <run-id>, --fallback-vendors <vendors>, --task-id <id>, --vendor <vendor>, -w, --workspace <path>, --isolation <mode>, --read-only` | 启动子智能体（提示词可以是内联文本或文件路径） |
| `agent status` | `--project-root <path>` | 检查子智能体状态 |
| `agent parallel` | `--session-id <id>, --vendor <vendor>, -i, --inline, --no-wait` | 并行运行多个子智能体 |
| `agent review` | `--vendor <vendor>, -p, --prompt <prompt>, -w, --workspace <path>, --no-uncommitted` | 使用外部 CLI（codex/claude/qwen/grok）运行代码审查 |
| `model` | `—` |  |
| `model check` | `--json, --fail-on-drift, --owner <name>, --probe` | 对照供应商的实时模型列表检查模型注册表 |
| `model probe` | `--json, --timeout <duration>` | 用对应的供应商 CLI 探测模型 slug，确认其可被接受 |
| `model propose` | `--json, --owner <name>, --write, --timeout <duration>` | 在内部运行 model:check --probe，并为被接受的候选生成 oma-config `models:` 补丁 |
| `memory` | `—` |  |
| `memory keys` | `--kind <kind>, --profile <name>, --key-env <name>, --from-env <name>, --dry-run, --json, --output <format>` | 配置 Honcho 连接或本地嵌入凭据 |
| `memory init` | `--force, --json, --output <format>` | 在 .agents/state/memories 中初始化协调存储 |
| `memory setup` | `--endpoint <url>, --port <port>, --install, --start, --dry-run, --json, --output <format>` | 准备 AgentMemory 端点配置 |
| `memory daemon` | `—` | 管理由 OMA 拥有的 AgentMemory 守护进程 |
| `memory daemon status` | `--json, --output <format>` | 显示守护进程状态 |
| `memory daemon start` | `--port <port>, --dry-run, --json, --output <format>` | 在后台启动 AgentMemory |
| `memory daemon stop` | `--dry-run, --json, --output <format>` | 停止由 OMA 拥有的 AgentMemory 守护进程 |
| `memory daemon restart` | `--port <port>, --dry-run, --json, --output <format>` | 重启由 OMA 拥有的 AgentMemory 守护进程 |
| `memory service` | `—` | 管理 AgentMemory 的操作系统服务集成 |
| `memory service install` | `--port <port>, --dry-run, --json, --output <format>` | 安装 AgentMemory 的 launchd/systemd 服务集成 |
| `memory service uninstall` | `--dry-run, --json, --output <format>` | 卸载 AgentMemory 的 launchd/systemd 服务集成 |
| `memory status` | `--json, --output <format>` | 显示所选语义内存提供方的健康状态 |
| `memory retry` | `—` |  |
| `memory retry drain` | `--dry-run, --json, --output <format>` | 排空队列中的 AgentMemory observe 重试 |
| `memory import` | `--source <source>, --since <since>, --dry-run, --force-partial, --json, --output <format>` | 将供应商对话历史导入 AgentMemory |
| `memory maintain` | `--keep <count>, --dry-run, --json, --output <format>` | 维护 AgentMemory 本地存储：备份、清理、压缩 |
| `memory maintain backup` | `--keep <count>, --dry-run, --json, --output <format>` | 维护 AgentMemory 本地存储：备份、清理、压缩 |
| `memory maintain prune` | `--keep <count>, --dry-run, --json, --output <format>` | 维护 AgentMemory 本地存储：备份、清理、压缩 |
| `memory maintain vacuum` | `--keep <count>, --dry-run, --json, --output <format>` | 维护 AgentMemory 本地存储：备份、清理、压缩 |
| `memory gc` | `--scope <scope>, --keep <count>, --max-age <duration>, --dry-run, --json, --output <format>` | 对项目本地内存执行垃圾回收：清理旧的 L1 会话和临时 Serena 文件 |
| `memory upgrade` | `--port <port>, --dry-run, --json, --output <format>` | 停止、备份、升级、重启 AgentMemory，并检查其健康状态 |
| `skill` | `—` | 检查和审计已安装的技能 |
| `skill audit` | `--json, --output <format>` | 检查已安装技能之间 frontmatter 描述的相似度 |
| `skill lint` | `--skill <id>, --json, --output <format>` | 检测各技能的编写坏味道（frontmatter、结构、失效引用） |
| `skill eval` | `--skill <id>, --mock, --live, --record, --yes, --task-dir <path>, --max-tasks <n>, --trials <n>, --require-coverage, --neg-transfer, --routing, --json, --output <format>` | 衡量各技能的效用提升（在留出任务上对比处理组与基线） |
| `skill optimize` | `--skill <id>, --dry-run, --apply, --mock, --live, --max-epochs <n>, --edits-per-epoch <k>, --lr <chars>, --yes, --memory <mode>, --json, --output <format>` | 优化技能的 SKILL.md，使测得的留出效用提升最大化 |
| `skill meta-optimize` | `--target <part>, --skill <ids...>, --anchor <ids...>, --repeats <n>, --candidates <n>, --max-epochs <n>, --edits-per-epoch <k>, --live, --apply, --memory <mode>, --yes, --json, --output <format>` | 提出对演进流程的修改，并在留出技能上评分 |
| `skill procedure` | `--export, --json, --output <format>` | 显示演进流程（优化器/维护者提示词、constitution）及其哈希 |
| `skill evolution-stats` | `--skill <id>, --json, --output <format>` | 按结果、内存模式和流程汇总已记录的优化运行 |
| `skill promotions` | `--skill <id>, --all, --json, --output <format>` | 梳理某个技能已记录的 SKILL.md 晋升与回滚；使用 `--all` 则梳理所有技能和演进流程 |
| `skill rollback` | `--skill <id>, --json, --output <format>` | 恢复最近一次已记录的晋升所替换的 SKILL.md 正文 |
| `schedule` | `—` |  |
| `schedule create` | `--cron <expr>, --every <phrase>, --vendor <vendor>, -w, --workspace <path>, --once, --expires-after <duration>, --env <keys>, --dry-run, --accept-rounded` | 注册计划执行的智能体任务 |
| `schedule list` | `--json, --output <format>` | 列出计划任务及其操作系统漂移状态（synced/missing-in-os/orphan-in-os），按项目分组 |
| `schedule delete` | `—` | 从清单和操作系统调度器中移除计划任务 |
| `schedule run` | `—` | 按 ID 执行计划任务（由操作系统调度器调用，通常不直接调用） |
| `schedule sync` | `--prune` | 重新同步清单 → 操作系统调度器。使用 --prune 移除孤立的操作系统任务。 |
