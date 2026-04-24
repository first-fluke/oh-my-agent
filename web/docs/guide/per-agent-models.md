---
title: "Guide: Per-Agent Model Configuration"
description: Configure different CLI vendors, models, and reasoning effort levels per agent via oma-config.yaml and models.yaml. Covers agent_cli_mapping, runtime profiles, oma doctor --profile, models.yaml, and session quota caps.
---

# Guide: Per-Agent Model Configuration

## Overview

oh-my-agent supports **per-agent model selection** through `agent_cli_mapping`. Each agent (pm, backend, frontend, qa, …) can target a specific vendor, model, and reasoning effort independently, instead of sharing one global vendor.

This page covers:

1. The three-file config hierarchy
2. The dual-format `agent_cli_mapping`
3. Runtime profile presets
4. The `oma doctor --profile` command
5. User-defined model slugs in `models.yaml`
6. Session quota caps

---

## Config File Hierarchy

oh-my-agent reads configuration from three files, in order of precedence (highest first):

| File | Purpose | Edit? |
|:-----|:--------|:------|
| `.agents/oma-config.yaml` | User overrides — agent-to-CLI mapping, active profile, session quota | Yes |
| `.agents/config/models.yaml` | User-provided model slugs (additions to the built-in registry) | Yes |
| `.agents/config/defaults.yaml` | Built-in Profile B baseline (5 `runtime_profiles`, safe fallbacks) | No — SSOT |

> `defaults.yaml` is part of the SSOT and must not be modified directly. All customization happens in `oma-config.yaml` and `models.yaml`.

---

## Dual-Format `agent_cli_mapping`

`agent_cli_mapping` accepts two value shapes so you can migrate gradually:

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # legacy — vendor only (uses default model)
  backend:                            # new AgentSpec object
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low
```

**Legacy string form**: `agent: "vendor"` — keeps working, uses the vendor's default model with default effort via the matching runtime profile.

**AgentSpec object form**: `agent: { model, effort }` — pins an exact model slug and reasoning effort (`low`, `medium`, `high`).

Mix and match freely. Unspecified agents fall back to the active `runtime_profile`, then to the top-level `agent_defaults` in `defaults.yaml`.

---

## Runtime Profiles

`defaults.yaml` ships Profile B with five ready-made `runtime_profiles`. Select one in `oma-config.yaml`:

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # see options below
```

| Profile | All agents route to | Use when |
|:--------|:--------------------|:---------|
| `claude-only` | Claude Code (Sonnet/Opus) | Consistent Anthropic stack |
| `codex-only` | OpenAI Codex (GPT-5.x) | Pure OpenAI stack |
| `gemini-only` | Gemini CLI | Google-first workflows |
| `antigravity` | Mixed: impl→codex, architecture/qa/pm→claude, retrieval→gemini | Cross-vendor strengths |
| `qwen-only` | Qwen Code | Local / self-hosted inference |

Profiles are a fast way to reshape the whole fleet without editing every agent line.

---

## `oma doctor --profile`

The `--profile` flag prints a matrix view showing each agent's resolved vendor, model, and effort — after `oma-config.yaml`, `models.yaml`, and `defaults.yaml` are merged.

```bash
oma doctor --profile
```

**Sample output:**

```
oh-my-agent — Profile Health (runtime=claude)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │
│ pm           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │
│ backend      │ openai/gpt-5.3-codex         │ codex    │ ✗ not logged in  │
│ frontend     │ openai/gpt-5.4               │ codex    │ ✗ not logged in  │
│ retrieval    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┘
```

Each row shows the resolved model slug (after `oma-config.yaml` + active profile + `defaults.yaml` merge) and whether you are signed in to the CLI that will execute that role. Use this whenever a subagent picks an unexpected vendor.

---

## Adding Slugs in `models.yaml`

`models.yaml` is optional and lets you register model slugs that are not in the built-in registry yet — useful for newly released models.

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — GPT-5.5 Spud release candidate"
```

Once registered, the slug becomes usable in `agent_cli_mapping`:

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

Slugs are identifiers — keep them in English exactly as published by the vendor.

---

## Session Quota Cap

Add `session.quota_cap` in `oma-config.yaml` to bound runaway subagent spawning:

```yaml
# .agents/oma-config.yaml
session:
  quota_cap:
    tokens: 2_000_000        # total session token ceiling
    spawn_count: 40          # max parallel + sequential subagents
    per_vendor:              # per-vendor token sub-caps
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

When a cap is reached the orchestrator refuses further spawns and surfaces a `QUOTA_EXCEEDED` status. Leave a field unset (or omit `quota_cap` entirely) to disable that dimension.

---

## Putting It Together

A realistic `oma-config.yaml`:

```yaml
active_profile: antigravity

agent_cli_mapping:
  pm: "claude"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Run `oma doctor --profile` to confirm resolution, then start a workflow as usual.


## Config file ownership

| File | Owner | Safe to edit? |
|------|-------|---------------|
| `.agents/config/defaults.yaml` | SSOT shipped with oh-my-agent | No — treat as read-only |
| `.agents/oma-config.yaml` | You | Yes — customize here |
| `.agents/config/models.yaml` | You | Yes — add new slugs here |

`defaults.yaml` carries a `version:` field so new oh-my-agent releases can add runtime_profiles, new Profile B slugs, or adjust the effort matrix. Editing it directly means you will not receive those upgrades automatically.

## Upgrading defaults.yaml

When you pull a newer oh-my-agent release, run `oma install` — the installer compares your local `defaults.yaml` version against the bundled one:

- **Match** → no change, silent.
- **Mismatch** → warning:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Mismatch + `--update-defaults`** → the bundled version overwrites yours:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

`models.yaml` is never touched by the installer. `oma-config.yaml` is also preserved, with one exception: `oma install` rewrites the `language:` line and refreshes the `vendors:` block based on the prompts you answer during install. Any other field you add (e.g., `agent_cli_mapping`, `active_profile`, `session.quota_cap`) is preserved across runs.

## Upgrading from a pre-5.16.0 install

If your project predates the per-agent model/effort feature:

1. Run `oma install` (or `oma update`) from your project root. The installer drops a fresh `defaults.yaml` into `.agents/config/` and runs migration `003-oma-config`, which moves any legacy `.agents/config/user-preferences.yaml` to `.agents/oma-config.yaml` automatically.
2. Run `oma doctor --profile`. Your existing `agent_cli_mapping: { backend: "gemini" }` values are resolved through `runtime_profiles.gemini-only.agent_defaults.backend`, so the matrix shows the correct slug and CLI automatically.
3. (Optional) Upgrade legacy string entries to the new AgentSpec form in `oma-config.yaml` when you want per-agent `model`, `effort`, `thinking`, or `memory` overrides:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. If you ever customized `defaults.yaml`, `oma install` will warn about the version mismatch instead of overwriting. Move your customizations into `oma-config.yaml` / `models.yaml`, then run `oma install --update-defaults` to accept the new SSOT.

No breaking changes to `agent:spawn` — legacy configs keep working through graceful fallback while you migrate at your own pace.
