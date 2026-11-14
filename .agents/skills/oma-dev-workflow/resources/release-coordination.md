# Release Coordination

Release Please workflow for automated versioning and releases. Load when the
repository uses [Release Please](https://github.com/googleapis/release-please)
or the user asks to set it up. Keep an existing release tool (semantic-release,
changesets) unless replacement was requested.

## How It Works

1. **Release PR Creation**: When conventional commits are merged to the default branch, Release Please opens or updates a release PR
2. **CHANGELOG Generation**: The PR carries the generated CHANGELOG.md
3. **Version Bumping**: The PR updates the version in the files the release type owns (for example `package.json`)
4. **Release on Merge**: When the release PR is merged, a tag and GitHub release are created

## Release Configuration

The action uses the manifest configuration below unless `release-type` is set on
the action itself, so keep the release type in the config file and leave that
input unset.

```json
// release-please-config.json
{
  "packages": {
    ".": {
      "release-type": "node"
    }
  }
}
```

```json
// .release-please-manifest.json
{
  ".": "1.0.0"
}
```

Use the release type that matches the package (`node`, `python`, `rust`, `simple`, ...). Add one `packages` entry per released path in a monorepo.

## GitHub Actions Workflow

```yaml
# .github/workflows/release-please.yml
name: Release Please

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json
```

Pull requests opened with the default `GITHUB_TOKEN` do not trigger other
workflows. When CI must run on the release PR, pass a token the project has
provisioned for that purpose instead.

## Conventional Commit Format

Release Please recognizes these commit types:

| Type | Version Bump | Description |
|------|--------------|-------------|
| `feat:` | minor | New feature |
| `fix:` | patch | Bug fix |
| `docs:` | no release by default; project config may opt in | Documentation |
| `style:` | no release by default; project config may opt in | Code style (no logic) |
| `refactor:` | no release by default; project config may opt in | Code refactoring |
| `test:` | no release by default; project config may opt in | Tests |
| `chore:` | no release by default; project config may opt in | Maintenance |
| `feat!:` | major | Breaking change |
| `fix!:` | major | Breaking bug fix |

## Release Flow

1. Merge conventional commits to the default branch, for example `feat(api): add export endpoint` or `fix(auth): handle expired refresh token`.
2. Release Please opens a PR titled like `chore(main): release 1.1.0` with the updated CHANGELOG.md and version bump.
3. Review the version and changelog in the release PR before merging through the
   project's normal merge policy. The action alone does not auto-merge release
   PRs or publish a package; those require explicit project automation.
4. After the merge, confirm the tag and GitHub release exist.

If a publish job follows the release, build and test from the release tag, not
from the default branch HEAD.

## Mise Tasks for Release Management

```toml
# Root mise.toml
[tasks."release:check"]
description = "Show open release PRs and recent releases"
run = '''
#!/usr/bin/env bash
gh pr list --label "autorelease: pending" --state open
gh release list --limit 5
'''

[tasks."release:changelog"]
description = "List releasable commits since the last tag"
run = '''
#!/usr/bin/env bash
git log --pretty=format:"%s" $(git describe --tags --abbrev=0)..HEAD | grep -E "^(feat|fix|perf|build|revert|docs|style|refactor|test|chore|ci)(\(.+\))?!?:"
'''

[tasks."release:verify"]
description = "Show the latest release and its assets"
run = "gh release view --json tagName,name,createdAt,assets"
```

When no release PR appears, check in order: releasable commits since the last
tag (`release:changelog`), both config files present at the paths the workflow
passes, and recent runs of the workflow (`gh run list --workflow=release-please.yml --limit 5`).

## Setup Requirements

1. **GitHub Actions workflow** (`.github/workflows/release-please.yml`)
2. **Release Please config** (`release-please-config.json`)
3. **Release Please manifest** (`.release-please-manifest.json`)
4. **Conventional commits** enforced by commitlint (see [validation-pipeline.md](validation-pipeline.md))
5. **GitHub CLI** (`gh`) installed for the release tasks — `brew install gh` or `mise use gh` (it is a Go binary, not an npm package; `bunx gh` resolves an unrelated deprecated package)
