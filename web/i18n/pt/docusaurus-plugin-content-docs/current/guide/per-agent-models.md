---
title: "Guide: Per-Agent Model Configuration"
description: Configure which AI model each agent uses via model_preset in oma-config.yaml. Covers built-in presets, per-agent overrides, inline model definitions, custom presets with extends, oma doctor --profile, and migration from legacy model_preset (per-agent overrides via `agents:`).
---

# Guide: Per-Agent Model Configuration

## Overview

`model_preset` is the single concept that controls which model every agent uses. Pick one of the five built-in presets and every agent (pm, backend, frontend, qa, …) is wired to an appropriate model for that vendor stack. Override individual agents as needed. Define additional presets when your team has a non-standard mix.

All configuration lives in one file: `.agents/oma-config.yaml`.

This page covers:

1. The five built-in presets
2. Overriding individual agents with the `agents:` map
3. Inlining custom model slugs with `models:`
4. Defining custom presets with `custom_presets:` and `extends:`
5. Inspecting resolved configuration with `oma doctor --profile`
6. Migration from legacy `model_preset (per-agent overrides via `agents:`)`

---

## Built-In Presets

Set `model_preset` to one of the five built-in keys:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: gemini-only
```

| Key | Description | Best for |
|:----|:-----------|:---------|
| `claude-only` | All agents use Claude (Sonnet/Opus) | Claude Max subscription holders |
| `codex-only` | All agents use OpenAI Codex (GPT-5.x) with effort levels | ChatGPT Plus/Pro users |
| `gemini-only` | All agents use Gemini CLI, thinking enabled for implementation roles | Google AI Pro users |
| `qwen-only` | All agents routed external via Qwen Code; binary thinking (no effort levels) | Local / self-hosted inference |
| `antigravity` | Mixed: impl roles use Codex, architecture/qa/pm use Claude, retrieval uses Gemini | Cross-vendor strengths without managing per-agent config |

Built-in presets ship inside the CLI package and update automatically when you upgrade `oh-my-agent`. No local file to maintain.

---

## Overriding Individual Agents

Use the `agents:` map to override specific agents on top of the active preset. Only agents you list are affected; the rest stay on the preset defaults.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: gemini-only

agents:
  backend: { model: openai/gpt-5.3-codex, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Each entry is an `AgentSpec` object:

| Field | Type | Required | Description |
|:------|:-----|:---------|:-----------|
| `model` | string | Yes | Model slug (built-in or user-defined) |
| `effort` | `low` \| `medium` \| `high` | No | Reasoning effort (ignored on models that do not support it) |
| `thinking` | boolean | No | Enable extended thinking (model-specific) |
| `memory` | `user` \| `project` \| `local` | No | Memory scope for the agent |

Valid agent IDs: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `tf-infra`, `retrieval`.

The merge is shallow: each field in your override replaces the preset value for that field. Fields you omit keep their preset value.

---

## Inlining Model Slugs

Register model slugs that are not yet in the built-in registry under `models:`. Once registered, use the slug anywhere in `agents:` or `custom_presets:`.

```yaml
# .agents/oma-config.yaml
models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports:
      native_dispatch_from: [gemini]
      thinking: true
```

> If a user-defined slug collides with a built-in slug, the user definition wins and a warning is emitted.

---

## Custom Presets

Define additional presets in `custom_presets:`. Use `extends:` to inherit all agent defaults from a built-in preset and override only the agents you care about.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude-only              # base preset — partial merge
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-5.3-codex, effort: high }
      db:      { model: openai/gpt-5.3-codex, effort: high }
      # all other agents inherited from claude-only
```

Without `extends:`, you must provide `agent_defaults` for all 11 agent roles. With `extends:`, only the entries you list are overridden; the rest are inherited from the base preset.

---

## `oma doctor --profile`

Run `oma doctor --profile` to inspect the fully resolved model matrix — after preset defaults, `custom_presets`, and `agents:` overrides are merged.

```bash
oma doctor --profile
```

**Sample output:**

```
oh-my-agent — Profile Health (preset=antigravity)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┬──────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │ Source   │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┼──────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │ (preset) │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ backend      │ openai/gpt-5.3-codex         │ codex    │ ✗ not logged in  │ (override)│
│ retrieval    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┴──────────┘
```

Each row shows the resolved model slug and which source applied it (`(preset)` or `(override)`). Use this whenever a subagent picks an unexpected vendor.

---

## Migration from Legacy `model_preset (per-agent overrides via `agents:`)`

Migration 008 runs automatically on `oma install` and `oma update`. It converts legacy projects in place:

| Legacy config | Result after migration 008 |
|:-------------|:--------------------------|
| All entries same vendor (e.g. all `gemini`) | `model_preset: gemini-only`, no `agents:` |
| Mixed vendors | Most-frequent vendor → `model_preset`; others → `agents:` overrides |
| `AgentSpec` object values | Moved to `agents:` as-is |
| `models.yaml` content | Inlined into `oma-config.yaml.models` |
| Customized `defaults.yaml` | Preserved as `custom_presets.user-customized` with a warning |

Originals are backed up to `.agents/.backup-pre-008-{timestamp}/` before any changes. The migration is idempotent — if `model_preset` is already present, it skips.

After migration, `cli built-in presets (no user file)`, ``oma-config.yaml` `models:` block`, and the `.agents/config/` directory are removed.

---

## Session Quota Cap

`session.quota_cap` is unchanged. Add it to `oma-config.yaml` to bound runaway subagent spawning:

```yaml
session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

When a cap is reached, the orchestrator refuses further spawns and surfaces a `QUOTA_EXCEEDED` status.

---

## Full Example

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports: { native_dispatch_from: [gemini], thinking: true }

custom_presets:
  my-team:
    extends: claude-only
    description: "Sonnet base, Codex for backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.3-codex, effort: high }
      db:      { model: openai/gpt-5.3-codex, effort: high }

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
```

Run `oma doctor --profile` to confirm resolution, then start a workflow as usual.
