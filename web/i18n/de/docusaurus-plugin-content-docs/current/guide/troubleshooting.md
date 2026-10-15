---
title: "Anleitung: Fehlerbehebung"
sidebar_label: Fehlerbehebung
description: Fehler bei Installation, Konfiguration, Vendor, Hooks, Dashboard, Zeitplänen, Evaluierung und Agentenergebnissen nach Symptom oder exakter Fehlermeldung diagnostizieren, mit quellenbasierten Prüfungen und Korrekturen.
---

# Fehlerbehebung

Beginnen Sie im Projekt- oder Installations-Root mit einer maschinenlesbaren Diagnose:

```bash
oma doctor --json
```

Der Befehl sollte mit JSON enden, das Befunde zu Installation, Vendor, Konfiguration und Integration ausweist. Fügen Sie `--profile` hinzu, wenn das Problem die Auflösung von Modell oder Agent betrifft. Bewahren Sie das JSON beim Melden eines Problems auf; es enthält die ausgewählten Pfade und Prüfungen, sodass keine Vermutung in Prosa nötig ist.

## Symptom finden {#find-your-symptom}

| Symptom | Weiter zu |
|---------|-------|
| OMA liest die falsche Konfiguration, oder ein Update hat Ihre Einstellungen ersetzt | [Die CLI oder Installation verwendet die falschen Dateien](#the-cli-or-install-is-using-the-wrong-files) |
| `oma install` oder `oma update` kann kein Release herunterladen | [Eine Installation oder ein Update kann das Release nicht herunterladen](#an-install-or-update-cannot-download-the-release) |
| Eine Vendor-CLI oder ein Modell startet nicht | [Ein Vendor startet nicht](#a-vendor-does-not-start) |
| Hooks sind installiert, aber nichts passiert | [Hooks sind installiert, laufen aber nicht](#hooks-are-installed-but-do-not-run) |
| Das Dashboard ist leer, getrennt oder startet nicht | [Das Dashboard ist leer oder getrennt](#the-dashboard-is-empty-or-disconnected) |
| Ein geplanter Job fehlt oder ist fehlgeschlagen | [Ein Zeitplan fehlt oder ist nicht gelaufen](#a-schedule-is-missing-or-did-not-run) |
| Skill-Evaluierung oder -Optimierung meldet keine Abdeckung | [Evaluierung oder Optimierung meldet keine Abdeckung](#evaluation-or-optimization-reports-no-coverage) |
| Ein Agentenlauf lässt sich nicht verifizieren, abschließen oder fortsetzen | [Ein Ergebnis kann nicht abgeschlossen oder fortgesetzt werden](#a-result-cannot-finish-or-resume) |
| Die CLI hat eine Fehlermeldung ausgegeben | [Fehlermeldung finden](#find-your-error) |

## Fehlermeldung finden {#find-your-error}

Jede der folgenden Meldungen wird von der CLI ausgegeben. Gleichen Sie den Anfang der Meldung ab.

| Meldung | Ursache | Korrektur |
|---------|-------|-----|
| `Unknown plan task: <id>` | Die Aufgaben-ID (aus `--task-id`, standardmäßig die Agenten-ID) ist keine Aufgaben-`id` in `.agents/results/plan-<session>.json` | Übergeben Sie `--task-id` mit einer Aufgaben-ID aus dem Plan |
| `Plan is immutable after dispatch; ...` | Der Sitzungsplan wurde nach seinem ersten Dispatch geändert | Stellen Sie den Plan wieder her, oder speichern Sie den geänderten Plan unter einer neuen Sitzungs-ID (und einer neuen `lineage_id`, falls Sie eine gesetzt haben) |
| `Task acceptance contract changed before dispatch` oder `Plan changed before dispatch` | Der Plan wurde bearbeitet, während ein Lauf startete | Versuchen Sie es erneut, sobald der Plan stabil ist |
| `Attempt limit reached for workflow lineage and logical goal` | `max_attempts` des Plans (Standard 3, einschließlich des ersten Versuchs) ist aufgebraucht | Prüfen Sie die fehlgeschlagenen Versuche, bevor Sie einen weiteren planen |
| `Cannot verify a finished run; start a new run` | `oma agent verify` lief, nachdem der Lauf beendet war | Starten Sie einen neuen Lauf mit `oma agent begin` |
| `Choose a command, --required, or --affected` | `oma agent verify` hat keinen oder mehr als einen Verifizierungsmodus erhalten | Verwenden Sie genau einen von `--required`, `--affected PATH...` oder `-- <argv>` |
| `No complete test selection for affected paths: ...` | Der Graph hat für diese Pfade keine vollständige Testauswahl | Verwenden Sie `--required` |
| `The spawning parent finalizes managed runs; write the claim file instead` | `oma agent finish` wurde für einen Lauf aufgerufen, der mit `oma agent spawn` oder `parallel` gestartet wurde | Schreiben Sie die Ergebnisdeklaration (Claim) an den injizierten Pfad; der übergeordnete Prozess finalisiert den Lauf |
| `Resume requires a session plan with task contracts` | Die Sitzung hat keine Plandatei | Fortsetzen funktioniert nur für planbasierte Sitzungen; starten Sie die Aufgabe stattdessen erneut |
| `A resume coordinator already owns this session` | Ein anderes `oma agent resume` für die Sitzung läuft, oder dessen Lease stammt von einem anderen Host | Warten Sie, bis das andere Fortsetzen beendet ist; ein Lease, das ein beendeter Prozess auf demselben Host hinterlassen hat, wird automatisch zurückgewonnen |
| `No graph-backed context found for <agent>` | Für diesen Agenten existiert kein Graph-Kontext | Korrigieren Sie die Aufgabendefinition, oder fahren Sie mit dem dokumentierten nativen Suchpfad des Projekts fort |
| `Dashboard failed: port 9847 is already in use. ...` | Ein anderer Prozess belegt den Dashboard-Port | `DASHBOARD_PORT=8080 oma dashboard web`, oder beenden Sie den anderen Prozess |
| `Invalid DASHBOARD_PORT: ...` | `DASHBOARD_PORT` ist keine Ganzzahl von 1 bis 65535 | Setzen Sie einen gültigen Port, oder entfernen Sie die Variable, um 9847 zu verwenden |
| `Removed option <old>. Use <new>.` | Der Befehl verwendete eine entfernte Flag-Schreibweise | Verwenden Sie das in der Meldung genannte Flag |
| `Unknown command: ... Use oma --help.` | Der Befehlspfad wurde entfernt oder umbenannt | Führen Sie `oma --help` oder `oma describe` aus, um die aktuellen Pfade zu sehen |
| `oma agent spawn` endet mit Exit-Code 3 | Der Vendor wurde mit 0 beendet, aber der Lauf endete nicht mit `completed` | Lesen Sie `unresolved` im Laufdatensatz; siehe [Agentenergebnisse und Fortsetzen](./agent-results-and-resume.md) |

## Die CLI oder Installation verwendet die falschen Dateien {#the-cli-or-install-is-using-the-wrong-files}

Prüfen Sie den Kontext ausdrücklich:

```bash
oma doctor --json
oma doctor --profile
```

| Symptom | Ursache | Korrektur |
|---------|-------|-----|
| Eine Einstellung wird ignoriert, oder ein globaler Standardwert gewinnt | Befehle lesen globale Standardwerte aus `$OMA_HOME/.agents/` (Standard `~/.oma/.agents/`), danach die nächstgelegene gemeinsame Projektkonfiguration und ein lokales Overlay. Verschiedene übergeordnete Projekt-Roots werden nicht zusammengeführt | Prüfen Sie, welche Konfigurationspfade `oma doctor --json` ausgewählt hat, und bearbeiten Sie die Datei, die tatsächlich gelesen wird |
| OMA bricht beim Laden der Konfiguration ab | Sowohl eine lokale CUE- als auch eine lokale YAML-Datei ist vorhanden, oder eine lokale Datei ist fehlerhaft. OMA bricht ab, statt die Überschreibung still zu ignorieren | Entfernen Sie eine der beiden lokalen Dateien, oder korrigieren Sie die fehlerhafte |
| Die Benutzerkonfiguration wurde nach einem Update ersetzt | Das Update lief mit `--force`. Normale Updates bewahren die benutzereigene Konfiguration, der erzwungene Modus kann sie ersetzen | Aktualisieren Sie ohne `--force` und prüfen Sie danach Konfiguration und erzeugte Pfade |
| Einstellungen in `oma-config.yaml` werden ignoriert, und `language` oder `timezone` zeigen Template-Werte | Ein älteres `oma update` hat die ausgelieferte `oma-config.cue` neben Ihre YAML-Datei kopiert. CUE hat Vorrang vor YAML, daher gelten die Template-Werte | `oma update` entfernt diese Kopie, solange sie ein unverändertes Template ist, und sichert sie unter `.agents/backup/stray-shared-config/`. Wenn Sie sie bearbeitet haben, behalten Sie eine gemeinsame Konfigurationsdatei und löschen die andere |
| `oma doctor` warnt vor `timezone: Asia/Seoul` | Ältere Templates lieferten `Asia/Seoul` als Standard-Zeitzone aus, und Ihr System nutzt eine andere | Löschen Sie die Zeile `timezone`, um der System-Zeitzone zu folgen. Um `Asia/Seoul` zu behalten, setzen Sie den Wert in Ihrer lokalen Konfiguration (`oma-config.local.yaml` oder `.local.cue`) |

Die Dateireihenfolge finden Sie in der [Konfigurationsreferenz](/docs/guide/configuration-reference). Prüfen Sie nach einem Update Konfiguration und erzeugte Pfade:

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` läuft nicht interaktiv.

## Eine Installation oder ein Update kann das Release nicht herunterladen {#an-install-or-update-cannot-download-the-release}

<!-- oma-docs:ignore-start -->
`oma install`, `oma update` und die Reparatur von `oma doctor` laden das Release herunter, das `prompt-manifest.json` auf `main` nennt. Sie versuchen zuerst das Asset `agent-skills.tar.gz` des GitHub-Releases `cli-v<version>`, geprüft gegen die zugehörige `.sha256`-Datei, danach das Quellarchiv dieses Tags und schließlich einen flachen Klon des Tags. Eine Prüfsummenabweichung oder eine Payload, deren `.agents/skills/_version.json` eine andere Version nennt, beendet den Lauf, statt eine andere Quelle zu versuchen.
<!-- oma-docs:ignore-end -->

| Symptom | Ursache | Korrektur |
|---------|-------|-----|
| Der Download schlägt direkt nach einem Release fehl | Das Manifest nennt eine Version, deren Assets noch veröffentlicht werden | Warten Sie einige Minuten und versuchen Sie es erneut |
| Sie benötigen unveröffentlichte Inhalte von `main` | Releases installieren nur getaggte Inhalte | Aktivieren Sie dies für einen Lauf mit `OMA_UPDATE_CHANNEL=main oma update` |

```bash
OMA_UPDATE_CHANNEL=main oma update
```

Der Lauf gibt eine Warnung aus: Inhalte des main-Branches sind weder ein getaggtes Release noch per Prüfsumme verifiziert.

## Ein Vendor startet nicht {#a-vendor-does-not-start}

Führen Sie die eigene Authentifizierungsprüfung des Vendors aus und prüfen Sie anschließend OMAs aufgelöstes Profil:

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

| Symptom | Ursache | Korrektur |
|---------|-------|-----|
| Die Vendor-CLI ist nicht authentifiziert | Die Vendor-Sitzung ist abgelaufen oder wurde nie eingerichtet | Authentifizieren Sie sich erneut mit dem exakten Vendor-Befehl, den `oma doctor` auflistet |
| Eine Modellüberschreibung wird abgelehnt | Die Überschreibung hat nicht das vom Schema akzeptierte Format `owner/model`, oder ihr Vendor unterstützt den ausgewählten CLI-Transport nicht | Verwenden Sie das Format `owner/model` mit einem Vendor, der den Transport unterstützt |
| `model_preset: free` erreicht sein Gateway nicht | Die aufgelöste Gateway-URL oder das Modell ist falsch, oder die konfigurierte API-Key-Umgebungsvariable ist leer | Prüfen Sie Gateway-URL und Modell mit `oma doctor --profile` und setzen Sie danach den Schlüssel in der Umgebungsvariable |
| Ein Kind wird ohne Ergebnisartefakt beendet | Das Kind hat seine Ergebnisdeklaration (Claim) nicht an den injizierten Pfad geschrieben | Prüfen Sie Laufverzeichnis und Status des übergeordneten Prozesses (siehe unten) |

Wenn Sie die `free`-Map auslassen, sind die Standardwerte `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY` und das Modell `auto`; legen Sie den API-Schlüssel niemals selbst in YAML ab.

Ein gestartetes Kind erhält die Laufidentität und die Anweisungen für die Ergebnisdeklaration, schreibt die Ergebnisdeklaration (Claim) an den injizierten Pfad und meldet seine Artefakte; der übergeordnete Prozess finalisiert den verwalteten Ausführungsbeleg (Receipt), nachdem er den Exit-Code erfasst hat. Schreibgeschützte Kinder geben `OMA_RESULT_JSON: ...` zurück; diese Zeile wird als Inspektion aufgezeichnet und erfüllt keine ausführbare Verifizierung.

## Hooks sind installiert, laufen aber nicht {#hooks-are-installed-but-do-not-run}

| Symptom | Ursache | Korrektur |
|---------|-------|-----|
| Codex führt OMA-Hooks nicht aus | Die Hooks sind noch nicht vertrauenswürdig: Es ist die erste Installation, oder ein Update hat die Befehlszeichenfolge eines Hooks geändert | Prüfen Sie `.codex/hooks.json` und führen Sie danach `/hooks` in Codex aus |

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

Von OMA gestartete Codex-Subprozesse übergeben für ihren eigenen verwalteten Aufruf das Bypass-Flag; ein Hook in einer Codex-Sitzung, die Sie selbst starten, wird dadurch nicht als vertrauenswürdig eingestuft. Siehe [Codex-Hook-Vertrauen](/docs/guide/codex-hook-trust).

## Das Dashboard ist leer oder getrennt {#the-dashboard-is-empty-or-disconnected}

Starten Sie das Terminal-Dashboard aus dem Projekt, das die Sitzungsdateien enthält:

```bash
oma dashboard terminal
```

| Symptom | Ursache | Korrektur |
|---------|-------|-----|
| `No agents detected yet` | Der Workflow hat noch keine Sitzungs-, Aufgaben- oder Fortschrittsdateien in das überwachte Speicherverzeichnis geschrieben, oder das Dashboard überwacht ein anderes Verzeichnis | Warten Sie auf die erste Fortschrittsdatei; starten Sie aus dem Projekt-Root, übergeben Sie `--project-root <path>`, oder setzen Sie `MEMORIES_DIR` |
| Dateien im alten Verzeichnis `.serena/memories/` erscheinen nicht | Das Dashboard liest `.agents/state/memories/` und durchsucht das alte Verzeichnis nicht | Setzen Sie `MEMORIES_DIR` auf das Verzeichnis, das die Dateien enthält |
| `oma dashboard web` endet mit `port 9847 is already in use` | Ein anderer Prozess belegt den Port | Verwenden Sie einen anderen `DASHBOARD_PORT` |
| Die Webseite bleibt nach einem Neustart des Dashboards auf Disconnected | Jeder Start erzeugt ein neues Zugriffstoken, und der offene Tab hält noch das alte | Laden Sie die Seite neu |

Das Web-Dashboard bindet an Loopback und gibt seine URL aus. Öffnen Sie sie; die Seite bringt ihr eigenes Token für Web-API und WebSocket mit.

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

Weitere Dashboard-Signale finden Sie unter [Dashboard-Überwachung](./dashboard-monitoring.md#troubleshooting-runbook).

## Ein Zeitplan fehlt oder ist nicht gelaufen {#a-schedule-is-missing-or-did-not-run}

Prüfen Sie Manifest und Scheduler-Zustand. Die ersten beiden Befehle sind schreibgeschützt; die letzten beiden ändern den Zustand:

```bash
oma schedule list                 # read-only: synced, stale, missing-in-os, orphan-in-os
oma schedule inspect SCHEDULE_ID  # read-only: one manifest entry
oma schedule sync                 # writes: registers missing jobs and rewrites stale ones
oma schedule run SCHEDULE_ID      # executes the job now (normally invoked by the OS scheduler)
```

| Symptom | Ursache | Korrektur |
|---------|-------|-----|
| `schedule list` zeigt `missing-in-os` oder `stale` | Die OS-Registrierung fehlt oder ist veraltet | `oma schedule sync` |
| Das Laufprotokoll zeigt `Unknown command: schedule:run` | Die Registrierung stammt aus der Zeit vor der Befehlsumbenennung | `oma update` synchronisiert sie automatisch neu; auch `oma schedule sync` schreibt sie neu |
| `schedule list` zeigt `orphan-in-os` | Ein OS-Job hat keinen Manifest-Eintrag | `oma schedule sync --prune`, nur wenn die verwaisten Jobs entfernt werden sollen |
| Ein erstellter Zeitplan wurde nie registriert | Er wurde mit `--dry-run` erstellt, was nur eine Vorschau erzeugt | Erstellen Sie ihn erneut ohne `--dry-run` |
| Ein wiederkehrendes Intervall wurde nicht registriert | Das Intervall muss gerundet werden | Prüfen Sie die Vorschau und akzeptieren Sie danach die Rundung mit `--accept-rounded` |
| Der Job lief, ist aber fehlgeschlagen | Der Vendor wurde mit einem Exit-Code ungleich null beendet, oder das Protokoll meldet `re-auth required` | Prüfen Sie das Laufprotokoll unter `~/.oma/schedule/runs/<id>/` und authentifizieren Sie den Vendor erneut |

## Evaluierung oder Optimierung meldet keine Abdeckung {#evaluation-or-optimization-reports-no-coverage}

| Symptom | Ursache | Korrektur |
|---------|-------|-----|
| Skill-Evaluierung oder -Optimierung meldet keine Abdeckung | Unter `.agents/eval/<skill>/` gibt es weniger als fünf Fixtures | Fügen Sie Fixtures hinzu, bis es mindestens fünf sind |
| Der Mock-Modus lehnt aufgezeichnete Rollouts ab | Die aufgezeichnete Herkunft des Rollouts stimmt nicht mit den aktuellen Skill- und Fixture-Hashes überein | Zeichnen Sie im Live-Modus neu auf; kopieren Sie keine alte `_rollouts`-Datei in ein neues Skill-Verzeichnis und behandeln Sie sie nicht als aktuelle Evidenz |
| `--apply` verweigert das Schreiben | `--apply` erfordert ein strikt positives Validierungsergebnis und einen bestandenen, vom Runner verwalteten Test-Split | Behalten Sie während der Prüfung des vorgeschlagenen Diffs den Standardwert `--dry-run` bei und beheben Sie zuerst die fehlschlagende Validierung |

Ein OMA-eigener Skill, der durch `--apply` geändert wurde, kann durch ein späteres `oma update` überschrieben werden.

## Ein Ergebnis kann nicht abgeschlossen oder fortgesetzt werden {#a-result-cannot-finish-or-resume}

Prüfen Sie Lauf- und Plandateien:

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

| Symptom | Ursache | Korrektur |
|---------|-------|-----|
| Eine abgeschlossene Ergebnisdeklaration (Claim) wird abgelehnt oder herabgestuft | Ein fehlgeschlagener Ausführungsbeleg (Receipt), geänderte Eingaben, fehlende Artefakte, offene Punkte oder ein geänderter Aufgabenvertrag | Führen Sie vor dem Beenden `oma agent verify RUN_ID --required` aus und beheben Sie, was der Ausführungsbeleg meldet |
| Das Fortsetzen lässt eine Aufgabe auf `blocked` | Automatisches Fortsetzen erfordert `retry_policy: "safe"`, einen wiederholbaren Prompt und verbleibende Versuche | Lesen Sie den Grund im Dry-Run-Bericht. Der Plan ist nach seinem ersten Dispatch eingefroren; setzen Sie `retry_policy` daher im Plan einer neuen Sitzung, oder führen Sie die Aufgabe manuell erneut aus |
| Das Fortsetzen wiederholt eine Aufgabe nicht | Ein laufender Prozess oder ein unterbrochener nativer Versuch ohne eindeutiges Ergebnis mit dem Status partial oder failed bleibt unangetastet, um doppelte Arbeit zu vermeiden | Warten Sie auf den laufenden Prozess, oder finalisieren Sie zuerst den nativen Versuch |

Den vollständigen Lebenszyklus beschreibt [Agentenergebnisse und Fortsetzen](./agent-results-and-resume.md).

## Hilfe anfordern {#ask-for-help}

Wenn Sie Hilfe anfordern, fügen Sie die relevante Ausgabe von `oma doctor --json`, den Befehl, die Session-/Run-ID und die offene Meldung ein. Fügen Sie keine Zugangsdaten oder Inhalte geheimnisführender Dateien ein. Eröffnen Sie ein Issue unter [github.com/first-fluke/oh-my-agent/issues](https://github.com/first-fluke/oh-my-agent/issues).

## Siehe auch {#see-also}

- [OMA verwenden](./usage.md#troubleshooting): Einrichtungsprobleme wie fehlende Skills, CLIs und Workspace-Konflikte
- [Dashboard-Überwachung](./dashboard-monitoring.md#troubleshooting-runbook): Signale für hängende, abgestürzte und getrennte Dashboards
- [Agentenergebnisse und Fortsetzen](./agent-results-and-resume.md): Laufdatensätze, Ergebnisdeklarationen (Claims) und Wiederherstellung
- [Glossar](../getting-started/glossary.md): Begriffe wie [Laufdatensatz und Ergebnisdeklaration](../getting-started/glossary.md#run-record-and-claim)
