---
title: "Anleitung: Fehlerbehebung"
sidebar_label: Fehlerbehebung
description: Fehler bei Installation, Konfiguration, Vendor, Dashboard, Zeitplänen, Evaluierung und Agentenergebnissen mit quellenbasierten Prüfungen diagnostizieren.
---

# Fehlerbehebung

Beginnen Sie im Projekt- oder Installations-Root mit einer maschinenlesbaren Diagnose:

```bash
oma doctor --json
```

Der Befehl sollte mit JSON enden, das Befunde zu Installation, Vendor, Konfiguration und Integration ausweist. Fügen Sie `--profile` hinzu, wenn das Problem die Auflösung von Modell oder Agent betrifft. Bewahren Sie das JSON beim Melden eines Problems auf; es enthält die ausgewählten Pfade und Prüfungen, sodass keine Vermutung in Prosa nötig ist.

## Die CLI oder Installation verwendet die falschen Dateien

Prüfen Sie den Kontext ausdrücklich:

```bash
oma doctor --json
oma doctor --profile
```

Projektbefehle lesen das nächstgelegene `.agents/oma-config.cue` oder `.agents/oma-config.yaml` und danach ein lokales Overlay. Ein globaler Befehl liest das HOME-Installations-Root. Wenn sowohl eine lokale CUE- als auch eine lokale YAML-Datei vorhanden ist, entfernen Sie eine davon. Ist eine lokale Datei fehlerhaft, beendet OMA den Vorgang, statt das Overlay still zu ignorieren. Siehe [Konfigurationsreferenz](/docs/guide/configuration-reference).

Prüfen Sie nach einem Update Konfiguration und erzeugte Pfade:

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` läuft nicht interaktiv. Wenn eine Benutzerkonfiguration unerwartet ersetzt wurde, prüfen Sie, ob `--force` verwendet wurde. Normale Updates bewahren die benutzereigene Konfiguration, der erzwungene Modus kann sie ersetzen.

## Eine Installation oder ein Update kann das Release nicht herunterladen

<!-- oma-docs:ignore-start -->
`oma install`, `oma update` und die Reparatur von `oma doctor` laden das Release herunter, das `prompt-manifest.json` auf `main` nennt. Sie versuchen zuerst das Asset `agent-skills.tar.gz` des GitHub-Releases `cli-v<version>`, geprüft gegen die zugehörige `.sha256`-Datei, danach das Quellarchiv dieses Tags und schließlich einen flachen Klon des Tags. Eine Prüfsummenabweichung oder eine Payload, deren `.agents/skills/_version.json` eine andere Version nennt, beendet den Lauf, statt eine andere Quelle zu versuchen.
<!-- oma-docs:ignore-end -->

Unmittelbar nach dem Erstellen eines Releases kann das Manifest eine Version nennen, deren Assets noch veröffentlicht werden; warten Sie einige Minuten und versuchen Sie es erneut. Um unveröffentlichte Inhalte vom Branch `main` bewusst zu installieren, aktivieren Sie dies ausdrücklich für diesen Lauf:

```bash
OMA_UPDATE_CHANNEL=main oma update
```

Der Lauf gibt eine Warnung aus: Inhalte des main-Branches sind weder ein getaggtes Release noch per Prüfsumme verifiziert.

## Ein Vendor startet nicht

Führen Sie zuerst die eigene Authentifizierungsprüfung des Vendors aus und prüfen Sie anschließend OMAs aufgelöstes Profil:

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

Verwenden Sie zur erneuten Authentifizierung den exakten Vendor-Befehl, den `oma doctor` auflistet. Eine Modellüberschreibung muss das vom Schema akzeptierte Format `owner/model` verwenden, und der Vendor muss den ausgewählten CLI-Transport unterstützen. Bei `model_preset: free` prüfen Sie Gateway-URL und Modell mit `oma doctor --profile` und stellen Sie danach sicher, dass die konfigurierte API-Key-Umgebungsvariable einen Schlüssel enthält. Wenn Sie die `free`-Map auslassen, sind die Standardwerte `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY` und das Modell `auto`; legen Sie den API-Schlüssel niemals selbst in YAML ab.

Wenn ein Kind ohne Ergebnisartefakt beendet wird, prüfen Sie Laufverzeichnis und Status des übergeordneten Prozesses. Ein gestartetes Kind erhält die Laufidentität und die Anweisungen für die Ergebnisdeklaration, schreibt die Ergebnisdeklaration (Claim) an den injizierten Pfad und meldet seine Artefakte; der übergeordnete Prozess finalisiert den verwalteten Ausführungsbeleg (Receipt), nachdem er den Exit-Code erfasst hat. Schreibgeschützte Kinder geben `OMA_RESULT_JSON: ...` zurück; diese Zeile wird als Inspektion aufgezeichnet und erfüllt keine ausführbare Verifizierung.

## Hooks sind installiert, laufen aber nicht

Prüfen Sie bei Codex die erzeugte Datei und folgen Sie dem einmaligen Vertrauensablauf:

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

Führen Sie `/hooks` nach der ersten Installation und nach einem Update aus, das eine Befehlszeichenfolge ändert. Von OMA gestartete Codex-Subprozesse übergeben für ihren eigenen verwalteten Aufruf das Bypass-Flag; dadurch wird ein Hook in einer Codex-Sitzung, die Sie selbst starten, nicht vertrauenswürdig. Siehe [Codex-Hook-Vertrauen](/docs/guide/codex-hook-trust).

## Das Dashboard ist leer oder getrennt

Starten Sie das Terminal-Dashboard aus dem Projekt, das die Sitzungsdateien enthält:

```bash
oma dashboard terminal
```

Standardmäßig liest es `.agents/state/memories/`. Setzen Sie `MEMORIES_DIR`, wenn der Zustand an einem anderen Ort liegt. Das Web-Dashboard bindet an Loopback und gibt eine URL mit Token aus:

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

Öffnen Sie die vom Befehl ausgegebene exakte URL; Web-API und WebSocket benötigen das Dashboard-Token. Wenn der Port belegt ist, verwenden Sie einen anderen `DASHBOARD_PORT`. Wenn keine Agenten erscheinen, prüfen Sie, ob der Workflow Sitzungs-, Aufgaben- und Fortschrittsdateien in das ausgewählte Speicherverzeichnis geschrieben hat. Das Dashboard durchsucht das alte Verzeichnis `.serena/memories/` nicht automatisch.

## Ein Zeitplan fehlt oder ist nicht gelaufen

Prüfen Sie Manifest und Scheduler-Zustand:

```bash
oma schedule list
oma schedule sync
oma schedule run SCHEDULE_ID
```

`schedule list` meldet `synced`, `stale`, `missing-in-os` und `orphan-in-os`. `schedule sync` stellt fehlende Jobs wieder her und schreibt veraltete Registrierungen neu (eine Zeile `Unknown command: schedule:run` im Laufprotokoll bedeutet, dass die Registrierung vor der Befehlsumbenennung entstand; `oma update` synchronisiert sie automatisch neu); fügen Sie `--prune` nur hinzu, wenn verwaiste OS-Jobs entfernt werden sollen. Eine mit `--dry-run` erzeugte Vorschau registriert keinen Job. Bei einem wiederkehrenden Intervall akzeptieren Sie nach Prüfung der Vorschau OMAs Rundung mit `--accept-rounded`. Prüfen Sie im Laufprotokoll unter `~/.agents/schedule/runs/<id>/` auf einen Vendor-Exit ungleich null oder `re-auth required`.

## Evaluierung oder Optimierung meldet keine Abdeckung

Skill-Evaluierung und Skill-Optimierung benötigen beide mindestens fünf Fixtures unter `.agents/eval/<skill>/`. Im Mock-Modus muss die aufgezeichnete Herkunft des Rollouts mit den aktuellen Skill- und Fixture-Hashes übereinstimmen. Zeichnen Sie im Live-Modus neu auf, wenn Fixture oder Skill geändert wurden; kopieren Sie keine alte `_rollouts`-Datei in ein neues Skill-Verzeichnis und behandeln Sie sie nicht als aktuelle Evidenz.

Halten Sie bei der Optimierung während der Prüfung des vorgeschlagenen Diffs den Standardwert `--dry-run` bei. `--apply` erfordert ein strikt positives Validierungsergebnis und einen bestandenen, vom Runner verwalteten Test-Split. Ein OMA-eigener Skill kann durch ein späteres `oma update` überschrieben werden.

## Ein Ergebnis kann nicht abgeschlossen oder fortgesetzt werden

Prüfen Sie Lauf- und Plandateien:

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

Führen Sie vor dem Beenden `oma agent verify RUN_ID --required` aus. Eine abgeschlossene Ergebnisdeklaration (Claim) mit fehlgeschlagenem Ausführungsbeleg (Receipt), geänderten Eingaben, fehlenden Artefakten, offenen Punkten oder geändertem Aufgabenvertrag wird abgelehnt oder herabgestuft. Das Fortsetzen erfolgt automatisch nur für Aufgaben mit `retry_policy: "safe"`, wiederholbarem Prompt und verbleibenden Versuchen. Ein laufender Prozess oder ein unterbrochener nativer Versuch ohne ein eindeutiges Ergebnis mit dem Status partial oder failed bleibt liegen, um doppelte Arbeit zu vermeiden. Siehe [Agentenergebnisse und Fortsetzen](/docs/guide/agent-results-and-resume).

Wenn Sie Hilfe anfordern, fügen Sie die relevante Ausgabe von `oma doctor --json`, den Befehl, die Session-/Run-ID und die offene Meldung ein. Fügen Sie keine Zugangsdaten oder Inhalte geheimnisführender Dateien ein.
