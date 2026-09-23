---
title: "Guide: oma-config.yaml Semantics"
sidebar_label: Configuration Loading
description: How OMA selects CUE and YAML configuration layers, applies local overlays, and resolves the few install-context fallbacks. See the configuration reference for supported keys and defaults.
---

## Overview

Configuration is selected from the nearest `.agents/` directory found while walking up from the current working directory:

- **Shared**: `.agents/oma-config.cue`, or `.agents/oma-config.yaml` when CUE is absent or cannot be evaluated.
- **Local**: `.agents/oma-config.local.cue` or `.agents/oma-config.local.yaml` (one file, overlaid on the shared file; keep this file private).

OMA does not merge a project file with `~/.agents/oma-config.*` for ordinary runtime lookups. A global install reads the home file because its install root is HOME; a project command reads the nearest project layer. `auto_update_cli` is the deliberate exception: its update check looks at the project config, then the home config, then defaults to enabled. See [Configuration reference](/docs/guide/configuration-reference) for the complete model.

## Precedence table

| Key | Effective rule | Notes |
|-----|:---:|-------|
| `OMA_MODEL_PRESET` | Highest | A non-empty environment value replaces `model_preset` for that process. |
| Local file | Overlays shared | Plain maps merge recursively; arrays, scalars, and `null` replace the shared value. Both local file formats cannot exist together. |
| Shared CUE | Preferred | If CUE is absent or fails, the loader tries the shared YAML file. A local CUE error is fatal. |
| Shared YAML | Fallback | Used when no usable shared CUE file is selected. |
| `auto_update_cli` | Project, then home, then `true` | This update-specific fallback is implemented in `resolveAutoUpdateCli`; it is not a general global layer. |

For a project-local override, put only the changed leaves in the local file. For example, a local model choice can be kept out of the shared file:

```yaml
# .agents/oma-config.local.yaml
model_preset: claude
agents:
  backend:
    model: anthropic/claude-sonnet-4-6
```

Run the command from the project so the nearest `.agents/` directory is selected. A malformed local file fails loudly; fix or remove it before retrying.

## Default values

| Key | Default | When applied |
|-----|---------|--------------|
| `auto_update_cli` | `true` | Both files absent or key missing |
| `serena.mode` | `bridge` | Both files absent or key missing |
| `serena.auto_update` | `true` | Both files absent or key missing |
| `telemetry` | `false` | Both files absent or key missing |
| `language` | `en` | Both files absent or key missing |
| `model_preset` | Required | The shipped project template uses `auto`; the schema requires a non-empty value. |
| `translation_voice` | `balanced` | Both files absent or key missing |
| `timezone` | System timezone | Both files absent or key missing |

## Read order rationale

The nearest-layer rule keeps a project’s configuration self-contained. If you want a user-wide baseline, install globally and edit `~/.agents/oma-config.yaml`; project installs can still define their own nearest layer.

## Notes

- `language` in `oma-config.yaml` controls agent response language. It is **not** used to determine install/update warning messages — those use the system locale (`$LANG`) because `oma-config.yaml` is not yet loaded at install time.
- `auto_update_cli` precedence is explicitly implemented in the update command. When both a project install and a global install are present, the project value is consulted first, then the home value.
- `telemetry` (default `false`) maps to each vendor's own opt-out, written by `oma install` / `oma update` / `oma link`: Claude `DISABLE_TELEMETRY` + `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`, Gemini/Qwen `privacy.usageStatisticsEnabled`, Codex `analytics.enabled` + `feedback.enabled`, Grok `[features] telemetry`, and Antigravity (agy) `enableTelemetry` in `~/.gemini/antigravity-cli/settings.json`. Setting `telemetry: true` opts back in by removing oma's opt-out for that vendor.
- `diagram` (engine `auto` / `archify` / `mermaid`, `explain_sidecar`, `archify.managed|channel|check_interval_min|path|quality|open`) is a sparse skill-override section like `video` / `image`; see [Diagram Engine](/docs/guide/diagram-engine).
- `video.hyperframes.check_interval_min` throttles the latest-version checks for the per-run HyperFrames toolchain and heygen-com/hyperframes (`oma video compose`, `oma update`).
- `market` (`managed|channel|check_interval_min|path|python|save_dir`) configures the always-latest `last30days` engine behind `oma market`; see [Market Research](/docs/guide/market-research).
- The typed runtime schema covers `providers`, `free`, `agents`, `models`, `custom_presets`, `vendors`, `session`, `docs`, and the sparse skill sections. Shipped templates also contain consumer-owned blocks such as `scm`, `memory`, `serena_reaper`, and `mcp`; their consumers own their nested keys. Do not infer a key from this list—use the [Configuration reference](/docs/guide/configuration-reference) and the feature guide for that block.
- Editing `oma-config.yaml` directly is safe. `oma install` and `oma update` use regex-level field replacement and preserve user-edited keys that they do not manage (e.g., custom `agents:` overrides, `session.quota_cap`).
- `oma update` additionally appends top-level keys that the shipped template defines but your file lacks (with template defaults), under an `# Added by oma update` marker. Keys you already have are never modified — existing content stays byte-identical. Keys you deliberately deleted will reappear with the template default; set the value explicitly instead of deleting the key to opt out.
