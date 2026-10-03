---
title: "CLI 命令"
description: "CLI 全部命令的完整参考，涵盖语法、选项、示例，并按类别组织。"
sidebar_label: CLI 命令
---

# CLI 命令

全局安装后(`bun install --global oh-my-agent`),使用`oma`或`oh-my-agent`.如需不安装而一次性使用,运行`npx oh-my-agent`.

环境变量`OH_MY_AG_OUTPUT_FORMAT`可以设置为`json`以强制使用机器可读输出在命令该支持它.这等同于传递`--json`到每个命令.

## 从任务开始

选择能回答当前问题的最小命令。下面的每个命令都会打印路径或报告，检查后再进入下一步。

|任务|启动这里|预期结果|
|:-----|:-----------|:----------------|
|安装或修复一个项目| `oma install`然后`oma doctor` |已安装资源和一个健康状态报告;使用`oma doctor --profile`当模型解析是该问题. |
|查找一个命令或选项从一个智能体| `oma describe`或`oma describe "image generate"` | JSON describing参数,选项,和嵌套命令. |
|生成一个图像| `oma image generate "<prompt>" --output json` |图像路径和一个清单在…下`.agents/results/images/`. |
|规划或渲染视频| `oma video generate "<brief>" --dry-run` |一个运行目录使用规划产物;合成和渲染仅之后该合成是已编写. |
|创建一个交互式代码解释器| `/explain` |一个validated self-contained HTML产物在…下`.agents/results/explain/`. |
|解析一个图表引擎| `oma diagram resolve --output json` |选定的Mermaid或archify引擎和其原因. |
|研究社区信号| `oma market detect-trap "<topic>"` |一个preflight结果;继续使用`oma market resolve --output json`和该上游运行仅当它传递. |
|转换或检查一个论文| `oma scholar search "<query>"` |搜索结果从Knows, OpenAlex,或Semantic Scholar;获取一个sidecar使用`oma scholar get`. |
|构建一个幻灯片deck | `oma slide create --output-dir <dir>` |一个可用目录该可以是已编写, validated,打包,和exported. |
|审查documentation漂移| `oma docs verify --json` |一个structured broken-参考报告和regenerated参考索引. |

已签入的注册表是此命令映射的来源。下面的规范发现名称来自 `oma describe` 返回的路径；交互式帮助可能显示兼容性别名，例如 `slide new`、`slide viewer`、`image list-vendors` 或 `video list-providers`。

## 当前命令范围

此映射让下面的长参考内容更易扫描，也便于发现不常用的命令族。使用每个命令族’s `--help`或`oma describe <path>`用于该精确参数grammar; [CLI选项](./options.md)包含该完成注册表标志矩阵.

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
| `harness` | `harness`, `harness eval` |
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
| `skill` | `skill`, `skill audit`, `skill lint`, `skill eval`, `skill optimize` |
| `schedule` | `schedule`, `schedule create`, `schedule list`, `schedule delete`, `schedule run`, `schedule sync` |

当命令把剩余参数交给其他工具时，注册表会有意保留其选项开放。这应用到`market run`和`diagram archify`;读取该已解析上游帮助之前运行中一个修改状态的或联网的操作.

---

## 设置与安装

### install（安装）

`oma`使用没有参数启动该交互式安装器. `oma install`是该显式形式和接受供应商-选择选项.

```
oma
oma install
oma install --web-search native --code-intelligence gortex --semantic-memory agent-memory
```

`--web-search`, `--code-intelligence`,和`--semantic-memory`保留该已保存供应商选择当省略. `--honcho-url`和`--honcho-workspace`配置一个新Honcho连接选中该供应商时.根级`-y, --yes`标志会跳过提示并使用默认值; `--global`目标是HOME安装.

**功能：**
1.检查用于旧版`.agent/`目录和迁移到`.agents/`如果找到.
2.检测和提供到删除竞争工具.
3.提示用于项目类型(所有, Fullstack, Frontend, Backend, Mobile, DevOps,自定义).
4.如果backend是选定,提示用于语言变体(Python, Node.js, Rust,其他).
5.询问关于GitHub Copilot符号链接.
6.下载该最新tarball从该注册表.
7.安装共享资源,工作流,配置,和选定技能.
8.安装供应商适配用于选定供应商(项目-本地设置;没有静默HOME-级别供应商写入).
9.创建CLI符号链接.
10.提供推荐**全局** Git配置(选择加入确认):
 - `rerere.enabled=true` ，多智能体合并冲突复用
 - `init.defaultBranch=main` ，一致默认分支用于新仓库
 -跳过完全在…下`--yes` / CI (打印手动修复提示而不是)
11.提供到配置MCP其中applicable.
12.提示用于GitHub star如果`gh`是已通过身份验证.

**示例：**
```bash
cd /path/to/my-project
oma
# Follow the interactive prompts
```

### doctor（诊断） {#doctor}

检查CLI安装、MCP配置和技能状态。

```
oma doctor [--json] [--output <format>] [--profile]
```

**选项：**

|标志|说明|
|:-----|:-----------|
| `--json` |输出作为JSON |
| `--output <format>` |输出格式(`text`或`json`) |
| `--profile` |显示配置档健康状态矩阵.显示该已解析模型slug, CLI,和身份验证状态每个智能体从该活动`model_preset`和`agents:`覆盖.参见[按智能体模型](../guide/per-agent-models.md). |

**检查内容：**
- CLI安装: agy, claude, codex, qwen (版本和路径).
-身份验证状态用于每个CLI.
- MCP配置: `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
-已安装技能:该技能是存在和其状态.
-内存store目录: `.agents/state/memories/`存在和文件数量(较旧项目fall返回到该旧版`.serena/memories/`路径).
- Dual安装markers (项目vs全局)和相关警告.
-推荐**全局** Git配置(`gitRecommended`在JSON):
 - `rerere.enabled=true`
 - `init.defaultBranch=main`
 -每个mismatch计数toward `totalIssues`
-项目供应商上下文文件(e.g. `CLAUDE.md` / `AGENTS.md` OMA区块当该匹配CLI是已安装).
- AgentMemory,状态/钩子健康状态, Serena回收器诊断,和相关问题计数器.

**自动修复:**如果缺少技能是检测到, `doctor`提供到安装它们交互式地.如果推荐Git配置是缺少或错误,它提供该相同选择加入全局修复使用由安装/更新.

**示例：**
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

**选项：**

|标志|说明|
|:-----|:-----------|
| `-f, --force` |覆盖用户-customized配置文件(`oma-config.yaml`, `mcp.json`, `stack/`目录) |
| `--with-new-skills` |安装技能该是新在这release;不使用它,刷新仅技能已经已安装. |
| `--ci` |运行在非交互式CI模式(跳过提示,纯文本文本输出) |
| `-y, --yes` |跳过提示.供应商范围是unchanged:仅现有供应商目录是更新unless `--all`或`--vendor`是提供. |
| `--all` |创建/更新所有受支持项目-范围内供应商. |
| `--vendor <vendors>` |创建/更新指定供应商.接受一个comma-separated列出例如作为`claude,qwen`. |

**功能：**
1.获取`prompt-manifest.json`从该注册表到检查该最新版本.
2.比较使用该本地版本在`.agents/skills/_version.json`.
3.如果已经上到日期,退出.
4.下载和提取该最新tarball.
5. Preserves用户-customized文件(unless `--force`).
6.复制新文件覆盖`.agents/`.
7.恢复保留文件.
8.更新供应商适配和刷新符号链接.由默认这仅处理供应商目录该已经存在在该项目.
9.提供推荐**全局** Git配置(相同选择加入作为安装: `rerere.enabled`, `init.defaultBranch`).跳过在…下`--yes` / `--ci`.

**示例：**
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

`oma update mcp`有其自己的`--yes`, `--ci`, `--all`,和`--vendor <vendors>`选项.它选择受支持浏览器MCP服务器(Aside, Chrome DevTools,或Firefox DevTools)用于该选定项目-范围内供应商.

### uninstall（卸载）

预览或删除选定安装根目录中由OMA管理的文件：

```
oma uninstall --dry-run
oma uninstall --yes
```

`--dry-run`列出删除项不使用变更文件. `--yes`跳过该确认提示词.该命令保留`oma-config.yaml`, `mcp.json`,和用户编写技能根据到该注册命令说明.如果该预览包含一个文件你仍需要,停止和保留该试运行输出用于审查.

### link（链接） {#link}

从以下事实来源重新生成供应商原生文件： `.agents/`来源的事实来源无需重新安装。

```
oma link [vendors...] [--global]
```

**示例：**

```bash
# Regenerate all configured vendors
oma link

# Regenerate only Claude and Codex files
oma link claude codex

# Regenerate the HOME install (~/.agents/) from any directory
oma link opencode --global
```

不使用`--global`,链接目标`<cwd>/.agents/`;使用该选项时, `~/.agents/` (或`OMA_HOME`).参见[全局安装](../guide/global-install.md).

**功能：**
1.重建供应商原生智能体文件从`.agents/agents/`
2.刷新钩子和本地设置用于该选定供应商
3.重新生成`CLAUDE.md`, `GEMINI.md`,或`AGENTS.md`集成区块
4.刷新Cursor MCP链接和CLI技能符号链接当相关

使用这之后编辑`.agents/agents/`, `.agents/workflows/`, `.agents/rules/`,或钩子定义.

**模型行为:**
-相同-供应商原生调度使用该模型定义在该生成供应商智能体文件.
-外部回退调度使用每个供应商's `default_model`从`.agents/skills/oma-orchestration/config/cli-config.yaml`.

**调度行为:**
-如果该目标供应商匹配该当前运行时和该运行时支持原生角色智能体, OMA使用原生调度.
-否则OMA回退返回到`oma agent spawn`.

### setup (workflow)（setup（工作流））

该`/setup`工作流(调用内部一个智能体会话)提供交互式配置的语言, CLI安装, MCP连接,和智能体-CLI mapping.这是不同从`oma` (该安装器): `/setup` configures一个已安装实例.
---

## 监控与指标

### dashboard（仪表盘）

启动终端仪表盘，实时监控智能体。

```
oma dashboard terminal
```

没有选项. Watches `.agents/state/memories/`在该当前目录(较旧项目fall返回到该旧版`.serena/memories/`路径).渲染一个box-drawing UI使用会话状态,智能体表格,和activity feed.更新在每文件变更. Press `Ctrl+C`到退出.

该内存目录可以是覆盖使用该`MEMORIES_DIR`环境变量.

**示例：**
```bash
# Standard usage
oma dashboard terminal

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal
```

### dashboard web（Web 仪表盘）

启动Web仪表盘。

```
oma dashboard web
```

启动一个HTTP服务器在`http://localhost:9847`使用一个WebSocket连接用于实时更新.打开该URL在一个浏览器到参见该仪表盘.

**环境变量:**

|变量|默认|说明|
|:---------|:--------|:-----------|
| `DASHBOARD_PORT` | `9847` | Port用于该HTTP/WebSocket服务器|
| `MEMORIES_DIR` | `{cwd}/.agents/state/memories` |路径到该内存目录(回退返回到该旧版`{cwd}/.serena/memories`用于较旧项目) |

**示例：**
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

**选项：**

|标志|说明|
|:-----|:-----------|
| `--json` |输出作为JSON |
| `--output <format>` |输出格式(`text`或`json`) |

**跟踪的指标：**
-会话数量
-技能使用(使用频率)
-任务已完成
-总计会话时间
-文件变更,行新增,行删除
-最后更新时间戳

**成本遥测** (汇总跨每`session-cost-*.md`文件在…下`.agents/state/memories/`):
-总计输入令牌(提示词character近似,没有输出令牌yet)
-总计生成次数
-估算USD使用一个保守按供应商输入-令牌速率表格(Claude $3/M, Codex $5/M, Gemini $0.3/M, Qwen $0/M, Cursor $5/M, Antigravity $0.3/M)
-按供应商明细(令牌·生成次数· USD)

该估算是一个下限,不一个精确计费amount.配置`session.quota_cap`在`.agents/oma-config.yaml`到enforce hard预算在spawn时间;参见该Why oh-my-智能体page在Getting Started用于该quality-首先工具集这些caps belong到.

指标是存储在`.agents/state/metrics.json`;一个旧版`.serena/metrics.json`是读取当存在. Data是收集从Git统计和内存文件.

**示例：**
```bash
# View current metrics
oma stats get

# JSON output
oma stats get --json

# Reset all metrics
oma stats reset
```

### recap（回顾）

汇总以下工具之间的AI对话历史： Claude, Codex, Qwen,和Cursor会话.

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

**选项：**

|标志|说明|默认|
|:-----|:-----------|:--------|
| `--window <period>` |时间窗口: `1d`, `3d`, `7d`, `2w`, `30d` | `1d` |
| `--date <date>` |指定日期(`YYYY-MM-DD`); takes precedence覆盖`--window` | |
| `--tool <tools>` | Comma-separated filter: `grok,claude,codex,qwen,cursor,antigravity` |所有|
| `--top <n>` |显示top N项目/topics | |
| `--sort <metric>` |排序由`count`或`duration` | `count` |
| `--mermaid` |输出作为Mermaid甘特图chart | |
| `--graph` |打开交互式图形在该浏览器| |
| `--json` / `--output <format>` |机器可读输出| `text` |

**示例：**

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

**参数：**

|参数|说明|默认|
|:---------|:-----------|:--------|
| `window` |时间窗口用于analysis (e.g., `7d`, `2w`, `1m`) |最后7天|

**选项：**

|标志|说明|
|:-----|:-----------|
| `--json` |输出作为JSON |
| `--output <format>` |输出格式(`text`或`json`) |
| `--interactive` |交互式模式使用手动入口|
| `--compare` |比较当前窗口vs之前相同长度窗口|

**显示内容：**
-适合发布的摘要(一个-行指标)
-摘要表格(提交,文件变更,行新增/删除,贡献者)
-趋势vs最后retro (如果previous快照存在)
-贡献者排行榜
-提交时间分布(hourly histogram)
-工作会话
-提交类型明细(feat,修复, chore, etc.)
-热点(大多数-变更文件)

**示例：**
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

列出当前项目的OMA工作流会话。显式全局发现
列出会话跨项目在…内该选定本地配置档:

```bash
oma state list
oma state list --all-projects --json
oma state list --all-projects --project /path/to/project
oma state list --all-projects --search migration
```

`--all-projects`是只读.它不能是combined使用会话activation或
maintenance.正常会话读取和写入保留其项目范围.
其他仓库'旧版会话必须首先迁移到HOME存储之前
它们appear在该aggregate listing.

### profile（配置档）

管理以下位置的本地存储配置档： `~/.oma/u/<slot>/`.槽位是
non-negative decimal integers;它们是独立从模型presets和
供应商login账户.

```bash
oma profile list --json
oma profile create 1
oma profile show
eval "$(oma profile use 1 --shell zsh)"
oma profile show
oma profile run 1 -- oma state list --all-projects --json
```

`profile use`打印shell activation; evaluating它设置`OMA_PROFILE`在该
当前shell.它does不modify该父级shell当运行在其自己的,变更
已经-运行中applications,或save一个独立CLI-仅默认. CLI命令
和供应商钩子started从该已激活shell继承该相同配置档.
该默认是配置档`0`; `OMA_STATE_HOME`覆盖该存储根目录.
`profile run <slot> -- <command> [args...]`选择该配置档用于仅该
命令和其子级.该separator keeps child选项例如作为`--help`
和`--json`附加到该child命令.

---

## 智能体管理

### agent spawn（生成智能体）

生成一个子智能体进程。

```
oma agent spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>] [--isolation <mode>]
```

**参数：**

|参数|必填|说明|
|:---------|:---------|:-----------|
| `agent-id` |是|智能体类型.一个的: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` |是|任务说明.可以是内联文本或一个路径到一个文件. |
| `session-id` |是|会话标识符(格式: `session-YYYYMMDD-HHMMSS`) |

**选项：**

|标志|说明|
|:-----|:-----------|
| `--vendor <vendor>` | CLI供应商覆盖: `antigravity`, `claude`, `codex`, `cursor`, `qwen`, `grok`, `pi` |
| `-w, --workspace <path>` |可用目录用于该智能体.自动检测从monorepo配置如果省略. |
| `--isolation <mode>` |每个-spawn隔离模式.当前支持`worktree`:创建一个新鲜Git worktree在`${tmpdir}/oma-worktrees/{sessionId}/{agentId}`在分支`oma/{sessionId}/{agentId}`和运行该智能体那里.该worktree是保留之后退出;合并或discard命令是打印用于手动审查(没有auto-合并). |
| `--read-only` | Restrict该spawned智能体到non-destructive工具(suppresses auto-approve标志).使用internally由`oma skill eval --live`用于两者评估执行臂. |
| `--fallback-vendors <vendors>` |退出在到一个ordered, comma-separated链的上到three已配置CLI供应商. Continuation需要一个识别配额/速率限制/暂时性失败和一个新鲜安全交接检查点. |

**供应商解析顺序：** `--vendor`标志> `agents:`覆盖在`oma-config.yaml` >活动`model_preset`智能体默认值.

**提示词解析：**如果该提示词参数是一个路径到一个现有文件,该文件contents是使用作为该提示词.否则,该参数是使用作为内联文本.供应商特定执行protocols是appended自动.

**退出码：**

|代码|含义|
|:-----|:--------|
| `0` |供应商进程exited 0和一个会话结果产物存在在…下该工作区. |
| `3` |供应商进程exited 0 but wrote **没有会话结果产物**在…下该工作区(e.g. agy writing到其自己的可信根目录而不是的`-w`).一个`blocker.raised`事件是appended到该会话轨迹和`agent status`报告`no-artifact`. Do不处理该spawn作为已完成. |
|其他|该供应商进程itself失败;其退出代码是通过通过. |

**示例：**
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

**供应商故障转移:**回退候选必须有一个供应商入口在该
已安装CLI配置.每个尝试使用其目标供应商's模型
配置和传递通过该现有会话配额检查.该`pi`
多供应商代理是excluded从这初始供应商回退feature.
没有附加供应商凭据或付费API路由是created.

当故障转移是enabled,该任务receives instructions到prepare一个
按运行安全交接记录在…下`.agents/results/`.一个后继者读取
该记录和检查该工作区之前continuing该剩余工作.
配额耗尽不使用一个可用检查点停止使用一个需要审查
记录.取消,普通任务失败,和已完成运行do不启动
另一个尝试. `--read-only` does不waive该检查点requirement.

会话事件记录该转换原因和来源/目标供应商;每个
尝试有其自己的运行身份和该后继者链接到其前驱.
这应用到subprocesses启动由`oma agent spawn`;它does不
自动切换一个现有交互式对话在一个供应商应用.
Omitting `--fallback-vendors` preserves该通常单供应商执行.

### agent status（智能体状态）

检查一个或多个子智能体的状态。

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

**参数：**

|参数|必填|说明|
|:---------|:---------|:-----------|
| `session-id` |是|该会话ID到检查|
| `agent-ids` |没有| Space-separated列出的智能体IDs.如果省略,没有输出. |

**选项：**

|标志|说明|默认|
|:-----|:-----------|:--------|
| `-r, --root <path>` |根目录路径用于内存检查|当前目录|

**状态值：**
- `completed`:结果文件存在(使用可选状态header).
- `running`: PID文件存在和进程是存活.
- `crashed`: PID文件存在but进程是已停止,或没有PID/结果文件找到.
- `no-artifact`:供应商进程exited 0 but wrote没有会话结果产物在…下该工作区(静默写错位置写入，参见`agent spawn`退出代码`3`).处理作为一个失败spawn.

**输出格式：**一个行每个智能体: `{agent-id}:{status}`

**示例：**
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
oma agent parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

**参数：**

|参数|必填|说明|
|:---------|:---------|:-----------|
| `tasks` |是| Either一个YAML任务文件路径,或(使用`--inline`)内联任务规格|

**选项：**

|标志|说明|
|:-----|:-----------|
| `--vendor <vendor>` | CLI供应商覆盖用于所有智能体|
| `-i, --inline` |内联模式: specify任务作为`agent:task[:workspace]`参数|
| `--no-wait` |后台模式(启动智能体和return立即) |

**YAML任务文件格式：**
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional, auto-detected if omitted
- agent: frontend
task: "Build user dashboard"
workspace: ./web
```

**内联任务格式：** `agent:task`或`agent:task:workspace` (工作区必须启动使用`./`或`/`).

**结果目录：** `.agents/results/parallel-{timestamp}/`包含日志文件用于每个智能体.

**示例：**
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

使用外部AI CLI运行代码审查(codex, claude, qwen,或grok).

```
oma agent review [--vendor <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**选项：**

|标志|说明|
|:-----|:-----------|
| `--vendor <vendor>` | CLI供应商到使用: `codex`, `claude`, `qwen`,或`grok`.默认值到`codex`当该已解析配置供应商是unsupported. |
| `-p, --prompt <prompt>` |自定义审查提示词.如果省略,一个默认代码审查提示词是使用. |
| `-w, --workspace <path>` |路径到审查.默认值到该当前可用目录. |
| `--no-uncommitted` |跳过未提交变更审查.当set,仅已提交变更在该会话是reviewed. |

**功能：**
-检测该当前会话ID自动从该环境或最近Git activity.
-用于`codex`:使用该原生`codex review`子命令.
-用于`claude`, `qwen`: constructs一个提示词-based审查请求和invokes该CLI使用该审查提示词.
-由默认, reviews未提交变更在该可用目录.
-使用`--no-uncommitted`, restricts审查到变更已提交在…内该当前会话.

**示例：**
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

为活动的持久工作流附加目标契约(orchestrate, ultrawork,工作, ralph).该契约是强制机械地由该持久模式停止钩子，完成停止是一个模型判断调用.

```
oma goal set [--workflow <name>] [--session-id <id>] [--gate <keyword>] [--budget-minutes <n>] [--description <text>]
```

**选项：**

|标志|说明|
|:-----|:-----------|
| `--gate <keyword>` |确定性停止门槛: `typecheck`, `test`,或`lint`. Maps到该包.json脚本的该相同名称,运行作为一个参数数组array使用没有shell.同时set,该停止钩子允许该工作流到结尾**仅当这脚本传递**;在失败它区块使用该输出tail因此该智能体knows什么到修复. Free-形式命令是拒绝，该门槛值lives在一个智能体-可写状态文件,因此executing arbitrary strings从它会bypass该权限layer. |
| `--budget-minutes <n>` | Wall-clock预算measured从工作流activation.当exceeded,该停止钩子deactivates该工作流和允许一个honest partial停止(machine verdict,已记录作为`gate.failed`使用`gate: "budget"`在该会话事件轨迹). |
| `--description <text>` |人类说明的该objective. Informational仅. |
| `--workflow <name>` |目标工作流当several持久工作流是活动. |
| `--session <id>` |目标会话ID suffix的该状态文件. |

**行为说明：**
-门槛通过→工作流deactivates, `gate.passed`是emitted,该停止是allowed.
-门槛失败和超时(60s hard cap)两者数量toward该强化限制(5),因此一个permanently red门槛不能阻止停止forever;该2-小时陈旧过期仍是作为该最终后备机制.
-不使用一个目标契约,持久模式behaves准确地作为之前(强化提示仅) ，该契约是完全选择加入.

**示例：**
```bash
# After starting /ultrawork: require typecheck to pass before the session may end
oma goal set --gate typecheck

# Bound an autonomous run: stop honestly after 2 hours even if incomplete
oma goal set --workflow ultrawork --gate test --budget-minutes 120
```

---

## 计划智能体

### schedule create（创建计划任务）

注册计划智能体任务。准确地一个的`--cron`或`--every`是必填.

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [-m <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>]
```

**参数：**

|参数|必填|说明|
|:---------|:---------|:-----------|
| `agent-id` |是|智能体类型: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` |是|任务说明通过到该智能体在触发时间|

**选项：**

|标志|说明|
|:-----|:-----------|
| `--cron "<expr>"` | 5-字段cron expression (e.g. `"0 9 * * *"`). Mutually exclusive使用`--every`. |
| `--every "<phrase>"` |自然语言间隔: `5m`, `2h`, `1d`, `every 20m`, `every 5 minutes`. Rounds到nearest cron-expressible step和打印一个说明. Mutually exclusive使用`--cron`. |
| `--vendor <vendor>` | CLI供应商覆盖通过到`oma agent spawn`: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`.默认值到auto-检测. |
| `-w, --workspace <path>` |可用目录用于该智能体.默认值到当前目录在registration时间. |
| `--once` |一个-shot模式:触发一次,然后自行删除. |
| `--expires-after <duration>` | Auto-expire recurring任务之后N天(`0` = indefinite). |
| `--env <KEY1,KEY2>` |采集命名env vars到`~/.agents/schedule/env/<id>` (0600)用于injection在运行时间.仅列出的键是captured;从不一个完整env dump. |

**功能：**
1. Parses和校验该cron expression (或转换该`--every`短语到cron).
2.写入该任务到`~/.agents/schedule/schedules.json` (全局清单,权限0600).
3.注册该任务使用该操作系统调度器(launchd / systemd --user/ schtasks).该操作系统任务调用`oma schedule run <id>`在该已配置间隔.

**示例：**
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

参见该[计划智能体指南](../guide/scheduled-agents.md)用于一个完整walkthrough.

### schedule list（列出计划任务）

按项目分组列出所有项目的计划任务及操作系统漂移状态。

```
oma schedule list [--json]
```

**选项：**

|标志|说明|
|:-----|:-----------|
| `--json` |输出作为JSON |

**漂移状态：** `synced` (清单+操作系统agree), `missing-in-os` (运行`schedule sync`到修复), `orphan-in-os` (操作系统有一个任务不在清单;运行`schedule sync --prune`到删除).

**示例：**
```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

### schedule delete（删除计划任务）

从清单和操作系统调度器中删除计划任务。

```
oma schedule delete <id>
```

**参数：**

|参数|必填|说明|
|:---------|:---------|:-----------|
| `id` |是|任务ID从`schedule list` (格式: `sch_<base32-12>`) |

**示例：**
```bash
oma schedule delete sch_abc123def456
```

### schedule run（运行计划任务）

按ID执行计划任务。这是该入口point called由该操作系统调度器在触发时间.不通常调用由hand, but可以是使用到调试一个任务.

```
oma schedule run <id>
```

**功能：**
1. Looks上`<id>`在该清单(退出non-零如果不找到).
2. Loads captured env vars从`~/.agents/schedule/env/<id>`和注入它们.
3.调用`oma agent spawn <agentId> <prompt> <sessionId> --vendor <vendor> -w <workspace>`.
4.写入该结果到`~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`.
5.更新`lastFiredAt`在该清单;自行删除如果任务是`--once`.
6.明确失败在身份验证过期:退出non-零和打印`re-auth required: <vendor>`到标准错误.从不静默地succeeds.

**示例：**
```bash
# Invoke manually to debug a job
oma schedule run sch_abc123def456
```

### schedule sync（同步计划任务）

将清单重新同步到操作系统调度器。 Repairs漂移之后系统migrations或操作系统调度器resets.

```
oma schedule sync [--prune]
```

**选项：**

|标志|说明|
|:-----|:-----------|
| `--prune` |也删除操作系统任务不存在在该清单(孤立-在-操作系统).不使用`--prune`, orphans是报告but不删除. |

**示例：**
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

**选项：**

|标志|说明|
|:-----|:-----------|
| `--json` |输出作为JSON |
| `--output <format>` |输出格式(`text`或`json`) |
| `--force` |覆盖空或现有架构文件|

**功能：**创建该`.agents/state/memories/`目录结构使用初始架构文件该智能体和工作流使用用于reading和writing coordination状态.

**示例：**
```bash
# Initialize memory
oma memory init

# Force overwrite existing schema
oma memory init --force
```

---

## 集成与工具

### auth status（身份验证状态）

检查所有受支持CLI的身份验证状态。

```
oma auth status [--json] [--output <format>]
```

**选项：**

|标志|说明|
|:-----|:-----------|
| `--json` |输出作为JSON |
| `--output <format>` |输出格式(`text`或`json`) |

**检查：** GitHub CLI (`gh`), Antigravity CLI (`agy`), Gemini CLI, Claude CLI, Codex CLI, Cursor CLI, Qwen CLI.

**示例：**
```bash
oma auth status
oma auth status --json
```

### bridge（桥接）

将MCP stdio代理到按项目共享的Serena服务器。

```
oma bridge [url] [--context <name>]
```

**参数：**

|参数|必填|说明|
|:---------|:---------|:-----------|
| `url` |没有|连接到一个调用方管理端点而不是的resolving一个共享守护进程|
| `--context` |没有| Serena上下文用于该守护进程(默认`ide`); daemons是按…键控由它|

**功能：**这是什么每供应商's serena MCP入口运行由默认，
你do不invoke它由hand. Serena's stdio transport gives每个智能体会话
其自己的Python进程加上一个完整语言服务器栈,因此该成本扩展
使用该数字的打开会话.该bridge collapses该到一个服务器每个
项目:它resolves该项目根目录从该可用目录,启动一个
`--project`-pinned Serena HTTP服务器如果无是运行中,和代理该
会话onto它.

固定`--project`重要，一个服务器started不使用它公开该
`activate_project` tool, letting任何会话切换该项目out从在…下
每其他一个.

**架构：**
```
session A --stdio--> oma bridge --.
                                   >-- HTTP --> one Serena server (+ LSPs)
session B --stdio--> oma bridge --'
```

**生命周期：**该首先会话启动该服务器,之后ones复用它,和
每个代理注册itself作为一个客户端.当该最后会话分离该
服务器是保持保持活跃用于10分钟，一个restart重新连接，和是否则
关闭下由该下一步bridge到启动.如果该共享服务器不能是到达,
该代理回退返回到一个会话-本地stdio serena.

退出out使用`serena.mode: stdio`在`.agents/oma-config.yaml`.

**示例：**
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

**`verify agent`参数:**

|参数|必填|说明|
|:---------|:---------|:-----------|
| `agent-type` |是|一个的: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |

**选项：**

|标志|说明|默认|
|:-----|:-----------|:--------|
| `-w, --workspace <path>` |工作区路径到验证|当前目录|
| `--json` |输出作为JSON | |
| `--output <format>` |输出格式(`text`或`json`) | |

**功能：**运行该验证脚本用于该specified智能体类型,检查构建成功,测试结果,和范围合规.

`verify triggers`测量关键词检测器准确率针对一个带标签提示词语料库.该百分比阈值是门槛.该注册路径是`verify agent`;该旧top-级别写法可能仍appear在兼容性帮助.

**通用检查（所有智能体类型）：**
- **范围检查**:读取`.agents/results/plan-{sessionId}.json`任务scopes.比较`git diff`变更文件针对定义范围模式.失败如果文件是modified outside该智能体's assigned范围.
- **Charter Preflight**: Verifies `result-{agent}.md`包含一个正确地filled `CHARTER_CHECK:`阻止使用没有unfilled占位符.
- **Hardcoded密钥**: Scans `.py`, `.ts`, `.tsx`, `.js`, `.dart`文件用于模式like `password = "..."`, `api_key = "..."` (排除测试/示例文件).
- **TODO/FIXME Comments**:计数`TODO`, `FIXME`, `HACK`, `XXX` comments (警告如果任何找到).

**按智能体类型的附加检查：**

|智能体类型|附加检查|
|:-----------|:-----------------|
| `backend` | Python syntax校验(`py_compile`), SQL injection检测(f-string + SQL keywords), Python测试执行(`pytest`) |
| `frontend` | TypeScript compilation (`tsc --noEmit`),内联风格检测(`style={{`), `any`类型usage (失败如果> 3), frontend tests (`vitest`) |
| `mobile` | Flutter/Dart analysis (`flutter analyze`或`dart analyze`), Flutter tests (`flutter test`) |
| `qa` | Self-检查验证|
| `debug` |运行Python tests或frontend tests based在检测到项目类型|
| `pm` |校验`.agents/results/plan-{sessionId}.json`存在和是有效JSON |

**输出格式：**
每个检查报告`PASS`, `FAIL`, `WARN`,或`SKIP`使用一个详情消息.总体结果是`ok: true`仅如果零检查失败.

**示例：**
```bash
# Verify backend output in default workspace
oma verify agent backend

# Verify frontend in specific workspace
oma verify agent frontend -w ./apps/web

# JSON output for CI
oma verify agent backend --json
```

### hook（钩子）

通过集中式oma钩子路由器分发供应商钩子事件(design 019).这是该规范ABI调用由每供应商's生成`oma-hook.sh` wrapper.它可以也是使用直接到调试或测试处理器链在隔离.

```
oma hook run --vendor <v> --event <nativeEvent> [--matcher <tool>]
```

**选项：**

|标志|必填|说明|
|:-----|:---------|:-----------|
| `--vendor <v>` |是|供应商身份.一个的: `antigravity`, `claude`, `codex`, `commandcode`, `cursor`, `grok`, `kimi`, `kiro`,或`qwen`. (该`pi`供应商是**不**有效这里，它使用该在-进程`installPiExtension` bridge而不是的`oma hook run`.) |
| `--event <e>` |是|原生钩子事件名称作为注册在该供应商设置(e.g. `UserPromptSubmit`, `PreToolUse`, `Stop`) |
| `--matcher <m>` |没有|可选tool名称/ matcher forwarded从该钩子registration (e.g. `Bash`) |

**标准输入/标准输出契约:**
- **标准输入**:供应商原生JSON载荷(该相同对象该供应商传递到钩子进程).
- **标准输出**:供应商-方言JSON (或纯文本文本用于kiro提示)当一个处理器触发;空当没有处理器produces输出.
- **退出代码**:始终`0` (失败-打开，错误是写入到标准错误和该智能体是从不阻塞).

**运行时data流程:**
```
vendor fires: oma-hook.sh --vendor claude --event UserPromptSubmit
  stdin: {"prompt":"...","cwd":"/project","sessionId":"..."}
  → oma hook resolves handler chain from .agents/hooks/variants/claude.json
  → runs: keyword-detector → state-boundary → skill-injector (in-process)
  → merges HandlerResult values (context: concat; pre_tool: last mutate wins; stop: any block)
  → emits vendor dialect to stdout
  → exit 0
```

**Debugging处理器链在隔离:**

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

空标准输出means该链produced一个没有-op用于该事件.一个JSON对象在标准输出是该供应商方言该智能体会话会receive.

**范围notes:**
- `statusLine`/hud条目是不routed通过`oma hook run` (hot-路径显示stays在一个direct `bun`路径).
-该pi供应商使用其在-进程`installPiExtension` bridge,不`oma hook run`.

参见`cli/commands/hook/command.ts`用于该router implementation (internally referred到作为"design 019")和`cli/commands/hook/probe/`用于该按供应商兼容性矩阵.

**示例：**
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

探测按供应商钩子兼容性和打印一个覆盖率矩阵.

```
oma hook probe [--vendor <list>] [--output <fmt>] [--hooks-dir <dir>]
```

**选项：**

|标志|说明|默认|
|:-----|:-----------|:--------|
| `--vendor <list>` | Comma-separated供应商到探测|所有受支持供应商|
| `--output <fmt>` |输出格式： `text`, `md`,或`json` | `text` |
| `--hooks-dir <dir>` |覆盖该`.agents/hooks/core`目录|自动检测|

**检查内容：**用于每个供应商,探测whether该core钩子scripts (`keyword-detector`, `persistent-mode`, etc.)是存在和whether该变体JSON maps事件correctly到处理器链.退出代码`1`如果任何供应商报告`failed`状态.

**示例：**
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

Manage API键和其他密钥在该操作系统密钥链(macOS密钥链, Linux密钥Service,或Windows凭据Manager), backed由`@napi-rs/keyring`.值从不appear在shell历史或环境文件;仅密钥名称是跟踪在`~/.config/oma/vault-index.json`因此`oma vault list`可以enumerate不使用exposing密钥值.

```
oma vault store <name> [--value <value>]
oma vault get <name>
oma vault list [--json]
oma vault delete <name>
```

**Sub-命令:**

| Sub-命令|说明|
|:------------|:-----------|
| `store <name>` |提示用于一个密钥值(隐藏输入)和写入它在…下`name`在该操作系统密钥链. `--value <value>`接受该值内联用于非交互式使用(可见在shell历史; prefer该提示词). |
| `get <name>` |打印该存储值到标准输出使用没有decoration因此它可以是使用内部shells: `export ANTHROPIC_API_KEY=$(oma vault get anthropic)`.退出使用代码`2`当该密钥does不存在. |
| `list` |列出存储密钥名称使用其`createdAt` timestamps.值是从不displayed. |
| `rm <name>` |删除该密钥从该密钥链和该索引. |

**密钥名称rules:** 1-64字符从`[A-Za-z0-9._-]`.示例： `anthropic`, `openai-prod`, `github_pat`, `sentry.dsn`.

**原生依赖:**该`@napi-rs/keyring`原生module是loaded lazily;如果它失败到load (用于示例, headless Linux不使用`libsecret`或`gnome-keyring`),该命令surfaces一个显式错误使用一个安装hint而不是的falling返回静默地.

**示例：**
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

清理上孤立子智能体进程和temp文件.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**选项：**

|标志|说明|
|:-----|:-----------|
| `--dry-run` |显示什么会是已清理不使用making变更|
| `-y, --yes` |跳过确认提示和清理everything |
| `--json` |输出作为JSON |
| `--output <format>` |输出格式(`text`或`json`) |

**什么它cleans:**
-孤立PID文件在该系统temp目录(`/tmp/subagent-*.pid`).
-孤立日志文件(`/tmp/subagent-*.log`).
- **孤立Serena语言服务器** ，当一个MCP客户端(e.g. Claude)退出,其`serena start-mcp-server` reparents到init和其LSP子级(`tsserver`, `pyright`, …, hundreds的MB)保留运行中使用没有客户端.这些是reaped这里.该*空闲-but-仍-附加* case是处理分别由[`serena reap`](#serena).
- Gemini Antigravity目录(brain, implicit, knowledge)在…下`.gemini/antigravity/`.

**示例：**
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

回收内存从Serena's按项目语言服务器. Serena生成次数一个LSP
栈(`tsserver`, `pyright`, …, ~300 MB)每个打开项目和keeps它保持活跃用于
该整个会话，使用several项目打开这adds上.该回收器kills
空闲LSP子级; Serena self-heals和respawns它们在该下一步tool调用(没有
restart needed).

```
oma serena reap [--dry-run] [--quiet]
oma serena reaper enable [--dry-run]
oma serena reaper disable [--dry-run]
```

**子命令:**

|命令|说明|
|:--------|:-----------|
| `serena reap` |回收空闲LSPs一次now.交互式运行始终execute; `--quiet` (该计划路径) honors该`enabled`选择加入. |
| `serena reap --dry-run` |预览回收目标和projected freed内存，从不kills. |
| `serena reaper enable` |安装一个后台任务该运行`serena reap --quiet`每5分钟(launchd / systemd timer / Windows任务调度器). |
| `serena reaper disable` |删除该后台任务. |

**Policy:** `lru` (默认) keeps该`keepWarm`大多数-最近-活动项目
保持活跃和reaps该rest; `idle` reaps任何项目空闲past `idleMinutes`.一个
`graceSeconds`窗口protects在-flight tool调用.

**配置** (`.agents/oma-config.yaml`,选择加入， disabled由默认):

```yaml
serena_reaper:
  enabled: false     # gates the scheduled (--quiet) path; interactive reap always runs
  policy: lru        # lru | idle
  keepWarm: 2        # LRU: keep this many most-recently-active projects warm
  idleMinutes: 10    # idle threshold / LRU secondary floor
  graceSeconds: 90   # in-flight protection; SIGTERM→SIGKILL window
```

诊断(按项目保留/回收状态和该activity信号来源)是
shown由[`oma doctor`](#doctor).孤立(已停止-客户端) Serena LSPs是reaped
由[`oma cleanup`](#cleanup) regardless的这设置.

**示例：**
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

Visualize项目结构作为一个依赖图形.

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

`viz`是一个构建-在别名用于`visualize`.

**选项：**

|标志|说明|
|:-----|:-----------|
| `--json` |输出作为JSON |
| `--output <format>` |输出格式(`text`或`json`) |

**功能：** Analyzes该项目结构和generates一个依赖图形showing relationships在…之间技能,智能体,工作流,和共享资源.

**示例：**
```bash
oma visualize
oma viz --json
```

### search（搜索）

Mechanical搜索primitives covering获取,元数据, RSS,媒体,代码,和信任scoring. Aliased作为`oma s`.所有子命令输出JSON到标准输出(一个对象每个行,或pretty-打印使用`--pretty`).

```
oma search <subcommand> ...
oma s <subcommand> ...
```

**子命令:**

|子命令|用途|
|:-----------|:--------|
| `fetch <url>` |获取URL通过自动升级策略流水线(API →探测→ impersonate →浏览器→归档) |
| `api <url>` |获取通过matched平台API处理器(阶段0) |
| `api:search <query>` | Fan-out关键词搜索跨平台该支持它(`--platforms <list>`) |
| `meta <url>` |解压OGP / JSON-LD /架构.org元数据|
| `rss <url>` |发现和parse RSS / Atom feed |
| `rss:google <query>` |构建一个Google News RSS URL用于一个查询|
| `media <url>` |解压媒体元数据通过`yt-dlp` (1858 sites) |
| `archive <url>` |获取通过AMP /归档.today / Wayback回退|
| `trust <domain>` |解析信任级别/评分用于一个域名|
| `code <query>` |搜索代码通过`gh` (GitHub)或`glab` (GitLab) |
| `doctor` |检查依赖(Chrome, `python3` + `curl_cffi`, `yt-dlp`, `gh`) |

**通用选项在URL/查询子命令:**

|标志|说明|默认|
|:-----|:-----------|:--------|
| `--timeout <seconds>` |每个-策略超时| `15` (`30`用于`media`) |
| `--locale <value>` | `Accept-Language` header | `en-US,en;q=0.9` |
| `--pretty` |美化打印JSON输出| `false` |

**`fetch`额外项:**

|标志|说明|
|:-----|:-----------|
| `--only <strategies>` | Comma-separated策略到运行(`api,probe,impersonate,browser,archive`) |
| `--skip <strategies>` | Comma-separated策略到跳过|
| `--include-archive` | Append归档策略作为一个最后回退|

**`media`额外项:**

|标志|说明|
|:-----|:-----------|
| `--subs` |写入subtitles |
| `--sub-lang <list>` | Subtitle languages, comma-separated (默认: `en`) |
| `--format <spec>` | yt-dlp格式规格|

**`code`额外项:**

|标志|说明|默认|
|:-----|:-----------|:--------|
| `--host <github\|gitlab>` |主机| `github` |
| `--language <lang>` |语言filter | |
| `--repo <owner/repo>` |范围到一个repo | |
| `--limit <n>` | Max结果| `20` |

**退出码：** `0`正常, `1`错误, `2`阻塞, `3`未找到, `4`无效输入, `5`需要身份验证, `6`超时.

**示例：**

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

注册表也公开这些显式发现helpers:

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

`search`发出JSON even不使用`--json`. `--pretty`变更演示文稿仅;它does不变更该结果架构. `search web`接受`--provider`, `--limit`, `--timeout`, `--json`,和`--pretty`.如果一个策略是阻塞或一个依赖是缺少,使用该退出代码表格上面和rerun `oma search doctor`之前变更策略.

### image（图像）

Multi-供应商AI图像生成使用身份验证-aware并行调度. Aliased作为`oma img`.

```
oma image <subcommand> ...
oma img <subcommand> ...
```

**子命令:**

|子命令|用途|
|:-----------|:--------|
| `generate <prompt...>` |生成图像通过`pollinations` (flux/zimage, free), `codex` (gpt-图像-2通过ChatGPT OAuth),或`antigravity` (nano-banana通过Gemini代码Assist subscription, keyless) |
| `doctor` |检查身份验证和安装状态每个供应商|
| `vendor list` |列出注册供应商和受支持模型|

**`image generate`选项:**

|标志|说明|默认|
|:-----|:-----------|:--------|
| `--vendor <name>` | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all` | `auto` |
| `--size <size>` |任何`WxH`使用edges divisible由16, 16–3840,和aspect ratio 1:3–3:1; `auto`是也已接受. |供应商默认|
| `--quality <level>` | `low` \| `medium` \| `high` \| `auto` |供应商默认|
| `-n, --count <n>` |数字的图像(1..5) | `1` |
| `--output-dir <path>` |输出目录| `.agents/results/images/{timestamp}/` |
| `--allow-external-output` |允许输出路径outside `$PWD` | `false` |
| `--model <name>` |供应商特定模型覆盖;忽略由`antigravity`, whose模型是opaque. |供应商默认|
| `--timeout <duration>` |每个-图像超时|供应商默认|
| `-r, --reference <path>` |参考图像(s); repeatable或comma-separated.受支持在`codex`和`antigravity`;拒绝在`pollinations`.每个≤5MB PNG/JPEG/GIF/WebP (magic-byte validated), max 10. | |
| `-y, --yes` |跳过成本确认| `false` |
| `--no-prompt-in-manifest` | Store SHA256的提示词而不是的raw文本| `false` |
| `--dry-run` |打印规划和成本估算; do不execute | `false` |
| `--output <format>` | CLI输出格式: `text` \| `json` | `text` |

每个运行写入一个`manifest.json`下一步到该生成图像recording供应商,模型,提示词(或hash),规模, quality,和成本.

**示例：**

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

规划,作者,和渲染简短-形式,解释器,和demo视频. `generate`创建该概要,脚本,渲染specification,和运行清单;一个合成和一个可用合成器是必填之前一个real MP4可以是渲染.

```
oma video generate "three ways to reduce build times" --mode shorts --dry-run --output json
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --output json
oma video doctor --output json
oma video provider list --output json
oma video compose <runDir> --output json
oma video render <runDir> --output json
```

`generate`接受`--mode shorts|explainer|demo`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor remotion|mpt`, `--capture`, `--source file|web`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout`,和`--capture-stop duration:<seconds>|selector:<css>`.使用`--source web --url <url>`用于一个浏览器采集; `--source file`是该默认. `--output-dir`选择该运行根目录, `--allow-external-output` permits一个路径outside `$PWD`, `--max-usd`设置一个成本ceiling, `--seed` stabilizes规划输入,和`--no-brief-in-manifest` stores一个概要hash而不是的其文本. `--dry-run`停止之后规划. `--output text|json`控制该CLI envelope.

`doctor`检查该cached Remotion/MPT工具链和接受`--install`, `--upgrade`, `--install-mpt`,和`--install-strudel`. `provider list`报告供应商availability和密钥状态. `compose` scaffolds或刷新该运行合成和报告该编写契约; `render`类型检查,渲染,和探测该输出.缺少合成器,合成,或工具链依赖是错误.该测试-仅`OMA_VIDEO_MOCK=1`路径是该sole占位符模式;一个正常运行从不substitutes一个文本或tiny-文件MP4.

成功JSON输出包含`runDir`, `manifestPath`, `scriptPath`,和`renderSpecPath`;该清单记录选定供应商,输入,和生成assets.之后`compose`,作者该生成合成根据到其`AUTHORING.md`,然后rerun `render`.如果一个供应商密钥是不可用,运行`oma video doctor`;如果采集失败,检查该URL, selector, device,和超时;如果rendering失败,修复该合成诊断之前retrying.

### star（Star）

Star oh-my-智能体在GitHub.

```
oma star
```

没有选项.需要`gh` CLI到是已安装和已通过身份验证. Stars该`first-fluke/oh-my-agent`仓库.

**示例：**
```bash
oma star
```

### describe（描述）

描述CLI命令作为JSON用于运行时内省.

```
oma describe [command-path]
```

**参数：**

|参数|必填|说明|
|:---------|:---------|:-----------|
| `command-path` |没有|该命令到描述.如果省略, describes该根目录program. |

**功能：** Outputs一个JSON对象使用该命令's名称,说明,参数,选项,和子命令.使用由AI智能体到understand可用CLI capabilities.

**示例：**
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

这些命令族是有用当该输出是一个研究产物,一个演示文稿,或一个报告.它们是有意地简短这里;该链接guides解释该工作流和恢复choices.

### intel suggest（智能建议）

根据市场和仓库信号建议产品工作：

```
oma intel suggest --topic "developer onboarding" --target ./my-product --dry-run
oma intel suggest --config .agents/intel.yaml --json
```

`--config` supplies该完整配置.用于一个-off运行, `--topic`, `--target`, `--repos`, `--since`,和`--last-commits`选择输入. `--output-dir`控制本地报告,和`--fixture` supplies一个本地JSON夹具用于确定性审查. `--create-issue`文件该已接受候选在GitHub和需要一个已配置目标加上确认;配对它使用`--base-repo <owner/name>`到选择该仓库和`--yes`仅在一个已经-approved自动化上下文. `--dry-run`和`--json`是安全inspection路径.

### market（市场研究）

market命令族会将工作交给解析出的上游`last30days`引擎.启动使用该门槛和resolver:

```
TOPIC="browser automation pain points"
oma market detect-trap "$TOPIC"
oma market resolve --output json
oma market run "$TOPIC" --days 30 --emit=compact
```

`market detect-trap` returns退出2使用一个reframe用于关键词-trap或overly broad topics; `--force` bypasses该门槛仅当该用户明确地wants到继续. `market resolve`接受`--refresh`和`--offline`,和`market update`刷新该托管引擎缓存. `market run`传递其剩余参数到该已解析Python引擎和adds `--save-dir`从`market.save_dir`当一个topic是supplied.读取[Market研究](../guide/market-research.md)之前selecting上游标志;其`--help`输出属于到该托管引擎和变更使用该release.

### docs（文档）

使用docs命令族检查文档漂移。该命令是报告-oriented; `sync`列出候选用于该主机智能体和does不编辑文件itself.

```
oma docs verify --json
oma docs verify --no-urls --report-file .agents/results/docs-drift.md
oma docs sync HEAD~3..HEAD --json
oma docs i18n --json --min-severity HIGH
oma docs lint --json --locales ko,ja
```

`verify`检查本地references和重新生成`docs/generated/doc-refs.json`; `--urls-sync` waits用于该可选`lychee` URL通过. `sync`默认值到staged变更,然后`HEAD~1..HEAD`,和发出`{doc, changedFiles, matchedRefs}`候选. `i18n`报告structural English/翻译漂移,同时`lint`报告translated-document风格问题.无的这些子命令auto-编辑该docs.

### slide（幻灯片）

`oma slide` operates在一个可用目录的1920×1080 HTML幻灯片fragments.一个最小可用路径是:

```
oma slide create --output-dir .agents/results/slides/demo
# author slide-01.html and meta.json in that directory
oma slide validate --workspace .agents/results/slides/demo --output json
oma slide preview --workspace .agents/results/slides/demo
oma slide bundle --workspace .agents/results/slides/demo
```

该quality门槛报告overflow,重叠,和font-规模发现项.使用`--slide <file>`用于一个single-幻灯片检查和`--report-file <path>`使用JSON输出.导出仅之后校验:

```
oma slide export pdf --workspace <dir> --output-file <file> --mode capture
oma slide export png --workspace <dir> --output-dir <dir> --resolution 1080p
oma slide export pptx --workspace <dir> --output-file <file>
```

PPTX导出是experimental和raster-backed. `slide import pptx <file>`, `slide asset fetch-video <url>`,和`slide style list|preview|get <slug>` cover输入assets和风格发现.使用[oma-幻灯片](../guide/content-and-research.md#slides-and-presentations)用于编写决策和该固定-stage constraints.

### scholar（学术检索）

搜索论文和工作元数据，并在共享前验证sidecar：

```
oma scholar search "vision language action" --limit 10
oma scholar resolve "Attention Is All You Need"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar lint paper.knows.yaml
```

`search`可以限制OpenAlex结果使用`--year-min`和强制回退供应商使用`--always-fallback`. `get --section`接受`statements`, `evidence`, `relations`, `artifacts`,或`citation`. `lint --lenient` demotes dangling cross-记录references到警告; `--fail-on-warning` makes警告失败用于CI.该CLI searches Knows首先,然后OpenAlex和Semantic Scholar fallbacks;它does不submit sidecars上游.

### explain（解释）

`/explain`是该编写工作流.该CLI校验已经-created产物:

```
oma explain validate .agents/results/explain/2026-09-09-change.html
oma explain validate --input-dir .agents/results/explain --output json --report-file .agents/results/explain/report.json
```

通过一个文件或`--input-dir`,不两者.校验covers该self-contained HTML契约和报告机器可读失败;它does不评判器该准确率的该explanation.参见[代码解释器](../guide/code-explainer.md).

### diagram（图表）

解析该引擎之前一个工作流发出一个structural图表:

```
oma diagram resolve --output json
oma diagram resolve --engine mermaid --offline
oma diagram update
oma diagram archify validate architecture <stem>.archify.json --quality showcase --json
oma diagram archify deliver architecture <stem>.archify.json <stem>.archify.html --quality showcase --json
```

`diagram resolve`接受`--engine auto|archify|mermaid`, `--refresh`,和`--offline`. `diagram update`刷新该托管archify复制. `diagram archify` forwards该剩余参数到该已解析上游executable和propagates其退出代码. Mermaid仍是该Markdown来源的事实来源;该HTML是一个derived产物.参见[图表引擎](../guide/diagram-engine.md).

## 状态、模型与内存检查

以下命令族提供持久工作流状态以及模型、供应商诊断。 Prefer `--dry-run`在清理-风格操作和`--json`当另一个program将consume该结果.

### state（状态）

```
oma state list --json
oma state list --all-projects --project /path/to/project --search migration
oma state get <session-id> --json
oma state verify --workflow work --checkpoint complete --json
oma state archive --older-than 90d --dry-run --json
oma state purge --older-than 90d --dry-run --json
```

`state emit`记录一个L1事件使用显式category和会话元数据. `state migrate` moves旧版会话到该选定配置档. `state repair` repairs malformed状态文件. `state decisions list`和`state inject-log list|get`检查必填决策和injection审计条目. `state activate`, `state archive`,和`state purge`是显式操作;该旧boolean action标志是拒绝.归档或purge仅之后reviewing一个试运行,因为这些命令变更本地状态.

### model（模型）

```
oma model check --json
oma model check --owner openai --fail-on-drift
oma model probe openai/gpt-5 --timeout 30s --json
oma model propose --owner anthropic --json
```

`model check`比较该注册表使用实时供应商列出和可以探测新候选. `model probe` tests一个slug针对其供应商CLI. `model propose`发出一个`oma-config` `models:` patch;使用`--write`仅当你intend到变更配置.供应商availability和配额可以创建探测失败even当一个注册表入口是有效.

### agent evidence commands（智能体证据命令）

原生智能体运行使用一个证据-backed顺序:

```
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
oma agent context docs --difficulty Medium
oma agent begin docs docs "$SESSION_ID" --workspace .
# Use the runId and claimPath printed by begin.
oma agent verify "<run-id>" --required
oma agent finish "<run-id>" "<claim-path>"
```

`agent context` loads图形-选定上下文; `begin`启动一个运行和打印一个生成运行ID加上声明路径; `verify` receives该运行ID和executes该pinned检查(`--required`)或narrows它们使用`--affected`; `finish` receives该运行ID和该声明文件路径. `agent resume --dry-run`报告ready和reusable任务,和`agent resume --max-attempts <n>` retries仅任务allowed由该规划.参见[智能体结果和恢复](../guide/agent-results-and-resume.md)用于该规划和声明shape.这些命令是用于该OMA执行契约;普通用户工作可以使用`agent spawn`, `agent parallel`,或`agent review`而不是.

### memory（内存）

```
oma memory status --json
oma memory keys --kind connection --dry-run --json
oma memory init --json
oma memory setup --endpoint http://127.0.0.1:8000 --dry-run --json
oma memory import --source claude --since 7d --dry-run --json
oma memory gc --scope project --keep 20 --dry-run --json
```

`memory keys` configures Honcho连接或embedding凭据; `--dry-run` previews destinations不使用reading或writing键. `memory setup`准备一个AgentMemory端点和可以optionally `--install`或`--start`它. `memory daemon`和`memory service` manage本地进程或操作系统-service集成. `memory maintain backup|prune|vacuum`, `memory retry drain`, `memory upgrade`,和`memory gc`是maintenance操作;检查其JSON或试运行输出之前applying它们.

## 技能管理

### skills audit（技能审计）

检查已安装技能是否存在描述重叠、黑洞式泛化和库规模导致的路由衰减。

```
oma skill audit [--json] [--output <format>]
```

**选项：**

|标志|说明|
|:-----|:-----------|
| `--json` |输出作为JSON用于CI/CD |
| `--output <format>` |输出格式(`text`或`json`) |

**检查内容：**
- **Pairwise说明相似度**: TF-IDF cosine相似度在…之间每配对的已安装技能.警告在≥ 60%,失败在≥ 75%.
- **黑洞式检测**:标志任何技能whose mean相似度到所有others是一个positive outlier (≥ mean + 1.5 × stddev), indicating一个覆盖-泛化说明该could hijack路由.
- **库-规模衰减**:警告当更多比60技能是已安装(路由准确率decays按对数作为该库增长).
- **聚焦检查**:警告当一个技能扩张到一个捆绑包，更多比20参考docs (`.md`文件besides `SKILL.md`, vendored trees excluded)或一个`SKILL.md` body覆盖25,000 chars. Focused技能outperform bundles (SkillsBench, arXiv:2602.12670);该修复是splitting,不deleting.

**退出码：** `0`所有发现项在warn band或无; `1`在至少一个失败-band配对.

**示例：**
```bash
oma skill audit
oma skill audit --json | jq '.findings'
```

### skills lint（技能检查）

检测单个技能中的编写气味： quality defects内部一个single `SKILL.md`,作为opposed到`skills audit`该检查relations *在…之间*技能. Based在该技能-气味分类法的arXiv:2607.01456 (覆盖99%的在-该-真实世界技能.md文件带有在至少一个气味).

```
oma skill lint [--skill <id>] [--json] [--output <format>]
```

**选项：**

|标志|说明|
|:-----|:-----------|
| `--skill <id>` |检查一个single技能|
| `--json` |输出作为JSON用于CI/CD |
| `--output <format>` |输出格式(`text`或`json`) |

**泛化气味(每技能):**

|气味| Severity |含义|
|:------|:---------|:--------|
| `missing-name` |失败| frontmatter `name` absent或空|
| `missing-description` |失败| frontmatter `description` absent或空，路由depends在它|
| `weak-description` | warn |说明在…下40 chars ， too thin到路由在|
| `body-too-long` | warn |技能.md body覆盖500行， move详情到`resources/` behind progressive disclosure |
| `template-placeholder` | warn | leftover `{Placeholder}`文本outside代码spans |
| `broken-reference` |失败| references一个`resources/`, `config/`, `scripts/`,或`assets/`文件该does不存在|

**SSL-lite 异味**（当技能的声明名称或公开的目录/别名名称以 `oma-` 开头时，即使没有 `## Scheduling` 也必须进行 SSL-lite 校验；没有前缀的别名不能绕过声明为 `oma-` 的名称。普通的无前缀技能通过包含 `## Scheduling` 选择使用该格式）：

|气味| Severity |含义|
|:------|:---------|:--------|
| `ssl-structure` |失败| top-级别sections deviate从`Scheduling / Structural Flow / Logical Operations / References` |
| `canonical-path` |失败|不准确地一个`### Canonical command path`或`### Canonical workflow path` |
| `missing-boundaries` | warn |没有`### When NOT to use` ， boundary-更少技能hijack路由|
| `empty-failure-recovery` | warn | `### Failure and recovery`缺少或空(接受bullets或表格行) ， encode失败mechanisms每个SkillLens |

**退出码：** `0`没有失败-severity气味; `1`在至少一个失败气味.

**示例：**
```bash
oma skill lint
oma skill lint --skill oma-scholar
oma skill lint --json | jq '.smells'
```

### skills eval（技能评估）

衡量每个技能的效用： does loading一个技能actually改进留出任务结果?这是该*效用* counterpart到`skills audit` (该测量说明-boundary重叠).其中`audit`询问"是two技能redundant?", `eval`询问"does这技能帮助?"

```
oma skill eval [--skill <id>] [--mock | --live] [--record] [--yes]
                [--task-dir <path>] [--max-tasks <n>] [--require-coverage]
                [--json] [--output <format>]
```

**选项：**

|标志|说明|
|:-----|:-----------|
| `--skill <id>` |技能ID到evaluate (simple名称,没有路径separators).默认值到`_all`. |
| `--mock` |回放已记录rollouts从`_rollouts/` (默认;确定性,没有LLM调度).安全用于CI. |
| `--live` |实时智能体调度，生成次数two执行臂(基线和处理)每个任务通过`oma agent spawn --read-only`.打印一个成本预览和询问用于确认unless `--yes`. |
| `--record` |写入captured实时rollouts (including评判器verdicts)到`_rollouts/`用于未来`--mock`回放.仅meaningful使用`--live`. |
| `--yes` |跳过该成本-预览确认提示词.仅meaningful使用`--live`. |
| `--task-dir <path>` |覆盖该任务夹具目录(必须是内部该工作区根目录).默认: `.agents/eval/<skill>/`. |
| `--max-tasks <n>` | Cap数字的任务evaluated (已应用在确定性排序顺序). |
| `--require-coverage` |退出non-零当fewer比5任务是找到(prevents静默green在CI). |
| `--json` |输出作为JSON用于CI/CD |
| `--output <format>` |输出格式(`text`或`json`) |

**How它工作:**

用于每个任务夹具在`.agents/eval/<skill>/`:
1. **基线执行臂** ，该任务提示词是dispatched不使用该技能loaded.
2. **处理执行臂** ， `SKILL.md`是prepended到该提示词,然后dispatched.
3.每个执行臂是scored由其checker (评判器由默认;断言或正则表达式用于确定性退出-ins).
4. `utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)`.

**决策:**

|决策| Condition |
|:---------|:---------|
| `pass` | `utilityLift ≥ 5%` |
| `warn` | `0% < utilityLift < 5%` |
| `fail` | `utilityLift ≤ 0%` (退出代码1) |
| `insufficient` | Fewer比5可评分任务(退出代码1仅使用`--require-coverage`) |

**推荐模式:**使用`--live`使用评判器检查器到测量actual技能效用.使用`--mock`到回放已记录评判器verdicts离线或到运行确定性`assert`/`regex`契约检查.

**环境变量:** `OMA_SKILLEVAL_MOCK=1` forces模拟模式regardless的标志.

**退出码：** `0`通过或warn; `1`失败或不足-使用-`--require-coverage`.

**示例：**
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

参见该[技能效用评估指南](../guide/skill-eval.md)用于该`.agents/eval/`夹具格式和checker类型.

---

### skills opt（技能优化）

优化技能的`SKILL.md`使用WikiSkill-风格持久演进.一个维护者consolidates observable rollout证据到范围内knowledge,一个提议者发出有界add/删除/替换编辑,和拒绝结果持久化跨运行.候选必须严格地改进该留出校验划分; `--apply` additionally需要严格改进在一个运行器拥有的最终-测试划分.研究basis: WikiSkill (arXiv:2608.27454).

```
oma skill optimize [--skill <id>] [--dry-run | --apply] [--mock | --live]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes] [--json] [--output <format>]
```

**选项：**

|标志|默认|说明|
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` |技能ID到优化(simple名称,没有路径separators). |
| `--dry-run` | **是(默认)** |建议编辑和打印该diff不使用变更`SKILL.md`;生成演进证据是仍已记录. |
| `--apply` | ， |应用已接受编辑;备份上该原始之前一个atomic写入和写入仅一个validated改进. |
| `--mock` | **是(默认)** |回放已记录optimizer编辑和评估verdicts (确定性,离线).安全用于CI. |
| `--live` | ， |实时LLM optimizer调度， incurs real模型调用每个epoch.打印一个成本预览和提示用于确认unless `--yes`. |
| `--max-epochs <n>` | `8` | Maximum优化轮次. |
| `--edits-per-epoch <k>` | `4` |候选编辑proposed每个epoch. |
| `--lr <chars>` | `600` | Textual learning-速率预算: maximum net character变更每个编辑. |
| `--yes` | ， |跳过成本-预览确认(仅使用`--live`). |
| `--json` | ， |输出作为JSON用于CI/CD. |
| `--output <format>` | `text` |输出格式(`text`或`json`). |

**硬依赖：**需要在至少5任务夹具在`.agents/eval/<skill>/`.错误使用一个clear消息当fewer是找到.参见该[技能效用评估指南](../guide/skill-eval.md)用于编写它们.

**训练、验证、测试划分：**夹具是划分deterministically 60/20/20.该维护者和提议者参见仅TRAIN证据,候选选择使用留出校验任务,和该运行器拥有的测试划分stays隐藏直到演进finishes. `--apply`写入仅当两者校验和最终-测试lift严格地改进.

**SSOT注意事项：**技能whose ID启动使用`oma-`是覆盖由`oma update`.用于那些技能, `--apply`是不建议，使用该默认`--dry-run`和上游该proposed diff.用户编写技能应用freely.

**退出码：** `0`优化已完成; `1`不足夹具或无效参数.

**示例：**
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

参见该[技能优化指南](../guide/skill-opt.md)用于该完整结尾-到-结尾walkthrough和SSOT /过拟合guard详情.

---

### harness eval（harness 评估）

比较候选`.agents/`覆盖层使用该当前OMA harness在成对,隔离仓库任务.该目标智能体和供应商路由stay固定;确定性检查评分该文件和输出produced由每个执行臂.

```
oma harness eval --suite <path> --candidate <path> [--mock | --live]
                 [--record] [--record-file <path>] [--yes]
                 [--timeout-minutes <n>] [--require-coverage]
                 [--json] [--output <format>]
```

|标志|说明|
|:-----|:------------|
| `--suite <path>` |必填套件YAML.该套件和夹具workspaces必须是内部该项目根目录. |
| `--candidate <path>` |必填候选根目录containing一个范围内`.agents/`覆盖层. |
| `--mock` |回放一个hash-匹配已记录运行(默认;确定性和离线). |
| `--live` |运行基线和候选执行臂通过该套件's目标智能体. |
| `--record` |持久化一个实时运行用于之后模拟回放.需要`--live`. |
| `--record-file <path>` |覆盖该recording路径;它必须remain内部该项目根目录. |
| `--yes` |跳过该实时-运行成本确认. |
| `--timeout-minutes <n>` |每个-执行臂超时, identical用于基线和候选.默认: `15`. |
| `--require-coverage` |退出non-零当fewer比five成对任务是可评分. |
| `--json` |输出该完整评估作为JSON. |
| `--output <format>` |输出格式(`text`或`json`). |

**决策门槛：**通过需要在至少5成对任务, lift的在至少5百分比points,和零回归.一个回归始终失败.低于-最低覆盖率是`insufficient`和退出non-零仅使用`--require-coverage`.

**隔离：**候选文件可以替换仅`.agents/agents`, `.agents/rules`, `.agents/skills`,和`.agents/workflows` content在该临时候选执行臂.钩子,配置,状态,评估夹具,符号链接,供应商variants,受保护智能体执行frontmatter变更,和夹具拥有的供应商harness文件是拒绝.一个执行臂失败如果它修改受保护定义during执行. HOME-based供应商发现是拒绝用于实时评估.该主智能体路由是固定;嵌套子智能体模型固定是不yet强制.

```bash
# Generate a live measurement and recording
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --live --record

# Replay the same measurement in CI
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --mock --require-coverage --json
```

参见该[harness评估指南](../guide/harness-eval.md)用于该套件架构,受支持检查,隔离模型,和当前限制.

---

### help（帮助）

显示帮助信息。

```
oma help
```

显示该完整帮助文本使用所有可用命令.

### version（版本）

显示版本号。

```
oma version
```

Outputs该当前CLI版本和退出.

---

## 环境变量

|变量|说明|使用由|
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | Set到`json`到强制JSON输出在所有命令该支持它|所有命令使用`--json`标志|
| `DASHBOARD_PORT` | Port用于该Web仪表盘| `dashboard web` |
| `MEMORIES_DIR` |覆盖该内存目录路径| `dashboard`, `dashboard web` |
| `OMA_SKILLEVAL_MOCK` | Set到`1`到强制模拟模式在`oma skill eval` regardless的标志| `skills eval` |

---

## 别名

|别名|完整命令|
|:------|:------------|
| `viz` | `visualize` |
