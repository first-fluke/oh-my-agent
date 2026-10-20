---
title: "Guide: Per-Agent Model Configuration"
sidebar_label: Agent Models
description: Configure which AI model each agent uses via model_preset in oma-config.yaml. Covers built-in presets and their per-role models, the model and CLI resolution table, per-agent overrides, inline model definitions, custom presets with extends, oma doctor --profile, quota caps, and pi/OpenCode/Kimi transports.
---

# Guide: Per-Agent Model Configuration

## Overview

`model_preset: auto` is the default for new installs. Unconfigured agents use the current vendor's native agent definitions and model settings. Choose a fixed preset to pin models, or override individual agents when you need a different model or vendor. Existing explicit presets are preserved on reinstall and update.

Shared configuration lives in `.agents/oma-config.yaml` and, when present, `.agents/oma-config.cue`, whose keys override the same YAML keys. An optional Git-ignored local file overrides settings for your machine.

For the full top-level key and precedence reference, see [Configuration reference](/docs/guide/configuration-reference).

This page covers:

1. The built-in presets and the models each role gets
2. How OMA resolves the model and CLI for an agent
3. Local configuration and the FreeLLMAPI (`free`) preset
4. Overriding individual agents with the `agents:` map
5. Inlining custom model slugs with `models:`
6. Defining custom presets with `custom_presets:` and `extends:`
7. Inspecting resolved configuration with `oma doctor --profile`
8. Migration from legacy `agent_cli_mapping`, and session quota caps
9. Dispatching through pi, OpenCode, and Kimi Code CLI

---

## Built-in presets

Set `model_preset` to one of the built-in keys:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto
```

| Key | Description | Best for |
|:----|:-----------|:---------|
| `auto` | Follow the current runtime's agent/model settings without injecting a model or effort flag | Default for new installs |
| `free` | Special gateway mode for OMA-spawned Codex, Claude, or Qwen processes; it is resolved separately from the built-in preset registry. | Local FreeLLMAPI gateway |
| `antigravity` | All agents use Antigravity CLI (`agy`): Gemini 3.1 Pro for implementation, architecture, and QA; Gemini 3.6 Flash for orchestration, PM, documentation, and explore. On agy 1.1+, OMA passes the display ID from `agy models` (for example `--model "Gemini 3.1 Pro (High)"`) and maps `effort` to a tier the model publishes. agy 1.0 has no `--model`, so its own config decides. agy has no `--thinking-budget`. | Antigravity CLI users |
| `claude` | All agents use Claude: Opus for architecture, Haiku for explore, Sonnet for every other role | Claude Max subscription holders |
| `codex` | All agents use OpenAI Codex (GPT-5.5 for most roles, GPT-5.4-mini for explore) with effort levels | ChatGPT Plus/Pro users |
| `qwen` | All agents use Qwen Code; matching Qwen sessions can use generated native agents, and other runtimes use CLI dispatch | Local / self-hosted inference |
| `kiro` | All agents use Kiro CLI; Sonnet handles implementation/architecture and Haiku handles orchestration/explore | Kiro users |
| `cursor` | All agents use Cursor `composer-2.5` (`composer-2.5-fast` for orchestrator/qa/pm/docs/explore) | Cursor Pro / Pro Student users |
| `mixed` | Claude for orchestrator, architecture (Opus), qa, pm, and docs; Codex GPT-5.5 for implementation roles and GPT-5.4-mini for explore | Cross-vendor strengths without managing per-agent config |

Built-in presets ship inside the CLI package and update automatically when you upgrade `oh-my-agent`. `gemini` is a compatibility alias that redirects to `antigravity`; it is not a separate current preset. No local preset file is required.

### Models per role

The fixed presets assign these registry slugs. Owner prefixes are omitted: `antigravity/`, `anthropic/`, `openai/`, `qwen/`, `kiro/`, and `cursor/` for the first six columns, and `anthropic/` for Claude models or `openai/` for GPT models in `mixed`. The source of truth is `cli/platform/built-in-presets.ts`.

| Role | `antigravity` | `claude` | `codex` | `qwen` | `kiro` | `cursor` | `mixed` |
|:-----|:--------------|:---------|:--------|:-------|:-------|:---------|:--------|
| orchestrator, pm, docs | gemini-3.6-flash | claude-sonnet-4-6 | gpt-5.5 (medium) | qwen3-coder-next | claude-haiku-3-5 | composer-2.5-fast | claude-sonnet-4-6 |
| architecture | gemini-3.1-pro | claude-opus-4-7 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5 | claude-opus-4-7 |
| qa | gemini-3.1-pro | claude-sonnet-4-6 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5-fast | claude-sonnet-4-6 |
| backend, frontend, mobile, db, debug, refactor, tf-infra | gemini-3.1-pro | claude-sonnet-4-6 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5 | gpt-5.5 (high) |
| explore | gemini-3.6-flash | claude-haiku-4-5 | gpt-5.4-mini (low) | qwen3-coder-next | claude-haiku-3-5 | composer-2.5-fast | gpt-5.4-mini (low) |

Values in parentheses are the preset's `effort` (Codex) or `thinking: true` (Qwen). A role a preset does not list, such as `eval`, uses that preset's `orchestrator` entry.

---

## How OMA resolves an agent's model and CLI

`OMA_MODEL_PRESET`, when set, replaces `model_preset` first (see [Configuration loading](/docs/guide/oma-config-semantics#precedence-table)). The resolver then picks one row:

| `model_preset` | `agents.<id>` set? | Model sent to the CLI | CLI that runs the agent |
|:---------------|:-------------------|:----------------------|:------------------------|
| `free` | Ignored | `FREELLM_MODEL`, else `free.model`, else `auto` (every role) | `--vendor`, else `OMA_RUNTIME_VENDOR`, else the detected runtime if it is Codex, Claude, or Qwen, else `default_cli`, else `codex`. Only `codex`, `claude`, and `qwen` are accepted. |
| `auto` | No | None. The vendor's own agent and session settings apply. | `--vendor`, else a supported `OMA_RUNTIME_VENDOR`, else the detected runtime, else `default_cli`, else `claude`. An unsupported value is an error. |
| `auto` | Yes | The override's `model` | That model's `cli`, then the vendor override rule below |
| Built-in, alias, or custom | No | The preset's entry for the role, else the preset's `orchestrator` entry | That model's `cli`, then the vendor override rule below |
| Built-in, alias, or custom | Yes | The preset entry shallow-merged with the override (override fields win) | That model's `cli`, then the vendor override rule below |

How the remaining pieces fit in:

- **Preset lookup.** OMA checks built-in names first, then aliases (`gemini` redirects to `antigravity` with a warning), then `custom_presets`. A custom preset with a built-in name is ignored. An unknown name stops with `Unknown model_preset "..."`, which lists the valid names.
- **Model lookup.** A slug is looked up in `models:` first, then in the built-in registry. An unknown slug, or a spec with `api_only: true`, stops dispatch.
- **Vendor override rule.** When `--vendor` or `OMA_RUNTIME_VENDOR` names a vendor for a model-backed row, `pi` always takes over (real-provider models only; see [Dispatching through pi](#dispatching-through-pi-transport-runtime)). Any other vendor takes over only if it is listed in the model's `supports.native_dispatch_from`. Otherwise OMA warns and keeps the model's own `cli`.
- **Effort.** `effort` is dropped, with a warning, for models whose CLI has no effort flag (Claude Code). It is kept for pi, which maps it to `--thinking`.

## Auto dispatch

With `auto`, OMA uses the current runtime's native subagent path when available. Cross-vendor agents and runtimes without native dispatch use `oma agent spawn`. Auto does not expand to a fixed vendor preset. Inherited plans do not inject OMA model or effort flags. An external CLI process uses that CLI's persisted defaults, which may differ from a model selected only in the parent session.

`oma doctor --profile` displays `(vendor agent default)` for inherited agents and the resolved model for explicit overrides. Native agent files keep their vendor definitions; same-vendor overrides in auto mode are applied when those files are generated by install/update.

## Local configuration

Create **one** of `.agents/oma-config.local.cue` or `.agents/oma-config.local.yaml` next to the shared configuration. Install, link and update add both paths to `.gitignore`; update preserves existing local files, including with `--force`.

OMA selects the nearest project configuration directory. Within that directory, keys set in shared CUE override the same keys in shared YAML, and the local file overrides the shared values. The full order is in the [precedence table](/docs/guide/oma-config-semantics#precedence-table). CUE files are evaluated independently before merging, so a shared `model_preset: "auto"` can be replaced by local `"free"`. Objects merge recursively; arrays, scalars and `null` replace the shared value. A malformed local file, a missing CUE executable for local CUE, or both local formats being present is an error, not permission to use shared defaults.

Command options and supported environment overrides take precedence over the effective file configuration. `oma doctor --profile` shows which files were used. Local files do not travel with Git clones or new worktrees. Free-mode subprocesses inherit `OMA_MODEL_PRESET=free` and the resolved gateway environment so nested OMA spawns preserve the route; independently launched sessions need their own local config or environment. Settings saved by install/setup commands still target the shared configuration; a local override continues to win at runtime.

## FreeLLMAPI preset

Keep `model_preset: auto` in the shared file and opt in locally:

```cue
// .agents/oma-config.local.cue
model_preset: "free"
free: {
    base_url:    "http://127.0.0.1:31415/v1"
    api_key_env: "FREELLM_API_KEY"
    model:       "auto"
}
```

The equivalent YAML file is:

```yaml
# .agents/oma-config.local.yaml
model_preset: free
free:
  base_url: http://127.0.0.1:31415/v1
  api_key_env: FREELLM_API_KEY
  model: auto
```

Start FreeLLMAPI separately and export its unified key as `FREELLM_API_KEY`. OMA also accepts upstream's `FREELLMAPI_API_KEY` when the default key variable is selected; the canonical variable wins when both are set. A custom `api_key_env` reads only that variable. Never put the key itself in the config. `OMA_MODEL_PRESET` overrides the preset. `FREELLM_BASE_URL` and `FREELLM_MODEL` override the respective file settings. The values in the example are the defaults, so `model_preset: free` alone is enough when the server and key are ready.

```bash
oma doctor --profile
oma agent spawn backend "Review the API error handling" free-review --vendor codex --read-only
```

Free mode uses `free.model` for every OMA-dispatched role, including roles with existing `agents.*.model` pins. It does not resolve those pins into paid subscriptions. Choose `auto`, a gateway model ID, or a named gateway chain such as `auto:coding` (create that chain in FreeLLMAPI first).

The transport follows the `free` row in [How OMA resolves an agent's model and CLI](#how-oma-resolves-an-agents-model-and-cli). Only Codex, Claude and Qwen transports are supported. An explicitly selected unsupported transport is an error.

| Transport | Gateway endpoint | CLI base URL |
|:--|:--|:--|
| Codex | `/v1/responses` | Includes `/v1` |
| Claude | `/v1/messages` | Server root; OMA removes the `/v1` suffix |
| Qwen | `/v1/chat/completions` | Includes `/v1` |

Use `oma agent spawn` even when the parent uses the same vendor. OMA injects the gateway connection and credentials into that subprocess only; changing the preset does not change the model of an already-open host session or host-native subagent tool. Codex gets a custom Responses provider through invocation arguments, while the key stays in the child environment. Claude and Qwen receive their compatible endpoint settings. Conflicting Claude/Qwen settings that would override the route or key are reported before execution; OMA does not rewrite those files.

Spawn and review check authenticated `GET /v1/models` before starting the agent. Missing keys, connection failures and HTTP authentication errors stop execution. `oma doctor --profile` shows the effective URL/model, environment overrides, key presence and server readiness without printing the key. Readiness does not guarantee a model has enough quota to complete a task.

FreeLLMAPI owns request-level provider failover. OMA's explicit checkpoint-based vendor failover remains a separate process recovery mechanism; every successor in free mode must still use a supported FreeLLMAPI transport. No automatic return to a paid vendor configuration occurs.

The free preset configures agent inference. It does not change the embedding configuration of existing memory services. FreeLLMAPI also exposes `/v1/embeddings`; when configuring a vector store separately, pin a model family so existing vectors retain a compatible space.

Upstream references: [client setup](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/clients/01-agent-clients.md), [API and embedding families](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md).

## Overriding individual agents

Use the `agents:` map to override specific agents on top of the active preset. Only agents you list are affected; the rest follow the vendor settings in auto mode or the selected fixed preset defaults.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Each entry is an `AgentSpec` object:

| Field | Type | Required | Description |
|:------|:-----|:---------|:-----------|
| `model` | string | Yes | Model slug (built-in or user-defined) |
| `effort` | `none` \| `low` \| `medium` \| `high` \| `xhigh` | No | Reasoning effort (ignored on models that do not support it) |
| `thinking` | boolean | No | Enable extended thinking (model-specific) |
| `memory` | `user` \| `project` \| `local` | No | Memory scope for the agent |

Valid agent IDs: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, `explore`, and `eval`. Built-in presets do not define `eval`, so it uses the preset's `orchestrator` entry unless you override it.

The merge is shallow: each field in your override replaces the preset value for that field. Fields you omit keep their preset value.

---

## Inlining model slugs

Register model slugs that are not yet in the built-in registry under `models:`. Once registered, reference the slug from `agents:` or `custom_presets:`.

```yaml
# .agents/oma-config.yaml
models:
  antigravity/gemini-3.1-pro-low:
    cli: antigravity
    cli_model: "Gemini 3.1 Pro (Low)"   # exact display ID from `agy models`
    auth_hint: "Requires Antigravity CLI sign-in (Google AI Pro tier)"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: true
      computer_use: false
      native_dispatch_from: [antigravity]
      api_only: false
```

Two rules apply to a registered slug you reference from `agents:`:

1. **The key must be in `owner/model` form.** `agents.<id>.model` validates against
   an `owner/model` pattern, so a bare key like `my-fast-model` is rejected — use
   a slashed key such as `antigravity/gemini-3.1-pro-low` (or the vendor's own
   `provider/model` slug).
2. **The spec must be complete and valid.** `cli`, `cli_model`, `auth_hint`, and every
   `supports` field are required at resolution time. `cli` must be one of
   `antigravity`, `claude`, `codex`, `commandcode`, `cursor`, `grok`, `kimi`,
   `kiro`, `qwen`, or `opencode`; `native_dispatch_from` entries must be
   `antigravity`, `claude`, `codex`, `cursor`, `kimi`, `kiro`, `opencode`, or `qwen`.
   `gemini` is not a valid value for either. An invalid spec logs
   `[model-registry] User inline model "<slug>" failed validation — falling back to core registry`;
   if the core registry has no such slug, dispatch stops with an unknown-slug error.

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

Without `extends:`, define at least `orchestrator`: every role the preset omits uses its `orchestrator` entry. With `extends:`, only the entries you list are overridden; the rest are inherited from the base preset. `extends` may name a built-in preset or another custom preset, and a circular chain is an error. A custom preset named like a built-in (for example `claude`) is ignored; the built-in wins.

---

## `oma doctor --profile`

Run `oma doctor --profile` to inspect the fully resolved model matrix after preset defaults, `custom_presets`, and `agents:` overrides are merged.

```bash
oma doctor --profile
```

**Sample output** (abridged: `model_preset: mixed` with a `backend` override; all 13 roles are listed in a real run, and the terminal draws each section inside a frame):

```text
 Profile Health (mixed)

 Configuration sources
   shared: <project>/.agents/oma-config.yaml

 Auth Status Matrix
┌──────────────┬────────────────────────────────────┬──────────────┬────────────────┐
│ Role         │ Model                              │ CLI          │ Auth Status    │
├──────────────┼────────────────────────────────────┼──────────────┼────────────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6        │ claude       │ ✓ logged in    │
│ architecture │ anthropic/claude-opus-4-7          │ claude       │ ✓ logged in    │
│ qa (preset)  │ anthropic/claude-sonnet-4-6        │ claude       │ ✓ logged in    │
│ backend (over│ openai/gpt-5.5                     │ codex        │ ✓ logged in    │
│ explore (pres│ openai/gpt-5.4-mini                │ codex        │ ✓ logged in    │
└──────────────┴────────────────────────────────────┴──────────────┴────────────────┘

 Profile health check complete (mixed)
```

Each row shows the role, the resolved model slug, the CLI that runs it, and its auth status. The role cell carries a source tag: `(preset)`, `(override)`, or `(vendor)` for agents that inherit vendor settings under `auto`. The Role column is 14 characters wide, so long tags are cut off, as above. Use this whenever a subagent picks an unexpected vendor.

---

## Migration from legacy `agent_cli_mapping`

Migration 008 runs automatically on `oma install` and `oma update`. It converts legacy projects in place:

| Legacy config | Result after migration 008 |
|:-------------|:--------------------------|
| All entries same vendor (e.g. all `claude`) | `model_preset` set to that vendor's preset (legacy `gemini` maps to `antigravity`), no `agents:` |
| Mixed vendors | Most-frequent vendor → `model_preset`; others → `agents:` overrides |
| `AgentSpec` object values | Moved to `agents:` as-is |
| `models.yaml` content | Inlined into `oma-config.yaml.models` |
| Customized `defaults.yaml` | Preserved as `custom_presets.user-customized` with a warning |

Originals are backed up to `.agents/backup/008-model-preset/<timestamp>-<pid>/` before any changes (`~/.oma/backup/008-model-preset/...` for the global install). The migration is idempotent. If `model_preset` is already present, it skips.

<!-- oma-docs:ignore-start -->
After migration, `.agents/config/defaults.yaml`, `.agents/config/models.yaml`, and the `.agents/config/` directory are removed.
<!-- oma-docs:ignore-end -->

---

## Session quota cap

Add `session.quota_cap` to `oma-config.yaml` to bound runaway subagent spawning:

```yaml
session:
  quota_cap:
    tokens: 2000000      # plain digits: YAML reads 2_000_000 as a string, which disables the cap
    spawn_count: 40
    per_vendor:          # dispatch vendor IDs (claude, codex, antigravity, ...), not model owners
      claude: 1200000
      codex: 600000
      antigravity: 200000
```

When a cap is reached, `oma agent spawn` refuses the next spawn and fails with `[session-cost] Quota cap exceeded for session <id>: <dimension> (current: N, limit: M)`. Runs initially reserve a prompt-length estimate. Available native transcript usage replaces it after completion; unsupported or missing observations remain estimates. These caps do not interrupt running children or guarantee a billing limit. `spawn_count` is the most predictable limit. Field rules: [Session quota caps](/docs/guide/configuration-reference#session-quota-caps).

---

## Full example

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  antigravity/gemini-3.1-pro-low:
    cli: antigravity
    cli_model: "Gemini 3.1 Pro (Low)"   # exact display ID from `agy models`
    auth_hint: "Requires Antigravity CLI sign-in (Google AI Pro tier)"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: true
      computer_use: false
      native_dispatch_from: [antigravity]
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
    tokens: 2000000
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

Dispatch any agent through pi with the `--vendor pi` override:

```bash
oma agent spawn backend "Implement the export endpoint" <session> --vendor pi
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
Use `claude`, `codex`, or `mixed`, or `agents.<id>` overrides whose models are
`anthropic/`, `openai/`, or `google/` slugs, when routing agents through pi.
`gemini` is an alias of `antigravity`, so pi rejects it.

> pi's model catalog is release-tracked and auth-gated. If a resolved slug does
> not match what your pi install exposes, check `pi --list-models` — pi's
> `--model` matching is fuzzy, so most provider slugs resolve as-is.

### Models outside pi's built-in registry (e.g. Z.ai GLM)

pi resolves `--model` against its **built-in model registry**, and its
`defaultProvider` setting is only consulted when no model is passed at all. For
Z.ai, pi ships only a subset of GLM ids (`glm-4.7`, `glm-4.5-air`,
`glm-5-turbo`, `glm-5.1`, `glm-5v-turbo` as of pi 0.80.x) — a preset that names
any other GLM id will fail to resolve.

Two ways to handle this:

1. **Registry ids** — constrain your preset to registry model ids. Use the
   `provider/id` form (e.g. `zai/glm-4.7`) to pin the provider explicitly; oma
   passes it through to pi's `--model` as-is.
2. **Unregistered ids** — register them with a pi extension. The `api` field
   must name one of pi's **api adapter ids** (`openai-completions`,
   `anthropic-messages`, …) — not the provider name. Provider names like
   `"zai"` or shorthands like `"openai"` are not adapter ids and fail at
   dispatch with `No API provider registered for api: …`.

```typescript
// ~/.pi/agent/extensions/zai-glm-models/index.ts  (or <project>/.pi/extensions/)
export default function (pi: ExtensionAPI) {
  pi.registerProvider("zai", {
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
    api: "openai-completions", // adapter id, NOT "zai"
    apiKey: "$ZAI_API_KEY",
    models: [
      { id: "glm-4.7-flash", api: "openai-completions", /* … */ },
      // NOTE: `models` replaces ALL existing models for the provider —
      // re-declare the built-in ids here if you still want them.
    ],
  });
}
```

Verify with `pi --list-models` before wiring the ids into a preset.

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

Route any agent through opencode with the `--vendor opencode` override:

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor opencode
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
   `supports` field. An incomplete spec fails validation; OMA logs a warning and
   falls back to the core registry, so the agent would not route to opencode.

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
oma model probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model probe` reports `accepted` when the slug is listed by
`opencode models`, `rejected` when it is not, and `auth_required` when the
provider needs login or a subscription.

### Auth and generated files

- **Auth:** `opencode auth login` stores credentials in
  `~/.local/share/opencode/auth.json`, one entry per provider. `oma auth status`
  / `oma doctor` report opencode as authenticated when *any* provider has
  a credential. `oma doctor --profile` is
  provider-aware instead: each row is checked against the provider prefix of its
  registered `cli_model`, so a model with `cli_model: zai-coding-plan/glm-5.3`
  is checked against the `zai-coding-plan` credential. A row whose model has no
  registered `provider/model` `cli_model` reports `? unknown` rather than a
  definite auth failure.
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

---

## Dispatching through Kimi Code CLI

[Kimi Code CLI](https://www.kimi.com/code) reads **hooks** only from a global
config (`~/.kimi-code/config.toml`, `KIMI_CODE_HOME`), so `oma install`/`oma link`
write the Kimi hook chain and its skill symlinks into HOME under explicit consent
(like Antigravity). Kimi also scans oma's SSOT `.agents/skills/` directly, so
skills resolve project-wide regardless. **MCP** needs no HOME write and is
project-scoped — written mode-aware to `<cwd>/.kimi-code/mcp.json` (project) or
`~/.kimi-code/mcp.json` (global).

### Explicit dispatch

Route any agent through Kimi with the `--vendor kimi` override:

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor kimi
```

This runs `kimi -p "<prompt>"`. Kimi's `-p` (non-interactive) mode auto-approves
regular tool calls under its `auto` permission policy, so oma does **not** append
`--yolo`/`--auto` (they are mutually exclusive with `-p`).

### Per-agent Kimi models

Like opencode, oma does **not** hardcode a Kimi model catalog (Kimi's lineup is
provider/subscription-dependent). To route specific agents to a Kimi model,
register a complete spec under `models:` with `cli: kimi` and reference it from
`agents:`:

The registry key must be in `owner/model` form (bare names are rejected by the
`agents.<id>.model` schema), and `cli_model` is the exact alias passed to
`kimi --model` — Kimi's documented coding alias is `kimi-code/kimi-for-coding`.
Confirm the alias your subscription exposes with `kimi --model <alias>` before
committing it.

```yaml
# .agents/oma-config.yaml
models:
  kimi-code/kimi-for-coding:
    cli: kimi
    cli_model: kimi-code/kimi-for-coding
    auth_hint: "Kimi subscription — run: kimi login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: []
      api_only: false

agents:
  pm:   { model: kimi-code/kimi-for-coding }
  docs: { model: kimi-code/kimi-for-coding }
```

Each routed agent dispatches `kimi --model kimi-code/kimi-for-coding -p "<prompt>"`.

> **Persistent-workflow note:** Kimi's documented Stop-blocking path is exit-code
> 2 / stderr, but the `oma hook run` router always exits 0 and emits a stdout dialect.
> oma emits a best-effort `permissionDecision: "deny"` (plus Claude-style
> `decision: "block"`) so persistent workflows degrade gracefully under Kimi.
