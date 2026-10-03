---
title: Wichtige Standardwerte
description: Die oh-my-agent-Standardwerte für Routing, Modellauswahl, Provider, Updates, Telemetrie, Browser-MCP, Serena-Transport und die Wiederherstellung von Workflows.
---

# Wichtige Standardwerte

Die Standardwerte machen ein neues Projekt sofort nutzbar und bewahren zugleich die Konfiguration, die Ihnen gehört. Sie werden zur Laufzeit aufgelöst. Ein ausgelassener Schlüssel kann sich deshalb anders verhalten als ein ausdrücklich leerer Wert. Beginnen Sie hier, wenn das Harness funktioniert, sich aber anders verhält als erwartet.

## Standardwerte für den ersten Lauf

| Bereich | Standardwert | Auswirkung | Überschreibung |
|---|---|---|---|
| Antwortsprache | `en` | Agenten- und Workflow-Antworten sind Englisch, sofern die Projektkonfiguration keine andere unterstützte Sprache auswählt. Eine ausdrückliche Sprachvorgabe des Benutzers oder der Sitzung kann den Projektstandard weiterhin überschreiben, wenn Host oder Workflow dies unterstützt. | `language` in `.agents/oma-config.yaml` oder `.cue` |
| Modell-Routing | `auto` | Die native Agentenkonfiguration der aktuellen Laufzeit wird verwendet. Unbekannte Laufzeiten greifen auf `default_cli` zurück, sofern dieser gesetzt ist. | `model_preset`, `default_cli` oder `agents.<id>` |
| Code-Intelligenz | `serena` | Eine neue Installation versucht, Serena zu installieren und dessen MCP-Konfiguration zu verknüpfen. | `providers.code_intelligence: gortex` oder `serena` |
| Code-Such-Guard | `block` | Solange ein Code-Intelligenz-Provider konfiguriert ist, blockiert ein PreToolUse-Hook die nativen Tools `Grep`/`Glob` sowie rekursive Shell-Suchen (`rg`, `grep -r`, `find -name`) und verweist den Agenten auf die Tools des Providers. Suchen, die auf bestätigte Ausschlüsse oder Pfade außerhalb des Projekts beschränkt sind, sind erlaubt. Der Hook weist nicht auf einen Bypass für Projektquellcode hin. | `providers.code_intelligence_guard: off` |
| Semantischer Speicher | `agentmemory` | Wenn verfügbar, wird Agent Memory für den semantischen Speicher ausgewählt. | `providers.semantic_memory: honcho` oder `none` |
| Websuche | `native` | Die Suche verwendet den nativen Web-Kanal der Laufzeit, sofern kein Provider ausgewählt ist. | `providers.web` |
| Dokumentations-Provider | `context7` | Für von einem Skill angeforderte Dokumentationsabfragen wird der Context7-Provider verwendet. | `providers.docs` |
| Telemetrie | deaktiviert | OMA schreibt beim Verknüpfen Opt-out-Einstellungen für die Anbieter. | `telemetry: true` |
| Automatische CLI-Updates | aktiviert | Die CLI prüft auf Updates, sofern dies nicht deaktiviert wurde. | `auto_update_cli: false` |
| Datumsformat | `ISO` | Ohne projektspezifisches Format werden Datumsangaben im ISO-Stil ausgegeben. | `date_format: US` oder `EU` |
| Zeitzone | Systemzeitzone | Geplante und gemeldete Zeiten folgen dem Host, wenn `timezone` fehlt. | `timezone: Australia/Sydney` (oder ein anderer IANA-Name) |
| Serena-Transport | `bridge` | Sitzungen teilen sich einen Serena-Server pro Projekt; ist die Bridge nicht verfügbar, fällt OMA auf eine sitzungslokale stdio-Verbindung zurück. | `serena.mode: stdio` |
| Serena-Auto-Update | aktiviert | `oma update` aktualisiert das lokale Serena-Tool, wenn möglich. | `serena.auto_update: false` |
| Browser-DevTools-MCP | nicht gesetzt | Vorhandene Browser-Einträge bleiben erhalten; eine neue interaktive Installation bietet `aside` an. | `mcp.devtools_browsers: [aside]`, `[chrome]`, `[firefox]` oder `[]` |
| Serena Reaper | geplanter Pfad deaktiviert | `serena_reaper.enabled: false` hält die regelmäßige Bereinigung inaktiv. Das interaktive `oma serena reap` läuft weiterhin. | `serena_reaper.enabled: true` plus `oma serena reaper enable` |

Die Namen und Standardwerte der Provider stammen aus den Laufzeit-Loadern und den Installationsdialogen. Die vom Installer erzeugte Konfigurationsdatei enthält Kommentare zu den verfügbaren Abschnitten. Verwenden Sie diese Kommentare als versionsabhängigen Schema-Leitfaden.

## Vorrang der Konfiguration

OMA sucht vom aktuellen Arbeitsverzeichnis aus aufwärts nach dem nächsten `.agents/`-Verzeichnis. Wenn vorhanden, liest es `oma-config.cue` und verwendet `oma-config.yaml`, falls die gemeinsame CUE-Auswertung fehlschlägt. Ein projektlokales Overlay (`oma-config.local.cue` oder `oma-config.local.yaml`) wird darüber zusammengeführt; behalten Sie nur eines dieser lokalen Overlays. `OMA_MODEL_PRESET` kann `model_preset` für einen Prozess überschreiben. Eine ungültige lokale Konfiguration beendet das Laden, statt stillschweigend einen anderen Wert auszuwählen.

Vor der festen Preset-Reihenfolge gelten zwei Sonderfälle für das Modell-Routing:

- Bei `model_preset: auto` wird die native Agenten-/Modellkonfiguration der aktuellen Laufzeit verwendet. Explizite Überschreibungen unter `agents.<id>` haben weiterhin Vorrang; eine unbekannte Laufzeit kann `default_cli` verwenden.
- Bei `model_preset: free` verwenden untergeordnete Spawns das lokale FreeLLMAPI-Gateway. `free.model` wählt das Gateway-Modell und ersetzt agentenspezifische Modell-Pins; fehlt der Wert, wird `FREELLM_MODEL` oder das Provider-Fallback `auto` verwendet.

Für ein festes oder benutzerdefiniertes Preset gilt folgende effektive Reihenfolge:

1. Explizite Überschreibung unter `agents.<id>`.
2. Der passende Eintrag von `model_preset`, als integriertes Preset oder unter `custom_presets`.
3. Der Eintrag `orchestrator` des Presets, wenn für eine Rolle kein eigener Eintrag vorhanden ist.
4. `default_cli` als Vendor-Fallback, wenn die vorherigen Ebenen keinen Plan auflösen.

Das `free`-Preset liefert Standardwerte für alle drei Provider-Einstellungen: `base_url` ist `http://127.0.0.1:31415/v1`, `api_key_env` ist `FREELLM_API_KEY` (der Kompatibilitätsalias `FREELLMAPI_API_KEY` wird ebenfalls akzeptiert) und `model` ist `auto`. Die ausgewählte Umgebungsvariable muss trotzdem einen gültigen API-Schlüssel enthalten; es gibt keinen Vendor-Fallback. Setzen Sie diese Werte in `oma-config.local.yaml`, wenn sie auf dem Rechner bleiben sollen, oder verwenden Sie `FREELLM_BASE_URL` und `FREELLM_MODEL` für prozessweite Überschreibungen.

## Standardwerte mit überraschenden Folgen

Ein fehlender Schlüssel `mcp.devtools_browsers` bedeutet „aktuelle Browser-Einträge unverändert lassen“. Eine ausdrücklich leere Liste entfernt Browser-Einträge während des Abgleichs. Browser-MCP-Prozesse laufen pro Agentensitzung. Aktivieren Sie sie daher nur für Aufgaben, die einen Browser steuern.

Der standardmäßige Serena-`bridge`-Modus verringert doppelte Sprachserver-Prozesse, wenn mehrere Agenten in einem Projekt arbeiten. `stdio` ist der Wiederherstellungsweg, wenn eine lokale Bridge nicht starten kann oder eine strikte Prozessisolierung nötig ist. Serena repariert seine untergeordneten Sprachserver-Prozesse beim nächsten Tool-Aufruf selbst; der Memory-Reaper ist davon getrennt und muss für den normalen Betrieb nicht aktiviert werden.

Die standardmäßige Telemetrie ist Opt-out. `telemetry: true` entfernt OMA-Opt-out-Einträge für Anbieter beim nächsten Link- oder Update-Vorgang. Dadurch können Anbieterfunktionen, die Telemetrie voraussetzen, wieder aktiviert werden. Diese Einstellung steuert Änderungen an der Anbieterintegration; sie ändert nicht die Sitzungs-Kostendateien, die OMA für die eigene Abrechnung schreibt.

## Wiederherstellungswege

| Symptom | Zuerst prüfen | Wiederherstellung |
|---|---|---|
| Vendor-Dateien sind veraltet | `oma doctor` und `oma link --dry-run` | Führen Sie nach Änderungen unter `.agents/` `oma link <vendor>` aus und verwenden Sie die SSOT als Quelle. |
| Ein Modell wird nicht akzeptiert | `oma doctor --profile` | Wechseln Sie zu `auto`, verwenden Sie ein integriertes Preset oder definieren Sie einen Modell-Slug unter `models:`. |
| Serena-Tools laufen in ein Timeout | `oma doctor` und der Provider-Abschnitt | Versuchen Sie `serena.mode: stdio`; bei Speicherdruck prüfen Sie zuerst mit `oma serena reap --dry-run`. |
| Ein dauerhafter Workflow lässt sich nicht stoppen | `.agents/state/*-state.json` | Sagen Sie `workflow done`; prüfen Sie die Zustandsdatei nur, wenn der Workflow nicht aufgeräumt hat. |
| Ein geplanter Reaper tut nichts | Abschnitt Serena Reaper in `oma doctor` | Setzen Sie `serena_reaper.enabled: true` und führen Sie danach `oma serena reaper enable` aus. |
| Lokale Konfiguration verhindert den Start | Fehlerpfad von `oma doctor` | Korrigieren oder entfernen Sie das lokale Overlay; erstellen Sie nicht gleichzeitig `.cue`- und `.yaml`-Overlays. |

Fahren Sie mit [Installation](./installation.md), [Modelle pro Agent](../guide/per-agent-models.md) oder [OMA-Konfigurationssemantik](../guide/oma-config-semantics.md) fort.
