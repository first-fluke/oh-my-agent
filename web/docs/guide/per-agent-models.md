---
title: "Guide: Per-Agent Model Configuration"
description: Configure different CLI vendors, models, and reasoning effort levels per agent using RARDO v2.1. Covers agent_cli_mapping, runtime profiles, oma doctor --profile, models.yaml, and session quota caps.
---

# Guide: Per-Agent Model Configuration

## Overview

RARDO v2.1 introduces **per-agent model selection** through `agent_cli_mapping`. Each agent (pm, backend, frontend, qa, …) can now target a specific vendor, model, and reasoning effort independently, instead of sharing one global vendor.

This page covers:

1. The three-file config hierarchy
2. The dual-format `agent_cli_mapping`
3. Runtime profile presets
4. The `oma doctor --profile` command
5. User-defined model slugs in `models.yaml`
6. Session quota caps

---

## Config File Hierarchy

RARDO v2.1 reads configuration from three files, in order of precedence (highest first):

| File | Purpose | Edit? |
|:-----|:--------|:------|
| `.agents/config/user-preferences.yaml` | User overrides — agent-to-CLI mapping, active profile, session quota | Yes |
| `.agents/config/models.yaml` | User-provided model slugs (additions to the built-in registry) | Yes |
| `.agents/config/defaults.yaml` | Built-in Profile B baseline (4 `runtime_profiles`, safe fallbacks) | No — SSOT |

> `defaults.yaml` is part of the SSOT and must not be modified directly. All customization happens in `user-preferences.yaml` and `models.yaml`.

---

## Dual-Format `agent_cli_mapping`

`agent_cli_mapping` accepts two value shapes so you can migrate gradually:

```yaml
# .agents/config/user-preferences.yaml
agent_cli_mapping:
  pm: "claude"                        # legacy — vendor only (uses default model)
  backend:                            # new AgentSpec object
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4.7"
    effort: medium
  qa:
    model: "google/gemini-3-pro"
    effort: low
```

**Legacy string form**: `agent: "vendor"` — keeps working, uses the vendor's default model with default effort.

**AgentSpec object form**: `agent: { model, effort }` — pins an exact model slug and reasoning effort (`low`, `medium`, `high`).

Mix and match freely. Unspecified agents fall back to the active `runtime_profile`.

---

## Runtime Profiles

`defaults.yaml` ships Profile B with four ready-made `runtime_profiles`. Select one in `user-preferences.yaml`:

```yaml
# .agents/config/user-preferences.yaml
active_profile: claude-only   # see options below
```

| Profile | All agents route to | Use when |
|:--------|:--------------------|:---------|
| `claude-only` | Claude Code (Sonnet/Opus) | Consistent Anthropic stack |
| `codex-only` | OpenAI Codex (GPT-5.x) | Pure OpenAI stack |
| `gemini-only` | Gemini CLI | Google-first workflows |
| `antigravity` | Mixed: pm→claude, backend→codex, qa→gemini | Cross-vendor strengths |
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
RARDO v2.1 — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4.7           medium   user-preferences
backend       openai    gpt-5.3-codex               high     user-preferences
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3-pro                low      profile:antigravity
architecture  claude    claude-opus-4.7             high     defaults
docs          claude    claude-sonnet-4.7           low      defaults

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
# .agents/config/user-preferences.yaml
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
    model: "anthropic/claude-sonnet-4.7"
    effort: medium
  qa:
    model: "google/gemini-3-pro"
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
