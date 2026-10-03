---
title: "Anleitung: Geplante Agenten"
sidebar_label: Geplante Agenten
description: Jeden Agenten wiederkehrend oder einmalig über den OS-Scheduler (macOS launchd, Linux systemd, Windows Task Scheduler) ausführen, ohne dass eine Vendor-Laufzeit geöffnet bleiben muss.
---

# Geplante Agenten

Mit `oma schedule` können Sie jeden Agenten zeitgesteuert ausführen, unabhängig davon, welche KI-Vendor-Laufzeit (Claude Code, Codex, Antigravity, Cursor, Qwen, Grok, opencode oder pi) gerade geöffnet ist. Der OS-Scheduler startet den Job; dieser ruft `oma agent spawn` ohne Benutzeroberfläche auf und verwendet die bereits auf der Festplatte gespeicherten Vendor-Credentials.

---

## So funktioniert es

Wenn Sie `oma schedule create` ausführen, erledigt oma Folgendes:

1. Einen Job-Datensatz im globalen Manifest unter `~/.agents/schedule/schedules.json` schreiben.
2. Den Job beim OS-Scheduler registrieren (macOS launchd, Linux systemd --user oder Windows Task Scheduler). Der OS-Job ruft `oma schedule run <id>` im konfigurierten Cron-Intervall auf.
3. Zum Auslösezeitpunkt sucht `oma schedule run` den Job, injiziert erfasste Umgebungsvariablen, ruft `oma agent spawn` auf und schreibt das Laufprotokoll nach `~/.agents/schedule/runs/<id>/<timestamp>.md`.

Das Manifest ist die einzige Quelle der Wahrheit (SSOT). Der OS-Scheduler ist lediglich der Executor. Der gesamte Zustand — Jobdefinitionen, Laufprotokolle und Zeitstempel der letzten Ausführung — liegt unter `~/.agents/schedule/`.

### Absichtlich nur global

`oma schedule` ist absichtlich benutzerweit und nicht projektbezogen. Da der OS-Scheduler Jobs unabhängig vom aktuellen Arbeitsverzeichnis ausführt, ist eine zentrale Registry die einzige praktikable SSOT. Jeder Job zeichnet über `workspace` und `projectLabel` auf, zu welchem Projekt er gehört. Dadurch kann `schedule list` Jobs nach Projekt gruppieren, obwohl die Registry gemeinsam genutzt wird.

Es gibt kein `--global`-Flag; Schedule-Befehle lesen und schreiben immer `~/.agents/schedule/`.

### OS-Backends

| Plattform | Primäres Backend | Fallback |
|---|---|---|
| macOS | launchd (plist + `launchctl`) | Benutzer-`crontab` |
| Linux | systemd --user timer | Benutzer-`crontab` |
| Windows | Task Scheduler (`schtasks`) | — |

oma wählt das verfügbare Backend automatisch. Sie konfigurieren dies nicht manuell.

---

## Vergleich: schedule, ralph und Claude /loop

Diese drei Funktionen werden manchmal verwechselt, weil sie alle mit „später erneut ausführen“ zu tun haben. Es handelt sich um unterschiedliche Konzepte.

| Funktion | Auslöser | Umfang | Bleibt sie nach Vendor-Neustart bestehen? |
|---|---|---|---|
| `oma schedule` | Zeitgesteuert (Cron) | Vendor-übergreifend, OS-Ebene | Ja — der OS-Scheduler löst aus, auch wenn keine Vendor-Laufzeit geöffnet ist |
| `ralph` | Abschlussbasiert (Stop-Hook-Schleife) | Vendor-übergreifend | Nur solange die aktuelle Sitzung aktiv ist; ralph ist eine „bis fertig“-Schleife und kein Timer |
| Claude Code `/loop` | Zeitgesteuert (In-Process-Cron) | Nur Claude-Laufzeit | Nein — läuft nur, solange Claude Code ausgeführt wird |

Verwenden Sie `schedule`, wenn ein Job werktags um 9 Uhr laufen soll. Verwenden Sie `ralph`, wenn ein Agent so lange iterieren soll, bis er eine Qualitätsschwelle erfüllt. Verwenden Sie `/loop` nur innerhalb von Claude Code, wenn Sie keine Vendor-übergreifende Portabilität benötigen.

---

## Schnellstart

```bash
# Run the qa-reviewer agent every weekday at 9 AM
oma schedule create qa-reviewer "Run QA review on the latest changes" --cron "0 9 * * 1-5"

# Run a backend agent every 2 hours using natural-language syntax
oma schedule create backend "Check for slow queries in the API logs" --every "2h"

# One-shot: run once at 3 PM today (cron syntax) and self-remove
oma schedule create pm "Generate weekly plan" --cron "0 15 * * *" --once

# Check what is scheduled
oma schedule list

# Remove a job
oma schedule delete sch_abc123def456
```

---

## Befehle

### schedule create

Einen Job für einen geplanten Agenten registrieren.

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>] [--dry-run] [--accept-rounded]
```

**Argumente:**

| Argument | Erforderlich | Beschreibung |
|---|---|---|
| `agent-id` | Ja | Zu startender Agententyp: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Ja | Zur Laufzeit an den Agenten übergebene Aufgabenbeschreibung |

**Optionen:**

| Flag | Beschreibung |
|---|---|
| `--cron "<expr>"` | Cron-Ausdruck mit 5 Feldern (z. B. `"0 9 * * *"` für täglich um 9 Uhr). Gegenseitig exklusiv mit `--every`. |
| `--every "<phrase>"` | Intervall in natürlicher Sprache (siehe folgende Tabelle). Gegenseitig exklusiv mit `--cron`. |
| `--vendor <vendor>` | An `oma agent spawn` übergebene CLI-Vendor-Überschreibung: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. Standardmäßig automatische Erkennung aus `oma-config.yaml`. |
| `-w, --workspace <path>` | Arbeitsverzeichnis des Agenten zur Laufzeit. Standardmäßig das aktuelle Arbeitsverzeichnis zum Registrierungszeitpunkt. |
| `--once` | Einmaliger Modus: Job wird einmal ausgelöst und entfernt sich selbst. Standard ist wiederkehrend. |
| `--expires-after <duration>` | Wiederkehrenden Job nach einer Dauer wie 30d automatisch ablaufen lassen. `0` bedeutet unbegrenzt (Standard). |
| `--env <KEY1,KEY2>` | Die benannten Umgebungsvariablen (nur die aufgelisteten) in `~/.agents/schedule/env/<id>` (Berechtigungen 0600) erfassen und zur Laufzeit injizieren. Secrets werden nie selbst im Manifest gespeichert. |
| `--dry-run` | Den aufgelösten Cron und einen möglichen Rundungshinweis ausgeben, ohne Scheduler-Job, Manifesteintrag oder Umgebungsdatei zu schreiben. |
| `--accept-rounded` | Erforderlich, um ein Intervall in natürlicher Sprache nach der Rundung auf einen in Cron darstellbaren Schritt zu registrieren. Zuerst mit `--dry-run` anzeigen. |

Genau eines von `--cron` oder `--every` ist erforderlich.

#### --every: Intervalle in natürlicher Sprache

`--every` akzeptiert die folgenden Formen. oma wandelt sie in einen Cron-Ausdruck mit fünf Feldern um und gibt einen Hinweis aus, wenn das angeforderte Intervall auf den nächsten in Cron darstellbaren Schritt gerundet wird.

| Form | Beispiel | Hinweise |
|---|---|---|
| Kompakte Einheit | `5m`, `2h`, `1d` | Minute, Stunde, Tag |
| Every + kompakt | `every 20m`, `every 2h` | |
| Every + Wort | `every 5 minutes`, `every 2 hours` | Plurale Einheiten werden akzeptiert |
| Sekunden | `30s` | Auf mindestens 1 Minute aufgerundet; Cron kann Intervalle unter einer Minute nicht ausdrücken |

Nicht teilende Intervalle werden auf einen sauberen Schritt gerundet und mit einem Hinweis ausgegeben. Zum Beispiel wird `--every 7m` zu `6m` (`*/6`) gerundet, weil 7 die 60 nicht teilt.

Zeigen Sie ein gerundetes Intervall vor der Registrierung an:

```bash
oma schedule create backend "Check logs" --every 7m --dry-run
# Preview: requested interval resolves to */6 * * * *
# Preview only: no OS job, manifest entry, or env file was written.
oma schedule create backend "Check logs" --every 7m --accept-rounded
```

Wenn die Vorschau ausgelassen wird, verweigert der Befehl die Registrierung eines gerundeten Intervalls. Schedules verwenden die lokalen Zeitregeln des ausgewählten OS-Schedulers.

**Beispiele:**

```bash
# Exact cron expression (full control)
oma schedule create backend "Optimize slow queries" --cron "0 */4 * * *"

# Natural language (oma converts to cron)
oma schedule create frontend "Run lighthouse audit" --every "every 6 hours"
# Converts to 0 */6 * * * (6 divides 24 cleanly, so no rounding note)

# Pin to a vendor and a workspace
oma schedule create qa "Run security scan" --cron "0 2 * * 0" --vendor claude -w /home/user/myproject

# One-shot job
oma schedule create pm "Generate sprint retrospective" --cron "0 17 * * 5" --once

# Capture specific env vars for the job
oma schedule create backend "Sync external API data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

---

### schedule list

Alle geplanten Jobs über alle Projekte hinweg auflisten, nach Projekt gruppiert und mit dem Driftzustand des Betriebssystems.

```
oma schedule list [--json]
```

**Optionen:**

| Flag | Beschreibung |
|---|---|
| `--json` | Maschinenlesbares JSON ausgeben |

**Driftzustände:**

| Zustand | Bedeutung |
|---|---|
| `synced` | Job existiert sowohl im Manifest als auch im OS-Scheduler |
| `stale` | Job ist registriert, aber die OS-Registrierung ruft einen Befehl auf, den die aktuelle CLI nicht mehr akzeptiert (zum Beispiel `schedule:run <id>`, geschrieben vor der Vereinheitlichung der Befehlspfade). `schedule sync` zum Neuschreiben ausführen; `oma update` erledigt das automatisch. |
| `missing-in-os` | Job ist im Manifest, fehlt aber im OS-Scheduler. `schedule sync` zur Reparatur ausführen. |
| `orphan-in-os` | Job existiert im OS-Scheduler, aber nicht im Manifest. Mit `schedule sync --prune` entfernen. |

**Ausgabe (Text):**

Jobs werden nach Projektbezeichnung gruppiert. Jede Zeile zeigt ID, Cron-Ausdruck, Agent, Vendor, OS-Backend, ob der Job wiederkehrend ist, und den Driftzustand.

```
[my-project]
ID                 CRON           AGENT              VENDOR   BACKEND  RECUR  STATE
------------------------------------------------------------------------------------------
sch_abc123def456   0 9 * * 1-5    qa-reviewer        auto     launchd  true   synced
sch_xyz789ghi012   */30 * * * *   backend            claude   launchd  true   missing-in-os

[orphan-in-os]
  dev.oma.sch_old (in OS scheduler but not in manifest)
```

**Beispiele:**

```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

---

### schedule delete

Einen geplanten Job sowohl aus dem Manifest als auch aus dem OS-Scheduler entfernen.

```
oma schedule delete <id>
```

**Argumente:**

| Argument | Erforderlich | Beschreibung |
|---|---|---|
| `id` | Ja | Job-ID aus `schedule list` (Format: `sch_<base32-12>`) |

Wenn das Entfernen im OS-Scheduler fehlschlägt (z. B. weil das Backend vorübergehend nicht verfügbar ist), wird eine Warnung ausgegeben, der Manifesteintrag aber trotzdem gelöscht.

**Beispiel:**

```bash
oma schedule delete sch_abc123def456
```

---

### schedule run

Einen geplanten Job nach ID ausführen. Dieser Befehl wird zur Auslösezeit vom OS-Scheduler aufgerufen und normalerweise nicht von Hand ausgeführt.

```
oma schedule run <id>
```

Der Wrapper:
1. Sucht die Job-ID im Manifest. Beendet sich mit einem Fehlercode ungleich null, wenn sie nicht gefunden wird.
2. Lädt erfasste Umgebungsvariablen aus `~/.agents/schedule/env/<id>` (falls vorhanden) und injiziert sie in den gestarteten Prozess.
3. Ruft `oma agent spawn <agentId> <prompt> <generatedSessionId> --vendor <vendor> -w <workspace>` auf.
4. Schreibt das Laufergebnis nach `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Aktualisiert `lastFiredAt` im Manifest.
6. Entfernt den Job selbst (Manifest und OS-Scheduler), wenn `--once` gesetzt war.

**Authentifizierungsfehler werden deutlich gemeldet:** Wenn Vendor-Credentials abgelaufen sind, beendet sich der Job mit einem Exit-Code ungleich null und schreibt `re-auth required: <vendor>` nach stderr. Er meldet nicht still Erfolg. Optional kann eine `oma-voice`-Benachrichtigung konfiguriert werden.

Sie können `schedule run` zur Fehlersuche manuell aufrufen:

```bash
oma schedule run sch_abc123def456
```

---

### schedule sync

Das Manifest erneut mit dem OS-Scheduler synchronisieren. Nach Systemmigrationen, Zurücksetzen des OS-Schedulers oder zur Reparatur von Drift verwenden.

```
oma schedule sync [--prune]
```

**Optionen:**

| Flag | Beschreibung |
|---|---|
| `--prune` | Zusätzlich OS-Jobs entfernen, die im OS-Scheduler, aber nicht im Manifest stehen (orphan-in-os-Zustand). Ohne `--prune` werden Verwaiste gemeldet, aber nicht entfernt. |

**Beispiele:**

```bash
# Repair missing-in-os jobs and rewrite stale registrations (does not remove orphans)
oma schedule sync

# Repair missing-in-os jobs AND remove orphans
oma schedule sync --prune
```

`oma update` führt nach jedem Update denselben Abgleich aus (ohne `--prune`), sodass ein CLI-Release, das die Schreibweise des Befehls `oma schedule run` ändert, bestehende OS-Registrierungen nicht auf einen Befehl zeigen lassen kann, den das neue Binary ablehnt. Auch von älteren Versionen mit `oma schedule:run <id>` geschriebene Registrierungen funktionieren weiter: Diese veraltete Schreibweise bleibt für vom OS aufgerufene Jobs akzeptiert.

---

## Speicherlayout

Der gesamte Schedule-Zustand liegt unter `~/.agents/schedule/`:

```
~/.agents/schedule/
├── schedules.json          # SSOT manifest (permissions 0600)
├── env/
│   └── sch_abc123def456    # Captured env vars for this job (permissions 0600)
└── runs/
    └── sch_abc123def456/
        └── 2026-06-16T090000Z.md   # Run log
```

Berechtigungen:
- Verzeichnis `~/.agents/schedule/`: `0700`
- Dateien `schedules.json` und `env/<id>`: `0600`

**Secrets werden nie in `schedules.json` geschrieben.** Das Flag `--env` schreibt nur die benannten Schlüssel in eine separate Datei mit `0600` unter `env/`. Nur ausdrücklich aufgelistete Schlüssel werden erfasst; ein vollständiger Dump der Umgebung wird nie gespeichert.

---

## Sicherheitshinweise

- `schedule create` ist ein Vorgang mit vertrauenswürdigem Pfad: Nur der authentifizierte Benutzer kann Jobs registrieren. Geben Sie `schedule create` nicht an externe oder nicht vertrauenswürdige Eingaben weiter. Ein geplanter Prompt ist beliebiger Code, der zu einem späteren Zeitpunkt ausgeführt wird.
- `schedule run` führt nur Jobs aus, deren ID im Manifest existiert. Eine beliebige argv-Injektion ist nicht möglich.
- Vendor-Credentials auf der Festplatte (z. B. `~/.codex/auth.json`, `~/.grok/auth.json`) werden für Headless-Dispatch unverändert verwendet. Es gibt keine zusätzliche Authentifizierungsprüfung. Wenn Credentials ablaufen, schlägt der Job laut fehl.

---

## Tipps und Fehlerbehebung

**Laufprotokolle prüfen:**

```bash
ls ~/.agents/schedule/runs/sch_abc123def456/
cat ~/.agents/schedule/runs/sch_abc123def456/2026-06-16T090000Z.md
```

**Job zeigt nach einem Systemneustart `missing-in-os`:**

Führen Sie `oma schedule sync` aus, um alle Manifest-Jobs erneut beim OS-Scheduler zu registrieren.

**Job wurde ausgelöst, aber Vendor-Credentials waren abgelaufen:**

Prüfen Sie das Laufprotokoll auf `re-auth required: <vendor>`. Authentifizieren Sie sich mit der Vendor-CLI erneut (z. B. `claude login`, `codex login`) und führen Sie vor dem nächsten Auslösen manuell `oma schedule run <id>` aus.

**`--every` hat mein Intervall gerundet:**

Wenn oma Ihr Intervall rundet, gibt es einen Hinweis mit der Änderung aus. Wenn Sie ein präzises Intervall benötigen, das nicht sauber in 60 Minuten oder 24 Stunden aufgeht, verwenden Sie stattdessen `--cron` mit einem ausdrücklichen Ausdruck mit fünf Feldern.

**Alle Jobs eines Projekts entfernen:**

```bash
# List jobs for a specific project, then remove each
oma schedule list --json | jq -r '.jobs[] | select(.projectLabel == "my-project") | .id' \
  | xargs -I{} oma schedule delete {}
```

**Windows-Unterstützung:**

Unter Windows verwendet oma `schtasks`, um Jobs zu registrieren. Die Drift-Erkennung von `schedule list` und die Befehle `schedule sync` funktionieren auf allen Plattformen gleich.

Beachten Sie, dass `schtasks` nicht jede Cron-Form ausdrücken kann. Unterstützte Formen sind: `*/N * * * *` (alle N Minuten), `M * * * *` (stündlich bei :M), `M H * * *` (täglich), `M H * * D` (wöchentlich; `D` kann ein einzelner Tag, ein Bereich wie `1-5` oder eine Liste wie `1,3,5` sein) und `M H D * *` (monatlich). Andere Ausdrücke (z. B. eine durch Kommas getrennte Liste im Minutenfeld) werden unter Windows zum Zeitpunkt von `schedule create` abgelehnt.
