---
title: "Guide: Configuration Reference"
sidebar_label: Configuration Reference
description: Supported OMA configuration locations, precedence, typed keys, defaults, and update ownership rules.
---

# Configuration reference

OMA reads configuration from `.agents/oma-config.cue` or `.agents/oma-config.yaml`. A local overlay, `.agents/oma-config.local.cue` or `.agents/oma-config.local.yaml`, is useful for machine-specific settings that should not enter the shared file.

Run this from the project whose configuration you want to inspect:

```bash
oma doctor --profile
```

The expected result is a resolved profile showing the selected preset and per-agent model plan. If the command reports a parse error, fix the nearest config layer before changing model settings.

## Which file wins

The loader walks upward from the current directory and stops at the nearest `.agents/` directory that contains a shared or local config. In that directory:

1. `oma-config.cue` is evaluated first.
2. `oma-config.yaml` is used when the shared CUE file is absent or cannot be evaluated.
3. One local file (`oma-config.local.cue` or `.local.yaml`) is merged over the shared file.
4. `OMA_MODEL_PRESET`, when set, overrides `model_preset` for that process.

Maps merge recursively. Arrays, scalars, and `null` replace the shared value. Keeping both local formats is an error. A malformed local file is fatal so a private override cannot be silently ignored.

This is a nearest-layer rule, not a general project-plus-home merge. A global install reads `~/.agents/oma-config.*` because HOME is its install root. A project command reads the nearest project layer. The update check for `auto_update_cli` is the exception: it checks the project, then HOME, then defaults to enabled.

## Top-level keys

The following keys are read by the current runtime schema or by shipped OMA consumers. A key marked sparse is intentionally partial: omit a nested value to keep the code default.

| Key | Type or accepted values | Default when absent | Purpose |
| --- | --- | --- | --- |
| `language` | string | `en` | Response language used by workflows and skills. |
| `translation_voice` | `formal`, `balanced`, `interpreter` | `balanced` in the shipped template | Voice selection for `oma-translation`. |
| `date_format` | `ISO`, `US`, `EU` | `ISO` in the shipped template; omission leaves no explicit override | Date formatting preference. |
| `timezone` | IANA name | system time zone | Dates used by schedules and reports. |
| `auto_update_cli` | boolean | `true` | Background CLI version checks; opt out with `false`. |
| `telemetry` | boolean | `false` | Vendor telemetry opt-in used by install, update, and link reconciliation. |
| `model_preset` | non-empty string | `auto` in new templates | Built-in or custom model preset. `OMA_MODEL_PRESET` overrides it for one process. |
| `free` | `base_url`, `api_key_env`, `model` | `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY`, `auto` | FreeLLMAPI settings when the preset is `free`; `FREELLM_BASE_URL` and `FREELLM_MODEL` override file values, and the key name never contains the secret. See [Per-agent model configuration](/docs/guide/per-agent-models#freellmapi-preset). |
| `providers` | `docs`, `web`, `code_intelligence`, `code_intelligence_guard`, `semantic_memory` | `context7`, `native`, `serena`, `block`, `agentmemory` | Select documentation, search, code-intelligence, and semantic-memory providers. Code intelligence accepts `serena` or `gortex`; semantic memory accepts `agentmemory`, `honcho`, or `none`. `code_intelligence_guard` (`block` or `off`) controls the PreToolUse search guard. Native searches confined to confirmed provider exclusions or paths outside the project are allowed. The guard reads Serena exclusions and enabled gitignore rules, or Gortex's exclusion listing; it does not infer dependencies from directory names. Prefix a shell search with `OMA_CI_ALLOW_NATIVE=1` when the provider is down or cannot search the requested scope, including exclusions the guard cannot verify. |
| `brave` | `api_key_env` or `api_key_vault` | unset | Brave search credential reference. |
| `honcho` | `base_url`, `workspace_id`, `project_id`, `api_key_env`, `api_key_vault`, `timeout_ms`, `max_results`, `max_tokens`, `recall_mode` | See [Honcho details](#honcho-semantic-memory) | Honcho semantic-memory connection settings. |
| `agents` | agent ID → `model`, optional `effort`, `thinking`, `memory` | preset resolution | Per-agent overrides applied over the selected preset. Effort is `none`, `low`, `medium`, `high`, or `xhigh`; memory is `user`, `project`, or `local`. |
| `models` | model slug → CLI mapping | unset | Inline model definitions for supported vendor CLIs. |
| `custom_presets` | preset → description, optional `extends`, `agent_defaults` | unset | User-defined presets; `extends` may inherit a built-in. |
| `vendors` | YAML: `string[]` of selected vendor IDs; CUE template: optional `vendors.pi` fallback map | all linkable vendors for the YAML list | Selects which vendor integrations `oma install` and `oma update` project in YAML. The dispatch capability map lives in the managed orchestration config; see [Vendor selection and dispatch metadata](#vendor-selection-and-dispatch-metadata). |
| `default_cli` | string | consumer fallback | Legacy vendor-only fallback when no model plan resolves. |
| `session.quota_cap` | `tokens`, `spawn_count`, `per_vendor: map<string, integer>` | each omitted dimension is uncapped | Hard token and spawn limits checked before the next agent spawn; see [Session quota caps](#session-quota-caps). |
| `docs` | `auto_verify`, `check_urls`, `exclude` | `false`, `true`, `[]` | `oma docs verify` behavior and scan exclusions. |
| `serena` | `mode: bridge\|stdio`, `auto_update` | `bridge`, `true` | Serena MCP transport and update behavior. |
| `mcp.devtools_browsers` | `aside`, `chrome`, `firefox`, or `[]` | unset = leave existing setup alone | Browser DevTools MCP selection during reconciliation. An explicit empty list removes selected browser entries. |
| `video` | sparse skill-owned map | skill default; see [Video Generation](/docs/guide/video-generation) | Video routing, provider order, output, cost, limits, and HyperFrames refresh settings. |
| `image` | sparse skill-owned map | skill default; see [Image Generation](/docs/guide/image-generation) | Image vendor, size, quality, output, comparison, and cost settings. |
| `voice` | `notification_profile`, `asset_profile`, `output_dir`, `auto_notify_after_sec`, `max_tts_chars`, `max_stt_minutes` | skill default; see [Content and Research Workflows](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) | Voicebox profile, output, and length settings. |
| `hwp` | `format`, `version.*`, `output.*` | skill default; see [Content and Research Workflows](/docs/guide/content-and-research#extract-hwp-family-documents) | Kordoc format, version channel, and output location. |
| `pdf` | `format`, `image_output`, `image_format`, `use_struct_tree`, `ocr.*`, `output.*` | skill default; see [Content and Research Workflows](/docs/guide/content-and-research#extract-pdf-content) | PDF extraction, OCR, image, and overwrite settings. |
| `scholar` | `base_url` | skill default; see [Content and Research Workflows](/docs/guide/content-and-research#search-and-validate-scholarly-material) | Knows endpoint host; protocol shape remains skill-owned. |
| `diagram` | `engine`, `explain_sidecar`, `archify.*` | skill default; see [Diagram Engine](/docs/guide/diagram-engine) | Mermaid/archify selection and managed-engine settings. |
| `market` | `managed`, `channel`, `check_interval_min`, `path`, `python`, `save_dir` | skill default; see [Market Research](/docs/guide/market-research) | Managed last30days engine resolution and result location. |

The shipped template also contains consumer-owned blocks. Their current keys and defaults are:

| Block | Keys read by the consumer | Default | Effect |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`, `max_age_days` | keep 100 sessions; prune Serena artifacts older than 50 days; `0` disables age pruning | Defaults for `oma memory gc`; command flags override them. |
| `serena_reaper` | `enabled`, `policy: lru\|idle`, `keep_warm`, `idle_minutes`, `grace_seconds` | `false`, `lru`, `2`, `10`, `90` | Controls the scheduled Serena LSP cleanup path. Interactive `oma serena reap` remains explicit; scheduled quiet runs are opt-in. |
| `refactor_guard` | `enabled`, `max_lines` | `false`, `500` | Opts into the stop-hook line-budget guard and sets its per-file code budget. |
| `scm` | `conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author.*`, `forbidden_patterns`, `allowed_exceptions` | shipped template enables conventional commits and PR protection, with the template’s co-author and filename lists | Governs the SCM skill, commit hook, and secret-pattern guard. Replace template identity values with your own before enabling co-author trailers. |

These blocks are accepted through the configuration passthrough and are interpreted by their feature or workflow. The `serena_reaper` parser reads the snake_case keys shown above, even though older template comments used camelCase names. Read the corresponding feature guide before adding nested keys; this page does not invent keys outside the consumers listed here.

## Exact nested objects

### Honcho semantic memory

The `honcho` map is validated by `HonchoConfigSchema`. The key names and effective runtime behavior are:

| Key | Shape | Effective default or constraint |
| --- | --- | --- |
| `base_url` | URL string | `https://api.honcho.dev`; HTTPS is required except for loopback HTTP. Credentials, query strings, and fragments are rejected. |
| `workspace_id` | 1–128 letters, digits, `_`, or `-` | Required when the provider starts. The interactive installer seeds `oma` when no saved value exists. |
| `project_id` | trimmed string, 1–128 characters | Omitted means the current OMA project root. |
| `api_key_env` | environment-variable name | `HONCHO_API_KEY`. A non-loopback endpoint needs this variable or `api_key_vault`. |
| `api_key_vault` | vault key name (`A-Z`, `a-z`, digits, `.`, `_`, `-`; 1–64 chars) | Omitted means no vault lookup. If both credential references are present, the environment value is used first. |
| `timeout_ms` | integer `100`–`30000` | `5000` milliseconds. The same deadline covers a status or memory request. |
| `max_results` | integer `1`–`50` | `8` recall results. |
| `max_tokens` | integer `128`–`16000` | `2000` UTF-8 bytes for recalled content and inferred context. |
| `recall_mode` | `messages` or `hybrid` | The installer writes `messages` for a new selection. An omitted value enables the provider's representation request as well as message recall. |

For example, a remote workspace can use a secret reference without putting the secret in YAML:

```yaml
providers:
  semantic_memory: honcho
honcho:
  base_url: https://honcho.example.com
  workspace_id: team
  project_id: product-docs
  api_key_vault: honcho-team
  timeout_ms: 5000
  max_results: 8
  max_tokens: 2000
  recall_mode: messages
```

The installer uses `http://127.0.0.1:8000` as its initial URL when setting up Honcho interactively or non-interactively without a saved URL. That installer seed is separate from the provider's runtime fallback above. Use `oma memory status` after selecting the provider; a missing workspace or credential is reported as unavailable rather than silently switching to another memory provider.

### Session quota caps

`session.quota_cap` is a partial map. Every field is optional; an omitted field leaves that dimension uncapped. Values must be non-negative integers, and `per_vendor` maps vendor names to token budgets:

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

The cap loader checks the user CUE layer, then the user YAML layer, then the shipped defaults fallback. Before a spawn, OMA checks `spawn_count`, total `tokens`, and `per_vendor` in that order. A limit is reached when usage is greater than or equal to it; OMA blocks the next spawn and reports the dimension that won. Usage is token accounting, not a billing estimate.

### Vendor selection and dispatch metadata

In the user-owned `.agents/oma-config.yaml`, `vendors` is a list of selected integration IDs:

```yaml
vendors:
  - claude
  - codex
  - pi
```

An absent list or an empty list selects all IDs in OMA's linkable-vendor registry. The list controls install/update projections; it is not the per-vendor command capability map.

The shipped `.agents/oma-config.cue` schema also permits a `vendors.pi` object with `command`, `prompt_flag`, `model_flag`, `default_model`, and `thinking_flag` fields. That block is a typed fallback shape in the CUE template; the current agent dispatch path resolves its capability fields from the managed orchestration registry below, so do not use `vendors.pi` as a replacement for the YAML selection list.

The managed `.agents/skills/oma-orchestration/config/cli-config.yaml` contains that capability map. Each `vendors.<id>` entry supports these fields:

| Field | Shape | Use |
| --- | --- | --- |
| `command` | executable string | Binary to run. |
| `subcommand` | string | Subcommand inserted before options, such as `codex exec`. |
| `prompt_flag` | string, or `none`/`null` to disable | Flag paired with the prompt; a positional prompt is used when disabled. |
| `auto_approve_flag` | string | Vendor permission-bypass flag for writable runs. Suppressed in read-only mode. |
| `read_only_flag` | string | Vendor read-only flag. If absent, the builder uses its vendor-specific fallback or warns. |
| `output_format_flag` | string | Flag that selects machine-readable output. |
| `output_format` | string | Value paired with `output_format_flag`. |
| `model_flag` | string | Flag paired with `default_model`. |
| `default_model` | string | Model value used when a resolved plan does not supply one. |
| `isolation_env` | `NAME=value` string | Optional environment assignment; unsafe loader/interpreter keys are rejected and `$$` expands to the current process ID. |
| `isolation_flags` | shell-style argument string | Extra isolation arguments split into argv tokens. |

The managed capability file is regenerated by OMA updates. Edit the user-owned `agents`, `models`, and `custom_presets` keys for model selection; use this capability map only when maintaining the managed orchestration data or debugging a vendor adapter. The commented `vendors.pi` object in older templates is fallback metadata and does not replace the selected-vendor list or the managed dispatch registry.

## Common changes

Choose a fixed preset for a project while keeping a personal override local:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed

# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-5.4
    effort: high
```

Select the code-intelligence and memory providers explicitly:

```yaml
providers:
  code_intelligence: serena
  code_intelligence_guard: block   # off → advisory primer only, no tool denial
  semantic_memory: none
```

Keep browser configuration unchanged during updates, or remove it deliberately:

```yaml
# Omit mcp.devtools_browsers to leave existing browser entries unchanged.
mcp:
  devtools_browsers: []
```

## Update and ownership rules

`.agents/oma-config.yaml` is user-owned. `oma update` preserves existing content and may append newly shipped top-level template keys under an `# Added by oma update` marker. `oma update --force` can replace user configuration, MCP configuration, and stack directories; use it only when resetting those customizations is intended. Local overlay files remain the private place for machine-specific values.

Do not put API keys in this file. Use `api_key_env` or `api_key_vault` fields and keep the actual credential in the referenced secret store or environment.

For model resolution details, see [Per-agent model configuration](/docs/guide/per-agent-models). For layer semantics and failure behavior, see [oma-config semantics](/docs/guide/oma-config-semantics).
