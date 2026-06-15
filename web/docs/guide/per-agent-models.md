---
title: "Guide: Per-Agent Model Configuration"
description: Configure which AI model each agent uses via model_preset in oma-config.yaml. Covers built-in presets, per-agent overrides, inline model definitions, custom presets with extends, oma doctor --profile, and migration from legacy agent_cli_mapping.
---

# Guide: Per-Agent Model Configuration

## Overview

`model_preset` is the single concept that controls which model every agent uses. Pick one of the built-in presets and every agent (pm, backend, frontend, qa, …) is wired to an appropriate model for that vendor stack. Override individual agents as needed. Define additional presets when your team has a non-standard mix.

All configuration lives in one file: `.agents/oma-config.yaml`.

This page covers:

1. The built-in presets
2. Overriding individual agents with the `agents:` map
3. Inlining custom model slugs with `models:`
4. Defining custom presets with `custom_presets:` and `extends:`
5. Inspecting resolved configuration with `oma doctor --profile`
6. Migration from legacy `agent_cli_mapping`

---

## Built-in presets

Set `model_preset` to one of the built-in keys:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity
```

| Key | Description | Best for |
|:----|:-----------|:---------|
| `antigravity` | All agents use Antigravity CLI (`agy`): Gemini 3.1 Pro for impl/architecture, Gemini 3.5 Flash for orchestration and explore. Model selection is config-driven inside `agy` — no `--model` or `--thinking-budget` flags are exposed. | Antigravity CLI users |
| `claude` | All agents use Claude (Sonnet/Opus) | Claude Max subscription holders |
| `codex` | All agents use OpenAI Codex (GPT-5.x) with effort levels | ChatGPT Plus/Pro users |
| `gemini` | All agents use Gemini CLI, thinking enabled for implementation roles | Google AI Pro users |
| `qwen` | All agents routed external via Qwen Code; binary thinking (no effort levels) | Local / self-hosted inference |
| `cursor` | All agents use Cursor `composer-2.5` (`composer-2.5-fast` for orchestrator/qa/pm/docs/explore) | Cursor Pro / Pro Student users |
| `mixed` | Mixed: impl roles use Codex, architecture/qa/pm use Claude, explore uses Gemini | Cross-vendor strengths without managing per-agent config |

Built-in presets ship inside the CLI package and update automatically when you upgrade `oh-my-agent`. No local file to maintain.

---

## Overriding individual agents

Use the `agents:` map to override specific agents on top of the active preset. Only agents you list are affected; the rest stay on the preset defaults.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Each entry is an `AgentSpec` object:

| Field | Type | Required | Description |
|:------|:-----|:---------|:-----------|
| `model` | string | Yes | Model slug (built-in or user-defined) |
| `effort` | `low` \| `medium` \| `high` | No | Reasoning effort (ignored on models that do not support it) |
| `thinking` | boolean | No | Enable extended thinking (model-specific) |
| `memory` | `user` \| `project` \| `local` | No | Memory scope for the agent |

Valid agent IDs: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `tf-infra`, `explore`.

The merge is shallow: each field in your override replaces the preset value for that field. Fields you omit keep their preset value.

---

## Inlining model slugs

Register model slugs that are not yet in the built-in registry under `models:`. Once registered, reference the slug from `agents:` or `custom_presets:`.

```yaml
# .agents/oma-config.yaml
models:
  google/gemini-3-flash-fast:
    cli: gemini
    cli_model: gemini-3-flash
    auth_hint: "Google AI Pro"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [gemini]
      api_only: false
```

Two rules apply to a registered slug you reference from `agents:`:

1. **The key must be in `owner/model` form.** `agents.<id>.model` validates against
   an `owner/model` pattern, so a bare key like `my-fast-model` is rejected — use
   a slashed key such as `google/gemini-3-flash-fast` (or the vendor's own
   `provider/model` slug).
2. **The spec must be complete.** `cli`, `cli_model`, `auth_hint`, and every
   `supports` boolean are required at resolution time. An incomplete spec is
   accepted by the config parser but fails model-registry validation and silently
   falls back to the core registry.

> If a user-defined slug collides with a built-in slug, the user definition wins and a warning is emitted.

---

## Custom presets

Define additional presets in `custom_presets:`. Use `extends:` to inherit all agent defaults from a built-in preset and override only the agents you care about.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # base preset — partial merge
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # all other agents inherited from claude
```

Without `extends:`, you must provide `agent_defaults` for all 11 agent roles. With `extends:`, only the entries you list are overridden; the rest are inherited from the base preset.

---

## `oma doctor --profile`

Run `oma doctor --profile` to inspect the fully resolved model matrix after preset defaults, `custom_presets`, and `agents:` overrides are merged.

```bash
oma doctor --profile
```

**Sample output:**

```
oh-my-agent — Profile Health (preset=mixed)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┬──────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │ Source   │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┼──────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │ (preset) │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ backend      │ openai/gpt-5.5         │ codex    │ ✗ not logged in  │ (override)│
│ explore    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┴──────────┘
```

Each row shows the resolved model slug and which source applied it (`(preset)` or `(override)`). Use this whenever a subagent picks an unexpected vendor.

---

## Migration from legacy `agent_cli_mapping`

Migration 008 runs automatically on `oma install` and `oma update`. It converts legacy projects in place:

| Legacy config | Result after migration 008 |
|:-------------|:--------------------------|
| All entries same vendor (e.g. all `gemini`) | `model_preset: gemini`, no `agents:` |
| Mixed vendors | Most-frequent vendor → `model_preset`; others → `agents:` overrides |
| `AgentSpec` object values | Moved to `agents:` as-is |
| `models.yaml` content | Inlined into `oma-config.yaml.models` |
| Customized `defaults.yaml` | Preserved as `custom_presets.user-customized` with a warning |

Originals are backed up to `.agents/.backup-pre-008-{timestamp}/` before any changes. The migration is idempotent. If `model_preset` is already present, it skips.

After migration, `.agents/config/defaults.yaml`, `.agents/config/models.yaml`, and the `.agents/config/` directory are removed.

---

## Session quota cap

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

## Full example

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  google/gemini-3-flash-fast:
    cli: gemini
    cli_model: gemini-3-flash
    auth_hint: "Google AI Pro"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [gemini]
      api_only: false

custom_presets:
  my-team:
    extends: claude
    description: "Sonnet base, Codex for backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
```

Run `oma doctor --profile` to confirm resolution, then start a workflow as usual.

---

## Dispatching through pi (transport runtime)

[pi](https://github.com/earendil-works/pi) (Earendil) is a multi-provider proxy
runtime rather than a model owner — it can run any real-provider model
(Anthropic, OpenAI, Google) under one CLI. oma treats pi as a **transport
overlay**: your `model_preset` and `agents:` overrides stay exactly as they are,
and pi becomes the executing CLI for a given agent.

Dispatch any agent through pi with the `-m pi` override:

```bash
oma agent:spawn backend "Implement the export endpoint" <session> -m pi
```

What happens:

- The per-agent model resolved from your preset/overrides (e.g.
  `openai/gpt-5.5`) is translated to pi's `--model <provider/id>` form, and
  `effort` is translated to pi's `--thinking` level. **Per-subagent models work
  on pi exactly as they do natively** — different agents can run different models.
- The agent's persona (system prompt) is inlined from `.agents/agents/<id>.md`,
  since pi has no vendor-side agent file to reference.
- Auth is whatever pi itself is configured for (`~/.pi/agent/auth.json` or a
  provider API key in the environment). `oma doctor` reports pi install + auth
  status alongside the other CLIs.

**Constraint:** pi only runs real-provider models. CLI-proprietary presets
(`cursor`, `kiro`, `qwen`, `antigravity`) name models that exist only inside
their own CLIs, so dispatching them through pi is rejected with a clear error.
Use a real-provider preset (`claude`, `codex`, `gemini`, or `mixed`) when routing
agents through pi.

> pi's model catalog is release-tracked and auth-gated. If a resolved slug does
> not match what your pi install exposes, check `pi --list-models` — pi's
> `--model` matching is fuzzy, so most provider slugs resolve as-is.

---

## Dispatching through OpenCode

[OpenCode](https://opencode.ai) is an extension-class vendor: like pi, it is not
a model owner but a CLI that runs models from its own catalog — the free
`opencode` provider, the low-cost `opencode-go` subscription plan, and the
`opencode-zen` gateway. oma integrates it as an **in-process plugin vendor**:
opencode auto-loads `.opencode/plugins/oma/` instead of registering settings-file
hooks, and resolves each agent's persona from generated `.opencode/agents/<id>.md`
files.

### Explicit dispatch

Route any agent through opencode with the `-m opencode` override:

```bash
oma agent:spawn pm "Draft the rollout plan" <session> -m opencode
```

This runs `opencode run --agent pm --dir <workspace> "<prompt>"`. The prompt is a
**trailing positional argument** — opencode's `-p` flag means `--password`, not
the prompt.

### Per-agent OpenCode models

To route specific agents to an opencode model, register the model under `models:`
and reference it from `agents:`. Two requirements apply (see
[Inlining model slugs](#inlining-model-slugs)):

1. **Slug must be in `owner/model` form.** Use the opencode `provider/model` slug
   as the registry key — bare names are rejected by the `agents.<id>.model` schema.
2. **The spec must be complete** — `cli`, `cli_model`, `auth_hint`, and every
   `supports` boolean. An incomplete spec fails validation and silently falls
   back to the core registry (so the agent would not route to opencode).

```yaml
# .agents/oma-config.yaml
language: en
model_preset: claude          # heavier impl roles stay on Claude

models:
  opencode-go/deepseek-v4-flash:
    cli: opencode
    cli_model: opencode-go/deepseek-v4-flash
    auth_hint: "OpenCode Go subscription — run: opencode auth login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [opencode]
      api_only: false

agents:
  pm:      { model: opencode-go/deepseek-v4-flash }
  qa:      { model: opencode-go/deepseek-v4-flash }
  docs:    { model: opencode-go/deepseek-v4-flash }
  explore: { model: opencode-go/deepseek-v4-flash }
```

Each routed agent dispatches `opencode run -m opencode-go/deepseek-v4-flash
--agent <id> --dir <workspace> "<prompt>"`. This is a good fit for lightweight,
fast roles (pm, qa, docs, explore) while heavier implementation agents stay on
Codex/Claude/etc.

### Validating a model slug

opencode's catalog is subscription- and login-gated, so oma does **not** hardcode
opencode model slugs. Validate one against your installed catalog:

```bash
oma model:probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model:probe` reports `accepted` when the slug is listed by
`opencode models`, `rejected` when it is not, and `auth_required` when the
provider needs login or a subscription.

### Auth and generated files

- **Auth:** `opencode auth login` stores credentials in
  `~/.local/share/opencode/auth.json`. `oma auth:status` / `oma doctor` report
  opencode auth alongside the other CLIs (default provider check: `opencode-go`).
- **Generated files:** `oma link` (or `oma link opencode`) writes one
  `.opencode/agents/<id>.md` persona per agent plus the `.opencode/plugins/oma/`
  bridge. These are generated from the `.agents/` SSOT — do not edit them
  directly; re-run `oma link` to regenerate.

> **Persistent-workflow note:** opencode's `session.idle` event (its nearest
> analog to the Claude `Stop` hook) is notification-only and cannot block the
> session from ending. Persistent workflows (orchestrate / work / ultrawork)
> therefore run with **degraded Stop semantics** under opencode — workflow
> reinforcement happens on the next message rather than by holding the session
> open.
