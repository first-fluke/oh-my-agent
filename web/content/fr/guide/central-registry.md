---
title: "Guide : Registre Central"
description: Documentation détaillée du registre central — workflow release-please, commits conventionnels, templates pour consommateurs, format .agent-registry.yml et comparaison avec l'approche GitHub Action.
---

# Guide : Registre Central

## Vue d'Ensemble

The central registry model treats the oh-my-agent GitHub repository (`first-fluke/oh-my-agent`) as a versioned artifact source. Consumer projects pull specific versions of skills and workflows from this registry, ensuring consistency across teams and projects.

This is the enterprise-grade approach for organizations that need:
- Version pinning across multiple projects.
- Auditable update trails via pull requests.
- Checksum verification for downloaded artifacts.
- Automated weekly update checks.
- Manual review before any update is applied.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  Central Registry                         │
│              (first-fluke/oh-my-agent)                    │
│                                                          │
│  ┌──────────────┐   ┌────────────────┐   ┌───────────┐  │
│  │ release-      │   │ CHANGELOG.md    │   │ Releases  │  │
│  │ please        │──►│ .release-       │──►│  - tarball│  │
│  │ workflow      │   │  please-        │   │  - sha256 │  │
│  │              │   │  manifest.json  │   │  - manifest│  │
│  └──────────────┘   └────────────────┘   └─────┬─────┘  │
│                                                 │        │
└─────────────────────────────────────────────────┼────────┘
                                                  │
                    ┌─────────────────────────────┼──────────────┐
                    │                             │              │
              ┌─────▼─────┐              ┌───────▼──────┐ ┌─────▼──────┐
              │ Project A  │              │ Project B    │ │ Project C  │
              │            │              │              │ │            │
              │ .agent-    │              │ .agent-      │ │ .agent-    │
              │ registry   │              │ registry     │ │ registry   │
              │ .yml       │              │ .yml         │ │ .yml       │
              │            │              │              │ │            │
              │ check-     │              │ check-       │ │ check-     │
              │ registry   │              │ registry     │ │ registry   │
              │ -updates   │              │ -updates     │ │ -updates   │
              │ .yml       │              │ .yml         │ │ .yml       │
              │            │              │              │ │            │
              │ sync-agent │              │ sync-agent   │ │ sync-agent │
              │ -registry  │              │ -registry    │ │ -registry  │
              │ .yml       │              │ .yml         │ │ .yml       │
              └────────────┘              └──────────────┘ └────────────┘
```

---

## For Maintainers: Releasing New Versions

### Release-Please Workflow

oh-my-agent uses [release-please](https://github.com/googleapis/release-please) to automate releases. The flow is:

1. **Conventional commits** land on `main`. Each commit must follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

   | Prefix | Meaning | Version Bump |
   |:-------|:--------|:-------------|
   | `feat:` | New feature | Minor (1.x.0) |
   | `fix:` | Bug fix | Patch (1.0.x) |
   | `feat!:` or `BREAKING CHANGE:` | Breaking change | Major (x.0.0) |
   | `chore:` | Maintenance | No bump (unless configured) |
   | `docs:` | Documentation | No bump |
   | `refactor:` | Code restructuring | No bump |
   | `perf:` | Performance improvement | Patch |
   | `test:` | Test changes | No bump |
   | `build:` | Build system | No bump |
   | `ci:` | CI configuration | No bump |
   | `style:` | Code style | No bump |
   | `revert:` | Revert previous commit | Depends on reverted commit |

2. **Release-please creates a release PR** that:
   - Bumps the version in `package.json` and related files.
   - Updates `CHANGELOG.md` with all commits since the last release.
   - Updates `.release-please-manifest.json` with the new version.

3. **When the release PR is merged**, release-please:
   - Creates a Git tag (e.g., `cli-v4.7.0`).
   - Creates a GitHub Release with the changelog.

4. **A CI workflow** then:
   - Builds the `agent-skills.tar.gz` tarball containing the `.agents/` directory.
   - Generates a SHA256 checksum file (`agent-skills.tar.gz.sha256`).
   - Generates `prompt-manifest.json` with version and file metadata.
   - Attaches all three artifacts to the GitHub Release.
   - Syncs `prompt-manifest.json` to the `main` branch for the CLI update mechanism.

### Release Artifacts

Each release produces three artifacts attached to the GitHub Release:

| Artifact | Description | Purpose |
|:---------|:-----------|:--------|
| `agent-skills.tar.gz` | Compressed tarball of the `.agents/` directory | Contains all skills, workflows, configs, agents |
| `agent-skills.tar.gz.sha256` | SHA256 checksum of the tarball | Integrity verification before extraction |
| `prompt-manifest.json` | JSON with version, file count, and metadata | Used by `oma update` to check for new versions |

### Conventional Commit Examples

```bash
# Feature addition (minor bump)
git commit -m "feat: add Rust backend language variant"

# Bug fix (patch bump)
git commit -m "fix: resolve workspace detection for Nx monorepos"

# Breaking change (major bump)
git commit -m "feat!: rename .agent/ to .agents/ directory"

# Scoped commit
git commit -m "feat(backend): add SQLAlchemy async session support"

# No version bump
git commit -m "chore: update test fixtures"
git commit -m "docs: add central registry guide"
git commit -m "ci: sync prompt-manifest.json [skip ci]"
```

---

## For Consumers: Setting Up Your Project

### Template Files

oh-my-agent provides two template files in `docs/consumer-templates/` that you copy into your project:

1. **`.agent-registry.yml`** — Configuration file placed at your project root.
2. **`check-registry-updates.yml`** — GitHub Actions workflow placed at `.github/workflows/`.
3. **`sync-agent-registry.yml`** — GitHub Actions workflow placed at `.github/workflows/`.

### .agent-registry.yml Format

This file lives at your project root and controls how your project interacts with the central registry.

```yaml
# Central registry repository
registry:
  repo: first-fluke/oh-my-ag

# Version pinning
# Options:
#   - Specific version: "1.2.0"
#   - Latest: "latest" (not recommended for production)
version: "4.7.0"

# Auto-update settings
auto_update:
  # Enable weekly update check PRs
  enabled: true

  # Schedule (cron format) - default: every Monday at 9am UTC
  schedule: "0 9 * * 1"

  # PR settings
  pr:
    # Auto-merge is disabled by design (manual review required)
    auto_merge: false

    # PR labels
    labels:
      - "dependencies"
      - "agent-registry"

    # Reviewers (optional)
    # reviewers:
    #   - "username1"
    #   - "username2"

# Sync settings
sync:
  # Target directory for .agents/ files
  target_dir: "."

  # Backup existing .agents/ before sync
  backup_existing: true

  # Files/directories to preserve during sync (glob patterns)
  # These won't be overwritten from the registry
  preserve:
    - ".agent/config/user-preferences.yaml"
    - ".agent/config/local-*"
```

**Key fields explained:**

- **`version`** — Pin to a specific version for reproducibility. Use `"latest"` only for experimental projects.
- **`auto_update.enabled`** — When true, the check workflow runs on schedule.
- **`auto_update.schedule`** — Cron expression for how often to check. Default is weekly on Monday at 9am UTC.
- **`auto_update.pr.auto_merge`** — Always `false` by design. Updates require manual review.
- **`sync.preserve`** — Glob patterns for files that should not be overwritten during sync. Typically includes your project's `user-preferences.yaml` and any local configuration overrides.

### Workflow Roles

#### check-registry-updates.yml

**Purpose:** Checks for new versions and creates a PR if an update is available.

**Trigger:** Cron schedule (default: weekly) or manual dispatch.

**Flow:**
1. Reads the current version from `.agent-registry.yml`.
2. Fetches the latest release tag from the registry repo via GitHub API.
3. Compares versions — exits if already up to date.
4. If an update is available:
   - Checks if a PR for this version already exists (prevents duplicates).
   - Creates a new branch (`agent-registry-update-{version}`).
   - Updates the version in `.agent-registry.yml`.
   - Commits and pushes.
   - Creates a PR with changelog information and review instructions.

**Labels applied:** `dependencies`, `agent-registry`.

**Permissions required:** `contents: write`, `pull-requests: write`.

#### sync-agent-registry.yml

**Purpose:** Downloads and applies the registry files when the version changes.

**Trigger:** Push to `main` that modifies `.agent-registry.yml`, or manual dispatch.

**Flow:**
1. Reads the version from `.agent-registry.yml` (or from manual input).
2. Downloads release artifacts: `agent-skills.tar.gz`, checksum, and manifest.
3. Verifies the SHA256 checksum.
4. Backs up the existing `.agents/` directory (with timestamp).
5. Extracts the tarball.
6. Restores preserved files from the backup (per `sync.preserve` patterns).
7. Commits the synced files.
8. Cleans up backup directories older than 7 days.

**Permissions required:** `contents: write`.

---

## Comparison: Central Registry vs GitHub Action

| Aspect | Central Registry | GitHub Action |
|:-------|:----------------|:-------------|
| **Setup complexity** | Higher — 3 files to configure | Lower — 1 workflow file |
| **Version control** | Explicit pinning in `.agent-registry.yml` | Always updates to latest |
| **Update mechanism** | Two-step: check PR then sync workflow | Single step: oma update in CI |
| **Checksum verification** | Yes — SHA256 verified before extraction | No — relies on npm registry |
| **Rollback** | Change version in `.agent-registry.yml` | Revert the update commit |
| **Audit trail** | Version-pinned PRs with labels | Commit history |
| **Preserved files** | Configurable glob patterns in `.agent-registry.yml` | Built-in: `user-preferences.yaml`, `mcp.json`, `stack/` |
| **Update source** | GitHub Release artifacts (tarball) | npm registry (oh-my-agent package) |
| **Approval flow** | PR review required (auto-merge disabled) | Configurable (PR mode or direct commit) |
| **Multiple projects** | Each project has its own pinned version | Each project runs independently |
| **Offline/air-gapped** | Possible — download tarball manually | Requires npm access |

---

## When to Use Which

### Use the Central Registry When:

- You manage multiple projects that need to stay on the same version.
- You need auditable, reviewable update PRs with checksum verification.
- Your security policy requires explicit approval for dependency updates.
- You want to pin specific versions and upgrade projects on different schedules.
- You need the ability to download artifacts for air-gapped environments.

### Use the GitHub Action When:

- You have a single project or a few independent projects.
- You want the simplest possible setup (one workflow file).
- You are comfortable with automatic updates to the latest version.
- You want built-in config file preservation without manual configuration.
- You prefer the direct `oma update` mechanism over tarball extraction.

### Use Both When:

- The central registry manages version pinning and scheduled checks.
- The GitHub Action handles the actual `oma update` call when a version bump is approved.

This is valid but adds complexity. Most teams choose one approach.
