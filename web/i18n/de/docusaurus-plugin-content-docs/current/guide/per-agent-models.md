---
title: "Leitfaden: Modellkonfiguration pro Agent"
description: Konfigurieren Sie über model_preset in oma-config.yaml, welches KI-Modell jeder Agent verwendet. Behandelt eingebaute Presets, Überschreibungen pro Agent, Inline-Modelldefinitionen, benutzerdefinierte Presets mit extends, oma doctor --profile sowie die Migration vom veralteten agent_cli_mapping.
---

# Leitfaden: Modellkonfiguration pro Agent

## Überblick

`model_preset` ist das einzige Konzept, das steuert, welches Modell jeder einzelne Agent verwendet. Wählen Sie eines der eingebauten Presets, und jeder Agent (pm, backend, frontend, qa, …) wird mit einem für den jeweiligen Anbieter-Stack passenden Modell verdrahtet. Überschreiben Sie einzelne Agenten nach Bedarf. Definieren Sie zusätzliche Presets, wenn Ihr Team eine Mischung außerhalb der Standardvorgaben benötigt.

Die gesamte Konfiguration befindet sich in einer einzigen Datei: `.agents/oma-config.yaml`.

Diese Seite behandelt:

1. Die eingebauten Presets
2. Das Überschreiben einzelner Agenten über die `agents:`-Map
3. Das Inlinen benutzerdefinierter Modell-Slugs über `models:`
4. Das Definieren benutzerdefinierter Presets mit `custom_presets:` und `extends:`
5. Das Inspizieren der aufgelösten Konfiguration mit `oma doctor --profile`
6. Die Migration vom veralteten `agent_cli_mapping`

---

## Eingebaute Presets

Setzen Sie `model_preset` auf einen der eingebauten Schlüssel:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity
```

| Schlüssel | Beschreibung | Geeignet für |
|:----|:-----------|:---------|
| `antigravity` | Alle Agenten verwenden die Antigravity CLI (`agy`): Gemini 3.1 Pro für Implementierung/Architektur, Gemini 3.5 Flash für Orchestrierung und Retrieval. Die Modellauswahl erfolgt konfigurationsgesteuert innerhalb von `agy` — keine `--model`- oder `--thinking-budget`-Flags werden bereitgestellt. | Antigravity-CLI-Nutzer |
| `claude` | Alle Agenten verwenden Claude (Sonnet/Opus) | Inhaber eines Claude-Max-Abonnements |
| `codex` | Alle Agenten verwenden OpenAI Codex (GPT-5.x) mit Effort-Stufen | Nutzer von ChatGPT Plus/Pro |
| `gemini` | Alle Agenten verwenden die Gemini CLI; Thinking ist für Implementierungsrollen aktiviert | Nutzer von Google AI Pro |
| `qwen` | Alle Agenten werden extern über Qwen Code geleitet; binäres Thinking (keine Effort-Stufen) | Lokale bzw. selbst gehostete Inferenz |
| `cursor` | Alle Agenten nutzen Cursor `composer-2.5` (`composer-2.5-fast` für orchestrator/qa/pm/docs/explore) | Cursor-Pro- / Pro-Student-Abo |
| `mixed` | Gemischt: Implementierungsrollen nutzen Codex, Architecture/QA/PM nutzen Claude, Retrieval nutzt Gemini | Anbieterübergreifende Stärken ohne Konfiguration pro Agent |

Eingebaute Presets werden mit dem CLI-Paket ausgeliefert und aktualisieren sich automatisch, wenn Sie `oh-my-agent` aktualisieren. Es ist keine lokale Datei zu pflegen.

---

## Einzelne Agenten überschreiben

Verwenden Sie die `agents:`-Map, um bestimmte Agenten zusätzlich zum aktiven Preset zu überschreiben. Nur die von Ihnen aufgeführten Agenten sind betroffen; alle übrigen verbleiben auf den Preset-Standardwerten.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Jeder Eintrag ist ein `AgentSpec`-Objekt:

| Feld | Typ | Erforderlich | Beschreibung |
|:------|:-----|:---------|:-----------|
| `model` | string | Ja | Modell-Slug (eingebaut oder benutzerdefiniert) |
| `effort` | `low` \| `medium` \| `high` | Nein | Reasoning-Effort (wird bei Modellen ohne entsprechende Unterstützung ignoriert) |
| `thinking` | boolean | Nein | Erweitertes Thinking aktivieren (modellspezifisch) |
| `memory` | `user` \| `project` \| `local` | Nein | Memory-Scope für den Agenten |

Gültige Agent-IDs: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `tf-infra`, `explore`.

Das Merging erfolgt flach: Jedes Feld in Ihrer Überschreibung ersetzt den Preset-Wert für genau dieses Feld. Ausgelassene Felder behalten ihren Preset-Wert.

---

## Modell-Slugs inlinen

Registrieren Sie Modell-Slugs, die noch nicht in der eingebauten Registry vorhanden sind, unter `models:`. Sobald registriert, können Sie den Slug überall in `agents:` oder `custom_presets:` verwenden.

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

> Wenn ein benutzerdefinierter Slug mit einem eingebauten Slug kollidiert, setzt sich die Benutzerdefinition durch und es wird eine Warnung ausgegeben.

---

## Benutzerdefinierte Presets

Definieren Sie zusätzliche Presets unter `custom_presets:`. Verwenden Sie `extends:`, um alle Agenten-Standardwerte von einem eingebauten Preset zu erben und nur die Agenten zu überschreiben, die für Sie relevant sind.

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

Ohne `extends:` müssen Sie `agent_defaults` für alle 11 Agentenrollen angeben. Mit `extends:` werden nur die von Ihnen aufgeführten Einträge überschrieben; die übrigen werden vom Basis-Preset geerbt.

---

## `oma doctor --profile`

Führen Sie `oma doctor --profile` aus, um die vollständig aufgelöste Modellmatrix zu inspizieren – nachdem Preset-Standardwerte, `custom_presets` und `agents:`-Überschreibungen zusammengeführt wurden.

```bash
oma doctor --profile
```

**Beispielausgabe:**

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

Jede Zeile zeigt den aufgelösten Modell-Slug sowie die Quelle, die ihn angewendet hat (`(preset)` oder `(override)`). Konsultieren Sie diese Ausgabe immer dann, wenn ein Subagent einen unerwarteten Anbieter wählt.

---

## Migration vom veralteten `agent_cli_mapping`

Migration 008 läuft automatisch bei `oma install` und `oma update`. Sie konvertiert veraltete Projekte direkt vor Ort:

| Veraltete Konfiguration | Ergebnis nach Migration 008 |
|:-------------|:--------------------------|
| Alle Einträge desselben Anbieters (z. B. ausschließlich `gemini`) | `model_preset: gemini`, kein `agents:` |
| Gemischte Anbieter | Häufigster Anbieter → `model_preset`; übrige → `agents:`-Überschreibungen |
| `AgentSpec`-Objektwerte | Werden unverändert nach `agents:` übernommen |
| Inhalt von `models.yaml` | Wird in `oma-config.yaml.models` eingebettet |
| Angepasste `defaults.yaml` | Wird als `custom_presets.user-customized` mit einer Warnung erhalten |

Originale werden vor jeglichen Änderungen in `.agents/.backup-pre-008-{timestamp}/` gesichert. Die Migration ist idempotent – ist `model_preset` bereits vorhanden, wird sie übersprungen.

Nach der Migration werden `.agents/config/defaults.yaml`, `.agents/config/models.yaml` und das Verzeichnis `.agents/config/` entfernt.

---

## Session Quota Cap

`session.quota_cap` bleibt unverändert. Fügen Sie es in `oma-config.yaml` hinzu, um ein außer Kontrolle geratenes Spawnen von Subagenten zu begrenzen:

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

Sobald ein Limit erreicht ist, verweigert der Orchestrator weitere Spawns und meldet den Status `QUOTA_EXCEEDED`.

---

## Vollständiges Beispiel

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

Führen Sie `oma doctor --profile` aus, um die Auflösung zu bestätigen, und starten Sie anschließend einen Workflow wie gewohnt.

---

## Dispatch über OpenCode

[OpenCode](https://opencode.ai) ist ein Vendor der Erweiterungsklasse: Wie pi besitzt es keine eigenen Modelle, sondern ist eine CLI, die Modelle aus seinem eigenen Katalog ausführt — den kostenlosen `opencode`-Provider, den günstigen `opencode-go`-Abonnementtarif und das `opencode-zen`-Gateway. oma integriert es als **In-Process-Plugin-Vendor**: opencode lädt `.opencode/plugins/oma/` automatisch, anstatt Hooks über eine Settings-Datei zu registrieren, und löst die Persona jedes Agenten aus generierten `.opencode/agents/<id>.md`-Dateien auf.

### Expliziter Dispatch

Leiten Sie einen beliebigen Agenten über die Überschreibung `-m opencode` durch opencode:

```bash
oma agent:spawn pm "Draft the rollout plan" <session> -m opencode
```

Dies führt `opencode run --agent pm --dir <workspace> "<prompt>"` aus. Der Prompt ist ein **nachgestelltes Positionsargument** — das `-p`-Flag von opencode bedeutet `--password`, nicht den Prompt.

### OpenCode-Modelle pro Agent

Um bestimmte Agenten an ein opencode-Modell zu leiten, registrieren Sie das Modell unter `models:` und referenzieren es aus `agents:`. Es gelten zwei Anforderungen (siehe [Modell-Slugs inlinen](#inlining-model-slugs)):

1. **Der Slug muss in der Form `owner/model` vorliegen.** Verwenden Sie den opencode-`provider/model`-Slug als Registry-Schlüssel — bloße Namen werden vom `agents.<id>.model`-Schema abgelehnt.
2. **Die Spezifikation muss vollständig sein** — `cli`, `cli_model`, `auth_hint` sowie jeder `supports`-Boolean. Eine unvollständige Spezifikation scheitert an der Validierung und fällt stillschweigend auf die Kern-Registry zurück (der Agent würde also nicht an opencode geleitet).

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

Jeder geleitete Agent setzt `opencode run -m opencode-go/deepseek-v4-flash --agent <id> --dir <workspace> "<prompt>"` ab. Dies passt gut zu leichtgewichtigen, schnellen Rollen (pm, qa, docs, explore), während schwerere Implementierungsagenten auf Codex/Claude/etc. verbleiben.

### Einen Modell-Slug validieren

Der Katalog von opencode ist abonnement- und login-gebunden, daher hardcodiert oma **keine** opencode-Modell-Slugs. Validieren Sie einen Slug gegen Ihren installierten Katalog:

```bash
oma model:probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model:probe` meldet `accepted`, wenn der Slug von `opencode models` aufgeführt wird, `rejected`, wenn nicht, und `auth_required`, wenn der Provider Login oder ein Abonnement benötigt.

### Auth und generierte Dateien

- **Auth:** `opencode auth login` speichert die Anmeldedaten in `~/.local/share/opencode/auth.json`. `oma auth:status` / `oma doctor` melden die opencode-Auth zusammen mit den übrigen CLIs auf Vendor-Ebene (Standard-Provider-Prüfung: `opencode-go`). `oma doctor --profile` prüft dagegen providerbezogen: Jede Zeile wird gegen das Provider-Präfix ihres registrierten `cli_model` geprüft, ein Modell mit `cli_model: zai-coding-plan/glm-5.3` also gegen die `zai-coding-plan`-Anmeldedaten. Eine Zeile, deren Modell kein registriertes `cli_model` in der Form `provider/model` hat, meldet `? unknown` statt eines definitiven Auth-Fehlers.
- **Generierte Dateien:** `oma link` (oder `oma link opencode`) schreibt pro Agent eine `.opencode/agents/<id>.md`-Persona sowie die `.opencode/plugins/oma/`-Bridge. Diese werden aus dem `.agents/`-SSOT generiert — bearbeiten Sie sie nicht direkt; führen Sie `oma link` erneut aus, um sie neu zu generieren.

> **Hinweis zu persistenten Workflows:** Das `session.idle`-Event von opencode (sein nächstes Analogon zum Claude-`Stop`-Hook) ist rein benachrichtigend und kann das Beenden der Sitzung nicht blockieren. Persistente Workflows (orchestrate / work / ultrawork) laufen unter opencode daher mit **eingeschränkter Stop-Semantik** — die Workflow-Verstärkung erfolgt bei der nächsten Nachricht, statt die Sitzung offen zu halten.
