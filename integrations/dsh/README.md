# OMA for DeepSeek Harness

Use project OMA skills and validation hooks in DeepSeek Harness (DSH). The
plugin installs its OMA CLI dependency and prepares uninitialized projects on
first use. It connects DSH tool execution and turn completion to OMA checks.
It ships executable JavaScript and needs no build or install-time scripts.

## Requirements

- DeepSeek Harness `0.2.0-rc.2`, using Cordis `4.0.4`.
- Node.js `22` or newer.
- Network access to GitHub when first opening an uninitialized project.
- Write access to that project's directory for automatic setup.

The plugin depends on exactly `oh-my-agent@20.4.1` and invokes that package's
CLI through Node.js. A global OMA installation or an `oma` executable on PATH
is unnecessary. Existing OMA projects can run without the setup download.

## Install

With the DSH CLI installed, install the plugin's own dependencies in your OMA
repository checkout, then add it to DSH:

```sh
cd integrations/dsh
npm install --ignore-scripts
cd ../..
dsh plugin --profile web add ./integrations/dsh --ignore-scripts
dsh --profile web --dump-config
dsh web
```

The configuration dump should contain the `dsh-plugin-oma` bundle and the `oma`
plugin row. Choose your project directory as the DSH workspace. DSH links a
local checkout, so that checkout needs its own installed dependencies.

For Git installation, pin a commit containing this integration and select the
subpackage using pnpm's Git source syntax:

```sh
dsh plugin --profile web add 'github:first-fluke/oh-my-agent#<commit>&path:/integrations/dsh' --ignore-scripts
```

Replace `<commit>` with the revision you reviewed. The package has no `prepare`,
`build`, or post-install script. Git installation resolves the package's
dependencies automatically. CLI profiles are distinct from the Desktop
application's managed profile; these commands install into the CLI Web profile.

To remove it:

```sh
dsh plugin --profile web remove dsh-plugin-oma
```

## Use

When DSH creates the first agent in an uninitialized workspace, the plugin:

1. Finds the nearest Git root, or uses the workspace directory when it has no
   Git root.
2. Downloads the approximately 1 MB `agent-skills.tar.gz` release asset for
   `cli-v20.4.1`, checks its SHA-256 checksum, and verifies its version.
3. Copies missing project templates into `.agents/` and creates a minimal
   `.agents/oma-config.yaml`. Existing files are preserved.
4. Refreshes DSH's skill discovery before the first model turn.

An existing `.agents/oma-config.yaml` or `.agents/oma-config.cue` skips setup
and remains unchanged. Automatic setup installs project skills, rules,
workflows, agent definitions, configuration templates, and hooks. It does not
run the full `oma install` command or configure vendor tools in your home
directory. The generated configuration disables automatic CLI updates and
keeps `providers.code_intelligence_guard: off` until you configure a code
intelligence provider and its DSH tools.

After setup, the plugin no longer needs the setup download to use that project.
The project's selected tools or skills may have their own network requirements.
DSH's filesystem skill provider discovers `.agents/skills/<name>/SKILL.md`
directly, including the existing `resources/` and `_shared/` reference paths.

Ask DSH to load an OMA skill, for example:

```text
Load oma-qa and review the changes in this repository.
```

The skill supplies instructions. The plugin runs the project's configured OMA
checks before and after tool calls and when a turn tries to finish. Hook output
becomes DSH tool decisions or model-visible follow-up context.

| DSH event | OMA event | Behavior |
| --- | --- | --- |
| `agent/created` | Project setup and runtime note | Prepares an uninitialized project and explains the skill location and CLI invocation. |
| `agent/created` | `oma state emit boundary` | Ties the active OMA session to the DSH session, for `oma state trajectory`. |
| `tools/pre-execute` | `PreToolUse` | Denies a blocked call before its tool body runs; forwards approval requests and context. |
| `tools/post-execute` | `PostToolUse` | Adds validation feedback to the next model request. |
| `agent/turn-stopping` | `Stop` | Queues bounded follow-up work when an OMA check blocks completion. |

The bridge invokes the dependency's CLI with
`hook run --vendor claude --event <event>` using an argument array, without a
shell. The runtime note gives the agent that CLI command as an argument array
for other OMA instructions. Here `claude` selects OMA's hook JSON format.
The DSH agent and session keep their existing identities. The bridge deliberately
omits OMA `SessionStart` and `UserPromptSubmit`: those handlers currently record
host identity and contain Claude-specific prompt behavior.

When an OMA session is active, a root agent records its DSH session id (and
`DSH_HOME`, when set) on that session as a `boundary` event. `oma state
trajectory` uses it to join the session's events with the DSH session log, so
DSH turns, tool calls, and token usage appear in the trajectory. With no active
OMA session there is nothing to attach to and nothing is recorded. Subagents
are not recorded; their work lives in separate DSH sessions.

DSH freezes tool arguments before its pre-execution hooks. If OMA requests a
changed input, the plugin denies the call instead of executing the original
input. The agent must make a new call with the required input. Post-execution
feedback cannot undo a completed tool.

Stop follow-up is bounded by `maxStopBlocks` to avoid an endless correction
loop. Exhausting this bound does not establish that OMA validation passed;
inspect the hook feedback and OMA result evidence.

Automatic OMA keyword-triggered workflows and OMA native role dispatch are not
part of this version. OMA Markdown workflows are instructions; they are not
converted into DSH JavaScript workflow scripts.

## Configuration

Override the `oma` row through your profile's `cordis.patch.yml`:

```yaml
- id: oma
  config:
    autoSetup: true
    setupTimeoutMs: 120000
    timeoutMs: 10000
    maxOutputBytes: 262144
    maxInputBytes: 4194304
    maxStopBlocks: 2
```

Set `autoSetup: false` to enable the plugin only in projects you have already
initialized with `.agents/oma-config.yaml` or `.agents/oma-config.cue`. With
that setting, uninitialized workspaces are left alone. `setupTimeoutMs` limits
automatic setup separately from the per-hook `timeoutMs`.

To use another CLI, add `command: /absolute/path/to/oma` and `commandArgs: []`.
`command` names one executable; `commandArgs` is a literal argument array.
These explicit overrides take precedence over the installed dependency. If
you override the CLI, keep it compatible with the `20.4.1` project templates
or initialize the project yourself and disable automatic setup.

The host environment is inherited so OMA can use the project's configured
tools. Hook processes run in the agent's actual working
directory, including an explicit Bash `workdir`. Directories are resolved to
their physical paths so symlinks and relative paths are checked from the same
location as the tool. Cancellation, agent disposal, and plugin unload terminate
owned hook processes.

Setup failures, including download and checksum failures, are shown to the
model and deny pre-tool execution. Fix the reported cause and reload the
plugin to retry; validation does not silently pass through after a setup
failure. In an initialized project, a failed, timed-out, or malformed
pre-tool hook denies that call. A post-tool failure becomes feedback, and a
stop-hook failure uses the same bounded follow-up mechanism.

## Verify

From the OMA repository root:

```sh
bun run test:dsh
```

The tests cover the shipped bridge, subprocess runner, runtime resolution,
project setup, and skill discovery refresh. The release
verification also uses published DSH packages for skill discovery, tool
execution, and agent continuation. Its model responses are deterministic test
fixtures; it makes no paid model calls.

Plugin `0.2.0` verification on macOS: 52 Node tests passed. With global `oma`
excluded from PATH, first-use setup downloaded and verified the `20.4.1`
project assets, refreshed a previously empty DSH skill catalog, discovered all
33 OMA skills, and loaded `oma-qa`. The dependency's real CLI allowed `pwd`
and denied `git add .env`. Dependencies were installed with scripts disabled.
Concurrent initialization also passed across 100 fresh projects with four
independent plugin instances per project (400 successful setup calls).

Historical baseline for plugin `0.1.0`: on macOS with DSH `0.2.0-rc.2`, Cordis
`4.0.4`, and a separately installed OMA `15.0.17`, 19 tests passed, all 33
project OMA skills were discovered, and the real OMA CLI blocked a guarded
tool call while allowing a benign call. That run predates automatic setup
and does not verify plugin `0.2.0` onboarding.

## References

- [DSH skill discovery](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/skills)
- [DSH plugin packaging](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish)
- [DSH tool events](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/tools)
- [pnpm Git subdirectory sources](https://pnpm.io/package-sources#install-from-a-git-repository-combining-different-parameters)
