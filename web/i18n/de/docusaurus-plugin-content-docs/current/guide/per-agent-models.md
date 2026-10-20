---
title: "Anleitung: Modellkonfiguration pro Agent"
sidebar_label: Agentenmodelle
description: Konfigurieren Sie über model_preset in oma-config.yaml, welches KI-Modell jeder Agent verwendet. Behandelt eingebaute Presets und ihre Modelle pro Rolle, die Auflösungstabelle für Modell und CLI, Überschreibungen pro Agent, Inline-Modelldefinitionen, benutzerdefinierte Presets mit extends, oma doctor --profile, Kontingentgrenzen sowie die Transporte pi, OpenCode und Kimi.
---

# Anleitung: Modellkonfiguration pro Agent

## Überblick

`model_preset: auto` ist der Standard für neue Installationen. Nicht konfigurierte Agenten verwenden die nativen Agenten-Definitionen und Modelleinstellungen des aktuellen Vendors. Wählen Sie ein festes Preset, um Modelle zu pinnen, oder überschreiben Sie einzelne Agenten, wenn Sie ein anderes Modell oder einen anderen Vendor benötigen. Bereits vorhandene explizite Presets bleiben bei Neuinstallation und Update erhalten.

Die gemeinsame Konfiguration liegt in `.agents/oma-config.yaml` und, falls vorhanden, in `.agents/oma-config.cue`, deren Schlüssel dieselben YAML-Schlüssel überschreiben. Eine optionale, von Git ignorierte lokale Datei überschreibt die Einstellungen für Ihren Rechner.

Eine vollständige Referenz der Top-Level-Schlüssel und Vorrangregeln finden Sie in der [Konfigurationsreferenz](/docs/guide/configuration-reference).

Behandelt werden:

1. Die eingebauten Presets und die Modelle, die jede Rolle erhält
2. Wie OMA Modell und CLI für einen Agenten auflöst
3. Lokale Konfiguration und das FreeLLMAPI-Preset (`free`)
4. Das Überschreiben einzelner Agenten mit der `agents:`-Map
5. Das Inlinen benutzerdefinierter Modell-Slugs mit `models:`
6. Das Definieren benutzerdefinierter Presets mit `custom_presets:` und `extends:`
7. Das Prüfen der aufgelösten Konfiguration mit `oma doctor --profile`
8. Die Migration vom veralteten `agent_cli_mapping` und Sitzungs-Kontingentgrenzen
9. Dispatch über pi, OpenCode und die Kimi Code CLI

---

## Eingebaute Presets {#built-in-presets}

Setzen Sie `model_preset` auf einen der eingebauten Schlüssel:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto
```

| Schlüssel | Beschreibung | Geeignet für |
|:----|:-----------|:---------|
| `auto` | Folgt den Agenten- und Modelleinstellungen der aktuellen Laufzeit, ohne ein Modell oder Effort-Flag einzuschleusen | Standard für neue Installationen |
| `free` | Spezieller Gateway-Modus für von OMA gestartete Codex-, Claude- oder Qwen-Prozesse; er wird getrennt von der eingebauten Preset-Registry aufgelöst. | Lokales FreeLLMAPI-Gateway |
| `antigravity` | Alle Agenten verwenden die Antigravity CLI (`agy`): Gemini 3.1 Pro für Implementierung, Architektur und QA; Gemini 3.6 Flash für Orchestrierung, PM, Dokumentation und Explore. Ab agy 1.1 übergibt OMA die Anzeige-ID aus `agy models` (zum Beispiel `--model "Gemini 3.1 Pro (High)"`) und bildet `effort` auf eine Stufe ab, die das Modell anbietet. agy 1.0 hat kein `--model`, daher entscheidet dessen eigene Konfiguration. agy hat kein `--thinking-budget`. | Nutzer der Antigravity CLI |
| `claude` | Alle Agenten verwenden Claude: Opus für Architektur, Haiku für Explore, Sonnet für alle übrigen Rollen | Inhaber eines Claude-Max-Abonnements |
| `codex` | Alle Agenten verwenden OpenAI Codex (GPT-5.5 für die meisten Rollen, GPT-5.4-mini für Explore) mit Effort-Stufen | Nutzer von ChatGPT Plus/Pro |
| `qwen` | Alle Agenten verwenden Qwen Code; passende Qwen-Sitzungen können erzeugte native Agenten nutzen, andere Laufzeiten verwenden CLI-Dispatch | Lokale oder selbst gehostete Inferenz |
| `kiro` | Alle Agenten verwenden die Kiro CLI; Sonnet übernimmt Implementierung und Architektur, Haiku Orchestrierung und Explore | Kiro-Nutzer |
| `cursor` | Alle Agenten verwenden Cursors `composer-2.5` (`composer-2.5-fast` für Orchestrator, QA, PM, Docs und Explore) | Cursor-Pro- oder Pro-Student-Nutzer |
| `mixed` | Claude für Orchestrator, Architektur (Opus), QA, PM und Docs; Codex GPT-5.5 für Implementierungsrollen und GPT-5.4-mini für Explore | Anbieterübergreifende Stärken ohne Verwaltung einer Konfiguration pro Agent |

Eingebaute Presets werden mit dem CLI-Paket ausgeliefert und beim Upgrade von `oh-my-agent` automatisch aktualisiert. `gemini` ist ein Kompatibilitätsalias, der auf `antigravity` verweist; es ist kein eigenes aktuelles Preset. Eine lokale Preset-Datei ist nicht erforderlich.

### Modelle pro Rolle {#models-per-role}

Die festen Presets weisen diese Registry-Slugs zu. Owner-Präfixe sind weggelassen: `antigravity/`, `anthropic/`, `openai/`, `qwen/`, `kiro/` und `cursor/` für die ersten sechs Spalten sowie in `mixed` `anthropic/` für Claude-Modelle bzw. `openai/` für GPT-Modelle. Maßgebliche Quelle ist `cli/platform/built-in-presets.ts`.

| Rolle | `antigravity` | `claude` | `codex` | `qwen` | `kiro` | `cursor` | `mixed` |
|:-----|:--------------|:---------|:--------|:-------|:-------|:---------|:--------|
| orchestrator, pm, docs | gemini-3.6-flash | claude-sonnet-4-6 | gpt-5.5 (medium) | qwen3-coder-next | claude-haiku-3-5 | composer-2.5-fast | claude-sonnet-4-6 |
| architecture | gemini-3.1-pro | claude-opus-4-7 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5 | claude-opus-4-7 |
| qa | gemini-3.1-pro | claude-sonnet-4-6 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5-fast | claude-sonnet-4-6 |
| backend, frontend, mobile, db, debug, refactor, tf-infra | gemini-3.1-pro | claude-sonnet-4-6 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5 | gpt-5.5 (high) |
| explore | gemini-3.6-flash | claude-haiku-4-5 | gpt-5.4-mini (low) | qwen3-coder-next | claude-haiku-3-5 | composer-2.5-fast | gpt-5.4-mini (low) |

Werte in Klammern sind das `effort` des Presets (Codex) bzw. `thinking: true` (Qwen). Eine Rolle, die ein Preset nicht aufführt, etwa `eval`, verwendet den `orchestrator`-Eintrag dieses Presets.

---

## Wie OMA Modell und CLI eines Agenten auflöst {#how-oma-resolves-an-agents-model-and-cli}

Ist `OMA_MODEL_PRESET` gesetzt, ersetzt es zuerst `model_preset` (siehe [Laden der Konfiguration](/docs/guide/oma-config-semantics#precedence-table)). Danach wählt der Resolver eine Zeile:

| `model_preset` | `agents.<id>` gesetzt? | An die CLI übergebenes Modell | CLI, die den Agenten ausführt |
|:---------------|:-------------------|:----------------------|:------------------------|
| `free` | Ignoriert | `FREELLM_MODEL`, sonst `free.model`, sonst `auto` (jede Rolle) | `--vendor`, sonst `OMA_RUNTIME_VENDOR`, sonst die erkannte Laufzeit, sofern sie Codex, Claude oder Qwen ist, sonst `default_cli`, sonst `codex`. Akzeptiert werden nur `codex`, `claude` und `qwen`. |
| `auto` | Nein | Keines. Es gelten die eigenen Agenten- und Sitzungseinstellungen des Vendors. | `--vendor`, sonst ein unterstütztes `OMA_RUNTIME_VENDOR`, sonst die erkannte Laufzeit, sonst `default_cli`, sonst `claude`. Ein nicht unterstützter Wert ist ein Fehler. |
| `auto` | Ja | Das `model` der Überschreibung | Die `cli` dieses Modells, danach die Vendor-Überschreibungsregel unten |
| Eingebaut, Alias oder benutzerdefiniert | Nein | Der Eintrag des Presets für die Rolle, sonst der `orchestrator`-Eintrag des Presets | Die `cli` dieses Modells, danach die Vendor-Überschreibungsregel unten |
| Eingebaut, Alias oder benutzerdefiniert | Ja | Der Preset-Eintrag, flach mit der Überschreibung zusammengeführt (Felder der Überschreibung gewinnen) | Die `cli` dieses Modells, danach die Vendor-Überschreibungsregel unten |

So fügen sich die übrigen Teile ein:

- **Preset-Suche.** OMA prüft zuerst eingebaute Namen, dann Aliase (`gemini` verweist mit einer Warnung auf `antigravity`), dann `custom_presets`. Ein benutzerdefiniertes Preset mit einem eingebauten Namen wird ignoriert. Ein unbekannter Name bricht mit `Unknown model_preset "..."` ab; die Meldung listet die gültigen Namen auf.
- **Modell-Suche.** Ein Slug wird zuerst in `models:` gesucht, dann in der eingebauten Registry. Ein unbekannter Slug oder eine Spezifikation mit `api_only: true` stoppt den Dispatch.
- **Vendor-Überschreibungsregel.** Wenn `--vendor` oder `OMA_RUNTIME_VENDOR` für eine modellgestützte Zeile einen Vendor nennt, übernimmt `pi` immer (nur Modelle echter Provider; siehe [Dispatch über pi](#dispatching-through-pi-transport-runtime)). Jeder andere Vendor übernimmt nur, wenn er in `supports.native_dispatch_from` des Modells aufgeführt ist. Andernfalls warnt OMA und behält die eigene `cli` des Modells bei.
- **Effort.** `effort` wird mit einer Warnung verworfen, wenn die CLI des Modells kein Effort-Flag hat (Claude Code). Für pi bleibt es erhalten und wird auf `--thinking` abgebildet.

## Automatischer Dispatch

Bei `auto` verwendet OMA, wenn verfügbar, den nativen Subagentenpfad der aktuellen Laufzeit. Vendorübergreifende Agenten und Laufzeiten ohne nativen Dispatch verwenden `oma agent spawn`. `auto` wird nicht zu einem festen Vendor-Preset erweitert. Geerbte Pläne schleusen keine OMA-Modell- oder Effort-Flags ein. Ein externer CLI-Prozess verwendet die gespeicherten Standardwerte dieser CLI, die sich von einem Modell unterscheiden können, das nur in der übergeordneten Sitzung ausgewählt wurde.

`oma doctor --profile` zeigt für geerbte Agenten `(vendor agent default)` und für explizite Überschreibungen das aufgelöste Modell. Native Agenten-Dateien behalten ihre Vendor-Definitionen; Überschreibungen desselben Vendors im Auto-Modus werden angewendet, wenn diese Dateien von install oder update generiert werden.

## Lokale Konfiguration

Erstellen Sie neben der gemeinsamen Konfiguration **genau eine** der Dateien `.agents/oma-config.local.cue` oder `.agents/oma-config.local.yaml`. Install, link und update nehmen beide Pfade in die `.gitignore` auf; update erhält vorhandene lokale Dateien auch mit `--force`.

OMA wählt das nächste Projekt-Konfigurationsverzeichnis. Innerhalb dieses Verzeichnisses überschreiben im gemeinsamen CUE gesetzte Schlüssel dieselben Schlüssel im gemeinsamen YAML, und die lokale Datei überschreibt die gemeinsamen Werte. Die vollständige Reihenfolge steht in der [Vorrangtabelle](/docs/guide/oma-config-semantics#precedence-table). CUE-Dateien werden vor dem Zusammenführen unabhängig ausgewertet, sodass ein gemeinsames `model_preset: "auto"` lokal durch `"free"` ersetzt werden kann. Objekte werden rekursiv zusammengeführt; Arrays, Skalare und `null` ersetzen den gemeinsamen Wert. Eine fehlerhafte lokale Datei, eine fehlende CUE-Executable für lokales CUE oder das gleichzeitige Vorhandensein beider lokalen Formate ist ein Fehler und keine Erlaubnis, auf gemeinsame Standardwerte auszuweichen.

Befehlsoptionen und unterstützte Umgebungsüberschreibungen haben Vorrang vor der wirksamen Dateikonfiguration. `oma doctor --profile` zeigt, welche Dateien verwendet wurden. Lokale Dateien werden nicht mit Git-Klonen oder neuen Worktrees übertragen. Free-Modus-Subprozesse erben `OMA_MODEL_PRESET=free` und die aufgelöste Gateway-Umgebung, damit verschachtelte OMA-Spawns dieselbe Route verwenden; unabhängig gestartete Sitzungen benötigen ihre eigene lokale Konfiguration oder Umgebung. Von Installations- und Setup-Befehlen gespeicherte Einstellungen zielen weiterhin auf die gemeinsame Konfiguration; eine lokale Überschreibung hat zur Laufzeit weiterhin Vorrang.

## FreeLLMAPI-Preset

Lassen Sie in der gemeinsamen Datei `model_preset: auto` stehen und aktivieren Sie FreeLLMAPI lokal:

```cue
// .agents/oma-config.local.cue
model_preset: "free"
free: {
    base_url:    "http://127.0.0.1:31415/v1"
    api_key_env: "FREELLM_API_KEY"
    model:       "auto"
}
```

Die entsprechende YAML-Datei lautet:

```yaml
# .agents/oma-config.local.yaml
model_preset: free
free:
  base_url: http://127.0.0.1:31415/v1
  api_key_env: FREELLM_API_KEY
  model: auto
```

Starten Sie FreeLLMAPI separat und exportieren Sie den einheitlichen Schlüssel als `FREELLM_API_KEY`. OMA akzeptiert auch Upstreams `FREELLMAPI_API_KEY`, wenn die Standardvariable ausgewählt ist; die kanonische Variable gewinnt, wenn beide gesetzt sind. Ein benutzerdefiniertes `api_key_env` liest nur diese Variable. Legen Sie den Schlüssel niemals in der Konfiguration ab. `OMA_MODEL_PRESET` überschreibt das Preset. `FREELLM_BASE_URL` und `FREELLM_MODEL` überschreiben die jeweiligen Dateieinstellungen. Die Werte im Beispiel sind die Standardwerte; sobald Server und Schlüssel bereitstehen, genügt daher `model_preset: free`.

```bash
oma doctor --profile
oma agent spawn backend "Review the API error handling" free-review --vendor codex --read-only
```

Der Free-Modus verwendet `free.model` für jede von OMA dispatchte Rolle, auch für Rollen mit vorhandenen `agents.*.model`-Pins. Diese Pins werden nicht in kostenpflichtige Abonnements aufgelöst. Wählen Sie `auto`, eine Gateway-Modell-ID oder eine benannte Gateway-Kette wie `auto:coding` (legen Sie diese Kette zuvor in FreeLLMAPI an).

Der Transport folgt der Zeile `free` unter [Wie OMA Modell und CLI eines Agenten auflöst](#how-oma-resolves-an-agents-model-and-cli). Unterstützt werden nur Codex-, Claude- und Qwen-Transporte. Ein ausdrücklich ausgewählter nicht unterstützter Transport führt zu einem Fehler.

| Transport | Gateway-Endpunkt | CLI-Basis-URL |
|:--|:--|:--|
| Codex | `/v1/responses` | Enthält `/v1` |
| Claude | `/v1/messages` | Serverstamm; OMA entfernt das Suffix `/v1` |
| Qwen | `/v1/chat/completions` | Enthält `/v1` |

Verwenden Sie `oma agent spawn`, auch wenn der Parent denselben Vendor verwendet. OMA injiziert Gateway-Verbindung und Zugangsdaten nur in diesen Subprozess; das Ändern des Presets ändert weder das Modell einer bereits geöffneten Host-Sitzung noch das native Subagent-Tool des Hosts. Codex erhält über die Aufrufargumente einen benutzerdefinierten Responses-Provider, während der Schlüssel in der Umgebung des Kindprozesses bleibt. Claude und Qwen erhalten ihre kompatiblen Endpunkt-Einstellungen. Widersprüchliche Claude- oder Qwen-Einstellungen, die Route oder Schlüssel überschreiben würden, werden vor der Ausführung gemeldet; OMA schreibt diese Dateien nicht um.

Spawn und Review prüfen vor dem Start des Agenten eine authentifizierte `GET /v1/models`-Anfrage. Fehlende Schlüssel, Verbindungsfehler und HTTP-Authentifizierungsfehler beenden die Ausführung. `oma doctor --profile` zeigt die wirksame URL und das Modell, Umgebungsüberschreibungen, das Vorhandensein des Schlüssels und die Serverbereitschaft, ohne den Schlüssel auszugeben. Bereitschaft garantiert nicht, dass ein Modell genügend Kontingent für die Aufgabe hat.

FreeLLMAPI ist für das Failover auf Anfrageebene zuständig. OMAs explizites, checkpointbasiertes Vendor-Failover bleibt ein getrenntes Verfahren zur Wiederherstellung nach Fehlern; jeder Nachfolger im Free-Modus muss weiterhin einen unterstützten FreeLLMAPI-Transport verwenden. Es erfolgt keine automatische Rückkehr zu einer kostenpflichtigen Vendor-Konfiguration.

Das Free-Preset konfiguriert die Agenteninferenz. Es ändert nicht die Embedding-Konfiguration vorhandener Memory-Dienste. FreeLLMAPI stellt auch `/v1/embeddings` bereit. Wenn Sie separat einen Vektorspeicher konfigurieren, pinnen Sie eine Modellfamilie, damit vorhandene Vektoren in einem kompatiblen Raum bleiben.

Upstream-Referenzen: [Client-Einrichtung](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/clients/01-agent-clients.md), [API- und Embedding-Familien](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md).

## Einzelne Agenten überschreiben

Verwenden Sie die `agents:`-Map, um bestimmte Agenten zusätzlich zum aktiven Preset zu überschreiben. Nur die von Ihnen aufgeführten Agenten sind betroffen; die übrigen folgen im Auto-Modus den Vendor-Einstellungen oder den Standardwerten des gewählten festen Presets.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Jeder Eintrag ist ein `AgentSpec`-Objekt:

| Feld | Typ | Erforderlich | Beschreibung |
|:------|:-----|:---------|:-----------|
| `model` | string | Ja | Modell-Slug (eingebaut oder benutzerdefiniert) |
| `effort` | `none` \| `low` \| `medium` \| `high` \| `xhigh` | Nein | Reasoning-Effort (wird bei Modellen ohne Unterstützung ignoriert) |
| `thinking` | boolean | Nein | Erweitertes Thinking aktivieren (modellspezifisch) |
| `memory` | `user` \| `project` \| `local` | Nein | Memory-Gültigkeitsbereich des Agenten |

Gültige Agent-IDs: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, `explore` und `eval`. Eingebaute Presets definieren `eval` nicht, daher verwendet es den `orchestrator`-Eintrag des Presets, sofern Sie es nicht überschreiben.

Das Zusammenführen ist flach: Jedes Feld Ihrer Überschreibung ersetzt den Preset-Wert für dieses Feld. Ausgelassene Felder behalten ihren Preset-Wert.

---

## Modell-Slugs inline definieren {#inlining-model-slugs}

Registrieren Sie Modell-Slugs, die noch nicht in der eingebauten Registry vorhanden sind, unter `models:`. Nach der Registrierung können Sie den Slug aus `agents:` oder `custom_presets:` referenzieren.

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

Für einen registrierten Slug, den Sie unter `agents:` referenzieren, gelten zwei Regeln:

1. **Der Schlüssel muss die Form `owner/model` haben.** `agents.<id>.model` wird gegen ein Muster `owner/model` validiert. Ein bloßer Schlüssel wie `my-fast-model` wird daher abgelehnt; verwenden Sie einen Schlüssel mit Schrägstrich wie `antigravity/gemini-3.1-pro-low` (oder den Slug `provider/model` des Vendors).
2. **Die Spezifikation muss vollständig und gültig sein.** `cli`, `cli_model`, `auth_hint` und jedes Feld unter `supports` sind bei der Auflösung erforderlich. `cli` muss einer der Werte `antigravity`, `claude`, `codex`, `commandcode`, `cursor`, `grok`, `kimi`, `kiro`, `qwen` oder `opencode` sein; Einträge in `native_dispatch_from` müssen `antigravity`, `claude`, `codex`, `cursor`, `kimi`, `kiro`, `opencode` oder `qwen` sein. `gemini` ist für keines der beiden ein gültiger Wert. Eine ungültige Spezifikation protokolliert `[model-registry] User inline model "<slug>" failed validation — falling back to core registry`; enthält die Core-Registry keinen solchen Slug, stoppt der Dispatch mit einem Fehler für einen unbekannten Slug.

> Wenn ein benutzerdefinierter Slug mit einem eingebauten Slug kollidiert, gewinnt die Benutzerdefinition und es wird eine Warnung ausgegeben.

---

## Benutzerdefinierte Presets

Definieren Sie zusätzliche Presets unter `custom_presets:`. Mit `extends:` erben Sie alle Agenten-Standardwerte eines eingebauten Presets und überschreiben nur die Agenten, die Sie benötigen.

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

Ohne `extends:` definieren Sie mindestens `orchestrator`: Jede Rolle, die das Preset auslässt, verwendet dessen `orchestrator`-Eintrag. Mit `extends:` werden nur die von Ihnen aufgeführten Einträge überschrieben; die übrigen werden vom Basis-Preset geerbt. `extends` kann ein eingebautes oder ein anderes benutzerdefiniertes Preset nennen; eine zirkuläre Kette ist ein Fehler. Ein benutzerdefiniertes Preset mit dem Namen eines eingebauten (zum Beispiel `claude`) wird ignoriert; das eingebaute gewinnt.

---

## `oma doctor --profile`

Führen Sie `oma doctor --profile` aus, um die vollständig aufgelöste Modellmatrix zu prüfen, nachdem Preset-Standardwerte, `custom_presets` und `agents:`-Überschreibungen zusammengeführt wurden.

```bash
oma doctor --profile
```

**Beispielausgabe** (gekürzt: `model_preset: mixed` mit einer `backend`-Überschreibung; ein echter Lauf listet alle 13 Rollen auf, und das Terminal zeichnet jeden Abschnitt in einem Rahmen):

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

Jede Zeile zeigt die Rolle, den aufgelösten Modell-Slug, die ausführende CLI und ihren Auth-Status. Die Rollenzelle trägt ein Quell-Tag: `(preset)`, `(override)` oder `(vendor)` für Agenten, die unter `auto` die Vendor-Einstellungen erben. Die Spalte Role ist 14 Zeichen breit, daher werden lange Tags wie oben abgeschnitten. Verwenden Sie diese Ausgabe, wenn ein Subagent einen unerwarteten Vendor auswählt.

---

## Migration vom veralteten `agent_cli_mapping`

Migration 008 läuft bei `oma install` und `oma update` automatisch. Sie konvertiert veraltete Projekte direkt vor Ort:

| Alte Konfiguration | Ergebnis nach Migration 008 |
|:-------------|:--------------------------|
| Alle Einträge desselben Vendors (z. B. alle `claude`) | `model_preset` wird auf das Preset dieses Vendors gesetzt (veraltetes `gemini` wird zu `antigravity`), kein `agents:` |
| Gemischte Vendoren | Häufigster Vendor → `model_preset`; übrige → `agents:`-Überschreibungen |
| `AgentSpec`-Objektwerte | Unverändert nach `agents:` verschoben |
| Inhalt von `models.yaml` | In `oma-config.yaml.models` inline eingefügt |
| Angepasste `defaults.yaml` | Als `custom_presets.user-customized` mit einer Warnung erhalten |

Die Originale werden vor Änderungen nach `.agents/backup/008-model-preset/<timestamp>-<pid>/` gesichert (`~/.oma/backup/008-model-preset/...` bei globaler Installation). Die Migration ist idempotent. Wenn `model_preset` bereits vorhanden ist, wird sie übersprungen.

<!-- oma-docs:ignore-start -->
Nach der Migration werden `.agents/config/defaults.yaml`, `.agents/config/models.yaml` und das Verzeichnis `.agents/config/` entfernt.
<!-- oma-docs:ignore-end -->

---

## Sitzungs-Kontingent

Fügen Sie `session.quota_cap` zu `oma-config.yaml` hinzu, um unkontrolliertes Spawnen von Subagenten zu begrenzen:

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

Wenn ein Kontingent erreicht ist, verweigert `oma agent spawn` den nächsten Spawn und schlägt mit `[session-cost] Quota cap exceeded for session <id>: <dimension> (current: N, limit: M)` fehl. Der Token-Verbrauch wird aus der Prompt-Länge geschätzt, daher ist `spawn_count` die am besten vorhersagbare Grenze. Feldregeln: [Sitzungs-Kontingentgrenzen](/docs/guide/configuration-reference#session-quota-caps).

---

## Vollständiges Beispiel

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

Führen Sie `oma doctor --profile` aus, um die Auflösung zu bestätigen, und starten Sie anschließend wie gewohnt einen Workflow.

---

## Dispatch über pi (Transportlaufzeit) {#dispatching-through-pi-transport-runtime}

[pi](https://github.com/earendil-works/pi) (Earendil) ist eine Multi-Provider-Proxy-Laufzeit und kein Modellanbieter. Sie kann jedes Modell echter Anbieter (Anthropic, OpenAI, Google) unter einer CLI ausführen. oma behandelt pi als **Transport-Overlay**: Ihr `model_preset` und Ihre `agents:`-Überschreibungen bleiben unverändert, während pi für einen Agenten zur ausführenden CLI wird.

Leiten Sie einen beliebigen Agenten mit der Überschreibung `--vendor pi` über pi:

```bash
oma agent spawn backend "Implement the export endpoint" <session> --vendor pi
```

Dabei geschieht Folgendes:

- Das aus Preset oder Überschreibungen aufgelöste Modell des Agenten (z. B. `openai/gpt-5.5`) wird in pis Form `--model <provider/id>` übersetzt; `effort` wird in pis `--thinking`-Stufe übersetzt. **Pro-Subagent-Modelle funktionieren mit pi genau wie nativ:** Verschiedene Agenten können verschiedene Modelle verwenden.
- Die Persona des Agenten (System-Prompt) wird aus `.agents/agents/<id>.md` inline eingefügt, da pi keine Vendor-seitige Agentendatei referenzieren kann.
- Die Authentifizierung stammt aus der pi-Konfiguration (`~/.pi/agent/auth.json` oder ein Provider-API-Key in der Umgebung). `oma doctor` meldet pi-Installation und Auth-Status zusammen mit den anderen CLIs.

**Einschränkung:** pi führt nur Modelle echter Provider aus. CLI-proprietäre Presets (`cursor`, `kiro`, `qwen`, `antigravity`) benennen Modelle, die nur in den jeweiligen CLIs existieren. Die Weiterleitung solcher Presets über pi wird daher mit einem verständlichen Fehler abgelehnt. Verwenden Sie `claude`, `codex` oder `mixed` bzw. `agents.<id>`-Überschreibungen, deren Modelle `anthropic/`-, `openai/`- oder `google/`-Slugs sind, wenn Sie Agenten über pi routen möchten. `gemini` ist ein Alias von `antigravity`, daher lehnt pi es ab.

> Pis Modellkatalog ist releasegebunden und erfordert Authentifizierung. Wenn ein aufgelöster Slug nicht zu dem passt, was Ihre pi-Installation bereitstellt, prüfen Sie `pi --list-models`. Pis `--model`-Abgleich ist unscharf, daher werden die meisten Provider-Slugs unverändert aufgelöst.

### Modelle außerhalb der eingebauten pi-Registry (z. B. Z.ai GLM)

pi löst `--model` gegen seine **eingebaute Modell-Registry** auf. Die Einstellung `defaultProvider` wird nur berücksichtigt, wenn überhaupt kein Modell übergeben wird. Für Z.ai liefert pi nur eine Teilmenge der GLM-IDs (`glm-4.7`, `glm-4.5-air`, `glm-5-turbo`, `glm-5.1`, `glm-5v-turbo`, Stand pi 0.80.x); ein Preset mit einer anderen GLM-ID kann nicht aufgelöst werden.

Dafür gibt es zwei Möglichkeiten:

1. **Registry-IDs:** Beschränken Sie Ihr Preset auf Registry-Modell-IDs. Verwenden Sie die Form `provider/id` (z. B. `zai/glm-4.7`), um den Provider ausdrücklich zu pinnen; oma reicht sie unverändert als `--model` an pi weiter.
2. **Nicht registrierte IDs:** Registrieren Sie sie mit einer pi-Erweiterung. Das Feld `api` muss eine der **API-Adapter-IDs** von pi nennen (`openai-completions`, `anthropic-messages`, …), nicht den Providernamen. Providernamen wie `"zai"` oder Kurzformen wie `"openai"` sind keine Adapter-IDs und führen beim Dispatch zu `No API provider registered for api: …`.

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

Prüfen Sie mit `pi --list-models`, bevor Sie die IDs in ein Preset übernehmen.

---

## Dispatch über OpenCode

[OpenCode](https://opencode.ai) ist wie pi ein Vendor der Erweiterungsklasse: Es besitzt keine eigenen Modelle, sondern ist eine CLI, die Modelle aus ihrem eigenen Katalog ausführt — den kostenlosen `opencode`-Provider, den kostengünstigen Abonnementtarif `opencode-go` und das Gateway `opencode-zen`. oma integriert OpenCode als **In-Process-Plugin-Vendor**: OpenCode lädt `.opencode/plugins/oma/` automatisch, statt Hooks über eine Settings-Datei zu registrieren, und löst die Persona jedes Agenten aus generierten `.opencode/agents/<id>.md`-Dateien auf.

### Expliziter Dispatch

Leiten Sie einen beliebigen Agenten mit der Überschreibung `--vendor opencode` über OpenCode:

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor opencode
```

Dabei wird `opencode run --agent pm --dir <workspace> "<prompt>"` ausgeführt. Der Prompt ist ein **nachgestelltes Positionsargument**; das `-p`-Flag von OpenCode bedeutet `--password`, nicht den Prompt.

### OpenCode-Modelle pro Agent

Um bestimmte Agenten auf ein OpenCode-Modell zu routen, registrieren Sie das Modell unter `models:` und referenzieren es aus `agents:`. Es gelten zwei Anforderungen (siehe [Modell-Slugs inline definieren](#inlining-model-slugs)):

1. **Der Slug muss die Form `owner/model` haben.** Verwenden Sie den OpenCode-`provider/model`-Slug als Registry-Schlüssel; bloße Namen werden vom Schema `agents.<id>.model` abgelehnt.
2. **Die Spezifikation muss vollständig sein:** `cli`, `cli_model`, `auth_hint` und jedes Feld unter `supports`. Eine unvollständige Spezifikation scheitert an der Validierung; OMA protokolliert eine Warnung und fällt auf die Core-Registry zurück, sodass der Agent nicht an OpenCode geroutet würde.

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

Jeder geroutete Agent führt `opencode run -m opencode-go/deepseek-v4-flash --agent <id> --dir <workspace> "<prompt>"` aus. Das passt zu leichten, schnellen Rollen (pm, qa, docs, explore), während schwerere Implementierungsagenten bei Codex, Claude usw. bleiben.

### Modell-Slug validieren

Der Katalog von OpenCode ist an Abonnement und Login gebunden; oma hardcodiert daher **keine** OpenCode-Modell-Slugs. Validieren Sie einen Slug gegen Ihren installierten Katalog:

```bash
oma model probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model probe` meldet `accepted`, wenn der Slug von `opencode models` aufgeführt wird, `rejected`, wenn er nicht aufgeführt wird, und `auth_required`, wenn der Provider Login oder ein Abonnement benötigt.

### Authentifizierung und generierte Dateien

- **Authentifizierung:** `opencode auth login` speichert Zugangsdaten in `~/.local/share/opencode/auth.json`, einen Eintrag pro Provider. `oma auth status` und `oma doctor` melden OpenCode als authentifiziert, sobald *irgendein* Provider Zugangsdaten besitzt. `oma doctor --profile` ist dagegen providerbezogen: Jede Zeile wird gegen das Provider-Präfix ihres registrierten `cli_model` geprüft. Ein Modell mit `cli_model: zai-coding-plan/glm-5.3` wird also gegen die Zugangsdaten von `zai-coding-plan` geprüft. Wenn das Modell kein registriertes `provider/model`-`cli_model` besitzt, meldet die Zeile `? unknown` statt eines eindeutigen Authentifizierungsfehlers.
- **Generierte Dateien:** `oma link` (oder `oma link opencode`) schreibt pro Agent eine `.opencode/agents/<id>.md`-Persona sowie die Bridge `.opencode/plugins/oma/`. Diese Dateien werden aus der `.agents/`-SSOT generiert; bearbeiten Sie sie nicht direkt, sondern führen Sie `oma link` erneut aus.

> **Hinweis zu persistenten Workflows:** Das OpenCode-Ereignis `session.idle` (sein nächstes Gegenstück zum Claude-`Stop`-Hook) dient nur Benachrichtigungen und kann das Ende der Sitzung nicht blockieren. Persistente Workflows (orchestrate / work / ultrawork) laufen unter OpenCode daher mit **eingeschränkter Stop-Semantik**; die Workflow-Verstärkung erfolgt bei der nächsten Nachricht, statt die Sitzung offen zu halten.

---

## Dispatch über die Kimi Code CLI

[Kimi Code CLI](https://www.kimi.com/code) liest **Hooks** nur aus einer globalen Konfiguration (`~/.kimi-code/config.toml`, `KIMI_CODE_HOME`). Daher schreiben `oma install` und `oma link` die Kimi-Hook-Kette und ihre Skill-Symlinks nach ausdrücklicher Zustimmung ins HOME (wie bei Antigravity). Kimi scannt außerdem OMAs SSOT `.agents/skills/` direkt, sodass Skills auch unabhängig davon projektweit aufgelöst werden. **MCP** benötigt keinen Schreibzugriff auf das HOME und ist projektbezogen; es wird modusabhängig nach `<cwd>/.kimi-code/mcp.json` (Projekt) oder `~/.kimi-code/mcp.json` (global) geschrieben.

### Expliziter Dispatch

Leiten Sie einen beliebigen Agenten mit der Überschreibung `--vendor kimi` über Kimi:

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor kimi
```

Dies führt `kimi -p "<prompt>"` aus. Kimi genehmigt im nicht-interaktiven `-p`-Modus reguläre Tool-Aufrufe automatisch über seine Berechtigungsrichtlinie `auto`. Daher hängt oma `--yolo` oder `--auto` **nicht** an; diese Optionen sind mit `-p` gegenseitig unvereinbar.

### Kimi-Modelle pro Agent

Wie bei OpenCode hardcodiert oma **keinen** Kimi-Modellkatalog, weil Kimis Angebot von Provider und Abonnement abhängt. Um bestimmte Agenten an ein Kimi-Modell zu routen, registrieren Sie eine vollständige Spezifikation unter `models:` mit `cli: kimi` und referenzieren sie aus `agents:`:

Der Registry-Schlüssel muss die Form `owner/model` haben; bloße Namen werden vom Schema `agents.<id>.model` abgelehnt. `cli_model` ist der exakte Alias, der an `kimi --model` übergeben wird. Kimis dokumentierter Coding-Alias ist `kimi-code/kimi-for-coding`. Bestätigen Sie vor dem Commit mit `kimi --model <alias>`, welchen Alias Ihr Abonnement bereitstellt.

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

Jeder geroutete Agent führt `kimi --model kimi-code/kimi-for-coding -p "<prompt>"` aus.

> **Hinweis zu persistenten Workflows:** Kimis dokumentierter Stop-blockierender Pfad verwendet Exit-Code 2 und stderr, aber der Router `oma hook run` beendet sich immer mit 0 und gibt einen stdout-Dialekt aus. oma gibt nach bestem Bemühen `permissionDecision: "deny"` (zusätzlich zum Claude-ähnlichen `decision: "block"`) aus, damit persistente Workflows unter Kimi kontrolliert eingeschränkt weiterlaufen.
