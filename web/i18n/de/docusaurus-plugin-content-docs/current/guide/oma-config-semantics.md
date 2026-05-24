---
title: "Anleitung: Semantik der oma-config.yaml"
description: Schlüsselbezogene Vorrangregeln für oma-config.yaml, wenn sowohl Projekt- als auch globale Installation vorhanden sind. Behandelt auto_update_cli (Projekt schlägt global), serena.mode, telemetry, language, model_preset, translation_voice, timezone sowie welche Dotfiles agy / claude / codex / gemini / qwen jeweils aufnehmen.
---

## Überblick

`oma-config.yaml` kann an zwei Orten liegen:

- **Projekt**: `<cwd>/.agents/oma-config.yaml`
- **Global**: `~/.agents/oma-config.yaml`

Wenn beide Dateien existieren, gewinnt die Projektdatei für jeden Schlüssel. Das ist beabsichtigt: Projektspezifische Anpassungen sind das spezifischere Signal und sollten nicht von einem benutzerweiten Standard überschrieben werden.

## Vorrangtabelle

| Schlüssel | Projekt gewinnt? | Hinweise |
|-----|:---:|-------|
| `auto_update_cli` | Ja | Der Projektwert überschreibt den globalen Wert. Implementiert in `resolveAutoUpdateCli` (`cli/commands/update/update.ts`). |
| `serena.mode` | Ja | Steuert den Transportmodus von Serena MCP (z. B. `stdio`, `sse`). |
| `telemetry` | Ja | Vendor-Telemetrie aktivieren (`true` / `false`). |
| `language` | Ja | Antwortsprache für Agent-Ausgaben (z. B. `en`, `ko`, `ja`). |
| `model_preset` | Ja | Modell-Auswahl-Preset (z. B. `claude`, `mixed`, `codex`). |
| `translation_voice` | Ja | Übersetzungston: `formal`, `balanced`, `interpreter`. |
| `timezone` | Ja | Zeitzonen-Kennung (z. B. `Asia/Seoul`, `America/New_York`). |

„Projekt gewinnt" bedeutet: Ist der Schlüssel in der Projektdatei vorhanden, wird dieser Wert verwendet, unabhängig davon, was die globale Datei vorgibt. Fehlt der Schlüssel in der Projektdatei, wird der Wert aus der globalen Datei genutzt. Fehlt er in beiden, greift der Standardwert.

## Standardwerte

| Schlüssel | Standard | Wann angewendet |
|-----|---------|--------------|
| `auto_update_cli` | `true` | Beide Dateien fehlen oder Schlüssel fehlt |
| `serena.mode` | `stdio` | Beide Dateien fehlen oder Schlüssel fehlt |
| `telemetry` | `false` | Beide Dateien fehlen oder Schlüssel fehlt |
| `language` | `en` | Beide Dateien fehlen oder Schlüssel fehlt |
| `model_preset` | `claude` | Beide Dateien fehlen oder Schlüssel fehlt |
| `translation_voice` | `balanced` | Beide Dateien fehlen oder Schlüssel fehlt |
| `timezone` | Systemzeitzone | Beide Dateien fehlen oder Schlüssel fehlt |

## Begründung der Lesereihenfolge

Die Projektkonfiguration wird zuerst gelesen, weil sie den spezifischeren Kontext darstellt — das Repository, an dem ein Entwickler gerade aktiv arbeitet. Ein Team könnte `language: ko` oder `model_preset: mixed` für sein Projekt festlegen, und diese Entscheidungen sollten nicht stillschweigend von der globalen `oma-config.yaml` einer einzelnen Person überschrieben werden.

Die globale Datei liefert eine benutzerweite Baseline. Schlüssel, die das Projekt nicht setzt, fallen auf den globalen Wert zurück, der wiederum auf den hartcodierten Standard zurückfällt.

## Hinweise

- `language` in `oma-config.yaml` steuert die Antwortsprache des Agenten. Es wird **nicht** verwendet, um Warnmeldungen bei Installation/Update festzulegen — diese nutzen das Systemlocale (`$LANG`), da `oma-config.yaml` zum Installationszeitpunkt noch nicht geladen ist.
- Der Vorrang von `auto_update_cli` ist im Update-Befehl explizit implementiert. Wenn sowohl eine Projekt- als auch eine globale Installation vorhanden sind, wird zuerst die Projekt-`oma-config.yaml` konsultiert.
- Das direkte Bearbeiten von `oma-config.yaml` ist sicher. `oma install` und `oma update` verwenden Feldersetzung auf Regex-Ebene und bewahren benutzerseitig bearbeitete Schlüssel, die sie nicht verwalten (z. B. eigene `agents:`-Überschreibungen, `session.quota_cap`).
