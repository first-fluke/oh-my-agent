# oh-my-agent-opencode

The [oh-my-agent](https://github.com/first-fluke/oh-my-agent) hook bridge as an
npm plugin for [OpenCode](https://opencode.ai) and [Kilo Code](https://kilo.ai).
It registers the same in-process handlers `oma link` installs per project
(`.opencode/plugins/oma/`), without copying anything into the project, and
serves both plugin contracts from one default export: the OpenCode 2.x
`{ id, setup }` definition and the V1 `server()` object form Kilo Code and
OpenCode 1.18.29+ load.

Requires the `oma` CLI on PATH (`npm install -g oh-my-agent`) and `bun`.
Every hook fails open: without `oma` the host runs unchanged.

## OpenCode

Add the package to `plugin` in `.opencode/opencode.json` (project) or
`~/.config/opencode/opencode.json` (global). OpenCode installs npm plugins
on startup.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["oh-my-agent-opencode"]
}
```

Pin a release with `"oh-my-agent-opencode@<version>"`.

## Kilo Code

Kilo reads the same key from `.kilo/kilo.json` or
`~/.config/kilo/kilo.json`:

```json
{
  "$schema": "https://app.kilo.ai/config.json",
  "plugin": ["oh-my-agent-opencode"]
}
```

## What the bridge does

| OpenCode 2.x hook | Kilo / 1.x hook | oh-my-agent handler |
| --- | --- | --- |
| session `prompt` | `chat.message` | keyword-detector (workflow activation) and skill-injector |
| session `context` | `experimental.chat.system.transform` | injects the detected context into the system prompt |
| tool `execute.before` (bash) | `tool.execute.before` | scm-guard (blocks staging likely secrets), test-filter (failures-only test output) |
| session `experimental.idle` | `session.idle` event | persistent-mode re-enters an unfinished workflow |

Each handler entry in this package runs
`oma hook script --vendor opencode --script <name>`; the handler logic lives
in the installed CLI, so updating `oma` updates the behaviour.

A project that already has `./plugins/oma/oma.ts` registered by `oma link`
does not need this package; keep one or the other.
