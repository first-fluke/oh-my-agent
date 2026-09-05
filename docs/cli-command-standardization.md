# CLI command structure

OMA uses `oma <resource> <action> [arguments] [options]`. Only the standard spellings are accepted. Previous command paths and renamed
option spellings are removed. This is a breaking CLI release.

```sh
oma schedule list --output json
oma schedule create qa "Review the project" --every 1d --vendor codex
oma schedule delete <job-id>
oma agent spawn backend "Implement the endpoint" <session-id> --vendor codex
oma memory daemon status
oma state get <session-id>
oma search api search "query"
```

Use `oma <resource> --help` to discover actions and
`oma describe "schedule create"` for a JSON description. `describe` accepts only
standard paths. Full `oma describe` reports the canonical
tree, including newly visible groups; its path strings therefore change.

## Command names

| Previous spelling | Standard spelling |
|---|---|
| `schedule:add/list/remove/run/sync` | `schedule create/list/delete/run/sync` |
| `agent:*`, `auth:status`, `model:*`, `goal:set`, `ralph:verify` | Replace the command separator with a space |
| `memory:daemon status` | `memory daemon status` |
| `memory:retry-drain` | `memory retry drain` |
| `memory:maintain backup/prune/vacuum` | `memory maintain backup/prune/vacuum` |
| `hook`, `hook:probe` | `hook run`, `hook probe` |
| `dashboard`, `dashboard:web` | `dashboard terminal`, `dashboard web` |
| `skills opt` | `skill optimize` |
| Other `skills` actions | `skill <action>` |
| `vault rm` | `vault delete` |
| `search api <url>`, `search api:search` | `search api fetch <url>`, `search api search` |
| `search rss <url>`, `search rss:google` | `search rss fetch <url>`, `search rss google` |
| `slide new`, `slide viewer` | `slide create`, `slide preview` |
| `slide pdf/png/pptx` | `slide export pdf/png/pptx` |
| `slide import-pptx`, `slide fetch-video` | `slide import pptx`, `slide asset fetch-video` |
| `slide styles <action>` | `slide style <action>` |
| `image list-vendors`, `video list-providers` | `image vendor list`, `video provider list` |
| `serena reaper:enable/disable` | `serena reaper enable/disable` |
| `intel run` | `intel suggest` |

Previous command aliases such as `vid`, `img`, `sl`, `s`, and `viz` are removed.
Global operations such as `install`, `update`, `doctor`, and `version` retain
their names. Bare `oma` still uses the existing install action.

## State operations

| Previous invocation | Standard invocation |
|---|---|
| `state` | `state list` |
| `state <sid>` | `state get <sid>` |
| `state --archived` | `state list --archived` |
| `state --activate <sid>` | `state activate <sid>` |
| `state --archive` / `state --purge` | `state archive` / `state purge` |
| `state:required-decisions` | `state decisions list` |
| `state:inject-log <sid>` | `state inject-log list <sid>` |
| `state:inject-log <sid> --entry <file>` | `state inject-log get <sid> <file>` |
| `state:summary` / `state:mirror` | `state summary` |
| `stats` / `stats --reset` | `stats get` / `stats reset` |

Explicit `state get repair` looks up that ID; `state repair` is the repair action. Archive and purge retain their existing selection rules and
`--dry-run` behavior.

## Options

| Previous option | Standard option | Meaning |
|---|---|---|
| Agent/schedule `--model <vendor>` | `--vendor <vendor>` | Runtime vendor, not a model ID |
| `--root` | `--project-root` | Definitions/state root; distinct from execution `--workspace` |
| `--sid`, `--session` | `--session-id` | OMA session identity |
| Output-format `--format` | `--output` | Existing supported formats; `--json` remains available where already supported |
| `--out <dir>`, `--out-dir` | `--output-dir` | Output directory |
| Artifact `--out <file>` | `--output-file` | Artifact file |
| Validation `--out`, `--out-file` | `--report-file` | JSON validation report |
| `slide new --dir` | `slide create --output-dir` | New slide workspace |
| Other slide `--dir` | `--workspace` | Slide workspace |
| `explain validate --dir` | `--input-dir` | Directory to inspect |
| `scholar search --max` | `--limit` | Result limit |
| `--allow-external-out` | `--allow-external-output` | Preserve external-path permission |
| `schedule:add --max-age-days` | `schedule create --expires-after 30d` | Job lifetime; `0` remains indefinite |
| `memory:gc --max-age-days` | `memory gc --max-age 30d` | Retention; `0` retains its existing meaning |

Renamed option spellings (including vendor `-m`) are rejected. Actual image `--model` and yt-dlp
`search media --format` retain their original meanings. `--env` still accepts
environment variable names, not `KEY=VALUE` assignments. `--yes`, `--force`,
and `--dry-run` are not interchangeable; this release does not add dry-run
support to handlers that did not already implement it.

Timeouts accept unit suffixes such as `30s`, `2m`, and `30000ms`. Canonical
`model probe/propose --timeout` requires a suffix because the old colon
commands interpreted bare numbers as milliseconds. Existing second-based
commands still accept bare seconds. `--timeout-minutes` is removed;
use `--timeout 2m`. Durations must convert to whole legacy
units. Existing defaults are unchanged.

Contradictory `--json --output text` is rejected. JSON result structures and
exit codes from handlers are unchanged. `--` and child executable arguments
are forwarded without option rewriting.

## Implementation and migration

`cli/utils/command-paths.ts` defines path overrides and explicit state actions.
`command-options.ts` defines option names and unit conversions.
`command-surface.ts` derives routing and discovery from the registered command
tree. It rewrites command tokens and known options, never prompt contents.
The original Commander tree validates and executes the normalized invocation.

Newly registered OS schedules use `oma schedule run <id>`. Existing OS jobs
using `schedule:run` must be rewritten with `oma schedule sync` after upgrading.
Until synced, those old OS invocations fail. Update project hook wrappers with
`oma link` or `oma update`, and update external scripts to the new syntax. Hook execution still loads only the hook slice.

Removed paths and flags fail before handler execution. Command registrations
used internally by the dispatcher are implementation details, not accepted public aliases.
