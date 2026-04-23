---
title: "Anleitung: Modellkonfiguration pro Agent"
description: Mit RARDO v2.1 CLI-Anbieter, Modelle und Reasoning-Stufen pro Agent festlegen. Behandelt agent_cli_mapping, Runtime-Profile, oma doctor --profile, models.yaml und Session-Quota-Obergrenzen.
---

# Anleitung: Modellkonfiguration pro Agent

## Überblick

RARDO v2.1 führt über `agent_cli_mapping` die **agentenweise Modellauswahl** ein. Jeder Agent (pm, backend, frontend, qa …) kann jetzt unabhängig einen eigenen Anbieter, ein eigenes Modell und eine eigene Reasoning-Stufe festlegen — statt einen globalen Anbieter zu teilen.

Diese Seite behandelt:

1. Die dreistufige Konfigurationshierarchie
2. Das duale Format von `agent_cli_mapping`
3. Presets für Runtime-Profile
4. Den Befehl `oma doctor --profile`
5. Benutzerdefinierte Modell-Slugs in `models.yaml`
6. Session-Quota-Obergrenzen

---

## Konfigurationsdatei-Hierarchie

RARDO v2.1 liest drei Dateien in absteigender Priorität:

| Datei | Zweck | Bearbeiten? |
|:------|:------|:-----------|
| `.agents/config/user-preferences.yaml` | Benutzer-Overrides — Agent-zu-CLI-Mapping, aktives Profil, Session-Quota | Ja |
| `.agents/config/models.yaml` | Benutzerdefinierte Modell-Slugs (Ergänzung zur eingebauten Registry) | Ja |
| `.agents/config/defaults.yaml` | Eingebaute Profile-B-Baseline (4 `runtime_profiles`, sichere Fallbacks) | Nein — SSOT |

> `defaults.yaml` ist Teil der SSOT und darf nicht direkt geändert werden. Anpassungen erfolgen ausschließlich in `user-preferences.yaml` und `models.yaml`.

---

## Duales Format von `agent_cli_mapping`

`agent_cli_mapping` akzeptiert zwei Wertformen, damit eine schrittweise Migration möglich ist:

```yaml
# .agents/config/user-preferences.yaml
agent_cli_mapping:
  pm: "claude"                        # Legacy — nur Anbieter (nutzt Default-Modell)
  backend:                            # neues AgentSpec-Objekt
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4.7"
    effort: medium
  qa:
    model: "google/gemini-3-pro"
    effort: low
```

**Legacy-Stringform**: `agent: "vendor"` — funktioniert weiterhin, verwendet das Default-Modell und den Default-Effort des Anbieters.

**AgentSpec-Objektform**: `agent: { model, effort }` — fixiert einen konkreten Modell-Slug und eine Reasoning-Stufe (`low`, `medium`, `high`).

Beide Formen lassen sich frei mischen. Nicht aufgeführte Agenten greifen auf das aktive `runtime_profile` zurück.

---

## Runtime-Profile

`defaults.yaml` liefert Profile B mit vier fertigen `runtime_profiles`. Wähle eines in `user-preferences.yaml`:

```yaml
# .agents/config/user-preferences.yaml
active_profile: claude-only   # siehe Optionen unten
```

| Profil | Alle Agenten zu | Einsetzen wenn |
|:-------|:----------------|:---------------|
| `claude-only` | Claude Code (Sonnet/Opus) | Einheitlicher Anthropic-Stack |
| `codex-only` | OpenAI Codex (GPT-5.x) | Reiner OpenAI-Stack |
| `gemini-only` | Gemini CLI | Google-zentrierte Workflows |
| `antigravity` | Gemischt: pm→claude, backend→codex, qa→gemini | Stärken über Anbieter hinweg nutzen |
| `qwen-only` | Qwen CLI | Lokale / selbstgehostete Inferenz |

Profile sind der schnelle Weg, die gesamte Agenten-Flotte neu auszurichten, ohne jede Zeile einzeln zu ändern.

---

## `oma doctor --profile`

Der neue `--profile`-Flag gibt eine Matrix aus, die für jeden Agenten Anbieter, Modell und Effort **nach** dem Mergen aller drei Konfigurationsdateien anzeigt.

```bash
oma doctor --profile
```

**Beispielausgabe:**

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

Wenn ein Subagent unerwartet zu einem anderen Anbieter greift, hilft dieser Befehl zuerst. Die Spalte `Source` verrät, welche Konfigurationsebene gewonnen hat.

---

## Slugs in `models.yaml` ergänzen

`models.yaml` ist optional und erlaubt es, Modell-Slugs zu registrieren, die noch nicht in der eingebauten Registry stehen — praktisch für frisch veröffentlichte Modelle.

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — GPT-5.5 Spud Release Candidate"
```

Nach der Registrierung ist der Slug in `agent_cli_mapping` nutzbar:

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

Slugs sind Bezeichner — behalte die englische Schreibweise des Anbieters exakt bei.

---

## Session-Quota-Obergrenze

Füge `session.quota_cap` in `user-preferences.yaml` ein, um ausufernde Subagent-Spawns zu begrenzen:

```yaml
# .agents/config/user-preferences.yaml
session:
  quota_cap:
    tokens: 2_000_000        # Gesamt-Token-Obergrenze der Session
    spawn_count: 40          # Max. parallele + sequenzielle Subagenten
    per_vendor:              # Anbieterbezogene Token-Unterlimits
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Bei Erreichen eines Limits verweigert der Orchestrator weitere Spawns und meldet den Status `QUOTA_EXCEEDED`. Felder leer lassen (oder `quota_cap` weglassen) deaktiviert die jeweilige Dimension.

---

## Alles zusammen

Eine realistische `user-preferences.yaml`:

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

`oma doctor --profile` ausführen, um die Auflösung zu prüfen, und dann wie gewohnt den Workflow starten.


## Config file ownership

| File | Owner | Safe to edit? |
|------|-------|---------------|
| `.agents/config/defaults.yaml` | **SSOT shipped with oh-my-agent** | ❌ Treat as read-only |
| `.agents/config/user-preferences.yaml` | You | ✅ Customize here |
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

## Upgrading from a pre-RARDO-v2.1 install

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
