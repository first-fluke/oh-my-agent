# Validation Pipeline

Use the project's existing app commands. The examples name web, api and mobile;
adapt that list to the repository. Shared packages, root configuration and unknown
paths conservatively trigger every app. Build, package and install tasks remain
subject to the execution policy.

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
subprocess calls. App checks run against the working tree; staged paths select
which apps to check. Do not run formatters that silently rewrite unstaged files.

```toml
[tasks."git:commit-msg"]
description = "Validate a commit message"
usage = 'arg "<file>"'
run = 'bunx @commitlint/cli@20 --edit "$usage_file"'

[tasks."git:pre-commit"]
description = "Lint apps affected by staged changes"
run = "python3 .mise/scripts/affected-checks.py --staged --kind lint"

[tasks."git:pre-push"]
description = "Test the complete branch change"
# Set CHECK_BASE to this project's target branch. Missing/unavailable base runs all apps.
run = 'python3 .mise/scripts/affected-checks.py --base "${CHECK_BASE:-origin/main}" --kind test'

[tasks."lint:changed"]
run = 'python3 .mise/scripts/affected-checks.py --base "${CHECK_BASE:-origin/main}" --kind lint'

[tasks."test:changed"]
run = 'python3 .mise/scripts/affected-checks.py --base "${CHECK_BASE:-origin/main}" --kind test'

[tasks."validate:changed"]
depends = ["lint:changed", "test:changed"]
```

Use the PR target's merge base, not HEAD~1. A documentation-only final commit must
not erase earlier feature changes from validation. Missing history must run
conservative checks rather than report an empty affected set.

## CI

Use full history and an explicit comparison base. The push before-SHA and PR
base-SHA below are example event values; an unavailable/zero revision triggers
all checks. Configure dependency provisioning using the repository's existing CI
setup before these commands; this example does not install dependencies.

```yaml
name: CI
on: [push, pull_request]
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
          python3 .mise/scripts/affected-checks.py --base "$CHECK_BASE" --kind lint
          python3 .mise/scripts/affected-checks.py --base "$CHECK_BASE" --kind test
      # Use the project's existing typecheck command where applicable.
```

## Commit message configuration

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
