---
title: "Guide: oma-config.yaml Semantics"
description: Per-key precedence rules for oma-config.yaml when both project and global installs are present. Covers auto_update_cli (project beats global), serena.mode, telemetry, language, model_preset, translation_voice, timezone, and which dotfiles agy / claude / codex / gemini / qwen each pick up.
---

## Overview

`oma-config.yaml` can live in two locations:

- **Project**: `<cwd>/.agents/oma-config.yaml`
- **Global**: `~/.agents/oma-config.yaml`

When both files exist, the project file wins for every key. This is intentional: per-project customization is the more specific signal and should not be overridden by a user-wide default.

## Precedence table

| Key | Project wins? | Notes |
|-----|:---:|-------|
| `auto_update_cli` | Yes | Project value overrides global. Implemented in `resolveAutoUpdateCli` (`cli/commands/update/update.ts`). |
| `serena.mode` | Yes | Controls Serena MCP transport mode (e.g., `stdio`, `sse`). |
| `telemetry` | Yes | Vendor telemetry opt-in (`true` / `false`). |
| `language` | Yes | Response language for agent outputs (e.g., `en`, `ko`, `ja`). |
| `model_preset` | Yes | Model selection preset (e.g., `claude`, `mixed`, `codex`). |
| `translation_voice` | Yes | Translator tone: `formal`, `balanced`, `interpreter`. |
| `timezone` | Yes | Time zone identifier (e.g., `Asia/Seoul`, `America/New_York`). |

"Project wins" means: if the key is present in the project file, that value is used regardless of what the global file says. If the key is absent from the project file, the global file's value is used. If it is absent from both, the default applies.

## Default values

| Key | Default | When applied |
|-----|---------|--------------|
| `auto_update_cli` | `true` | Both files absent or key missing |
| `serena.mode` | `stdio` | Both files absent or key missing |
| `telemetry` | `false` | Both files absent or key missing |
| `language` | `en` | Both files absent or key missing |
| `model_preset` | `claude` | Both files absent or key missing |
| `translation_voice` | `balanced` | Both files absent or key missing |
| `timezone` | System timezone | Both files absent or key missing |

## Read order rationale

Project config is read first because it represents the more specific context — the repository a developer is actively working in. A team might enforce `language: ko` or `model_preset: mixed` for their project, and those choices should not be silently overridden by an individual's global `oma-config.yaml`.

The global file provides a user-wide baseline. Keys that the project does not set fall through to the global value, which in turn falls through to the hardcoded default.

## Notes

- `language` in `oma-config.yaml` controls agent response language. It is **not** used to determine install/update warning messages — those use the system locale (`$LANG`) because `oma-config.yaml` is not yet loaded at install time.
- `auto_update_cli` precedence is explicitly implemented in the update command. When both a project install and a global install are present, the project `oma-config.yaml` is consulted first.
- Editing `oma-config.yaml` directly is safe. `oma install` and `oma update` use regex-level field replacement and preserve user-edited keys that they do not manage (e.g., custom `agents:` overrides, `session.quota_cap`).
