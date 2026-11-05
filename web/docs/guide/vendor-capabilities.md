---
title: Vendor capabilities and packages
description: Skill discovery, agent definitions, hooks, and package formats across OMA vendors.
---

# Vendor capabilities and packages

`cli/constants/vendor-capabilities.ts` records each supported host's skill discovery, agent directory, hook bridge, and package manifest. Its vendor keys match `ALL_CLI_VENDORS`; skill projection paths come from `CLI_SKILLS_DIR` so project and global installations retain their existing destinations.

| Host | Shared skills without vendor links | Agent directory | Hook bridge | Package manifest |
| --- | --- | --- | --- | --- |
| Antigravity CLI | No | — | Settings | — |
| Claude Code | No | `.claude/agents` | Settings | `.claude-plugin/plugin.json` |
| Codex | No | `.codex/agents` | Settings | `codex-plugin/plugin.json` |
| Command Code | No | `.commandcode/agents` | Settings | — |
| Copilot CLI | No | `.github/agents` | Settings | — |
| Cursor | No | `.cursor/agents` | Settings | `.cursor-plugin/plugin.json` |
| Grok | — | `.grok/agents` | Settings | — |
| Hermes | No | — | — | — |
| Kimi | No | — | Settings | — |
| Kiro | No | `.kiro/agents` | Settings | — |
| OpenCode | No | `.opencode/agents` | Extension | — |
| Pi | Yes | — | Extension | `pi-package/package.json` |
| Qwen Code | Yes | `.qwen/agents` | Settings | — |
| ZCode | — | — | — | — |

“Without vendor links” means OMA can use shared discovery in both install modes. Kimi's project scanning alone does not replace its existing global skill projection. A hook bridge or an agent directory does not imply a subprocess runtime adapter. Gemini is not an OMA vendor; Antigravity CLI has its own integration.

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
