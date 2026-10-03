---
title: "Anleitung: Semantik von oma-config.yaml"
sidebar_label: Konfigurationsladung
description: Erfahren Sie, wie OMA CUE- und YAML-Konfigurationsebenen auswählt, lokale Overlays anwendet und die wenigen Fallbacks des Installationskontexts auflöst. Die Konfigurationsreferenz enthält unterstützte Schlüssel und Standardwerte.
---

## Überblick

Die Konfiguration wird aus dem nächsten `.agents/`-Verzeichnis ausgewählt, das beim Aufwärtslaufen vom aktuellen Arbeitsverzeichnis gefunden wird:

- **Gemeinsam:** `.agents/oma-config.cue` oder `.agents/oma-config.yaml`, wenn CUE fehlt oder nicht ausgewertet werden kann.
- **Lokal:** `.agents/oma-config.local.cue` oder `.agents/oma-config.local.yaml` (eine Datei als Overlay über der gemeinsamen Datei; halten Sie diese Datei privat).

Bei normalen Laufzeitabfragen führt OMA eine Projektdatei nicht mit `~/.agents/oma-config.*` zusammen. Eine globale Installation liest die Datei im HOME, weil ihr Installationsstamm das HOME ist; ein Projektbefehl liest die nächste Projektebene. `auto_update_cli` ist die bewusste Ausnahme: Die Update-Prüfung liest zuerst die Projektkonfiguration, dann die HOME-Konfiguration und verwendet anschließend standardmäßig `true`. Die vollständige Modellbeschreibung finden Sie in der [Konfigurationsreferenz](/docs/guide/configuration-reference).

## Vorrangtabelle

| Schlüssel | Wirksame Regel | Hinweise |
|-----|:---:|-------|
| `OMA_MODEL_PRESET` | Höchste | Ein nichtleerer Umgebungswert ersetzt `model_preset` für diesen Prozess. |
| Lokale Datei | Overlay über gemeinsam | Normale Maps werden rekursiv zusammengeführt; Arrays, Skalare und `null` ersetzen den gemeinsamen Wert. Beide lokalen Dateiformate dürfen nicht gleichzeitig vorhanden sein. |
| Gemeinsames CUE | Bevorzugt | Wenn CUE fehlt oder fehlschlägt, versucht der Loader die gemeinsame YAML-Datei. Ein Fehler in lokalem CUE ist fatal. |
| Gemeinsames YAML | Fallback | Wird verwendet, wenn keine nutzbare gemeinsame CUE-Datei ausgewählt wird. |
| `auto_update_cli` | Projekt, dann HOME, dann `true` | Dieser Fallback gilt nur für Updates und ist in `resolveAutoUpdateCli` implementiert; er ist keine allgemeine globale Ebene. |

Für eine lokale Projektüberschreibung tragen Sie nur die geänderten Blätter in die lokale Datei ein. So kann beispielsweise eine lokale Modellauswahl aus der gemeinsamen Datei herausgehalten werden:

```yaml
# .agents/oma-config.local.yaml
model_preset: claude
agents:
  backend:
    model: anthropic/claude-sonnet-4-6
```

Führen Sie den Befehl aus dem Projekt aus, damit das nächste `.agents/`-Verzeichnis ausgewählt wird. Eine fehlerhafte lokale Datei führt zu einem deutlichen Fehler; korrigieren oder entfernen Sie sie vor dem nächsten Versuch.

## Standardwerte

| Schlüssel | Standardwert | Wann angewendet |
|-----|---------|--------------|
| `auto_update_cli` | `true` | Beide Dateien fehlen oder der Schlüssel fehlt |
| `serena.mode` | `bridge` | Beide Dateien fehlen oder der Schlüssel fehlt |
| `serena.auto_update` | `true` | Beide Dateien fehlen oder der Schlüssel fehlt |
| `telemetry` | `false` | Beide Dateien fehlen oder der Schlüssel fehlt |
| `language` | `en` | Beide Dateien fehlen oder der Schlüssel fehlt |
| `model_preset` | Erforderlich | Die ausgelieferte Projektvorlage verwendet `auto`; das Schema verlangt einen nichtleeren Wert. |
| `translation_voice` | `balanced` | Beide Dateien fehlen oder der Schlüssel fehlt |
| `timezone` | Systemzeitzone | Beide Dateien fehlen oder der Schlüssel fehlt |

## Begründung der Lesereihenfolge

Die Regel mit der nächsten Ebene hält die Konfiguration eines Projekts in sich geschlossen. Wenn Sie eine benutzerweite Baseline möchten, installieren Sie global und bearbeiten `~/.agents/oma-config.yaml`; Projektinstallationen können weiterhin ihre eigene nächste Ebene definieren.

## Hinweise

- `language` in `oma-config.yaml` steuert die Antwortsprache des Agenten. Es wird **nicht** verwendet, um Warnmeldungen bei Installation und Update festzulegen — diese verwenden das Systemlocale (`$LANG`), da `oma-config.yaml` zum Installationszeitpunkt noch nicht geladen ist.
- Der Vorrang von `auto_update_cli` ist im Update-Befehl ausdrücklich implementiert. Wenn eine Projekt- und eine globale Installation vorhanden sind, wird zuerst der Projektwert und danach der HOME-Wert berücksichtigt.
- `telemetry` (Standard `false`) wird über `oma install`, `oma update` oder `oma link` auf die jeweilige Deaktivierungsoption des Vendors abgebildet: Claude `DISABLE_TELEMETRY` und `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`, Gemini/Qwen `privacy.usageStatisticsEnabled`, Codex `analytics.enabled` und `feedback.enabled`, Grok `[features] telemetry` sowie Antigravity (agy) `enableTelemetry` in `~/.gemini/antigravity-cli/settings.json`. Mit `telemetry: true` aktivieren Sie die Telemetrie wieder, indem OMAs Deaktivierung für diesen Vendor entfernt wird.
- `diagram` (`engine: auto` / `archify` / `mermaid`, `explain_sidecar`, `archify.managed|channel|check_interval_min|path|quality|open`) ist wie `video` und `image` ein sparsamer Skill-Override-Abschnitt; siehe [Diagramm-Engine](/docs/guide/diagram-engine).
- `video.hyperframes.check_interval_min` begrenzt die Prüfungen auf die neueste Version der HyperFrames-Toolchain und von heygen-com/hyperframes pro Ausführung (`oma video compose`, `oma update`).
- `market` (`managed|channel|check_interval_min|path|python|save_dir`) konfiguriert die immer aktuelle `last30days`-Engine hinter `oma market`; siehe [Marktforschung](/docs/guide/market-research).
- Das typisierte Laufzeitschema umfasst `providers`, `free`, `agents`, `models`, `custom_presets`, `vendors`, `session`, `docs` und die sparsamen Skill-Abschnitte. Ausgelieferte Vorlagen enthalten außerdem verbrauchereigene Blöcke wie `scm`, `memory`, `serena_reaper` und `mcp`; deren Verbraucher besitzen die jeweiligen Unterschlüssel. Leiten Sie aus dieser Liste keinen Schlüssel ab, sondern verwenden Sie die [Konfigurationsreferenz](/docs/guide/configuration-reference) und den Leitfaden des jeweiligen Features.
- Das direkte Bearbeiten von `oma-config.yaml` ist sicher. `oma install` und `oma update` ersetzen Felder auf Regex-Ebene und bewahren benutzerseitig bearbeitete Schlüssel, die sie nicht verwalten (z. B. eigene `agents:`-Überschreibungen oder `session.quota_cap`).
- `oma update` hängt zusätzlich Top-Level-Schlüssel an, die die ausgelieferte Vorlage definiert, die Ihre Datei aber nicht enthält (mit Vorlagenstandards unter einem Marker `# Added by oma update`). Bereits vorhandene Schlüssel werden nie geändert; ihr Inhalt bleibt byte-identisch. Absichtlich gelöschte Schlüssel erscheinen mit dem Vorlagenstandard erneut. Setzen Sie den Wert ausdrücklich, wenn Sie den Schlüssel deaktivieren möchten.
