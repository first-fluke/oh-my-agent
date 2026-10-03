---
title: "CLI 选项"
description: "CLI 全部选项的详尽参考，涵盖全局标志、输出控制、按命令选项和实际使用模式。"
sidebar_label: CLI 选项
---

# CLI 选项

## 全局选项

这些选项是可用在该根目录`oma` / `oh-my-agent`命令:

|标志|说明|
|:-----|:-----------|
| `-g, --global` | Operate在该HOME安装(`~/.agents/`)而不是的`<cwd>/.agents/` |
| `-y, --yes` |跳过提示其中该选定命令支持确认;命令专属安全检查仍应用|
| `-V, --version` |输出该版本数字和退出|
| `-h, --help` |显示帮助用于该命令|

所有子命令也支持`-h, --help`到显示其指定帮助文本.

`--global`设置该安装根目录用于该整个进程,因此`install`, `update`, `link`,和`uninstall`所有解析到`~/.agents/` regardless的该目录你运行它们从. `OMA_HOME=<abs-path>`覆盖它，参见[全局安装](../guide/global-install.md).

---

## 输出选项 {#output-options}

Many命令支持机器可读输出用于CI/CD流水线和自动化.那里是three方式到请求JSON输出,在优先级顺序:

### 1. --json标志

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

该`--json`标志是可用仅在该单项路径该声明支持它. Do不推断支持从一个命令命令族:用于示例, `image`, `video`,和`slide`叶节点公开`--output`其中该注册表列出它,同时`search`有其自己的JSON流式输出.注册表矩阵在该结尾的这page是该权威每个-路径列出.

### 2. --output 标志

```bash
oma stats get --output json
oma doctor --output text
```

该`--output`标志接受`text`或`json`.它提供该相同functionality作为`--json` but也允许你明确地请求文本输出(有用当该环境变量是set到json but你希望文本用于一个指定命令).

**验证：**如果一个无效格式是提供,该CLI抛出: `Invalid output format: {value}. Expected one of text, json`.

### 3. OH_MY_AG_输出_格式环境变量

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

Set这环境变量到`json`到强制JSON输出在所有命令该支持它.仅`json`是识别;任何其他值是忽略和默认值到文本.

**解析顺序:** `--json`标志> `--output`标志> `OH_MY_AG_OUTPUT_FORMAT` env var > `text` (默认).

### 命令supporting JSON输出

|命令| `--json` | `--output` | Notes |
|:--------|:---------|:----------|:------|
| `doctor` |是|是|包含CLI检查, MCP状态,技能状态|
| `stats` |是|是|完整指标对象|
| `retro` |是|是|快照使用指标, authors,提交类型|
| `cleanup` |是|是|列出的已清理items |
| `auth status` |是|是|身份验证状态每个CLI |
| `memory init` |是|是| Initialization结果|
| `verify agent` / `verify triggers` |是|是|验证结果每个检查|
| `visualize` |是|是|依赖图形作为JSON |
| `describe` |始终JSON | N/一个|始终outputs JSON (内省命令) |
| `recap` |是|是|对话历史每个tool/会话|
| `image generate` / `image doctor` / `image vendor list` | N/一个|是|使用`--output json`; `vendor list`是该规范发现路径|
| `video generate` / `video doctor` / `video compose` / `video render` / `video provider list` | N/一个|是|使用`--output json`用于该运行envelope或就绪报告|
| `explain validate` |是|是|产物校验报告|
| `diagram resolve` / `diagram update` |是|是|引擎解析或托管-缓存结果|
| `market resolve` / `market update` |是|是|托管研究-引擎状态|
| `docs verify` / `docs sync` / `docs i18n` / `docs lint` |是| N/一个|每个docs路径使用其自己的报告选项|
| `search ...` |始终JSON | N/一个|所有`search`子命令流式输出JSON;使用`--pretty`用于人类reading |

---

## 按命令配置的选项

### install（安装）

```
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

交互式安装器会将选定的供应商设置写入`.agents/oma-config.yaml`.供应商标志用于选择Web-搜索,代码-intelligence,和semantic-内存集成; `--honcho-url`和`--honcho-workspace`配置该Honcho内存service选中该供应商时.根级`-y, --yes`标志应用当一个安装流程询问用于确认.

### doctor（诊断）

```
oma doctor [--json] [--output <format>] [--profile]
```

|标志|说明|默认|
|:-----|:-----------|:--------|
| `--json` |发出JSON而不是的formatted文本. | `false` |
| `--output <format>` |显式输出格式(`text`或`json`).参见[输出选项](#output-options). | `text` |
| `--profile` |显示该配置档健康状态矩阵(已解析模型slug, CLI,和身份验证状态每个智能体从该活动`model_preset`和`agents:`覆盖).参见[按智能体模型](../guide/per-agent-models.md). | `false` |

### update（更新）

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

|标志|简短|说明|默认|
|:-----|:------|:-----------|:--------|
| `--force` | `-f` |覆盖用户-customized配置文件during更新. Affects: `oma-config.yaml`, `mcp.json`, `stack/`目录.不使用这标志,这些文件是backed上之前该更新和恢复afterward. | `false` |
| `--with-new-skills` | |安装技能新增到该注册表since该当前installation. | `false` |
| `--ci` | |运行在非交互式CI模式.跳过所有确认提示,使用纯文本console输出而不是的spinners和animations.必填用于CI/CD流水线其中标准输入是不可用. | `false` |
| `--yes` | `-y` |跳过提示. Does不创建缺少供应商目录unless成对使用`--all`或`--vendor`. | `false` |
| `--all` | |创建/更新所有受支持项目-范围内供应商. | `false` |
| `--vendor <vendors>` | |创建/更新一个comma-separated供应商列出,用于示例`claude,qwen`. |现有供应商目录仅|

`oma update mcp`使用该相同`--yes`, `--ci`, `--all`,和`--vendor`控制同时选择浏览器MCP服务器.它does不使用`--force`或`--with-new-skills`.

**使用 --force 时的行为：**
- `oma-config.yaml`是替换使用该注册表默认.
- `mcp.json`是替换使用该注册表默认.
- Backend `stack/`目录(语言-指定资源)是替换.
- 所有其他文件是始终更新regardless的这标志.

**使用--ci时的行为：**
- 没有`console.clear()`在启动.
- `@clack/prompts`是替换使用纯文本`console.log`.
- 竞争工具检测提示是跳过.
- 错误抛出而不是的调用`process.exit(1)`.

**供应商范围：**
- `oma update`更新仅供应商目录该已经存在.
- `oma update --yes`使用该相同供应商范围,不使用提示.
- `oma update --all`创建/更新所有受支持项目-范围内供应商.
- `oma update --vendor claude,qwen`创建/更新仅该列出的供应商.

### stats（统计）

```
oma stats get [--json] [--output <format>]
oma stats reset
```

|标志|说明|默认|
|:-----|:-----------|:--------|
| `--json` |发出该重置结果作为JSON. | `false` |
| `--output <format>` |发出`text`或`json`. | `text` |

`oma stats reset`是该重置命令.该旧的`oma stats get --reset`写法是不部分的该当前公共范围.

### retro（复盘）

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

|标志|说明|默认|
|:-----|:-----------|:--------|
| `--interactive` |交互式模式使用手动data入口.提示用于附加上下文该不能是gathered从Git (e.g., mood,显著事件). | `false` |
| `--compare` |比较该当前时间窗口针对该previous窗口的该相同length.显示delta指标(e.g.,提交+12,行新增-340). | `false` |

**窗口参数格式：**
- `7d`: 7天
- `2w`: 2周
- `1m`: 1月
- 省略用于默认(7天)

### cleanup（清理）

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

|标志|简短|说明|默认|
|:-----|:------|:-----------|:--------|
| `--dry-run` | |预览模式.列出所有items该会是已清理but makes没有变更.退出代码0 regardless的发现项. | `false` |
| `--yes` | `-y` |跳过所有确认提示. Cleans everything不使用asking.有用在scripts和CI. | `false` |

**清理内容：**
1. 孤立PID文件: `/tmp/subagent-*.pid`其中该引用的进程是没有更长运行中.
2. 孤立日志文件: `/tmp/subagent-*.log`匹配已停止PIDs.
3. Gemini Antigravity目录: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`.这些累积状态覆盖时间和可以增长大.

### agent spawn（生成智能体）

```
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

|标志|简短|说明|默认|
|:-----|:------|:-----------|:--------|
| `--resumed-from` | ， |链接一个retry到其preceding运行ID. | |
| `--fallback-vendors` | ， | Ordered, comma-separated显式回退供应商链. | |
| `--task-id` | ， |任务ID从该会话规划. |智能体ID |
| `--vendor` | ， | CLI供应商覆盖.该运行时接受`antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`,或`pi`. |已解析从配置|
| `--workspace` | `-w` |可用目录用于该智能体.如果省略或set到`.`,该CLI auto-检测该工作区从monorepo配置文件(pnpm-工作区.YAML,包.json, lerna.json, nx.json, turbo.json, mise.toml). |自动检测或`.` |
| `--isolation` | ， |隔离模式: `worktree`创建一个Git worktree每个spawn;该默认是`none`. | `none` |
| `--read-only` | ， | Restrict该spawned智能体到non-destructive工具和suppress auto-approve标志. | `false` |

**验证：**
- `agent-id`必须是一个的: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id`必须不包含`..`, `?`, `#`, `%`,或控制字符.
- `vendor`必须是一个的: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`.

**供应商特定行为：**

|供应商|命令| Auto-approve标志|提示词标志|
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| claude | `claude` | (无) | `-p` |
| codex | `codex` | `--sandbox workspace-write` | (无;提示词是positional) |
| cursor | `cursor-agent` |供应商特定| `-p` |
| opencode | `opencode` |供应商特定| `-p` |
| qwen | `qwen` | `--yolo` | `-p` |
| grok | `grok` |供应商特定| `-p` |
| pi | `pi` | suppressed在`--read-only`模式|提示词是positional |

这些默认值可以是覆盖在`.agents/skills/oma-orchestration/config/cli-config.yaml`.

Codex 保持其 workspace-write 沙箱。oma 会启用网络访问，并把项目根目录、OMA 状态主目录（`~/.oma`）和已有的包管理器缓存添加为可写目录。`oma update` 会替换 `cli-config.yaml`，因此请用 `OMA_CODEX_SANDBOX` 设置持久的模式：`read-only`、`workspace-write`（默认）或 `danger-full-access`（无沙箱、无审批）。

### agent status（智能体状态）

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

|标志|简短|说明|默认|
|:-----|:------|:-----------|:--------|
| `--root` | `-r` |根目录路径用于locating内存文件(`.agents/state/memories/result-{agent}.md`)和PID文件. |当前可用目录|

**状态确定逻辑:**
1. 如果`.agents/state/memories/result-{agent}.md`存在:读取`## Status:` header.如果没有header,报告`completed`.
2. 如果PID文件存在在`/tmp/subagent-{session-id}-{agent}.pid`:检查如果该PID是存活.报告`running`如果存活, `crashed`如果已停止.
3. 如果都不文件存在:报告`crashed`.

### agent parallel（并行智能体）

```
oma agent parallel [tasks...] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

|标志|简短|说明|默认|
|:-----|:------|:-----------|:--------|
| `--vendor` | ， | CLI供应商覆盖已应用到所有spawned智能体. |已解析按智能体从配置|
| `--inline` | `-i` | Interpret任务参数作为`agent:task[:workspace]` strings而不是的一个文件路径. | `false` |
| `--no-wait` | |后台模式.启动所有智能体和returns立即不使用等待用于完成. PID列出和日志是已保存到`.agents/results/parallel-{timestamp}/`. | `false` (waits用于完成) |

**内联任务格式：** `agent:task`或`agent:task:workspace`
- 工作区是检测到由检查如果该最后冒号分隔的片段启动使用`./`, `/`,或等于`.`.
- 示例： `backend:Implement auth API:./api` --智能体=backend,任务="Implement身份验证API",工作区=./API.
- 示例： `frontend:Build login page` --智能体=frontend,任务="构建login page",工作区=自动检测.

**YAML任务文件格式：**
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

|标志|说明|默认|
|:-----|:-----------|:--------|
| `--window <period>` |时间窗口: `1d`, `3d`, `7d`, `2w`, `30d`.忽略当`--date`是set. | `1d` |
| `--date <date>` |指定日期(`YYYY-MM-DD`). Takes precedence覆盖`--window`. | |
| `--tool <tools>` | Filter会话由tool. Comma-separated: `grok`, `claude`, `codex`, `qwen`, `cursor`, `antigravity`. |所有工具|
| `--top <n>` |显示仅top N项目/topics在该摘要. | unlimited |
| `--sort <metric>` |排序会话由`count`或`duration`. | `count` |
| `--mermaid` |输出一个Mermaid甘特图chart而不是的该默认摘要. | `false` |
| `--graph` |打开一个交互式图形在该浏览器. Mutually exclusive使用`--mermaid`. | `false` |

> **说明:**生成供应商规则文件(e.g. `.cursor/rules`)从该已安装技能是处理由[`oma link <vendor>`](./commands.md#link),不一个独立`export`命令.

### search（搜索）

```
oma search <subcommand> [...]
```

该`search`组提供其自己的JSON输出(没有`--json` / `--output`标志).使用`--pretty`在URL/查询子命令到美化打印结果,和依赖在子命令-指定选项低于:

|子命令|显著选项|
|:-----------|:---------------|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (默认`en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (默认`en`), `--format <spec>`, `--timeout` (默认`30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (默认`github`), `--language`, `--repo`, `--limit` (默认`20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` |无(运行binary检查用于Chrome / `python3 curl_cffi` / `yt-dlp` / `gh`) |

**退出码：** `0`正常, `1`错误, `2`阻塞, `3`未找到, `4`无效输入, `5`需要身份验证, `6`超时.使用这些在scripts到区分暂时性阻塞项从无效输入.

### image（图像）

```
oma image <subcommand> [...]
```

输出格式是控制每个子命令通过`--output <text|json>`.

`image generate`接受:

|标志|简短|说明|默认|
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`. `auto` resolves从该活动`image:`配置和可用身份验证. | `auto` |
| `--size <size>` | | `WxH`使用两者edges divisible由16, 16–3840, aspect ratio 1:3–3:1,或`auto`. |供应商默认|
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. |供应商默认|
| `--count <n>` | `-n` |数字的图像, 1..5. | `1` |
| `--output-dir <dir>` | |输出目录.必须是内部`$PWD` unless `--allow-external-output`是set. | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | |允许`--output-dir`路径outside `$PWD`. | `false` |
| `--model <name>` | |供应商特定模型覆盖.该antigravity模型是选定由`agy`. |供应商默认|
| `--timeout <duration>` | |每个-图像超时使用一个时长值. |供应商默认|
| `--reference <path>` | `-r` |参考图像用于风格/主题迁移. Repeatable (`-r a.png -r b.png`)或comma-separated. Validated用于规模(≤5MB),格式(PNG/JPEG/GIF/WebP通过magic bytes),和数量(≤10).受支持在`codex`和`antigravity`;拒绝使用退出4在`pollinations`. | |
| `--yes` | `-y` |跳过该成本确认提示词. | `false` |
| `--no-prompt-in-manifest` | | Store SHA256的该提示词而不是的该raw文本在`manifest.json`. | `false` |
| `--dry-run` | |打印规划和成本估算; do不execute. | `false` |
| `--output <format>` | | `text` \| `json`. | `text` |

`image doctor`和`image vendor list`接受`--output <text|json>`. `image list-vendors`仍是一个帮助别名; `vendor list`是该规范发现路径.

### video（视频）

```
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate`接受该规划和采集控制`--mode`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor`, `--capture`, `--source`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout`,和`--capture-stop`.它也接受`--output-dir`, `--allow-external-output`, `--max-usd`, `--seed`, `--timeout`, `--script`, `--dry-run`, `--yes`, `--output`,和`--no-brief-in-manifest`.浏览器采集使用`--source web --url <url>`; `file`是该默认来源.一个正常渲染需要一个已编写合成和一个可用合成器;占位符是限制到该`OMA_VIDEO_MOCK=1`测试路径.

`video doctor`报告或提供该HyperFrames/MPT/Strudel工具链. `compose`准备该运行's合成契约,和`render` lint 检查,渲染,和探测该输出. `provider list`报告供应商和密钥状态.读取[视频生成](../guide/video-generation.md)用于该运行清单和恢复顺序.

### memory init（初始化内存）

```
oma memory init [--json] [--output <format>] [--force]
```

|标志|说明|默认|
|:-----|:-----------|:--------|
| `--force` |覆盖空或现有架构文件在`.agents/state/memories/`.不使用这标志,现有文件是不touched. | `false` |

### verify（验证）

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

|标志|简短|说明|默认|
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` |路径到该工作区目录到验证. |当前可用目录|

**智能体类型:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

`verify triggers`测量关键词检测器准确率针对一个带标签语料库.该百分比阈值是门槛;使用JSON输出当一个CI任务需要到检查单项发现项.该旧`oma verify <agent-type>`写法是一个兼容性帮助形式; `verify agent`是该注册路径.

---

## 实际示例

### CI流水线:更新和验证

```bash
# Update in CI mode, then run doctor to verify installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### Automated指标collection

```bash
# Collect metrics as JSON and pipe to a monitoring system
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Batch智能体执行使用状态监控

```bash
# Start agents in background
oma agent parallel tasks.yaml --no-wait

# Check status periodically
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
```

### 清理在CI之后tests

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### 感知工作区验证

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### Retro使用比较用于sprint reviews

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

### 描述用于智能体内省

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```
## 完整公共选项注册表

下面的矩阵由已签入的公共命令注册表生成。它是本页的覆盖索引：带 `—` 的行没有命令专属选项，共享的根标志和帮助别名已在上文说明。值语法发生变化时，运行 `oma describe "<path>"` 查看运行时帮助。

|命令路径|公共选项|用途|
|---|---|---|
| `install` | `--web-search <provider>, --code-intelligence <provider>, --semantic-memory <provider>, --honcho-url <url>, --honcho-workspace <id>` |安装oh-my-智能体技能和configurations |
| `describe` | `—` |描述CLI命令作为JSON用于运行时内省|
| `uninstall` | `--dry-run, -y, --yes` |删除oh-my-智能体's拥有的文件(preserves oma-配置.YAML, mcp.json,和用户编写技能) |
| `update` | `-f, --force, --with-new-skills, --ci, -y, --yes, --all, --vendor <vendors>` |更新技能到最新版本从注册表|
| `update mcp` | `-y, --yes, --ci, --all, --vendor <vendors>` | Choose浏览器MCP服务器(Aside, Chrome DevTools, Firefox DevTools) |
| `link` | `--dry-run` |重新生成供应商文件(.claude/, .cursor/, etc.)从.智能体/ SSOT |
| `intel` | `—` | Product intelligence流水线:研究, gaps, PRD,问题proposal |
| `intel suggest` | `--config <path>, --topic <topic>, --target <target>, --repos <repos>, --since <window>, --last-commits <n>, --output-dir <path>, --dry-run, --fixture <path>, --create-issue, --base-repo <owner/name>, --yes, --json, --output <format>` | Suggest high-值product工作从market/代码intelligence |
| `market` | `—` |社区-信号market研究通过该始终-最新最后30天引擎|
| `market detect-trap` | `--force` | Preflight检查该refuses关键词-trap queries |
| `market resolve` | `--refresh, --offline, --json, --output <format>` |报告该最后30天引擎oma将运行(托管最新, pin,或本地复制)和该Python它使用|
| `market update` | `--json, --output <format>` |下载该最新最后30天release到oma's托管缓存(~/.缓存/oma-market/最后30天) |
| `market run` | `—` |运行该最后30天引擎(scripts/最后30天.py)使用该given参数; --save-dir默认值到market.save_dir |
| `doctor` | `--profile, --heal-check <agentType>, --json, --output <format>` |检查CLI安装, MCP配置,和技能状态|
| `profile` | `—` | Manage本地OMA执行配置档|
| `profile list` | `--json, --output <format>` |列出本地配置档|
| `profile show` | `--json, --output <format>` |显示一个本地配置档|
| `profile create` | `--json, --output <format>` |创建一个本地配置档|
| `profile use` | `--shell <shell>, --json, --output <format>` |打印shell代码到激活一个现有配置档|
| `profile run` | `—` |运行一个命令使用OMA_配置档set用于该child进程|
| `retro` | `--interactive, --compare, --json, --output <format>` | Engineering retrospective使用指标&趋势|
| `recap` | `--window <period>, --date <date>, --tool <tools>, --top <n>, --sort <metric>, --mermaid, --graph, --json, --output <format>` |回顾AI tool对话历史|
| `docs` | `—` | Documentation漂移检测:验证references和建议更新用于diff-affected docs |
| `docs verify` | `--json, --report-file <path>, --no-urls, --urls-sync` |解压L2 references从docs和报告broken目标.重新生成docs/生成/doc-refs.json作为一个side effect.退出代码: 0 =清理, 1 = broken refs找到. URL链接检查是delegated到`lychee` (安装: brew安装lychee). |
| `docs sync` | `--json` | Given一个Git diff,列出docs该参考变更文件.该主机LLM (技能运行时)是预期到读取这列出加上该diff和建议patches每个该技能.md契约，该CLI从不auto-编辑docs.默认diff-range: --cached (staged变更),回退到HEAD~1..HEAD. |
| `docs i18n` | `--json, --min-severity <level>` |检测漂移在…之间English来源docs (Web/docs)和i18n翻译(Web/i18n/{lang}/...).发出structural信号(行数量, heading数量,最后-提交时间戳)每个配对因此该主机LLM可以decide该翻译需要一个diff-同步patch.该CLI从不编辑翻译. |
| `docs lint` | `--json, --locales <list>` |检查translated docs用于content-级别anti-模式(em-dashes在CJK目标, etc.). Complements `oma docs i18n` (structural漂移)使用风格/anti-pattern检查每个oma-翻译技能.md § Stage 4.该CLI从不auto-修复，它仅报告问题用于该主机LLM到restructure. |
| `emit` | `--target <target>, --output-dir <path>, --json, --output <format>` |发出standards-conformant产物从该.智能体/ SSOT (智能体技能规格,智能体Plugins包, Claude代码plugin marketplace,智能体.md, cli/-范围内供应商docs) |
| `cleanup` | `--dry-run, -y, --yes, --json, --output <format>` |清理上孤立子智能体进程和temp文件|
| `bridge` | `--context <name>` |代理MCP stdio到一个共享按项目Serena服务器(started在demand) |
| `verify` | `—` |验证子智能体输出(backend/frontend/mobile/qa/调试/pm),或测量关键词检测器trigger准确率|
| `verify agent` | `-w, --workspace <path>, --json, --output <format>` | |
| `verify triggers` | `--corpus <path>, --max-false-fire <pct>, --max-missed-fire <pct>, --json, --output <format>` |测量关键词检测器trigger准确率针对一个带标签提示词语料库|
| `vault` | `—` | Manage API键+密钥在该操作系统密钥链(macOS密钥链/ Linux密钥Service / Windows凭据Manager) |
| `vault store` | `--value <value>` | Store一个密钥在…下<名称> (交互式password提示词) |
| `vault get` | `—` |打印存储值到标准输出(用于:导出密钥=$(oma vault get <名称>)) |
| `vault list` | `--json` |列出存储密钥名称(值从不displayed) |
| `vault delete` | `—` |删除一个密钥从该密钥链和该索引|
| `star` | `—` | Star oh-my-智能体在GitHub |
| `visualize` | `--focus <node-or-path>, --affected <paths...>, --json, --output <format>` | Visualize项目结构作为一个依赖图形|
| `search` | `—` | Mechanical搜索primitives ，获取, meta, rss,媒体,信任,代码|
| `search providers` | `--json, --pretty` |列出注册搜索供应商和检查选择不使用网络调用|
| `search web` | `--provider <id>, --limit <n>, --timeout <duration>, --json, --pretty` |搜索使用该选定Web供应商(Brave有一个CLI adapter) |
| `search fetch` | `--only <strategies>, --skip <strategies>, --include-archive, --timeout <duration>, --locale <value>, --pretty` |获取URL通过自动升级策略流水线|
| `search meta` | `--timeout <duration>, --locale <value>, --pretty` |解压OGP / JSON-LD /架构.org从URL |
| `search media` | `--subs, --sub-lang <list>, --format <spec>, --timeout <duration>, --pretty` |解压媒体元数据通过yt-dlp (1858 sites) |
| `search archive` | `--timeout <duration>, --locale <value>, --pretty` |获取通过AMP /归档.today / Wayback |
| `search trust` | `--pretty` |解析信任级别/评分用于一个域名|
| `search code` | `--host <github\|gitlab>, --language <lang>, --repo <owner/repo>, --limit <n>, --pretty` |搜索代码通过gh / glab |
| `search doctor` | `—` |检查依赖(Chrome, python3 curl_cffi, yt-dlp, gh) |
| `search api` | `—` | |
| `search api fetch` | `--timeout <duration>, --locale <value>, --pretty` |获取通过matched平台API (阶段0) |
| `search api search` | `--platforms <list>, --timeout <duration>, --locale <value>, --pretty` | Fan-out关键词搜索跨平台该支持它|
| `search rss` | `—` | |
| `search rss fetch` | `--timeout <duration>, --locale <value>, --pretty` |发现和parse RSS/Atom feed用于一个URL |
| `search rss google` | `--locale <value>` |构建Google News RSS URL用于一个查询|
| `harness` | `—` | Evaluate OMA harness overlays针对隔离仓库任务|
| `harness eval` | `--suite <path>, --candidate <path>, --mock, --live, --record, --record-file <path>, --yes, --timeout <duration>, --require-coverage, --json, --output <format>` |比较候选.智能体覆盖层使用该当前基线|
| `harness incident promote` | `--skill <id>, --draft, --force, --json, --output <format>` | 从已捕获的事故派生技能回归 fixture |
| `harness feedback` | `--live, --apply, --max-epochs <n>, --incident <ids...>, --scan-runs, --json, --output <format>` | 晋升事故并优化受影响的技能 |
| `harness evolution enable` | `--max-dispatches <n>, --cron <expr>, --mode <mode>, --json, --output <format>` | 启用项目受预算约束的计划反馈周期；模式为 apply 或 propose |
| `harness evolution status` | `--json, --output <format>` | 显示配置、计划、待办工作、冲突和上一个周期 |
| `harness evolution disable` | `--json, --output <format>` | 禁用项目的计划反馈周期 |
| `harness evolution run` | `--json, --output <format>` | 按已启用项目保存的模式和预算运行一个周期 |
| `slide` | `—` | HTML演示文稿toolkit ， scaffold,校验,导出,和编辑1920×1080幻灯片decks |
| `slide validate` | `--workspace <path>, --output <format>, --slide <file>, --report-file <path>` | Geometric quality门槛，渲染幻灯片通过puppeteer-core和检查overflow/重叠/font-规模|
| `slide bundle` | `--workspace <path>, --output-file <path>, --inline-fonts` |合并每个-幻灯片文件到一个single self-contained .html deliverable |
| `slide edit` | `--workspace <path>, --port <n>` |打开浏览器bbox editor (node:http服务器在127.0.0.1,调度到oma智能体运行器) |
| `slide doctor` | `—` |探测必填deps (chrome, puppeteer-core)和可选deps (yt-dlp, pptxgenjs) |
| `slide create` | `--output-dir <path>, --force` | Scaffold一个新幻灯片可用目录使用starter HTML, assets/,和meta.json |
| `slide preview` | `--workspace <path>` |构建viewer.html (deck-stage Web component + speaker-notes panel, toggle使用`n`) |
| `slide export` | `—` | |
| `slide export pdf` | `--workspace <path>, --output-file <path>, --mode <mode>` |导出幻灯片到PDF通过puppeteer-core |
| `slide export png` | `--workspace <path>, --output-dir <path>, --resolution <res>` |导出每个幻灯片作为一个PNG图像通过puppeteer-core |
| `slide export pptx` | `--workspace <path>, --output-file <path>` | [EXPERIMENTAL]导出到PPTX通过pptxgenjs (raster-backed, gradients rasterized) |
| `slide import` | `—` | |
| `slide import pptx` | `--workspace <path>` |导入一个.pptx文件到幻灯片fragments通过officeparser (bunx, best-推理强度) |
| `slide asset` | `—` | |
| `slide asset fetch-video` | `--workspace <path>, --output-name <name>` |下载视频通过yt-dlp到./assets/和打印本地ref |
| `slide style` | `—` | Browse和获取design风格presets |
| `slide style list` | `—` |列出可用风格presets (vendored + bold-template索引) |
| `slide style preview` | `—` |预览一个风格preset在该终端|
| `slide style get` | `--refresh` |获取一个bold template design.md (始终-最新main; cached用于离线回退) |
| `scholar` | `—` | Knows.academy论文sidecars (OpenAlex + Semantic Scholar fallbacks) |
| `scholar search` | `--limit <n>, --year-min <year>, --always-fallback` |搜索论文(knows.academy → OpenAlex → Semantic Scholar) |
| `scholar resolve` | `—` |查找best论文匹配跨knows.academy, OpenAlex, Semantic Scholar |
| `scholar get` | `--section <name>` |获取一个sidecar (knows记录_ID)或工作元数据(W-ID, DOI, arXiv:<ID>, CorpusId:<n>, S2 paperId) |
| `scholar lint` | `--lenient, --fail-on-warning` |校验一个.knows.YAML或.knows.json sidecar (v0.9.0) |
| `image` | `—` | Multi-供应商AI图像生成，身份验证-aware并行调度|
| `image generate` | `--vendor <name>, --size <size>, --quality <level>, -n, --count <n>, --output-dir <path>, --allow-external-output, --model <name>, --timeout <duration>, -r, --reference <path>, -y, --yes, --no-prompt-in-manifest, --dry-run, --output <format>` |生成图像通过pollinations (flux/zimage, free), codex (gpt-图像-2, ChatGPT OAuth),或antigravity (gemini nano-banana通过`agy` CLI, free使用Gemini代码Assist sign-在) |
| `image doctor` | `--output <format>` |检查身份验证和安装状态每个供应商|
| `image vendor` | `—` | |
| `image vendor list` | `--output <format>` |列出注册供应商和受支持模型|
| `video` | `—` |简短-形式,解释器,和demo视频生成|
| `video generate` | `--mode <mode>, --aspect <aspect>, --locale <lang>, --captions <style>, --visual <mode>, --voice <profile>, --music <mode>, --duration <sec>, --compositor <name>, --capture <path>, --source <kind>, --url <url>, --device <name>, --ready-selector <css>, --show-cursor, --polish, --capture-timeout <sec>, --capture-stop <mode>, --output-dir <path>, --allow-external-output, --max-usd <n>, --seed <n>, --timeout <duration>, -y, --yes, --dry-run, --script <path>, --output <format>, --no-brief-in-manifest` |生成一个视频运行目录从一个概要|
| `video doctor` | `--output <format>, --install, --upgrade, --install-mpt, --install-strudel` |检查视频供应商和合成器就绪|
| `video compose` | `--output <format>, --refresh, --offline` | Scaffold该运行's HyperFrames项目在该最新工具链+ heygen-com/hyperframes;打印该编写契约|
| `video render` | `--output <format>` | Re-渲染一个运行目录从渲染-规格.json |
| `video provider` | `—` | |
| `video provider list` | `--output <format>` |列出视频供应商和availability |
| `serena` | `—` | Serena MCP语言服务器生命周期utilities |
| `serena reap` | `--dry-run, --quiet` | Kill空闲Serena LSP子级到回收内存(Serena self-heals在下一步tool调用) |
| `serena reaper` | `—` | |
| `serena reaper enable` | `--dry-run` |安装该periodic Serena回收器计划任务(运行每5分钟) |
| `serena reaper disable` | `--dry-run` |卸载该periodic Serena回收器计划任务|
| `explain` | `—` |解释产物management和quality校验工具|
| `explain validate` | `--input-dir <path>, --output <format>, --report-file <path>, --json` |校验self-contained解释HTML报告产物|
| `diagram` | `—` |图表引擎helpers (archify交互式HTML或Mermaid回退) |
| `diagram resolve` | `--engine <engine>, --refresh, --offline, --json, --output <format>` |报告该图表引擎工作流应使用,和其中archify lives |
| `diagram update` | `--json, --output <format>` |下载该最新archify release到oma's托管缓存(~/.缓存/oma-图表/archify) |
| `diagram archify` | `—` |运行该已安装archify CLI (诊断\|指南\|校验\| deliver \| visual-检查…)使用更新检查disabled |
| `help` | `—` |显示帮助信息|
| `version` | `—` |显示版本数字|
| `dashboard` | `—` | |
| `dashboard terminal` | `—` |启动终端仪表盘(实时智能体监控) |
| `dashboard web` | `—` |启动Web仪表盘在http://127.0.0.1:9847 |
| `auth` | `—` | |
| `auth status` | `--json, --output <format>` |检查身份验证状态的所有受支持CLIs |
| `hook` | `—` | |
| `hook run` | `--vendor <v>, --event <e>, --matcher <m>` |通过集中式oma钩子路由器分发供应商钩子事件(design 019) |
| `hook probe` | `--vendor <list>, --output <format>, --hooks-dir <dir>` |探测按供应商L1钩子兼容性和打印一个矩阵(D63) |
| `state` | `—` | |
| `state emit` | `--session-id <id>, --category <category>, --vendor <vendor>, --vendor-sid <vendorSid>, --parent-event-id <eventId>, --causality-key <key>, --ts <iso>, --no-mirror, --json, --output <format>` | Append一个OMA L1工作流事件|
| `state migrate` | `--include-active, --dry-run, --json, --output <format>` |迁移旧版会话到该HOME配置档和删除verified originals |
| `state get` | `--json, --output <format>` |检查一个OMA L1会话由ID |
| `state list` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` |检查OMA L1工作流状态|
| `state repair` | `--dry-run, --json, --output <format>` |修复OMA L1工作流状态文件|
| `state verify` | `--workflow <workflow>, --checkpoint <checkpoint>, --session-id <id>, --category <category>, --no-emit-missing, --json, --output <format>` |验证必填L1事件用于一个工作流检查点|
| `state decisions` | `—` | |
| `state decisions list` | `--json, --output <format>` |列出必填L1决策.创建checkpoints |
| `state inject-log` | `—` | |
| `state inject-log list` | `--entry <file>, --json, --output <format>` |列出或view每个-boundary inject审计日志(D52) |
| `state inject-log get` | `--json, --output <format>` |列出或view每个-boundary inject审计日志(D52) |
| `state summary` | `--category <category>, --json, --output <format>` |导出一个会话摘要到该coordination store |
| `state heal-check` | `--agent <agentType>, --json, --output <format>` |检查whether self-healing是allowed用于一个智能体|
| `state activate` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` |检查OMA L1工作流状态|
| `state archive` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` |检查OMA L1工作流状态|
| `state purge` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` |检查OMA L1工作流状态|
| `ralph` | `—` | |
| `ralph verify` | `--session-id <id>, --newer-than <iso>, --no-emit, --json, --output <format>` |验证ralph EXEC产物(anti-circumvention门槛, ralph.md Step 1.3) |
| `goal` | `—` | |
| `goal set` | `--workflow <name>, --session-id <id>, --gate <keyword>, --budget-minutes <n>, --description <text>, --json, --output <format>` | Attach一个目标契约(确定性停止门槛/ wall-clock预算)到一个活动持久工作流|
| `stats` | `—` | |
| `stats get` | `--json, --output <format>` | View生产力指标|
| `stats reset` | `--json, --output <format>` | View生产力指标|
| `agent` | `—` | |
| `agent context` | `--project-root <path>, --difficulty <level>` | Load图形-选定上下文用于一个原生调度提示词|
| `agent resume` | `--project-root <path>, --dry-run, --max-attempts <count>` |恢复安全incomplete任务, reusing当前acceptance证据|
| `agent begin` | `--project-root <path>, -w, --workspace <path>` |启动一个证据-backed原生智能体运行|
| `agent verify` | `--project-root <path>, --required, --affected <paths...>` | Execute验证参数数组之后--和记录其real退出代码|
| `agent finish` | `--project-root <path>` |校验一个原生智能体结果针对其验证receipts |
| `agent spawn` | `--resumed-from <run-id>, --fallback-vendors <vendors>, --task-id <id>, --vendor <vendor>, -w, --workspace <path>, --isolation <mode>, --read-only` | Spawn一个子智能体(提示词可以是内联文本或一个文件路径) |
| `agent status` | `--project-root <path>` |检查状态的subagents |
| `agent parallel` | `--session-id <id>, --vendor <vendor>, -i, --inline, --no-wait` |运行multiple sub-智能体在并行|
| `agent review` | `--vendor <vendor>, -p, --prompt <prompt>, -w, --workspace <path>, --no-uncommitted` |运行代码审查使用外部CLI (codex/claude/qwen/grok) |
| `model` | `—` | |
| `model check` | `--json, --fail-on-drift, --owner <name>, --probe` |检查模型注册表针对实时供应商模型列出|
| `model probe` | `--json, --timeout <duration>` |探测一个模型slug针对其供应商CLI到验证它是已接受|
| `model propose` | `--json, --owner <name>, --write, --timeout <duration>` |运行模型:检查 --probe internally和生成一个oma-配置`models:` patch用于已接受候选|
| `memory` | `—` | |
| `memory keys` | `--kind <kind>, --profile <name>, --key-env <name>, --from-env <name>, --dry-run, --json, --output <format>` |配置Honcho连接或本地embedding凭据|
| `memory init` | `--force, --json, --output <format>` | Initialize该coordination store在.智能体/状态/内存|
| `memory setup` | `--endpoint <url>, --port <port>, --install, --start, --dry-run, --json, --output <format>` | Prepare AgentMemory端点配置|
| `memory daemon` | `—` | Manage一个OMA-拥有的AgentMemory守护进程进程|
| `memory daemon status` | `--json, --output <format>` |显示守护进程状态|
| `memory daemon start` | `--port <port>, --dry-run, --json, --output <format>` |启动AgentMemory在该后台|
| `memory daemon stop` | `--dry-run, --json, --output <format>` |停止该OMA-拥有的AgentMemory守护进程|
| `memory daemon restart` | `--port <port>, --dry-run, --json, --output <format>` | Restart该OMA-拥有的AgentMemory守护进程|
| `memory service` | `—` | Manage AgentMemory操作系统service集成|
| `memory service install` | `--port <port>, --dry-run, --json, --output <format>` |安装AgentMemory launchd/systemd service集成|
| `memory service uninstall` | `--dry-run, --json, --output <format>` |卸载AgentMemory launchd/systemd service集成|
| `memory status` | `--json, --output <format>` |显示选定semantic-内存供应商健康状态|
| `memory retry` | `—` | |
| `memory retry drain` | `--dry-run, --json, --output <format>` | Drain queued AgentMemory observe retries |
| `memory import` | `--source <source>, --since <since>, --dry-run, --force-partial, --json, --output <format>` |导入供应商对话历史到AgentMemory |
| `memory maintain` | `--keep <count>, --dry-run, --json, --output <format>` | Maintain AgentMemory本地存储: backup, prune, vacuum |
| `memory maintain backup` | `--keep <count>, --dry-run, --json, --output <format>` | Maintain AgentMemory本地存储: backup, prune, vacuum |
| `memory maintain prune` | `--keep <count>, --dry-run, --json, --output <format>` | Maintain AgentMemory本地存储: backup, prune, vacuum |
| `memory maintain vacuum` | `--keep <count>, --dry-run, --json, --output <format>` | Maintain AgentMemory本地存储: backup, prune, vacuum |
| `memory gc` | `--scope <scope>, --keep <count>, --max-age <duration>, --dry-run, --json, --output <format>` | Garbage-collect项目-本地内存: prune旧L1会话和ephemeral Serena文件|
| `memory upgrade` | `--port <port>, --dry-run, --json, --output <format>` |停止, backup, upgrade, restart,和健康状态-检查AgentMemory |
| `skill` | `—` |检查和审计已安装技能|
| `skill audit` | `--json, --output <format>` |检查frontmatter说明相似度在…之间已安装技能|
| `skill lint` | `--skill <id>, --json, --output <format>` |检测按技能编写气味(frontmatter,结构, broken refs) |
| `skill eval` | `--skill <id>, --mock, --live, --record, --yes, --task-dir <path>, --max-tasks <n>, --trials <n>, --require-coverage, --neg-transfer, --routing, --json, --output <format>` |测量按技能效用lift (处理vs基线在留出任务) |
| `skill optimize` | `--skill <id>, --dry-run, --apply, --mock, --live, --max-epochs <n>, --edits-per-epoch <k>, --lr <chars>, --yes, --memory <mode>, --json, --output <format>` |优化技能的技能.md到maximize measured留出效用lift |
| `skill meta-optimize` | `--target <part>, --skill <ids...>, --anchor <ids...>, --repeats <n>, --candidates <n>, --max-epochs <n>, --edits-per-epoch <k>, --live, --apply, --memory <mode>, --yes, --json, --output <format>` | 提出对演进流程的修改，并在留出技能上评分 |
| `skill procedure` | `--export, --json, --output <format>` | 显示演进流程（优化器/维护者提示词、constitution）及其哈希 |
| `skill evolution-stats` | `--skill <id>, --json, --output <format>` | 按结果、内存模式和流程汇总已记录的优化运行 |
| `skill promotions` | `--skill <id>, --all, --json, --output <format>` | 梳理某个技能已记录的 SKILL.md 晋升与回滚；使用 `--all` 则梳理所有技能和演进流程 |
| `skill rollback` | `--skill <id>, --json, --output <format>` | 恢复最近一次已记录的晋升所替换的 SKILL.md 正文 |
| `schedule` | `—` | |
| `schedule create` | `--cron <expr>, --every <phrase>, --vendor <vendor>, -w, --workspace <path>, --once, --expires-after <duration>, --env <keys>, --dry-run, --accept-rounded` |注册一个计划智能体任务|
| `schedule list` | `--json, --output <format>` |列出计划任务使用操作系统漂移状态(synced/缺少-在-操作系统/孤立-在-操作系统), grouped由项目|
| `schedule delete` | `—` |删除一个计划任务从清单和操作系统调度器|
| `schedule run` | `—` | Execute一个计划任务由ID (调用由操作系统调度器;不通常called直接) |
| `schedule sync` | `--prune` |重新同步清单→操作系统调度器.使用--prune到删除孤立操作系统任务. |
