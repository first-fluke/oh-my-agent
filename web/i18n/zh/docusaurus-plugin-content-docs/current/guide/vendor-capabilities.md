---
title: 供应商能力与包
description: 各 OMA 供应商的技能发现、智能体定义、钩子和包格式。
---

# 供应商能力与包

`cli/constants/vendor-capabilities.ts` 记录每个受支持宿主的技能发现、智能体目录、钩子桥接和包清单。它的供应商键与 `ALL_CLI_VENDORS` 一致；技能投影路径来自 `CLI_SKILLS_DIR`，因此项目安装和全局安装仍使用各自已有的目标位置。

| 宿主 | 不经供应商链接的共享技能 | 智能体目录 | 钩子桥接 | 包清单 |
| --- | --- | --- | --- | --- |
| Antigravity CLI | 否 | — | 设置 | `antigravity-plugin/plugin.json` |
| Claude Code | 否 | `.claude/agents` | 设置 | `.claude-plugin/plugin.json` |
| Codex | 否 | `.codex/agents` | 设置 | `plugin.json` |
| Command Code | 否 | `.commandcode/agents` | 设置 | `commandcode-mod/package.json` |
| Copilot CLI | 否 | `.github/agents` | 设置 | `plugin.json`（Agent Plugins 包） |
| Cursor | 否 | `.cursor/agents` | 设置 | `.cursor-plugin/plugin.json` |
| Grok | — | `.grok/agents` | 设置 | `.grok-plugin/plugin.json` |
| Hermes | 否 | — | — | `plugin.json`（Agent Plugins 包） |
| Kilo Code | 是 | `.kilo/agents` | 扩展 | `opencode-package/package.json` |
| Kimi | 否 | — | 设置 | `.kimi-plugin/plugin.json` |
| Kiro | 否 | `.kiro/agents` | 设置 | `plugin.json`（Agent Plugins 包） |
| OpenCode | 否 | `.opencode/agents` | 扩展 | `opencode-package/package.json` |
| Pi | 是 | — | 扩展 | `pi-package/package.json` |
| Qwen Code | 是 | `.qwen/agents` | 设置 | `plugin.json`（Agent Plugins 包） |
| ZCode | — | — | — | `.zcode-plugin/plugin.json` |

“不经供应商链接”表示两种安装模式都可以使用共享发现。仅靠 Kimi 的项目扫描，不能代替它现有的全局技能投影。有钩子桥接或智能体目录，并不表示有子进程运行时适配器。Gemini 不是 OMA 供应商；Antigravity CLI 有自己的集成。

## Agent Plugins 包 {#agent-plugins-package}

仓库根目录是一个 [Agent Plugins 1.0](https://agent-plugins.org/) 包，`oma emit` 会从 `.agents/` 这一 SSOT 重新生成它：

```text
plugin.json              # $schema 1.0.0, name "oma", version, keywords, extensions
mcp.json                 # portable MCP servers (1.0.0 mcp schema)
skills/<name>/SKILL.md   # Agent Skills (+ bundled references/)
com.firstfluke.oma/      # agents, workflows, rules, oma-config.yaml (oma-aware hosts)
com.github.copilot/      # Copilot CLI components (see below)
```

Git 和 marketplace 安装会克隆不含依赖的仓库，因此根目录就是这个包。本地路径或 `owner/repo:path` 安装复制的是你指向的目录，而仓库根目录还带有源码树、`node_modules` 和网站。对这两种安装，请使用 `oma emit --target agent-plugin` 写到 `codex-plugin/` 的干净副本（在本仓库中为 `bun cli/cli.ts emit --target agent-plugin`），或从 [GitHub release](https://github.com/first-fluke/oh-my-agent/releases) 解包 `oma-agent-plugin.tar.gz`。`codex-plugin/` 是生成的，已被 gitignore，不会提交。因为每个宿主都会整棵安装这棵树，其中的技能引用一份 `skills/_shared/` 共享指南；只有根目录的 `skills/` 会把它们打进每个技能，因为 `bunx skills use first-fluke/oh-my-agent@<skill>` 只会从中复制单个技能目录。

清单关键词（`oma`、`oh-my-agent`、`multi-agent`、`orchestrator`、`orchestrate`、`workflow`、`workflows`、`skills`、`agents`）也是 Kiro 的激活词。清单不声明组件路径，规范禁止这样做；每个宿主读取固定位置。没有任何宿主需要在 `plugin.json` 旁边再放一份原生清单：Copilot 会先读根目录的 Agent Plugins 清单，再读 `.claude-plugin/plugin.json`；Qwen Code 通过它的 Agent Plugins 适配器加载这个包，不会生成 `qwen-extension.json`。

| 宿主 | 加载内容 | 安装 |
| --- | --- | --- |
| GitHub Copilot CLI | 技能、MCP 服务器，以及 `com.github.copilot/` 中的 12 个自定义智能体、20 个工作流斜杠命令、6 条按文件限定的规则、4 个生命周期钩子 | `copilot plugin install first-fluke/oh-my-agent`（克隆根包）、对生成副本执行 `copilot plugin install /absolute/path/to/codex-plugin`，或先 `copilot plugin marketplace add first-fluke/oh-my-agent` 再 `copilot plugin install oma@oh-my-agent` |
| Kiro CLI（Powers） | 技能和 MCP 服务器（安装时服务器名会加上命名空间）；按清单关键词激活 | 对生成副本执行 `kiro-cli powers install /absolute/path/to/codex-plugin`（CLI 2.25+），或用仓库 URL 走 **Add Custom Power → Import power from GitHub** |
| Qwen Code | 作为 `oma` 扩展的技能和 MCP 服务器 | 对生成副本执行 `qwen extensions install /absolute/path/to/codex-plugin --consent` 或 `qwen extensions link /absolute/path/to/codex-plugin`（Agent Plugins 来源）。裸仓库 URL 会打开 Qwen 的交互式插件选择器，因为根目录还带有 Claude marketplace；`qwen extensions install https://github.com/first-fluke/oh-my-agent:oma` 会以非交互方式选择该 marketplace 的 `oma` 条目（按 Qwen 文档，随后会从 Claude 清单转换）。 |
| Hermes Agent | 形如 `oma:<skill>` 的技能，以及 stdio / Streamable HTTP MCP 服务器 | `hermes plugins install first-fluke/oh-my-agent --no-enable`，然后 `hermes plugins enable oma` |
| Codex | 技能和 MCP 服务器 | `codex plugin marketplace add first-fluke/oh-my-agent`，然后 `codex plugin add oma@oh-my-agent` |

### Copilot CLI 组件 {#copilot-cli-components}

Copilot 从 `oma emit` 按 SSOT 填入的 `com.github.copilot/` 命名空间读取不可移植的组件：

- `agents/<name>.agent.md`：与项目安装写到 `.github/agents/` 的 Copilot 自定义智能体相同。
- `commands/<workflow>.md`：每个可用工作流一条斜杠命令；每条都读取项目的 `.agents/workflows/<workflow>.md`。
- `rules/<rule>.instructions.md`：带文件 glob（`applyTo`）或 `alwaysApply: true` 的规则；按请求加载的规则仍留在项目安装中。
- `hooks/hooks.json`，以及 `scripts/plugin-bootstrap.sh` 和 `scripts/plugin-hook.sh`：与 Claude Code marketplace 条目相同的失败时放行脚本，以 `OMA_PLUGIN_VENDOR=copilot` 运行。SessionStart 会准备 CLI，并对当前项目运行 `oma install --yes`；UserPromptSubmit、PreToolUse（Bash）和 Stop 会转发到 `oma hook --vendor copilot`，直到项目自己的 `.github/hooks/oma.json` 注册接管。每条命令都以 `|| true` 结尾，因此缺少 CLI 或插件根目录无法解析时，绝不会挡住工具调用。

工作流、智能体和规则引用项目的 `.agents/` 树。没有 oma CLI 时，这个包仍提供技能和 MCP 服务器；引导钩子会在第一次会话中补上其余部分。

### 验证记录 {#validation-record}

2026年11月8日核对。每个宿主的主目录都指向一个临时目录；没有运行模型调用、钩子或 MCP 服务器。`<path>/codex-plugin` 是 `oma emit --target agent-plugin` 写出的树：

- Copilot CLI 1.0.107：`copilot plugin install <path>/codex-plugin` 报告 `Installed 33 skills`；`plugin list --json` 显示 `oma` 已按包版本启用；`installed-plugins/_direct/` 下的缓存副本包含 `com.github.copilot/{agents,commands,rules,hooks,scripts}`。先 `copilot plugin marketplace add <repo>`，再 `copilot plugin install oma@oh-my-agent`，也会从检出目录实时安装完整条目。Copilot 警告说，直接安装已被弃用，应改用 `plugin@marketplace`。
- Kiro CLI 3.1.0：`kiro-cli powers install <path>/codex-plugin`（临时目录上设置了 `KIRO_HOME` 和 `KIRO_DATA_DIR`）报告 `Installed power "oma"`，并把包复制到 `powers/installed/oma/`。Kiro 忽略 `USERPROFILE`；要迁移它的主目录，请使用 `KIRO_HOME`。
- Qwen Code 0.26.9：`qwen extensions install <path>/codex-plugin --consent` 报告 `installed successfully and enabled`；`qwen extensions list` 显示 `Origin: AgentPlugins`、33 个技能，以及 `context7`、`serena` 和 `aside` MCP 服务器。
- Hermes Agent：此处未安装。清单、技能前置元数据和 `mcp.json` 已对照 Hermes 的 `hermes_cli/agent_plugins.py` 中的规则检查（没有未知字段，名称有效，stdio 命令是单个 token）；Hermes 不需要 `extensions["com.nousresearch.hermes"]` 块。

CI 会从检出目录生成这个包，并在每次推送时把它安装到固定版本的 Copilot CLI 和 Qwen Code 中（`agent-plugin-hosts` 作业，`scripts/agent-plugin-host-smoke.ts`）。

## Pi 包 {#pi-packages}

Pi 会直接发现项目的 `.agents/skills` 和全局的 `~/.agents/skills`。因此在项目中安装 OMA 不需要 `.pi/skills` 投影。

要在 OMA 安装之外分发，发布流水线会生成 Pi 技能包，并把它发布到 npm 上的 `oh-my-agent-pi`；你也可以自己生成：

```bash
pi install npm:oh-my-agent-pi            # the published package
oma emit --target pi-package             # or emit it locally
pi install /absolute/path/to/pi-package
```

在这个源码仓库中，把本地 CLI 运行为 `bun cli/cli.ts emit --target pi-package`。默认输出是 `pi-package/`（已被 gitignore；这棵树是生成的，不会提交）；`--output-dir <base>` 会把它写到 `<base>/pi-package/` 下。

生成的 `package.json` 声明 `pi.skills: ["./skills"]`，包含 `pi-package` 关键词，并使用仓库版本。技能引用的共享指南只在 `skills/_shared/` 下生成一次（pi 会整包加载），因此没有任何技能自带一份副本。这个包没有工作区依赖，也没有安装脚本。它分发的是技能；OMA 的项目安装会另行提供 Pi 钩子扩展。

Pi 也支持 Git 和 npm 来源。仓库已经在根目录 `package.json` 中声明了源码技能，因此 `pi install git:github.com/first-fluke/oh-my-agent@<tag>` 可以发现它们。对于含有 `package.json` 的 Git 包，Pi 会安装依赖；生成的包避开了源码工作区的依赖树。`oma emit` 本身不会发布；发布工作流会把生成的包发布到 npm。

2026年11月5日，这个格式对照已安装的 Pi 0.78.1 包文档和包解析器做过检查。对源码仓库和生成包的只读解析都加载了 33 个技能，诊断为零，没有安装包，也没有联系模型。

## OpenCode 与 Kilo Code 插件包 {#opencode-and-kilo-code-plugin-package}

`oma link` 会按项目安装 opencode 系列的钩子桥接：`.opencode/plugins/oma/oma.ts`（Kilo 为 `.kilo/plugins/oma/`），外加它启动的处理器条目，并在 `opencode.json` / `kilo.json` 的 `plugin` 下注册。同一座桥接也会生成为 npm 插件包，这样项目（或全局配置）不必按项目安装就能加载它：

```bash
oma emit --target opencode-package
```

默认输出是 `opencode-package/`（唯一仍会提交的生成包，因此克隆后可以把它当作目录插件加载）；`--output-dir <base>` 会把它写到 `<base>/opencode-package/` 下。这个包（`oh-my-agent-opencode`）包含未改动的 SSOT 桥接（`oma.ts`）、包入口（`index.ts`，即 `main` / `exports`）、每个独立钩子脚本对应的一条生成处理器入口（每条运行 `oma hook script --vendor opencode --script <name>`）、`filter-test-output.sh` 和一份 README。它没有依赖；`oma` CLI 必须在 PATH 上，并且必须安装 `bun`。两者缺一时，每个钩子都会失败时放行。

两个宿主通过不同契约加载包插件，而入口用同一个默认导出来同时满足两者：OpenCode 2.x 读取 `{ id, setup(ctx) }`，`setup` 注册 `ctx.session.hook("prompt" | "context" | "experimental.idle")` 和 `ctx.tool.hook("execute.before")`，并分别适配到桥接的 `chat.message`、`experimental.chat.system.transform`、`session.idle` 和 `tool.execute.before` 处理器；Kilo Code 和 OpenCode 1.18.29+ 需要带 `server()` 的对象，这个对象就是桥接本身。处理器逻辑没有复制一份。

在 `.opencode/opencode.json`（项目）或 `~/.config/opencode/opencode.json`（全局）中按包名注册；OpenCode 会在启动时把 npm 插件安装到自己的缓存：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["oh-my-agent-opencode"]
}
```

Kilo Code 从 `.kilo/kilo.json` 或 `~/.config/kilo/kilo.json` 读取同一个键；`kilo plugin oh-my-agent-opencode` 会替你加入这条条目。两个宿主都用共享的 `opencode` 身份调度，并以桥接所读取的 Claude JSON 方言回答。`oma link` 已经注册了 `./plugins/oma/oma.ts` 的项目不需要这个包；两者保留一个即可。

OpenCode 2.x 也接受目录插件（`"plugin": ["../path/to/opencode-package"]`，相对于配置文件），这样可以不经过 npm 加载生成的包。注意 OpenCode 2.x 要求已配置的插件路径是目录，并拒绝单文件条目：`oma link` 写入的按项目 `./plugins/oma/oma.ts` 注册在那里会被跳过（“configured plugin path must be a directory”），因此在 OpenCode 2.x 上改用这个包；Kilo Code 仍会加载按项目的文件。

2026年11月8日对照 OpenCode 2.2.6 和 Kilo Code CLI 7.8.27 验证：两者都从项目配置解析了 `plugin: ["oh-my-agent-opencode"]`（`opencode debug config`、`kilo debug config`）。OpenCode 尝试了 npm 安装（包发布前为 404），并保持失败时放行。把包放进各宿主的插件缓存（`<cache>/opencode/npm/<spec>/node_modules/`、`<cache>/kilo/packages/<spec>/node_modules/`）后，对本地 OpenAI 兼容端点执行无头 `run "orchestrate: say hi"`，两个宿主的系统提示中都收到了 `[OMA WORKFLOW: ORCHESTRATE]`，随后是持久化模式的再次进入，直到强化上限。发布工作流会在每次 CLI 发布时把生成的包以 `oh-my-agent-opencode` 发布到 npm。

## Command Code mod 包 {#command-code-mod-package}

Command Code 的设置文件钩子（`.commandcode/settings.json`，由 `oma link` 安装）只覆盖 `SessionStart`、`PostToolUse` 和 `Stop`。[mod](https://commandcode.ai/docs/mods) 能看到完整生命周期，因此 OMA 也会生成一个 mod 包：

```bash
oma emit --target commandcode-mod
```

默认输出是 `commandcode-mod/`（已被 gitignore；这棵树是生成的，不会提交）。它的 `package.json` 带有 `cmd-mod` 关键词和一个 `commandcode` 块（`mods: ["./mods/oma.ts"]`、`skills: ["./skills"]`），因此一次安装就会带上钩子桥接和全部 OMA 技能。`mods/oma.ts` 通过 `oma hook script --vendor commandcode --script <name>` 把 ModApi 钩子映射到核心处理器：`transformInput` 运行 keyword-detector 和 skill-injector（提示原样通过），`appendSystemPrompt` 注入检测到的上下文，`onSessionStart` 运行 code-intelligence-primer 和 state-boundary，`beforeToolCall` 在 `shell_command` 上运行 scm-guard（拒绝会变成 `{block: true}`）和 test-filter，`onStop` 把持久化模式的阻止变成 `{continue: true, reason}`。这个包没有依赖，也不需要构建步骤；没有 `oma` CLI 时，每个钩子都会失败时放行。

```bash
cmd mods add oh-my-agent-commandcode          # this project
cmd mods add -g oh-my-agent-commandcode       # your user
cmd mods add ./commandcode-mod                # a local checkout or `oma emit` output
cmd mods inspect ./commandcode-mod            # static report, never runs the mod
cmd --mod ./commandcode-mod/mods/oma.ts       # one session, without installing
```

2026年11月8日对照 Command Code 1.88.5 验证：`cmd mods inspect` 报告了已注册的钩子，`cmd mods add -g <local path>` 安装了这个包，`cmd mods list` 显示 `oma · user · from local:…`。驱动该 mod 的钩子对照 CLI 时，注入了 `[OMA WORKFLOW: ORCHESTRATE]`，阻止了 `git add .env`，并返回了持久化模式的 continue。没有做带模型的 `cmd -p` 回合（测试机上没有 Command Code 账户）。发布工作流会在每次 CLI 发布时把生成的包以 `oh-my-agent-commandcode` 发布到 npm。

## Cursor 插件验证 {#cursor-plugin-verification}

Cursor Agent `2026.10.22-27dcf5f` 提供：

```text
agent --plugin-dir <path>
agent plugin marketplace add <gitUrl> [--git-ref <ref>]
agent plugin marketplace list
agent plugin marketplace remove <nameOrUrl>
agent plugin marketplace update <nameOrUrl>
```

它的插件 CLI 没有单独的插件安装命令。Marketplace 注册是账户操作，会索引一个 Git 仓库；它不提供隔离的本地安装检查。OMA 在生成期间不会自动注册 marketplace。

2026年11月5日，已提交的 Cursor 清单中的两个技能目录、智能体目录、规则目录、MCP 文件和 logo 都能在仓库内解析。CLI 帮助确认支持加载本地插件目录。没有演练账户 marketplace 注册，也没有演练实时模型会话。

## 兼容 Claude 的插件宿主 {#claude-compatible-plugin-hosts}

Antigravity CLI、Grok Build CLI、ZCode 和 Kimi Code 读取的插件清单，其形态源自 Claude Code 的 `.claude-plugin/plugin.json`。`oma emit` 会从 `.agents/` 这一事实来源为每个宿主生成一份原生清单。本仓库的 git 克隆就是 Grok、ZCode 和 Kimi 的可安装包；Antigravity 的树是生成的（`oma emit --target antigravity-plugin`，或发布资产 `oma-antigravity-plugin.tar.gz`），因为它的校验器会拒绝仓库根目录：

| 宿主 | 生成目标 | 已提交的产物 | 技能 | 智能体 | MCP | 钩子 |
| --- | --- | --- | --- | --- | --- | --- |
| Antigravity CLI | `antigravity-plugin` | 无；生成的 `antigravity-plugin/`（自包含，发布资产） | `skills/` | `agents/`（已转换） | `mcp_config.json` | 不随包提供 |
| Grok Build CLI | `grok-plugin` | `.grok-plugin/{plugin,marketplace}.json` | 根目录 `skills/` | `.agents/agents/*.md` | 内联 `mcpServers` | 未声明 |
| ZCode | `zcode-plugin` | `.zcode-plugin/{plugin,marketplace}.json` | 根目录 `skills/` | `.agents/agents/*.md` | 内联 `mcpServers` | 未声明 |
| Kimi Code | `kimi-plugin` | `.kimi-plugin/plugin.json` | 根目录 `skills/` | `.agents/agents/*.md` | 内联 `mcpServers` | 未声明 |

这些包都不随包提供钩子。Claude 插件钩子从 `CLAUDE_PROJECT_DIR` 和 `${CLAUDE_PLUGIN_ROOT}` 解析项目，而这些宿主不会设置它们；Antigravity 和 Kimi 运行插件钩子时，工作目录是插件目录。因此工作流和项目钩子来自 `oma` CLI（`bun install -g oh-my-agent`，然后 `oma install`），它会为每个宿主准备原生钩子桥接。技能、智能体、规则和 MCP 服务器不依赖它也能工作。

在这个源码仓库中，把本地 CLI 运行为 `bun cli/cli.ts emit --target <target>`；`--output-dir <base>` 会把每个产物写到 `<base>` 下的同一相对路径。当已提交的清单与一次新的生成不一致时，CI 漂移门禁（`bun run --cwd cli check:emit-drift`）会失败。Release Please 会在 CLI 发布时提升每份已提交清单的版本；生成的本地路径树使用它们被生成时所在的发布标签作为版本。

### Antigravity CLI（`agy`） {#antigravity-cli-agy}

这个包遵循 [antigravity.google/docs/build-plugins](https://antigravity.google/docs/build-plugins)：`plugin.json` 对照 `https://antigravity.google/schemas/v1/plugin.json` 校验，以及 `skills/<name>/SKILL.md`、`agents/<name>.md`、`rules/AGENTS.md` 加上每条 OMA 规则一个 `rules/<rule>.md`（`trigger: always_on | glob | model_decision`，`globs` 以逗号分隔）、`mcp_config.json`、`assets/logo.png` 和一份 README。之所以生成自包含的树，是因为 `agy plugin validate --strict` 会拒绝仓库根目录（根目录 `AGENTS.md` 和 Claude 的 `hooks/hooks.json` 被报告为从未加载）。请安装 `antigravity-plugin/` 目录，而不是仓库 URL 或根目录：指向根目录时，agy 会加载那里的 Agent Plugins `plugin.json`，结果是 33 个技能、没有智能体或规则，并且只有在 `enable-agent-plugins-spec` 标志打开时才有 `mcp.json`（`agy plugin validate --json .`，agy 1.5.3）。

```bash
# From a release asset:
tar -xzf oma-antigravity-plugin.tar.gz        # unpacks antigravity-plugin/
# Or from a clone (the tree is generated, not committed):
git clone https://github.com/first-fluke/oh-my-agent
cd oh-my-agent && bun install && bun cli/cli.ts emit --target antigravity-plugin
agy plugin validate --strict ./antigravity-plugin
agy plugin install ./antigravity-plugin
agy plugin list
agy --agent pm-planner
```

技能以 `/<skill-name>` 加载；MCP 服务器的命名空间为 `oma_<server>`。`agy plugin import claude` 也会导入已有的 Claude Code 安装。2026年11月8日，生成的树通过了 `agy plugin validate --strict`（agy 1.5.3），0 个错误、0 个警告：33 个技能、12 个智能体、14 条规则、3 个 MCP 服务器。

### Grok Build CLI {#grok-build-cli}

Grok 无需设置就能读取 Claude Code 插件和 marketplace，因此 `.claude-plugin/` 已经可用。原生的 `.grok-plugin/plugin.json` 增加了显式的技能、智能体和 MCP 声明，`.grok-plugin/marketplace.json` 列出与 Claude marketplace 相同的 `oma` 条目，以及 `oma-frontend`、`oma-security`、`oma-research` 领域根，来源为本地（`{"type": "local", "path": ...}`）。这是 Grok 目录校验器在没有固定 commit sha 时接受的形式。

```bash
grok plugin marketplace add first-fluke/oh-my-agent
grok plugin install oma            # or oma-frontend, oma-security, oma-research
# Local clone instead of GitHub:
grok plugin validate ./oh-my-agent
grok --plugin-dir ./oh-my-agent
```

生成这批清单的宿主上没有安装 Grok；清单和目录由 CLI 测试对照已记录的字段集和 `xai-org/plugin-marketplace` 目录规则做结构检查。

### ZCode {#zcode}

ZCode 会先解析 `.zcode-plugin/plugin.json`，再回退到 `.claude-plugin/plugin.json`，因此仓库根目录可以原生解析，每个领域根通过它的 Claude 清单解析。安装只能通过图形界面：

1. 打开 **Settings → Plugins**。
2. 点击 **Create → Add marketplace**（右上角），输入 `first-fluke/oh-my-agent`、Git URL，或本地克隆的路径。ZCode 会在添加前校验 marketplace。
3. 在 **Personal** 分段下，对 `oma`（或某个领域条目）点击 **Install**，等到状态变为 **Installed**。插件默认启用。
4. 之后使用 **Manage installed → Check for updates**。ZCode 会比较 `.zcode-plugin/marketplace.json` 中的目录条目版本和已安装的 `plugin.json`，因此两者都跟随 CLI 发布。

生成这批清单的宿主上没有安装 ZCode；清单名称模式（`^[a-z0-9][a-z0-9._-]{0,127}$`）、字段集和 marketplace 形态由 CLI 测试断言。

### Kimi Code CLI {#kimi-code-cli}

`.kimi-plugin/plugin.json` 把 `skills` 指向根目录 `skills/` 扫描目录，列出每个 `.agents/agents/*.md` 文件（已经是 Kimi 的智能体格式：前置元数据中的 `name` 和 `description`，Markdown 正文作为系统提示），内联 `mcpServers`，并带有 `/plugins` 所显示的 `interface` 块。

```text
/plugins install /absolute/path/to/oh-my-agent
/plugins install https://github.com/first-fluke/oh-my-agent
/reload
```

Kimi 会把插件复制到 `$KIMI_CODE_HOME/plugins/managed/oma/`，并应用到每个项目；技能以 `/skill:oma:<skill-name>` 调用。生成这批清单的宿主上没有安装 Kimi；清单表面（允许的字段、`./` 路径规则、钩子字段集）由 CLI 测试断言。

## Qwen Agent Board {#qwen-agent-board}

实验性的 [Qwen Agent Board 文档](https://qwenlm.github.io/qwen-code-docs/en/users/features/agent-board/)描述了 `qwen board task`、`claim`、`done`、`ask` 和 `answer`。这块看板协调的是本地文件；它不会启动、加入或监控智能体进程。

当已安装的 Qwen CLI 声明了 `board` 命令时，OMA 可以转发明确的看板操作：

```bash
oma agent board show --board orders --json
oma agent board task "Check API" --board orders --actor api --owner web
oma agent board done TASK_ID --board orders --actor web --note "Checked"
```

这个适配器也支持 `claim`、`ask`、`answer` 和 `decline`。它会在转发操作前检查根帮助。它补充 OMA 的执行状态和回执；它绝不会自动把 OMA 的工作标为完成。

2026年11月5日，已安装的 Qwen Code 0.20.1 没有暴露 `board` 或 `agents` CLI 命令。`qwen board --help` 返回的是根帮助，因此这次安装没有通过能力检查。真正的原生看板操作仍未验证；没有 `agents join` 集成。
