---
title: "Leitfaden: Modellkonfiguration pro Agent"
description: Verschiedene CLI-Anbieter, Modelle und Reasoning-Effort-Stufen pro Agent über oma-config.yaml und models.yaml konfigurieren. Behandelt agent_cli_mapping, Runtime-Profile, oma doctor --profile, models.yaml und Session-Quota-Obergrenzen.
---

# Leitfaden: Modellkonfiguration pro Agent

## Übersicht

oh-my-agent unterstützt die **modellbasierte Auswahl pro Agent** über `agent_cli_mapping`. Jeder Agent (pm, backend, frontend, qa, …) kann unabhängig auf einen bestimmten Anbieter, ein bestimmtes Modell und eine bestimmte Reasoning-Effort-Stufe ausgerichtet werden, anstatt einen gemeinsamen globalen Anbieter zu verwenden.

Diese Seite behandelt:

1. Die dreistufige Konfigurationshierarchie
2. Das Dual-Format `agent_cli_mapping`
3. Runtime-Profil-Voreinstellungen
4. Den Befehl `oma doctor --profile`
5. Benutzerdefinierte Modell-Slugs in `models.yaml`
6. Session-Quota-Obergrenzen

---

## Konfigurationsdatei-Hierarchie

oh-my-agent liest die Konfiguration aus drei Dateien, in der Reihenfolge ihrer Priorität (höchste zuerst):

| Datei | Zweck | Bearbeitbar? |
|:-----|:--------|:------|
| `.agents/oma-config.yaml` | Benutzer-Overrides — Agent-zu-CLI-Zuordnung, aktives Profil, Session-Quota | Ja |
| `.agents/config/models.yaml` | Benutzerdefinierte Modell-Slugs (Ergänzungen zur integrierten Registry) | Ja |
| `.agents/config/defaults.yaml` | Integrierte Profile-B-Basis (5 `runtime_profiles`, sichere Fallbacks) | Nein — SSOT |

> `defaults.yaml` ist Teil des SSOT und darf nicht direkt geändert werden. Alle Anpassungen erfolgen in `oma-config.yaml` und `models.yaml`.

---

## Dual-Format `agent_cli_mapping`

`agent_cli_mapping` akzeptiert zwei Wertformate, damit Sie schrittweise migrieren können:

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # Legacy — nur Anbieter (verwendet Standardmodell)
  backend:                            # Neues AgentSpec-Objekt
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low
```

**Legacy-String-Format**: `agent: "vendor"` — bleibt weiterhin funktionstüchtig, verwendet das Standardmodell des Anbieters mit Standard-Effort über das passende Runtime-Profil.

**AgentSpec-Objektformat**: `agent: { model, effort }` — legt einen exakten Modell-Slug und den Reasoning-Effort (`low`, `medium`, `high`) fest.

Kombinieren Sie beide Formate beliebig. Nicht spezifizierte Agents fallen auf das aktive `runtime_profile` zurück, dann auf die `agent_defaults` der obersten Ebene in `defaults.yaml`.

---

## Runtime-Profile

`defaults.yaml` enthält Profile B mit fünf vorgefertigten `runtime_profiles`. Wählen Sie eines in `oma-config.yaml`:

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # siehe Optionen unten
```

| Profil | Alle Agents werden geleitet zu | Verwenden wenn |
|:--------|:--------------------|:---------|
| `claude-only` | Claude Code (Sonnet/Opus) | Einheitlicher Anthropic-Stack |
| `codex-only` | OpenAI Codex (GPT-5.x) | Reiner OpenAI-Stack |
| `gemini-only` | Gemini CLI | Google-basierte Workflows |
| `antigravity` | Gemischt: impl→codex, architecture/qa/pm→claude, retrieval→gemini | Stärken verschiedener Anbieter kombinieren |
| `qwen-only` | Qwen Code | Lokale / selbst gehostete Inferenz |

Profile sind eine schnelle Möglichkeit, die gesamte Agent-Flotte umzugestalten, ohne jede einzelne Agent-Zeile bearbeiten zu müssen.

---

## `oma doctor --profile`

Das Flag `--profile` gibt eine Matrixansicht aus, die für jeden Agent den aufgelösten Anbieter, das Modell und den Effort anzeigt — nach der Zusammenführung von `oma-config.yaml`, `models.yaml` und `defaults.yaml`.

```bash
oma doctor --profile
```

**Beispielausgabe:**

```
oh-my-agent — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4-6           medium   oma-config
backend       openai    gpt-5.3-codex               high     oma-config
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3.1-pro-preview      low      profile:antigravity
architecture  claude    claude-opus-4-7             high     defaults
retrieval     google    gemini-3.1-flash-lite       —        defaults

Session quota cap:
  tokens:       2,000,000
  spawn_count:  40
  per_vendor:   { claude: 1.2M, openai: 600K, google: 200K }
```

Verwenden Sie diesen Befehl immer dann, wenn ein subagent einen unerwarteten Anbieter auswählt — die Spalte `Source` zeigt an, welche Konfigurationsebene den Vorzug erhalten hat.

---

## Slugs in `models.yaml` hinzufügen

`models.yaml` ist optional und ermöglicht es Ihnen, Modell-Slugs zu registrieren, die noch nicht in der integrierten Registry vorhanden sind — nützlich für neu veröffentlichte Modelle.

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

Nach der Registrierung kann der Slug in `agent_cli_mapping` verwendet werden:

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

Slugs sind Bezeichner — behalten Sie sie genau in der vom Anbieter veröffentlichten englischen Form bei.

---

## Session-Quota-Obergrenze

Fügen Sie `session.quota_cap` in `oma-config.yaml` hinzu, um unkontrolliertes Spawning von subagents zu begrenzen:

```yaml
# .agents/oma-config.yaml
session:
  quota_cap:
    tokens: 2_000_000        # Gesamte Session-Token-Obergrenze
    spawn_count: 40          # Maximale parallele + sequenzielle Subagents
    per_vendor:              # Token-Teilobergrenzen pro Anbieter
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Wenn eine Obergrenze erreicht wird, verweigert der orchestrator weitere Spawns und gibt einen `QUOTA_EXCEEDED`-Status zurück. Lassen Sie ein Feld leer (oder lassen Sie `quota_cap` vollständig weg), um diese Dimension zu deaktivieren.

---

## Alles zusammen

Eine praxisnahe `oma-config.yaml`:

```yaml
active_profile: antigravity

agent_cli_mapping:
  pm: "claude"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
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

Führen Sie `oma doctor --profile` aus, um die Auflösung zu bestätigen, und starten Sie anschließend wie gewohnt einen Workflow.


## Konfigurationsdatei-Eigentümerschaft

| Datei | Eigentümer | Sicher bearbeitbar? |
|------|-------|---------------|
| `.agents/config/defaults.yaml` | SSOT, mitgeliefert mit oh-my-agent | Nein — als schreibgeschützt behandeln |
| `.agents/oma-config.yaml` | Sie | Ja — hier anpassen |
| `.agents/config/models.yaml` | Sie | Ja — hier neue Slugs hinzufügen |

`defaults.yaml` enthält ein Feld `version:`, damit neue oh-my-agent-Versionen runtime_profiles, neue Profile-B-Slugs oder Anpassungen an der Effort-Matrix hinzufügen können. Wenn Sie die Datei direkt bearbeiten, erhalten Sie diese Aktualisierungen nicht mehr automatisch.

## Upgrading defaults.yaml

Wenn Sie eine neuere oh-my-agent-Version abrufen, führen Sie `oma install` aus — das Installationsprogramm vergleicht die Version Ihrer lokalen `defaults.yaml` mit der mitgelieferten:

- **Übereinstimmung** → keine Änderung, still.
- **Abweichung** → Warnung:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Abweichung + `--update-defaults`** → die mitgelieferte Version überschreibt Ihre:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

Ihre `oma-config.yaml` und `models.yaml` werden vom Installationsprogramm nie verändert.

## Upgrading from a pre-5.16.0 install

Wenn Ihr Projekt vor der Einführung der Modell/Effort-Funktion pro Agent erstellt wurde:

1. Führen Sie `oma install` (oder `oma update`) aus dem Projektverzeichnis aus. Das Installationsprogramm legt eine neue `defaults.yaml` in `.agents/config/` ab und führt die Migration `003-oma-config` aus, die eine vorhandene `.agents/config/user-preferences.yaml` automatisch nach `.agents/oma-config.yaml` verschiebt.
2. Führen Sie `oma doctor --profile` aus. Ihre vorhandenen `agent_cli_mapping: { backend: "gemini" }`-Werte werden über `runtime_profiles.gemini-only.agent_defaults.backend` aufgelöst, sodass die Matrix automatisch den korrekten Slug und die korrekte CLI anzeigt.
3. (Optional) Aktualisieren Sie Legacy-String-Einträge auf das neue AgentSpec-Format in `oma-config.yaml`, wenn Sie pro Agent `model`, `effort`, `thinking` oder `memory` überschreiben möchten:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. Falls Sie `defaults.yaml` jemals angepasst haben, wird `oma install` vor der Versionsabweichung warnen, anstatt die Datei zu überschreiben. Verschieben Sie Ihre Anpassungen in `oma-config.yaml` / `models.yaml` und führen Sie dann `oma install --update-defaults` aus, um das neue SSOT zu übernehmen.

Es gibt keine Breaking Changes für `agent:spawn` — Legacy-Konfigurationen bleiben durch einen graceful Fallback weiterhin funktionsfähig, während Sie in Ihrem eigenen Tempo migrieren.
