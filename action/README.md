# oh-my-agent update action

Automatically update [oh-my-agent](https://github.com/first-fluke/oh-my-agent) skills in your repository via a scheduled GitHub Action.

> **Marketplace**: This action is also available on the [GitHub Marketplace](https://github.com/marketplace/actions/oh-my-agent-update) via [`first-fluke/oma-update-action`](https://github.com/first-fluke/oma-update-action).

## Usage

Create `.github/workflows/update-oma.yml` in your repository:

```yaml
name: Update oh-my-agent

on:
  schedule:
    - cron: "0 9 * * 1" # Every Monday at 09:00 UTC
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: first-fluke/oma-update-action@v1
```

## Inputs

| Input | Description | Default |
|:------|:-----------|:--------|
| `mode` | `pr` creates a pull request, `commit` pushes directly | `pr` |
| `base-branch` | Base branch for PR or direct commit target | `main` |
| `force` | Overwrite user config files (`--force`) | `false` |
| `pr-title` | Custom PR title | `chore(deps): update oh-my-agent skills` |
| `pr-labels` | Comma-separated labels for the PR | `dependencies,automated` |
| `commit-message` | Custom commit message | `chore(deps): update oh-my-agent skills` |
| `token` | GitHub token for PR creation | `${{ github.token }}` |

## Outputs

| Output | Description |
|:-------|:-----------|
| `updated` | `true` if changes were detected |
| `version` | The oh-my-agent version after update |
| `pr-number` | PR number (only in `pr` mode) |
| `pr-url` | PR URL (only in `pr` mode) |

## Examples

### Direct commit mode

```yaml
- uses: first-fluke/oma-update-action@v1
  with:
    mode: commit
    commit-message: "chore: sync oh-my-agent skills"
```

### With a Personal Access Token (for fork repos)

```yaml
- uses: first-fluke/oma-update-action@v1
  with:
    token: ${{ secrets.PAT_TOKEN }}
```

### Conditional job on update

```yaml
jobs:
  update:
    runs-on: ubuntu-latest
    outputs:
      updated: ${{ steps.oma.outputs.updated }}
    steps:
      - uses: actions/checkout@v4
      - uses: first-fluke/oma-update-action@v1
        id: oma

  notify:
    needs: update
    if: needs.update.outputs.updated == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "oh-my-agent was updated!"
```

## How it works

1. Installs `oh-my-agent` CLI via Bun
2. Runs `oma update --ci` (non-interactive mode)
3. Detects changes in `.agents/` and `.claude/` directories
4. Creates a PR or commits directly based on `mode` input
