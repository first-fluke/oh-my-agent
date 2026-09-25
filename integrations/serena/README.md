# Managed Serena Dart diagnostics

OMA reuses the project's shared Serena daemon and Dart LSP for package diagnostics.
`oma install`, `oma update`, managed bridge startup, and `oma serena check` reconcile
an adapter shipped in `cli/assets/serena/`. Upgrades that remove the patch are
repaired automatically. Context regeneration retains the diagnostic tool when the
adapter is compatible. No Flutter build or second analyzer is started.

The adapter modifies the local Serena Python installation. It is tested against
**serena-agent 1.7.0 and Dart 3.13.4**. Untested Serena versions are rejected for
Dart checks. Update the compatibility check only after testing the upstream APIs;
there is no fallback that silently skips analysis.

## Commands

```sh
oma serena check --project apps/mobile --timeout 60 --staged
oma doctor
```

The check starts the shared server if needed and registers itself as a client for
its whole lifetime. Adapter code, project settings, context, and installed SDK
version form a startup revision. On revision changes, an idle daemon is replaced
after verifying its PID, command, project, context, and port. A daemon with live
clients is left running; close that project's active MCP sessions and retry.
Doctor reports missing/unsupported adapters, missing tool registration, and
pending restarts without repairing them.

Existing hooks invoking `oma-dart-check` can migrate once with:

```sh
oma serena setup
```

This repairs the adapter/context and creates `~/.local/bin/oma-dart-check`, which
invokes `oma serena check` through the same CLI entrypoint. Keep that directory on
`PATH`. On Windows, invoke `oma serena check` directly; the shell compatibility
launcher is unavailable. Automatic Python discovery supports Python entrypoint
scripts and adjacent Windows venv launchers; arbitrary shell/env wrappers fail
with an unavailable status rather than patching a different environment.

For development without building the CLI:

```sh
bun /path/to/oh-my-agent/cli/cli.ts serena setup
```

That compatibility launcher remains tied to this source checkout until setup is
run through an installed release. Packaging includes the four Python assets.

## Python symbol cache memory

The managed adapter also replaces Serena 1.7.0's eager, project-wide symbol
pickle loading with file-granular SQLite caches for every language. On the
observed project, the old caches occupied 339 MiB on disk; loading only the Dart
document cache raised a probe process from 17 MiB to 486 MiB peak memory.
Cached file roots also acquired parent references to whole workspace trees.

Cold files now remain on disk. Each lookup decodes only the requested file;
each write serializes before callers can attach workspace parents. This preserves
file hash validation, symbol parent/child relationships, and upstream cache
version invalidation while preventing request mutations from retaining other
files in the cache. Each SQLite connection has a 2 MiB page cache and no mmap.
Entries larger than 16 MiB serialized are served without caching. Database
failures fall back to uncached requests.

Existing `.pkl` files are preserved but not loaded. The first symbol query per
file populates the new `.serena/cache/<language>/oma-*.sqlite3` cache; later
sessions reuse it. Broad queries can still require large temporary object
graphs. These settings bound cache retention, not the process's entire heap.
Running servers pick up the change after restart. OMA leaves active sessions
running and reports a pending restart instead of interrupting them.

## Project SDK

Enable `dart` in `.serena/project.yml`'s `language_servers`. Existing runtime
reconciliation defaults `onlyAnalyzeProjectsWithOpenFiles` to true. Managed
startup selects the project's installed mise Flutter SDK, or mise Dart SDK when
Flutter is absent. It records `dart_executable: mise` so later tool-version
changes are followed. An existing explicit absolute SDK path is preserved.
It does not install or download a project SDK.

```yaml
ls_specific_settings:
  dart:
    dart_executable: mise
    initializationOptions:
      onlyAnalyzeProjectsWithOpenFiles: true
```

Optional `--dart-sdk /absolute/path/to/dart` asserts that Serena uses that SDK.
The response also validates the active repository and package scope.

## Check semantics

Exit codes: `0` completed without errors/warnings/info, `1` completed with
diagnostics, `2` incomplete or unavailable. `--staged` rejects unstaged or
untracked Dart/YAML/lock inputs within the package and detects index changes.
It never stashes or rewrites source files. OMA may reconcile Serena configuration.
CI should retain `flutter analyze`.

`--timeout` bounds startup and analysis separately, from 1 to 120 seconds each;
preparation has separate bounded SDK/installer probes. The Python analysis client
has an overall deadline, and OMA terminates it if it fails to exit after that
budget. Missing tools, timeouts, and unsupported methods fail closed.

The tool requests reanalysis, waits for a **new analysis start and completion
pair**, and collects package diagnostics including unchanged consumers. Dart
3.13.4 does not support `dart/workspace/analysis/complete`; its official
[reanalyze test](https://github.com/dart-lang/sdk/blob/3.13.4/pkg/analysis_server/test/lsp/reanalyze_test.dart)
uses the start/end notification sequence.

One file per checked package remains open to retain its warm context. That
context still consumes memory. This removes duplicate analyzer processes; it is
not a hard memory limit. Input snapshots exclude platform/build/cache directories
but track `.dart_tool/package_config.json`. External dependency contents are
expected to remain stable during a check. CI remains the full analysis authority.

## Tests

```sh
~/.local/share/uv/tools/serena-agent/bin/python3 -m unittest discover \
  -s integrations/serena -p 'test_*.py'
cd cli
bun x vitest run io/serena-adapter.test.ts io/serena-managed-runtime.test.ts \
  io/serena-daemon.test.ts commands/doctor/serena-adapter.test.ts
```

Coverage includes incomplete-analysis rejection, cross-file errors, partially
staged work, upgrade repair, idempotency, conditional tool registration, SDK
changes, busy-server reuse, and safe stale-server replacement.
