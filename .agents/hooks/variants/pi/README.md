# pi hook variant

`pi` (Earendil's [pi-coding-agent](https://github.com/earendil-works/pi)) does
**not** use the JSON hook-variant mechanism the other vendors share. Those
vendors register hook commands in a settings file (`installHooksFromVariant`),
and each hook runs as a `bun <script>` subprocess that reads stdin JSON and
writes stdout JSON.

pi instead **auto-loads in-process TypeScript extensions** and dispatches
`pi.on(event, handler)`. So pi gets a bespoke install path,
`installPiExtension`, which copies the core hook scripts plus `index.ts` (the
bridge in this directory) into `.pi/extensions/oma/`.

## Discovery

pi auto-discovers extensions from (official docs):

- `~/.pi/agent/extensions/*.ts` / `*/index.ts` (global)
- `.pi/extensions/*.ts` / `*/index.ts` (project-local)

`oma` installs the bridge as a **directory extension**:
`.pi/extensions/oma/index.ts`. The sibling `*.ts` files in that directory
(`keyword-detector.ts`, `skill-injector.ts`, `test-filter.ts`, deps) are NOT
auto-loaded — pi only treats `index.ts` as the entry point — they are spawned
as subprocesses by the bridge.

## Event mapping

| oma concern | other vendors | pi event | bridge action |
|---|---|---|---|
| keyword-detector + skill-injector | `UserPromptSubmit` | `before_agent_start` | spawn both, append their `additionalContext` to `event.systemPrompt` |
| test-filter | `PreToolUse` (Bash) | `tool_call` (bash) | spawn test-filter, rewrite `event.input.command` in place |
| persistent-mode | `Stop` (block) | — | **no analog** (see below) |
| hud / status line | `statusLine` | `ctx.ui.setStatus` (RPC only) | not wired |

## Known limitation: persistent workflows

pi has no stop-blocking event. Its only post-turn hook, `agent_end`, is
notification-only and cannot re-enter the agent loop. So the
"block termination until the workflow finishes" behaviour of `orchestrate`,
`ultrawork`, and `work` cannot be reproduced under pi. The persistent state is
still written; it simply degrades to **re-injection on the next user turn** via
`before_agent_start` (the same reinforcement path keyword-detector already
uses), rather than forcing continuation within a single turn.

## Vendor identity

`"pi"` is present in the **hook-layer** `VENDORS`
(`.agents/hooks/core/constants.ts`) so the `Vendor` dialect in `hook-output.ts`
can emit pi-native shapes. It is intentionally **absent** from the cli-runtime
`VENDORS` (`cli/constants/vendors.ts`), which drives the settings-file install
that does not apply to pi. The CLI spawn path still supports `-m pi` through the
runtime-dispatch external CLI config; it invokes `pi -p` as a subprocess rather
than a native subagent API.

## Enabling

Add `pi` to the `vendors:` block in `.agents/oma-config.yaml`, then run
`oma link` (or `oma install` / `oma update`). The bridge is regenerated into
`.pi/extensions/oma/` and workflow prompt wrappers are regenerated into
`.pi/prompts/` on every link. pi picks up extension changes on `/reload` or next
launch.
