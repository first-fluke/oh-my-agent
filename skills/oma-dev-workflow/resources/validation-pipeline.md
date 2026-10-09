# Validation Pipeline

Use the project's existing app commands. The examples name web, api and mobile;
adapt that list to the repository. Shared packages, root configuration and unknown
paths conservatively trigger every app. Select tools and nonmutating commands from
[tooling-profiles.md](tooling-profiles.md). Build, package and install tasks remain
subject to the execution policy.

## Repeated local validation

Group local validation runs by repository, branch, worktree directory, and the
same pipeline/app scope. Within that scope, keep only the latest invocation:

- Before starting a replacement, identify the running invocation it supersedes.
  Establish which invocation is newest so an older invocation cannot cancel a
  newer one when reruns arrive together.
- Stop the previous invocation and its owned child processes, and confirm they
  have exited before starting the replacement.
- Limit cancellation to the verified validation run. If ownership or shutdown
  cannot be confirmed, report the limitation rather than terminate unrelated
  processes or start overlapping checks. Avoid blanket process-name termination.
- Record superseded runs as canceled, never passed. A canceled Git-hook check
  must return a nonzero status. Discard partial or stale results and use only the
  latest completed run that checks the current working tree.

## Commitlint setup

Inspect the package manager, lockfile, commitlint config and hook manager first.
Keep existing configuration and integrate with existing hooks. Install
`@commitlint/cli` and `@commitlint/config-conventional` as local development
dependencies through the detected package manager; pin resolved versions and commit
its lockfile. Install those locked dependencies during local environment setup.
Do not download commitlint during a hook or depend on Bun being installed.

For an npm repository, a one-time setup task can run:

```bash
npm install --save-dev --save-exact @commitlint/cli @commitlint/config-conventional
```

Use the corresponding local execution command behind mise tasks:

| Package manager | Local commitlint command |
|-----------------|--------------------------|
| npm | `npm exec --no -- commitlint` |
| pnpm | `pnpm exec commitlint` |
| Yarn | `yarn exec commitlint` |
| Bun | `bun run commitlint` |

The task examples below use `./node_modules/.bin/commitlint` for an npm repository.
Adapt them to the detected manager, including Yarn PnP. A missing dependency or
config is an error; never replace commitlint with a successful no-op. When
commitlint is requested in a Python/Dart-only repository, explicitly provision a
pinned Node runtime with mise and a repository-local package manifest/lockfile for
these development tools. Report that prerequisite instead of silently adding a
runtime when commitlint was not requested.

```javascript
// commitlint.config.cjs — keep an existing project config when present.
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'perf', 'build', 'revert', 'docs',
                              'style', 'refactor', 'test', 'chore', 'ci', 'infra']],
  },
};
```

## Local hooks

Resolve the actual Git hooks directory so linked worktrees work. Preflight every
destination before writing anything; keep existing hooks and integrate them
through the project's chosen hook manager.

```toml
[hooks]
postinstall = '''
  hook_dir=$(git rev-parse --git-path hooks) || exit 1
  for name in commit-msg pre-commit pre-push; do
    if [ -e "$hook_dir/$name" ]; then
      echo "Existing hook: $hook_dir/$name; integrate it instead of overwriting." >&2
      exit 1
    fi
  done
  mkdir -p "$hook_dir"
  cat > "$hook_dir/commit-msg" <<'EOF'
#!/bin/sh
exec mise run git:commit-msg -- "$1"
EOF
  cat > "$hook_dir/pre-commit" <<'EOF'
#!/bin/sh
exec mise run git:pre-commit
EOF
  cat > "$hook_dir/pre-push" <<'EOF'
#!/bin/sh
exec mise run git:pre-push
EOF
  chmod +x "$hook_dir/commit-msg" "$hook_dir/pre-commit" "$hook_dir/pre-push"
'''
```

A linked worktree can share these hooks with other worktrees. If the project uses
core.hooksPath, use its existing installation process instead.

Copy [affected-checks.py](affected-checks.py) to the project's
`.mise/scripts/affected-checks.py`. It uses NUL-delimited Git paths and argv
subprocess calls. Adapt `APPS` and `CHECK_APPS` to the repository: include only apps
with applicable checks, such as excluding a Dockerfile-only target from
`typecheck`. Do not create passing placeholder tasks. App checks run against the
working tree; staged paths select which apps to check. Typecheck the full affected
app using its project configuration, rather than passing changed filenames to the
checker. Do not run formatters that silently rewrite unstaged files.

Define each app's required `check` task as an aggregate of its applicable lint,
typecheck and `format:check` tasks, as shown in the tooling profiles. Include
`format:check` only when a project formatter check is configured; never use a
mutating `format` task in hooks or CI. Shared dependencies in the aggregate run
once, so Dart lint/typecheck aliases can share one analyzer task. Missing required
tasks and failures in configured checks must fail validation.

The helper invokes app tasks only. If the Dockerfile profile defines a root
`lint:dockerfile` task, add that task once to the dependencies of `git:pre-commit`
and `validate:changed`, and run `mise run lint:dockerfile` once in the CI checks
step. This also covers root/shared Dockerfiles. Omit those additions when the
repository has no configured Dockerfile check.

```toml
[tasks."git:commit-msg"]
description = "Validate a commit message"
usage = 'arg "<file>"'
run = './node_modules/.bin/commitlint --edit "$usage_file"'

[tasks."git:pre-commit"]
description = "Check apps affected by staged changes"
run = "python3 .mise/scripts/affected-checks.py --staged --kind check"

[tasks."git:pre-push"]
description = "Check and test the complete branch change"
run = "mise run validate:changed"

[tasks."check:changed"]
# Set CHECK_BASE to this project's target branch. Missing/unavailable base runs all apps.
run = 'python3 .mise/scripts/affected-checks.py --base "${CHECK_BASE:-origin/main}" --kind check'

[tasks."lint:changed"]
run = 'python3 .mise/scripts/affected-checks.py --base "${CHECK_BASE:-origin/main}" --kind lint'

[tasks."typecheck:changed"]
run = 'python3 .mise/scripts/affected-checks.py --base "${CHECK_BASE:-origin/main}" --kind typecheck'

[tasks."test:changed"]
run = 'python3 .mise/scripts/affected-checks.py --base "${CHECK_BASE:-origin/main}" --kind test'

[tasks."validate:changed"]
depends = ["check:changed", "test:changed"]
```

Use the PR target's merge base, not HEAD~1. A documentation-only final commit must
not erase earlier feature changes from validation. Missing history must run
conservative checks rather than report an empty affected set.

## CI

Use full history and an explicit comparison base. App checks run on pushes and
PRs, use the complete branch comparison, and fall back to all applicable apps if
the base is missing, zero or unavailable. Commit messages are validated by the
local `commit-msg` hook.

Configure runtime/dependency provisioning using the repository's existing CI
setup before validation. This example expects locked dependencies to be installed.

```yaml
name: CI
on: [push, pull_request]
permissions:
  contents: read
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: jdx/mise-action@v2
      # Insert the existing project dependency/cache setup here.
      - name: Check affected apps
        env:
          CHECK_BASE: ${{ github.event.pull_request.base.sha || github.event.before }}
        run: |
          set -eu
          python3 .mise/scripts/affected-checks.py --base "$CHECK_BASE" --kind check
          python3 .mise/scripts/affected-checks.py --base "$CHECK_BASE" --kind test
```

Commitlint reference: [installation](https://commitlint.js.org/guides/getting-started.html),
[local hooks](https://commitlint.js.org/guides/local-setup.html).
