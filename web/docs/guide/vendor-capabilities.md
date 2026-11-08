---
title: Vendor capabilities and packages
description: Skill discovery, agent definitions, hooks, and package formats across OMA vendors.
---

# Vendor capabilities and packages

`cli/constants/vendor-capabilities.ts` records each supported host's skill discovery, agent directory, hook bridge, and package manifest. Its vendor keys match `ALL_CLI_VENDORS`; skill projection paths come from `CLI_SKILLS_DIR` so project and global installations retain their existing destinations.

| Host | Shared skills without vendor links | Agent directory | Hook bridge | Package manifest |
| --- | --- | --- | --- | --- |
| Antigravity CLI | No | — | Settings | `antigravity-plugin/plugin.json` |
| Claude Code | No | `.claude/agents` | Settings | `.claude-plugin/plugin.json` |
| Codex | No | `.codex/agents` | Settings | `codex-plugin/plugin.json` |
| Command Code | No | `.commandcode/agents` | Settings | `commandcode-mod/package.json` |
| Copilot CLI | No | `.github/agents` | Settings | `plugin.json` (Agent Plugins package) |
| Cursor | No | `.cursor/agents` | Settings | `.cursor-plugin/plugin.json` |
| Grok | — | `.grok/agents` | Settings | `.grok-plugin/plugin.json` |
| Hermes | No | — | — | `plugin.json` (Agent Plugins package) |
| Kilo Code | Yes | `.kilo/agents` | Extension | `opencode-package/package.json` |
| Kimi | No | — | Settings | `.kimi-plugin/plugin.json` |
| Kiro | No | `.kiro/agents` | Settings | `plugin.json` (Agent Plugins package) |
| OpenCode | No | `.opencode/agents` | Extension | `opencode-package/package.json` |
| Pi | Yes | — | Extension | `pi-package/package.json` |
| Qwen Code | Yes | `.qwen/agents` | Settings | `plugin.json` (Agent Plugins package) |
| ZCode | — | — | — | `.zcode-plugin/plugin.json` |

“Without vendor links” means OMA can use shared discovery in both install modes. Kimi's project scanning alone does not replace its existing global skill projection. A hook bridge or an agent directory does not imply a subprocess runtime adapter. Gemini is not an OMA vendor; Antigravity CLI has its own integration.

## Agent Plugins package

The repository root is an [Agent Plugins 1.0](https://agent-plugins.org/) package, and `oma emit` regenerates it from the `.agents/` SSOT:

```text
plugin.json              # $schema 1.0.0, name "oma", version, keywords, extensions
mcp.json                 # portable MCP servers (1.0.0 mcp schema)
skills/<name>/SKILL.md   # Agent Skills (+ bundled references/)
com.firstfluke.oma/      # agents, workflows, rules, oma-config.yaml (oma-aware hosts)
com.github.copilot/      # Copilot CLI components (see below)
codex-plugin/            # the same package without the source tree
```

`codex-plugin/` is the clean copy: a local-path or `owner/repo:path` install copies the directory you point at, and the repository root also carries the source tree, `node_modules`, and the web site. Point local installs at `codex-plugin/`; Git or marketplace installs clone without dependencies, so the root is fine there.

The manifest keywords (`oma`, `oh-my-agent`, `multi-agent`, `orchestrator`, `orchestrate`, `workflow`, `workflows`, `skills`, `agents`) are also Kiro's activation vocabulary. The manifest declares no component paths, which the specification forbids; each host reads the fixed locations. No host needs a native manifest beside `plugin.json`: Copilot reads a root Agent Plugins manifest before `.claude-plugin/plugin.json`, and Qwen Code loads the package through its Agent Plugins adapter without generating `qwen-extension.json`.

| Host | Loads | Install |
| --- | --- | --- |
| GitHub Copilot CLI | skills, MCP servers, and from `com.github.copilot/`: 12 custom agents, 21 workflow slash commands, 6 file-scoped rules, 4 lifecycle hooks | `copilot plugin install first-fluke/oh-my-agent:codex-plugin`, or `copilot plugin marketplace add first-fluke/oh-my-agent` then `copilot plugin install oma@oh-my-agent` |
| Kiro CLI (Powers) | skills and MCP servers (server names are namespaced on install); activates on the manifest keywords | `kiro-cli powers install /absolute/path/to/codex-plugin` (CLI 2.25+), or **Add Custom Power → Import power from GitHub** with the repository URL |
| Qwen Code | skills and MCP servers as the `oma` extension | `qwen extensions install /absolute/path/to/codex-plugin --consent` or `qwen extensions link /absolute/path/to/codex-plugin` (Agent Plugins origin). The bare repository URL opens Qwen's interactive plugin picker, because the root also carries the Claude marketplace; `qwen extensions install https://github.com/first-fluke/oh-my-agent:oma` selects that marketplace's `oma` entry non-interactively (per Qwen's docs it is then converted from the Claude manifest). |
| Hermes Agent | skills as `oma:<skill>` and the stdio / Streamable HTTP MCP servers | `hermes plugins install first-fluke/oh-my-agent --no-enable`, then `hermes plugins enable oma` |
| Codex | skills and MCP servers | `codex plugin marketplace add first-fluke/oh-my-agent` then `codex plugin add oma@oh-my-agent` |

### Copilot CLI components

Copilot reads non-portable components from the `com.github.copilot/` namespace that `oma emit` fills from the SSOT:

- `agents/<name>.agent.md`: the same Copilot custom agents a project install writes to `.github/agents/`.
- `commands/<workflow>.md`: one slash command per available workflow; each reads the project's `.agents/workflows/<workflow>.md`.
- `rules/<rule>.instructions.md`: the rules with a file glob (`applyTo`) or `alwaysApply: true`; on-request rules stay with the project install.
- `hooks/hooks.json` with `scripts/plugin-bootstrap.sh` and `scripts/plugin-hook.sh`: the same fail-open scripts as the Claude Code marketplace entry, run with `OMA_PLUGIN_VENDOR=copilot`. SessionStart provisions the CLI and runs `oma install --yes` for the current project; UserPromptSubmit, PreToolUse (Bash), and Stop forward to `oma hook --vendor copilot` until the project's own `.github/hooks/oma.json` registration takes over. Every command ends in `|| true`, so a missing CLI or an unresolved plugin root never blocks a tool call.

Workflows, agents, and rules reference the project's `.agents/` tree. Without the oma CLI the package still provides skills and MCP servers; the bootstrap hook adds the rest on the first session.

### Validation record

Checked on 2026-11-08 with each host's home pointed at a scratch directory; no model call, hook, or MCP server ran:

- Copilot CLI 1.0.107: `copilot plugin install <path>/codex-plugin` reported `Installed 33 skills`; `plugin list --json` shows `oma` enabled at the package version; the cached copy under `installed-plugins/_direct/` contains `com.github.copilot/{agents,commands,rules,hooks,scripts}`. `copilot plugin marketplace add <repo>` followed by `copilot plugin install oma@oh-my-agent` also installed the full entry live from the checkout. Copilot warns that direct installs are deprecated in favor of `plugin@marketplace`.
- Kiro CLI 3.1.0: `kiro-cli powers install <path>/codex-plugin` (with `KIRO_HOME` and `KIRO_DATA_DIR` on the scratch directory) reported `Installed power "oma"` and copied the package to `powers/installed/oma/`. Kiro ignores `USERPROFILE`; use `KIRO_HOME` to relocate its home.
- Qwen Code 0.26.9: `qwen extensions install <path>/codex-plugin --consent` reported `installed successfully and enabled`; `qwen extensions list` shows `Origin: AgentPlugins`, 33 skills, and the `context7`, `serena`, and `aside` MCP servers.
- Hermes Agent: not installed here. The manifest, skill frontmatter, and `mcp.json` were checked against the rules in Hermes' `hermes_cli/agent_plugins.py` (no unknown fields, valid names, stdio commands as single tokens); Hermes requires no `extensions["com.nousresearch.hermes"]` block.

CI installs the checkout into pinned Copilot CLI and Qwen Code releases on every push (`agent-plugin-hosts` job, `scripts/agent-plugin-host-smoke.ts`).

## Pi packages

Pi discovers project `.agents/skills` and global `~/.agents/skills` directly. Installing OMA in a project therefore does not require a `.pi/skills` projection.

For distribution outside an OMA installation, emit the Pi skill package:

```bash
oma emit --target pi-package
pi install /absolute/path/to/pi-package
```

In this source repository, run the local CLI as `bun cli/cli.ts emit --target pi-package`. The default output is `pi-package/`; `--out <base>` writes it under `<base>/pi-package/`.

The generated `package.json` declares `pi.skills: ["./skills"]`, includes the `pi-package` keyword, and uses the repository version. Skills include their referenced resources. The package has no workspace dependencies or install scripts. It distributes skills; OMA's project installation supplies its Pi hook extension separately.

Pi also supports Git and npm sources. The repository already declares its source skills in its root `package.json`, so `pi install git:github.com/first-fluke/oh-my-agent@<tag>` can discover them. Pi runs dependency installation for Git packages containing `package.json`; the emitted package avoids the source workspace's dependency tree. No npm package is published by `oma emit`.

This format was checked against the installed Pi 0.78.1 package documentation and package resolver on 2026-11-05. Read-only resolution of both the source repository and the emitted package loaded 33 skills with zero diagnostics, without installing a package or contacting a model.

## OpenCode and Kilo Code plugin package

`oma link` installs the opencode-family hook bridge per project: `.opencode/plugins/oma/oma.ts` (`.kilo/plugins/oma/` for Kilo) plus the handler entries it spawns, registered under `plugin` in `opencode.json` / `kilo.json`. The same bridge is also emitted as an npm plugin package so a project (or a global config) can load it without a per-project install:

```bash
oma emit --target opencode-package
```

The default output is `opencode-package/`; `--out <base>` writes it under `<base>/opencode-package/`. The package (`oh-my-agent-opencode`) contains the unchanged SSOT bridge (`oma.ts`), a package entry (`index.ts`, the `main`/`exports`), one generated handler entry per standalone hook script (each runs `oma hook script --vendor opencode --script <name>`), `filter-test-output.sh`, and a README. It has no dependencies; the `oma` CLI must be on PATH and `bun` must be installed, and every hook fails open when either is missing.

The two hosts load package plugins through different contracts, and the entry serves both from one default export: OpenCode 2.x reads `{ id, setup(ctx) }` and `setup` registers `ctx.session.hook("prompt" | "context" | "experimental.idle")` and `ctx.tool.hook("execute.before")`, each adapted onto the bridge's `chat.message`, `experimental.chat.system.transform`, `session.idle` and `tool.execute.before` handlers; Kilo Code and OpenCode 1.18.29+ require an object with `server()`, which is the bridge itself. Handler logic is not duplicated.

Register it by package name in `.opencode/opencode.json` (project) or `~/.config/opencode/opencode.json` (global); OpenCode installs npm plugins into its cache on startup:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["oh-my-agent-opencode"]
}
```

Kilo Code reads the same key from `.kilo/kilo.json` or `~/.config/kilo/kilo.json`; `kilo plugin oh-my-agent-opencode` adds the entry for you. Both hosts dispatch with the shared `opencode` identity, which answers in the Claude JSON dialect the bridge reads. A project where `oma link` already registered `./plugins/oma/oma.ts` does not need the package; keep one or the other.

OpenCode 2.x also accepts a directory plugin (`"plugin": ["../path/to/opencode-package"]`, relative to the config file), which loads the emitted package without npm. Note that OpenCode 2.x requires configured plugin paths to be directories and rejects a single-file entry: the per-project `./plugins/oma/oma.ts` registration `oma link` writes is skipped there ("configured plugin path must be a directory"), so on OpenCode 2.x use this package instead; Kilo Code still loads the per-project file.

Verified on 2026-11-08 against OpenCode 2.2.6 and Kilo Code CLI 7.8.27: both resolved `plugin: ["oh-my-agent-opencode"]` from the project config (`opencode debug config`, `kilo debug config`), OpenCode attempted the npm install (a 404 until the package is published) and stayed fail-open, and with the package placed in each host's plugin cache (`<cache>/opencode/npm/<spec>/node_modules/`, `<cache>/kilo/packages/<spec>/node_modules/`) a headless `run "orchestrate: say hi"` against a local OpenAI-compatible endpoint received `[OMA WORKFLOW: ORCHESTRATE]` in its system prompt on both hosts, followed by the persistent-mode re-entries up to the reinforcement cap. The package is emitted, not published: npm publishing is a release-pipeline step.

## Command Code mod package

Command Code's settings-file hooks (`.commandcode/settings.json`, installed by `oma link`) cover `SessionStart`, `PostToolUse` and `Stop` only. A [mod](https://commandcode.ai/docs/mods) sees the full lifecycle, so OMA also emits a mod package:

```bash
oma emit --target commandcode-mod
```

The default output is `commandcode-mod/`. Its `package.json` carries the `cmd-mod` keyword and a `commandcode` block (`mods: ["./mods/oma.ts"]`, `skills: ["./skills"]`), so one install brings the hook bridge and every OMA skill. `mods/oma.ts` maps the ModApi hooks onto the core handlers through `oma hook script --vendor commandcode --script <name>`: `transformInput` runs keyword-detector and skill-injector (the prompt passes through unchanged), `appendSystemPrompt` injects the detected context, `onSessionStart` runs code-intelligence-primer and state-boundary, `beforeToolCall` runs scm-guard (a deny becomes `{block: true}`) and test-filter on `shell_command`, and `onStop` turns a persistent-mode block into `{continue: true, reason}`. The package has no dependencies and needs no build step; every hook fails open without the `oma` CLI.

```bash
cmd mods add oh-my-agent-commandcode          # this project
cmd mods add -g oh-my-agent-commandcode       # your user
cmd mods add ./commandcode-mod                # a local checkout or `oma emit` output
cmd mods inspect ./commandcode-mod            # static report, never runs the mod
cmd --mod ./commandcode-mod/mods/oma.ts       # one session, without installing
```

Verified on 2026-11-08 against Command Code 1.88.5: `cmd mods inspect` reported the registered hooks, `cmd mods add -g <local path>` installed the package and `cmd mods list` showed `oma · user · from local:…`, and driving the mod's hooks against the CLI injected `[OMA WORKFLOW: ORCHESTRATE]`, blocked `git add .env`, and returned a persistent-mode continue. A model-backed `cmd -p` turn was not exercised (no Command Code account on the test machine). npm publishing is a release-pipeline step.

## Cursor plugin verification

Cursor Agent `2026.10.22-27dcf5f` exposes:

```text
agent --plugin-dir <path>
agent plugin marketplace add <gitUrl> [--git-ref <ref>]
agent plugin marketplace list
agent plugin marketplace remove <nameOrUrl>
agent plugin marketplace update <nameOrUrl>
```

Its plugin CLI has no individual plugin install command. Marketplace registration is an account operation that indexes a Git repository; it does not provide an isolated local installation check. OMA does not register a marketplace automatically during emission.

On 2026-11-05 the committed Cursor manifest's two skill directories, agents directory, rules directory, MCP file, and logo all resolved within the repository. CLI help confirmed support for loading a local plugin directory. Account marketplace registration and a live model session were not exercised.

## Claude-compatible plugin hosts

Antigravity CLI, Grok Build CLI, ZCode, and Kimi Code read plugin manifests whose shape descends from Claude Code's `.claude-plugin/plugin.json`. `oma emit` generates one native manifest per host from the `.agents/` source of truth, and a git clone of this repository is the installable package for all four:

| Host | Emit target | Committed artifact | Skills | Agents | MCP | Hooks |
| --- | --- | --- | --- | --- | --- | --- |
| Antigravity CLI | `antigravity-plugin` | `antigravity-plugin/` (self-contained) | `skills/` | `agents/` (converted) | `mcp_config.json` | not shipped |
| Grok Build CLI | `grok-plugin` | `.grok-plugin/{plugin,marketplace}.json` | root `skills/` | `.agents/agents/*.md` | inline `mcpServers` | not declared |
| ZCode | `zcode-plugin` | `.zcode-plugin/{plugin,marketplace}.json` | root `skills/` | `.agents/agents/*.md` | inline `mcpServers` | not declared |
| Kimi Code | `kimi-plugin` | `.kimi-plugin/plugin.json` | root `skills/` | `.agents/agents/*.md` | inline `mcpServers` | not declared |

None of these packages ships hooks. The Claude plugin hooks resolve the project from `CLAUDE_PROJECT_DIR` and `${CLAUDE_PLUGIN_ROOT}`, which these hosts do not set, and Antigravity and Kimi run plugin hooks with the plugin directory as the working directory. Workflows and project hooks therefore come from the `oma` CLI (`npm i -g oh-my-agent`, then `oma install`), which provisions each host's native hook bridge. Skills, agents, rules, and MCP servers work without it.

In this source repository, run the local CLI as `bun cli/cli.ts emit --target <target>`; `--output-dir <base>` writes each artifact under `<base>` at the same relative path. The CI drift gate (`bun run --cwd cli check:emit-drift`) fails when a committed manifest differs from a fresh emit, and Release Please bumps every manifest version with the CLI release.

### Antigravity CLI (`agy`)

The package follows [antigravity.google/docs/build-plugins](https://antigravity.google/docs/build-plugins): `plugin.json` validated against `https://antigravity.google/schemas/v1/plugin.json`, `skills/<name>/SKILL.md`, `agents/<name>.md`, `rules/AGENTS.md` plus one `rules/<rule>.md` per OMA rule (`trigger: always_on | glob | model_decision`, comma-separated `globs`), `mcp_config.json`, `assets/logo.png`, and a README. A self-contained tree is emitted because `agy plugin validate --strict` rejects the repository root (the root `AGENTS.md` and Claude `hooks/hooks.json` are reported as never loaded).

```bash
git clone https://github.com/first-fluke/oh-my-agent
agy plugin validate --strict ./oh-my-agent/antigravity-plugin
agy plugin install ./oh-my-agent/antigravity-plugin
agy plugin list
agy --agent pm-planner
```

Skills load as `/<skill-name>`; MCP servers are namespaced as `oma_<server>`. `agy plugin import claude` also imports an existing Claude Code installation. On 2026-11-08 the committed tree passed `agy plugin validate --strict` (agy 1.5.3) with 0 errors and 0 warnings: 33 skills, 12 agents, 14 rules, 3 MCP servers.

### Grok Build CLI

Grok reads Claude Code plugins and marketplaces with no setup, so `.claude-plugin/` already works. The native `.grok-plugin/plugin.json` adds explicit skill, agent, and MCP declarations, and `.grok-plugin/marketplace.json` lists the same `oma` entry and `oma-frontend`, `oma-security`, `oma-research` domain roots as the Claude marketplace with local sources (`{"type": "local", "path": ...}`), the form Grok's catalog validator accepts without a pinned commit sha.

```bash
grok plugin marketplace add first-fluke/oh-my-agent
grok plugin install oma            # or oma-frontend, oma-security, oma-research
# Local clone instead of GitHub:
grok plugin validate ./oh-my-agent
grok --plugin-dir ./oh-my-agent
```

Grok was not installed on the emitting host; the manifest and catalog are checked structurally by the CLI tests against the documented field set and the `xai-org/plugin-marketplace` catalog rules.

### ZCode

ZCode resolves `.zcode-plugin/plugin.json` first and falls back to `.claude-plugin/plugin.json`, so the repository root resolves natively and each domain root resolves through its Claude manifest. Installation is GUI-only:

1. Open **Settings → Plugins**.
2. Click **Create → Add marketplace** (top right) and enter `first-fluke/oh-my-agent`, the Git URL, or the path of a local clone. ZCode validates the marketplace before adding it.
3. Under the **Personal** segment, click **Install** on `oma` (or a domain entry) and wait for the status to change to **Installed**. Plugins are enabled by default.
4. Later, use **Manage installed → Check for updates**; ZCode compares the catalog entry version in `.zcode-plugin/marketplace.json` with the installed `plugin.json`, so both track the CLI release.

ZCode was not installed on the emitting host; the manifest name pattern (`^[a-z0-9][a-z0-9._-]{0,127}$`), field set, and marketplace shape are asserted by the CLI tests.

### Kimi Code CLI

`.kimi-plugin/plugin.json` points `skills` at the root `skills/` scan directory, lists each `.agents/agents/*.md` file (already in Kimi's agent format: frontmatter `name` and `description`, Markdown body as the system prompt), inlines `mcpServers`, and carries the `interface` block shown by `/plugins`.

```text
/plugins install /absolute/path/to/oh-my-agent
/plugins install https://github.com/first-fluke/oh-my-agent
/reload
```

Kimi copies the plugin to `$KIMI_CODE_HOME/plugins/managed/oma/` and applies it to every project; skills are invoked as `/skill:oma:<skill-name>`. Kimi was not installed on the emitting host; the manifest surface (allowed fields, `./` path rule, hook field set) is asserted by the CLI tests.

## Qwen Agent Board

The experimental [Qwen Agent Board documentation](https://qwenlm.github.io/qwen-code-docs/en/users/features/agent-board/) describes `qwen board task`, `claim`, `done`, `ask`, and `answer`. The board coordinates local files; it does not start, join, or monitor agent processes.

OMA can forward explicit board operations when the installed Qwen CLI advertises the `board` command:

```bash
oma agent board show --board orders --json
oma agent board task "Check API" --board orders --actor api --owner web
oma agent board done TASK_ID --board orders --actor web --note "Checked"
```

The adapter also supports `claim`, `ask`, `answer`, and `decline`. It checks root help before forwarding an operation. It supplements OMA's execution state and receipts; it never marks OMA work complete automatically.

The installed Qwen Code 0.20.1 did not expose `board` or `agents` CLI commands on 2026-11-05. `qwen board --help` returned the root help, so this installation fails the capability check. A real native board operation remains unverified; there is no `agents join` integration.
