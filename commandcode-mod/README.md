# oh-my-agent-commandcode

[oh-my-agent](https://github.com/first-fluke/oh-my-agent) for
[Command Code](https://commandcode.ai) as a mod package: the oma hook bridge
(`mods/oma.ts`) plus every oh-my-agent skill (`skills/`), loaded together by
one `cmd mods add`.

Requires the `oma` CLI on PATH (`npm install -g oh-my-agent`). Every hook
fails open: without `oma` the mod changes nothing.

## Install

```bash
cmd mods add oh-my-agent-commandcode        # this project
cmd mods add -g oh-my-agent-commandcode     # your user
cmd mods add ./path/to/commandcode-mod         # a local checkout or `oma emit` output
```

Try it without installing: `cmd --mod ./path/to/commandcode-mod/mods/oma.ts`.
Review what it registers first: `cmd mods inspect ./path/to/commandcode-mod`.

## What the mod does

| Command Code hook | oh-my-agent handler |
| --- | --- |
| `transformInput` | keyword-detector (workflow activation) and skill-injector; the prompt passes through unchanged |
| `appendSystemPrompt` | injects the detected context into the system prompt |
| `onSessionStart` | code-intelligence-primer and state-boundary |
| `beforeToolCall` (`shell_command`) | scm-guard (blocks staging likely secrets), test-filter (failures-only test output) |
| `onStop` | persistent-mode keeps an unfinished workflow running |

Each hook runs `oma hook script --vendor commandcode --script <name>`; the
handler logic lives in the installed CLI, so updating `oma` updates the
behaviour. A project where `oma link` already registered
`.commandcode/settings.json` hooks keeps those; this mod adds the prompt and
tool hooks the settings file cannot express.
