---
title: "Guide: Per-Agent Model Configuration"
description: Configure different CLI vendors, models, and reasoning effort levels per agent via oma-config.yaml and models.yaml. Covers agent_cli_mapping, runtime profiles, oma doctor --profile, models.yaml, and session quota caps.
---

# Guide: Per-Agent Model Configuration

## Overview

 introduces **per-agent model selection** through `agent_cli_mapping`. Each agent (pm, backend, frontend, qa, …) can now target a specific vendor, model, and reasoning effort independently, instead of sharing one global vendor.

This page covers:

1. The three-file config hierarchy
2. The dual-format `agent_cli_mapping`
3. Runtime profile presets
4. The `oma doctor --profile` command
5. User-defined model slugs in `models.yaml`
6. Session quota caps

---

## Config File Hierarchy

 reads configuration from three files, in order of precedence (highest first):

| File | Purpose | Edit? |
|:-----|:--------|:------|
| `.agents/oma-config.yaml` | User overrides — agent-to-CLI mapping, active profile, session quota | Yes |
| `.agents/config/models.yaml` | User-provided model slugs (additions to the built-in registry) | Yes |
| `.agents/config/defaults.yaml` | Built-in Profile B baseline (4 `runtime_profiles`, safe fallbacks) | No — SSOT |

> `defaults.yaml` is part of the SSOT and must not be modified directly. All customization happens in `user-preferences.yaml` and `models.yaml`.

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

**Legacy string form**: `agent: "vendor"` — keeps working, uses the vendor's default model with default effort.

**AgentSpec object form**: `agent: { model, effort }` — pins an exact model slug and reasoning effort (`low`, `medium`, `high`).

Mix and match freely. Unspecified agents fall back to the active `runtime_profile`.

---

## Runtime Profiles

`defaults.yaml` ships Profile B with four ready-made `runtime_profiles`. Select one in `user-preferences.yaml`:

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
| `qwen-only` | Qwen CLI | Local / self-hosted inference |

Profiles are a fast way to reshape the whole fleet without editing every agent line.

---

## `oma doctor --profile`

The new `--profile` flag prints a matrix view showing each agent's resolved vendor, model, and effort — after all three config files are merged.

```bash
oma doctor --profile
```

**Sample output:**

```
 — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4-6           medium   user-preferences
backend       openai    gpt-5.3-codex               high     user-preferences
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3.1-pro-preview              low      profile:antigravity
architecture  claude    claude-opus-4-7             high     defaults
docs          claude    claude-sonnet-4-6           low      defaults

Session quota cap:
  tokens:       2,000,000
  spawn_count:  40
  per_vendor:   { claude: 1.2M, openai: 600K, google: 200K }
```

Use this whenever a subagent picks an unexpected vendor — the `Source` column tells you which config layer won.

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

Add `session.quota_cap` in `user-preferences.yaml` to bound runaway subagent spawning:

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

A realistic `user-preferences.yaml`:

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
| `.agents/config/defaults.yaml` | **SSOT shipped with oh-my-agent** | ❌ Treat as read-only |
| `.agents/oma-config.yaml` | You | ✅ Customize here |
| `.agents/config/models.yaml` | You | ✅ Add new slugs here |

`defaults.yaml` carries a `version:` field so new OMA releases can add runtime_profiles, new Profile B slugs, or adjust the effort matrix. Editing it directly means you will not receive those upgrades automatically.

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

Your `user-preferences.yaml` and `models.yaml` are never touched by the installer.

## Upgrading from a pre-5.16.0 install

If your project predates the per-agent model/effort feature:

1. Run `oma install` from your project root. The installer drops a fresh `defaults.yaml` into `.agents/config/` and preserves your existing `oma-config.yaml`.
2. Run `oma doctor --profile`. Your legacy `agent_cli_mapping: { backend: "gemini" }` values are now resolved through `runtime_profiles.gemini-only.agent_defaults.backend`, so the matrix shows the correct slug and CLI automatically.
3. (Optional) Move custom agent settings from `oma-config.yaml` into the new `user-preferences.yaml` using the AgentSpec form if you want per-agent `model`, `effort`, `thinking`, or `memory` overrides:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. If you ever customized `defaults.yaml`, `oma install` will warn about the version mismatch instead of overwriting. Move your customizations into `user-preferences.yaml` / `models.yaml`, then run `oma install --update-defaults` to accept the new SSOT.

No breaking changes to `agent:spawn` — legacy configs keep working through graceful fallback while you migrate at your own pace.
