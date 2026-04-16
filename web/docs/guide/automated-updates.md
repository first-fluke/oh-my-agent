---
title: "Guide: Automated Updates"
description: Complete GitHub Action documentation for oh-my-agent — setup, all inputs and outputs, detailed examples, how it works under the hood, and comparison with the central registry.
---

# Guide: Automated Updates

## Overview

The oh-my-agent GitHub Action (`first-fluke/oma-update-action@v1`) automatically updates your project's agent skills by running `oma update` in CI. It supports two modes: creating a pull request for review, or committing directly to a branch.

---

## Quick Setup

Add this file to your project as `.github/workflows/update-oh-my-agent.yml`:

```yaml
name: Update oh-my-agent

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9am UTC
  workflow_dispatch:        # Allow manual trigger

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

That is the minimal configuration. It creates a PR with default settings when a new version is available.

---

## All Action Inputs

| Input | Type | Required | Default | Description |
|:------|:-----|:---------|:--------|:-----------|
| `mode` | string | No | `"pr"` | How to apply changes. `"pr"` creates a pull request. `"commit"` pushes directly to the base branch. |
| `base-branch` | string | No | `"main"` | Base branch for the PR (in `pr` mode) or the target branch for direct commits (in `commit` mode). |
| `force` | string | No | `"false"` | Pass `--force` to `oma update`. When `"true"`, overwrites user-customized config files (`oma-config.yaml`, `mcp.json`) and `stack/` directories. Normally these are preserved. |
| `pr-title` | string | No | `"chore(deps): update oh-my-agent skills"` | Custom title for the pull request. Only used in `pr` mode. |
| `pr-labels` | string | No | `"dependencies,automated"` | Comma-separated labels to add to the PR. Only used in `pr` mode. |
| `commit-message` | string | No | `"chore(deps): update oh-my-agent skills"` | Custom commit message. Used in both modes — as the PR commit message or the direct commit message. |
| `token` | string | No | `${{ github.token }}` | GitHub token for creating PRs. Use a Personal Access Token (PAT) if you need the PR to trigger other workflows (the default `GITHUB_TOKEN` does not trigger workflow runs on PRs it creates). |

---

## All Action Outputs

| Output | Type | Description | Available |
|:-------|:-----|:-----------|:----------|
| `updated` | string | `"true"` if changes were detected after running `oma update`. `"false"` if already up to date. | Always |
| `version` | string | The oh-my-agent version after the update. Read from `.agents/skills/_version.json`. | When `updated` is `"true"` |
| `pr-number` | string | The pull request number. | Only in `pr` mode when a PR is created |
| `pr-url` | string | The full URL of the created pull request. | Only in `pr` mode when a PR is created |

---

## Detailed Examples

### Example 1: Default PR Mode

The most common setup. Creates a PR every Monday if updates are available.

```yaml
name: Update oh-my-agent

on:
  schedule:
    - cron: '0 9 * * 1'
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
        id: update

      - name: Summary
        if: steps.update.outputs.updated == 'true'
        run: |
          echo "Updated to version ${{ steps.update.outputs.version }}"
          echo "PR: ${{ steps.update.outputs.pr-url }}"
```

**What happens:**
- Checks out the repository.
- Installs Bun, then installs oh-my-agent globally.
- Runs `oma update --ci`.
- Checks if `.agents/` or `.claude/` have changes.
- If changes exist, uses `peter-evans/create-pull-request@v8` to create a PR on branch `chore/update-oh-my-agent`.
- The PR is labeled `dependencies,automated` and includes the new version number in the body.

### Example 2: Direct Commit Mode with PAT

For teams that want updates applied immediately without a PR review step. Uses a PAT so the commit can trigger downstream workflows.

```yaml
name: Update oh-my-agent (Direct)

on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6am UTC
  workflow_dispatch:

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.OH_MY_AGENT_PAT }}

      - uses: first-fluke/oma-update-action@v1
        with:
          mode: commit
          token: ${{ secrets.OH_MY_AGENT_PAT }}
          commit-message: "chore: auto-update oh-my-agent skills"
          base-branch: develop
```

**What happens:**
- Checks out `develop` branch using a PAT.
- Runs `oma update --ci`.
- If changes exist, configures git as `github-actions[bot]` and commits directly to `develop`.
- The PAT ensures the commit triggers any workflows that listen for pushes on `develop`.

**Important:** Use `secrets.OH_MY_AGENT_PAT` (a Fine-Grained PAT with Contents: Write permission) instead of `github.token`. The default `GITHUB_TOKEN` creates commits that do not trigger other workflows, which can break CI pipelines that expect push events.

### Example 3: Conditional Notification

Update with Slack notification when a new version is available.

```yaml
name: Update oh-my-agent

on:
  schedule:
    - cron: '0 9 * * 1'
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
        id: update

      - name: Notify Slack
        if: steps.update.outputs.updated == 'true'
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": "oh-my-agent updated to v${{ steps.update.outputs.version }}. PR: ${{ steps.update.outputs.pr-url }}"
            }

      - name: Skip notification
        if: steps.update.outputs.updated == 'false'
        run: echo "Already up to date, no notification needed."
```

**Key pattern:** Use `steps.update.outputs.updated == 'true'` to conditionally run downstream steps only when an actual update occurred. This prevents noise from "no changes" runs.

### Example 4: Force Mode with Custom Labels

For projects that want to reset all config files to defaults on update.

```yaml
name: Update oh-my-agent (Force)

on:
  workflow_dispatch:  # Manual trigger only for force updates

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: first-fluke/oma-update-action@v1
        with:
          force: 'true'
          pr-title: "chore(deps): force-update oh-my-agent skills (reset configs)"
          pr-labels: "dependencies,automated,force-update"
          commit-message: "chore(deps): force-update oh-my-agent skills"
```

**Warning:** Force mode overwrites `oma-config.yaml`, `mcp.json`, and `stack/` directories. Use this only when you want to reset all customizations to defaults. For regular updates, omit the `force` input.

---

## How It Works Under the Hood

The action is a [composite action](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action) defined in `action/action.yml`. It executes 4 steps:

### Step 1: Setup Bun

```yaml
- uses: oven-sh/setup-bun@v2
```

Installs the Bun runtime, which is required to run the oh-my-agent CLI.

### Step 2: Install oh-my-agent

```bash
bun install -g oh-my-agent
```

Installs the CLI globally from the npm registry. This gives access to the `oma` command.

### Step 3: Run oma update

```bash
FLAGS="--ci"
if [ "${{ inputs.force }}" = "true" ]; then
  FLAGS="$FLAGS --force"
fi
oma update $FLAGS
```

The `--ci` flag runs the update in non-interactive mode (skips all prompts, outputs plain text instead of spinner animations). The `--force` flag, when enabled, overwrites user-customized config files.

What `oma update --ci` does internally:

1. Fetches `prompt-manifest.json` from the main branch to get the latest version number.
2. Compares with the local version in `.agents/skills/_version.json`.
3. If versions match, exits with "Already up to date."
4. If a new version is available, downloads and extracts the latest tarball.
5. Preserves user-customized files (unless `--force`): `oma-config.yaml`, `mcp.json`, `stack/` directories.
6. Copies new files over the existing `.agents/` directory.
7. Restores preserved files.
8. Updates vendor adaptations (hooks, settings, agent definitions) for all vendors.
9. Refreshes CLI symlinks.

### Step 4: Check for Changes

```bash
if [ -n "$(git status --porcelain .agents/ .claude/ 2>/dev/null)" ]; then
  echo "updated=true" >> "$GITHUB_OUTPUT"
  VERSION=$(jq -r '.version' .agents/skills/_version.json)
  echo "version=$VERSION" >> "$GITHUB_OUTPUT"
else
  echo "updated=false" >> "$GITHUB_OUTPUT"
fi
```

Checks if `oma update` actually changed any files in `.agents/` or `.claude/`. Sets the `updated` and `version` outputs accordingly.

After this, depending on the `mode` input:

- **`pr` mode:** Uses `peter-evans/create-pull-request@v8` to create a PR on branch `chore/update-oh-my-agent`. The PR includes the new version number, a link to the oh-my-agent repo, and the configured labels. If the branch already exists (from a previous unclosed PR), it updates the existing PR.

- **`commit` mode:** Configures git as `github-actions[bot]`, stages `.agents/` and `.claude/`, commits with the configured message, and pushes to the base branch.

---

## Comparison with Central Registry

| Aspect | GitHub Action | Central Registry |
|:-------|:-------------|:----------------|
| **Files to add** | 1 workflow file | 3 files (.agent-registry.yml + 2 workflows) |
| **Update source** | npm registry | GitHub Release artifacts |
| **Version pinning** | No — always latest | Yes — explicit in .agent-registry.yml |
| **Checksum verification** | No | Yes — SHA256 |
| **Config preservation** | Automatic (oma-config.yaml, mcp.json, stack/) | Manual (configure preserve patterns) |
| **PR creation** | Built-in (peter-evans/create-pull-request) | Built-in (gh pr create) |
| **Direct commit option** | Yes (mode: commit) | Not built-in (sync always commits) |
| **Force update** | Yes (force: true) | Always overwrites except preserved patterns |
| **Downstream triggers** | Need PAT for workflow triggers | Sync workflow is triggered by push to main |
| **Best for** | Simple projects, single team | Multi-project organizations, compliance needs |

For most teams, the GitHub Action is sufficient. Use the central registry when you need version pinning, checksum verification, or coordinated updates across many projects.
