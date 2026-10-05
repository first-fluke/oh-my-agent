# OMA for DeepSeek Harness

Use project OMA skills and validation hooks in DeepSeek Harness (DSH). The
plugin connects DSH tool execution and turn completion to the existing OMA CLI.
It ships executable JavaScript and needs no build or install-time scripts.

## Requirements

- DeepSeek Harness `0.2.0-rc.2`, using Cordis `4.0.4`.
- The OMA CLI on the host's PATH. Tested with OMA `15.0.17`.
- An OMA project with `.agents/oma-config.yaml` or `.agents/oma-config.cue`.

Initialize OMA through its normal project installation before enabling this
plugin. The plugin does not install OMA or change your project configuration.
DSH's filesystem skill provider discovers `.agents/skills/<name>/SKILL.md`
directly, including the existing `resources/` and `_shared/` reference paths.

## Install

With the DSH CLI installed, run from an OMA repository checkout:

```sh
dsh plugin --profile web add ./integrations/dsh --ignore-scripts
dsh --profile web --dump-config
dsh web
```

The configuration dump should contain the `dsh-plugin-oma` bundle and the `oma`
plugin row. Choose your initialized OMA project as the DSH workspace.

For Git installation, pin a commit containing this integration and select the
subpackage using pnpm's Git source syntax:

```sh
dsh plugin --profile web add 'github:first-fluke/oh-my-agent#<commit>&path:/integrations/dsh' --ignore-scripts
```

Replace `<commit>` with the revision you reviewed. The package has no `prepare`,
`build`, or post-install script. CLI profiles are distinct from the Desktop
application's managed profile; these commands install into the CLI Web profile.

To remove it:

```sh
dsh plugin --profile web remove dsh-plugin-oma
```

## Use

Ask DSH to load an OMA skill, for example:

```text
Load oma-qa and review the changes in this repository.
```

The skill supplies instructions. The plugin runs the project's configured OMA
checks before and after tool calls and when a turn tries to finish. Hook output
becomes DSH tool decisions or model-visible follow-up context.

| DSH event | OMA event | Behavior |
| --- | --- | --- |
| `agent/created` | Direct runtime note | Explains the DSH runtime and project OMA skill location. |
| `agent/created` | `oma state emit boundary` | Ties the active OMA session to the DSH session, for `oma state trajectory`. |
| `tools/pre-execute` | `PreToolUse` | Denies a blocked call before its tool body runs; forwards approval requests and context. |
| `tools/post-execute` | `PostToolUse` | Adds validation feedback to the next model request. |
| `agent/turn-stopping` | `Stop` | Queues bounded follow-up work when an OMA check blocks completion. |

The bridge invokes `oma hook run --vendor claude --event <event>` using an
argument array, without a shell. Here `claude` selects OMA's hook JSON format.
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
    command: /absolute/path/to/oma
    commandArgs: []
    timeoutMs: 10000
    maxOutputBytes: 262144
    maxInputBytes: 4194304
    maxStopBlocks: 2
```

`command` names one executable. `commandArgs` is a literal argument array,
not a shell command. The host environment is inherited so OMA can use the
project's configured tools. Hook processes run in the agent's actual working
directory, including an explicit Bash `workdir`. Directories are resolved to
their physical paths so symlinks and relative paths are checked from the same
location as the tool. Cancellation, agent disposal, and plugin unload terminate
owned hook processes.

A project without an OMA marker is left alone. In an initialized project, a
failed, timed-out, or malformed pre-tool hook denies that call. A post-tool
failure becomes feedback, and a stop-hook failure uses the same bounded
follow-up mechanism.

## Verify

From the OMA repository root:

```sh
bun run test:dsh
```

The tests cover the shipped bridge and subprocess runner. The release
verification also uses published DSH packages for skill discovery, tool
execution, and agent continuation. Its model responses are deterministic test
fixtures; it makes no paid model calls.

Verified on macOS with DSH `0.2.0-rc.2`, Cordis `4.0.4`, and OMA `15.0.17`:
19 tests pass, all 33 project OMA skills are discovered, and the real OMA CLI
blocks a guarded tool call while allowing a benign call.

## References

- [DSH skill discovery](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/skills)
- [DSH plugin packaging](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish)
- [DSH tool events](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/tools)
- [pnpm Git subdirectory sources](https://pnpm.io/package-sources#install-from-a-git-repository-combining-different-parameters)
