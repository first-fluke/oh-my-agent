# Tooling Profiles

Use these profiles when setting up or changing development checks. For an
execution-only request, run the project's existing commands. Inspect manifests,
lockfiles, tool configs, task definitions, hooks, and CI before selecting a profile.
Preserve existing choices; these defaults fill missing configuration.

## Selection and task contract

| Detected scope | Default for missing configuration |
| --- | --- |
| Python | Ruff lint/format + explicitly configured pyrefly |
| JavaScript | Biome lint/format |
| TypeScript | Biome + TypeScript 7 native type checking |
| Dart / Flutter | SDK analyzer + `dart format`; Falcon is optional |
| Dockerfile | Hadolint |
| Commit messages | Local commitlint + `@commitlint/config-conventional` |

Configure only the detected packages/files and the requested operations. Keep the
project's package manager and runtime versions. Resolve compatible tool versions
at setup time and record them in manifests and lockfiles; pin standalone tools in
`mise.toml`. Provision dependencies before hooks or CI checks run. Hooks must not
download packages or initialize configuration.

Expose applicable tasks through `mise`:

- `lint`: checks without fixes.
- `format:check`: checks formatting without writes.
- `format`: explicitly requested formatting writes.
- `typecheck`: whole-app type analysis without compilation output.
- `check`: aggregate the applicable non-mutating checks.
- `git:commit-msg`: commitlint for the supplied message file.

Each underlying checker should run once per `check`: Biome `check` already checks
formatting, and the Dart analyzer covers both lint and types. JavaScript-only and
Dockerfile-only scopes need no placeholder typecheck task. Keep framework-specific
checks such as `vue-tsc` or `svelte-check` when already configured.

For example, a Python app can aggregate its three independent checks:

```toml
[tasks.check]
depends = ["lint", "format:check", "typecheck"]
```

Record the configured aggregate in an existing domain stack's supported contract:

```yaml
verify:
  syntax:
    cmd: "mise run check"
```

Merge this into the existing `verify` mapping; preserve `detect`, `tests`, raw-SQL
scans, and other domain fields. Use an app-qualified task path for monorepos. Do
not invent `verify.lint` or `verify.typecheck` fields unsupported by the schema.
`/stack-set` records detected configuration; this skill owns tool setup. Running
checks must not invoke `/stack-set` or install defaults implicitly.

## Python: Ruff and pyrefly

For an existing uv project, add both tools as development dependencies:

```sh
uv add --dev ruff pyrefly
```

For another package manager, use its development dependency/lockfile mechanism;
do not migrate the project to uv just for these checks. Preserve existing
`pyproject.toml`, `ruff.toml`, `.ruff.toml`, and pyrefly configuration. Derive Python
version, source roots, and exclusions from the actual project.

Configure pyrefly during setup with `uv run pyrefly init`, then inspect the
generated changes. Alternatively, add explicit project scope to `pyproject.toml`.
This example applies only when both `src/` and `tests/` exist:

```toml
[tool.pyrefly]
project-includes = ["src/**/*.py", "tests/**/*.py"]
search-path = ["src"]
```

Unconfigured pyrefly can use a basic preset or infer legacy settings. Do not claim
full project type checking without verifying its configuration and included paths.
Keep `init`, suppression generation, and Ruff `--fix` out of check tasks.

| Task | Command for a uv project |
| --- | --- |
| `lint` | `uv run --no-sync --no-python-downloads ruff check .` |
| `format:check` | `uv run --no-sync --no-python-downloads ruff format --check .` |
| `format` | `uv run --locked ruff format .` |
| `typecheck` | `uv run --no-sync --no-python-downloads pyrefly check` |

Provision the environment with `uv sync --locked` during setup/CI dependency
installation. `--locked` alone still permits environment synchronization;
`--no-sync` skips it, and `--no-python-downloads` prevents interpreter downloads.
Lockfile freshness is checked during provisioning; a missing checker must fail
instead of downloading it in a hook.

Sources: [Ruff](https://docs.astral.sh/ruff/tutorial/),
[Ruff formatter](https://docs.astral.sh/ruff/formatter/),
[pyrefly installation](https://pyrefly.org/en/docs/installation/),
[pyrefly configuration](https://pyrefly.org/en/docs/configuration/).

## JavaScript / TypeScript: Biome and native TypeScript

Install local development dependencies with the detected package manager. This is
an npm example for an unconfigured TypeScript project:

```sh
npm install --save-dev --save-exact @biomejs/biome typescript
./node_modules/.bin/biome init
```

For JavaScript alone, omit TypeScript. Run `biome init` only when configuration is
absent; use the installed version's generated schema rather than a stale JSON
template. Preserve existing ESLint/Prettier configurations unless replacement was
requested. Check framework, plugin, and file-type coverage before migrating tools.

| Task | npm example using installed tools |
| --- | --- |
| `lint` | `npm exec --no -- biome check .` |
| `format:check` | `npm exec --no -- biome format .` |
| `format` | `npm exec --no -- biome format --write .` |
| `typecheck` (TypeScript 7) | `npm exec --no -- tsc --noEmit` |

Biome's `check` includes formatting and assists; an aggregate can depend on `lint`
and `typecheck` without repeating `format:check`. Keep `--write` and unsafe fixes
out of validation; `biome ci` is also a non-mutating CI entry point.

TypeScript 7.0 RC and later use the executable name **`tsc`**, including the native
compiler. Keep an existing `typescript` 7 dependency and `tsc --noEmit` task. Only
projects explicitly using `@typescript/native-preview` should run `tsgo --noEmit`.
Check the installed package/executable before writing tasks; do not install both
packages or replace framework checks merely to obtain the `tsgo` name. If native
checking is incompatible with a project's configuration, retain its working
checker and report the limitation rather than silently skipping checks.

Sources: [Biome setup](https://biomejs.dev/installation/quick-start/),
[Biome CI](https://biomejs.dev/recipes/continuous-integration/),
[TypeScript downloads](https://www.typescriptlang.org/download/),
[native compiler command naming](https://github.com/microsoft/typescript-go#preview),
[noEmit](https://www.typescriptlang.org/tsconfig/noEmit.html).

## Dart / Flutter: SDK analyzer and formatter

Read `pubspec.yaml`, `pubspec.lock`, `analysis_options.yaml`, SDK constraints, and
the existing analyzer command. Use the project's Dart/Flutter SDK; do not install
a second SDK or replace analyzer plugins. Preserve existing lint rules and
analysis exclusions. Provision packages before running checks.

| Task | Dart command | Flutter command |
| --- | --- | --- |
| Analyzer | `dart analyze --fatal-infos` | `flutter analyze --no-pub --fatal-infos` |
| `format:check` | `dart format --output=none --set-exit-if-changed .` | Same |
| `format` | `dart format .` | Same |

The analyzer performs both lint and type checks. Use one `analyze` task and make
`lint`/`typecheck` aliases depend on it; the aggregate `check` should depend on
`analyze` and `format:check`. Hook/CI pipelines should call that aggregate once,
rather than invoke both aliases sequentially. Keep an existing package-specific
`dart analyze` command in Flutter projects that rely on analyzer plugins.

[Falcon](https://github.com/viveky259259/falcon) is a Rust/tree-sitter Dart/Flutter
linter. Offer it only as an explicitly selected additional check. Its default
analysis is syntactic, and its semantic mode invokes the Dart analyzer; it does
not replace SDK type checking. Verify the installed version and rule coverage
before adding a Falcon task. Do not infer analyzer compatibility from speed
claims or compile a tool from source without an explicit build request.

Sources: [Dart analyze](https://dart.dev/tools/dart-analyze),
[Dart format](https://dart.dev/tools/dart-format),
[Flutter CLI](https://docs.flutter.dev/reference/flutter-cli).

## Dockerfile: Hadolint

Use the installed Hadolint or provision a pinned release through mise's `hadolint`
tool during setup. Discover the actual Dockerfiles, including files outside the
root, and pass their paths explicitly. For a repository with a root Dockerfile:

```toml
[tasks."lint:dockerfile"]
run = "hadolint Dockerfile"
```

Preserve `.hadolint.yaml`/`.hadolint.yml`, rule severity, ignores, and inline
exceptions. Supply `--config` when the project uses another location. Hadolint's
`--ignore` replaces the configured ignore list, so do not add it casually. Do not
blanket-disable findings or append `|| true` to a failing lint command.

Include `lint:dockerfile` once in root/shared checks and in the selected hook/CI
pipeline; affected-app checks alone do not run root tasks. Hadolint performs
static checking: no Docker image build is required. Missing tool/configuration is
an incomplete check, not a successful skip.

Sources: [Hadolint](https://github.com/hadolint/hadolint),
[mise registry](https://mise.jdx.dev/registry.html).

## Commit messages: commitlint

Install both `@commitlint/cli` and `@commitlint/config-conventional` as locked local
development dependencies using the existing JavaScript tooling area. Without one
(for example, a Python-only repository), provision a pinned Node runtime and a
private tooling `package.json` with a lockfile as part of requested commitlint
setup. Keep tool dependencies separate from Python/Dart application dependencies.

Preserve existing commitlint configuration and the hook manager. For new
configuration, extend `@commitlint/config-conventional`; keep repository-specific
types/scopes when present. Run the installed CLI from the local `commit-msg` hook
for the quoted message-file path. Do not use transient `npx -y`, `bunx`, or
`pnpm dlx` downloads in hooks, or assume a Python-only repository has Bun.

Use [validation-pipeline.md](validation-pipeline.md) for the local dependency
example and `commit-msg` integration.
Initialize and install during setup; checks must only validate messages.

Sources: [commitlint setup](https://commitlint.js.org/guides/getting-started.html),
[configuration](https://commitlint.js.org/reference/configuration.html),
[local hooks](https://commitlint.js.org/guides/local-setup.html).
