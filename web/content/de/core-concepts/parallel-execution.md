---
title: Parallele Ausführung
description: Vollständige Anleitung zum gleichzeitigen Ausführen mehrerer oh-my-agent-Agenten — agent:spawn-Syntax mit allen Optionen, Inline-Modus agent:parallel, Workspace-Muster, Multi-CLI-Konfiguration, Anbieter-Auflösungspriorität, Dashboard-Überwachung, Session-ID-Strategie und zu vermeidende Anti-Patterns.
---

# Parallele Ausführung

Der Kernvorteil von oh-my-agent ist das gleichzeitige Ausführen mehrerer spezialisierter Agenten. Während der Backend-Agent Ihre API implementiert, erstellt der Frontend-Agent die Benutzeroberfläche und der Mobile-Agent baut die App-Bildschirme — alles koordiniert über gemeinsamen Speicher.

---

## agent:spawn — Einzelnes Agenten-Spawning

### Grundsyntax

```bash
oma agent:spawn <agent-id> <prompt> <session-id> [options]
```

### Parameter

| Parameter | Erforderlich | Beschreibung |
|-----------|----------|-------------|
| `agent-id` | Ja | Agentenkennung: `backend`, `frontend`, `mobile`, `db`, `pm`, `qa`, `debug`, `design`, `tf-infra`, `dev-workflow`, `translator`, `orchestrator`, `commit` |
| `prompt` | Ja | Aufgabenbeschreibung (Zeichenkette in Anführungszeichen oder Pfad zu einer Prompt-Datei) |
| `session-id` | Ja | Gruppiert Agenten, die am selben Feature arbeiten. Format: `session-YYYYMMDD-HHMMSS` oder eine beliebige eindeutige Zeichenkette. |
| `options` | Nein | Siehe Optionstabelle unten |

### Optionen

| Flag | Kurz | Beschreibung |
|------|-------|-------------|
| `--workspace <path>` | `-w` | Arbeitsverzeichnis für den Agenten. Agenten modifizieren nur Dateien innerhalb dieses Verzeichnisses. |
| `--model <name>` | `-m` | CLI-Vendor für diesen speziellen Spawn überschreiben. Optionen: `gemini`, `claude`, `codex`, `qwen`. |
| `--max-turns <n>` | `-t` | Standard-Zug-Limit für diesen Agenten überschreiben. |
| `--json` | | Ergebnis als JSON ausgeben (nützlich für Skripte). |
| `--no-wait` | | Starten und vergessen — sofort zurückkehren, ohne auf den Abschluss zu warten. |

### Beispiele

```bash
# Backend-Agent mit Standard-Vendor starten
oma agent:spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Mit Workspace-Isolation starten
oma agent:spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Vendor für diesen speziellen Agenten überschreiben
oma agent:spawn frontend "Build login form" session-01 -m claude -w ./apps/web

# Höheres Zug-Limit für eine komplexe Aufgabe setzen
oma agent:spawn backend "Implement payment gateway integration" session-01 -t 30

# Prompt-Datei statt Inline-Text verwenden
oma agent:spawn backend ./prompts/auth-api.md session-01 -w ./apps/api
```

---

## Paralleles Spawning mit Hintergrundprozessen

Um mehrere Agenten gleichzeitig auszuführen, verwenden Sie Shell-Hintergrundprozesse:

```bash
# 3 Agenten parallel starten
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent:spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Blockiert, bis alle Agenten fertig sind
```

Das `&` führt jeden Agenten im Hintergrund aus. `wait` blockiert, bis alle Hintergrundprozesse abgeschlossen sind.

### Workspace-bewusstes Muster

Weisen Sie beim parallelen Ausführen immer separate Workspaces zu, um Dateikonflikte zu vermeiden:

```bash
# Full-Stack-Parallelausführung
oma agent:spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent:spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent:spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# Nach der Implementierung QA ausführen (sequenziell — hängt von Implementierung ab)
oma agent:spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel — Inline-Parallelmodus

Für eine sauberere Syntax, die die Hintergrundprozessverwaltung automatisch übernimmt:

### Syntax

```bash
oma agent:parallel -i <agent1>:<prompt1> <agent2>:<prompt2> [options]
```

### Beispiele

```bash
# Grundlegende Parallelausführung
oma agent:parallel -i backend:"Implement auth API" frontend:"Build login form" mobile:"Auth screens"

# Mit no-wait (starten und vergessen)
oma agent:parallel -i backend:"Auth API" frontend:"Login form" --no-wait

# Alle Agenten teilen automatisch dieselbe Sitzung
oma agent:parallel -i \
  backend:"JWT auth with refresh tokens" \
  frontend:"Login form with email validation" \
  db:"User schema with soft delete and audit trail"
```

Das `-i`-Flag (inline) ermöglicht die direkte Angabe von Agent-Prompt-Paaren im Befehl.

---

## Multi-CLI-Konfiguration

Nicht alle KI-CLIs sind domänenübergreifend gleich leistungsfähig. oh-my-agent ermöglicht es, Agenten an die CLI weiterzuleiten, die ihre Domäne am besten beherrscht.

### Vollständiges Konfigurationsbeispiel

```yaml
# .agents/oma-config.yaml

# Antwortsprache
language: en

# Datumsformat für Berichte
date_format: "YYYY-MM-DD"

# Zeitzone für Zeitstempel
timezone: "Asia/Seoul"

# Standard-CLI (verwendet, wenn keine agentenspezifische Zuordnung existiert)
default_cli: gemini

# Pro-Agent-CLI-Routing
agent_cli_mapping:
  frontend: claude       # Komplexes UI-Reasoning, Komponentenkomposition
  backend: gemini        # Schnelle API-Gerüsterstellung, CRUD-Generierung
  mobile: gemini         # Schnelle Flutter-Code-Generierung
  db: gemini             # Schnelles Schema-Design
  pm: gemini             # Schnelle Aufgabenzerlegung
  qa: claude             # Gründliches Sicherheits- und Barrierefreiheits-Review
  debug: claude          # Tiefe Grundursachenanalyse, Symbolverfolgung
  design: claude         # Nuancierte Designentscheidungen, Anti-Pattern-Erkennung
  tf-infra: gemini       # HCL-Generierung
  dev-workflow: gemini   # Task-Runner-Konfiguration
  translator: claude     # Nuancierte Übersetzung mit kultureller Sensibilität
  orchestrator: gemini   # Schnelle Koordination
  commit: gemini         # Einfache Commit-Nachrichten-Generierung
```

### Vendor-Auflösungspriorität

Wenn `oma agent:spawn` bestimmt, welche CLI verwendet wird, folgt es dieser Priorität (höchste gewinnt):

| Priorität | Quelle | Beispiel |
|----------|--------|---------|
| 1 (höchste) | `--model`-Flag | `oma agent:spawn backend "task" session-01 -m claude` |
| 2 | `agent_cli_mapping` | `agent_cli_mapping.backend: gemini` in oma-config.yaml |
| 3 | `default_cli` | `default_cli: gemini` in oma-config.yaml |
| 4 | `active_vendor` | Legacy-Einstellung in `cli-config.yaml` |
| 5 (niedrigste) | Fest codierter Fallback | `gemini` |

Das bedeutet, ein `--model`-Flag gewinnt immer. Ohne Flag prüft das System die agentenspezifische Zuordnung, dann den Standard, dann die Legacy-Konfiguration und fällt schließlich auf Gemini zurück.

---

## Vendor-spezifische Startmethoden

Der Startmechanismus variiert je nach IDE/CLI:

| Vendor | Wie Agenten gestartet werden | Ergebnisbehandlung |
|--------|----------------------|-----------------|
| **Claude Code** | `Agent`-Tool mit `.claude/agents/{name}.md`-Definitionen. Mehrere Agent-Aufrufe in derselben Nachricht = echte Parallelität. | Synchrone Rückgabe |
| **Codex CLI** | Modellvermittelte parallele Subagenten-Anfrage | JSON-Ausgabe |
| **Gemini CLI** | `oma agent:spawn`-CLI-Befehl | MCP-Memory-Abfrage |
| **Antigravity IDE** | Nur `oma agent:spawn` (benutzerdefinierte Subagenten nicht verfügbar) | MCP-Memory-Abfrage |
| **CLI-Fallback** | `oma agent:spawn {agent} {prompt} {session} -w {workspace}` | Ergebnisdatei-Abfrage |

Innerhalb von Claude Code verwendet der Workflow das `Agent`-Tool direkt:
```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Mehrere Agent-Tool-Aufrufe in derselben Nachricht werden als echte Parallelität ausgeführt — kein sequenzielles Warten.

---

## Agentenüberwachung

### Terminal-Dashboard

```bash
oma dashboard
```

Zeigt eine Live-Tabelle mit:
- Sitzungs-ID und Gesamtstatus
- Pro-Agent-Status (läuft, abgeschlossen, fehlgeschlagen)
- Zugzähler
- Neueste Aktivität aus Fortschrittsdateien
- Verstrichene Zeit

Das Dashboard überwacht `.serena/memories/` für Echtzeit-Updates. Es aktualisiert sich, wenn Agenten Fortschritte schreiben.

### Web-Dashboard

```bash
oma dashboard:web
# Öffnet http://localhost:9847
```

Funktionen:
- Echtzeit-Updates über WebSocket
- Automatische Wiederverbindung bei Verbindungsabbrüchen
- Farbcodierte Agentenstatus-Indikatoren
- Aktivitätsprotokoll-Streaming aus Fortschritts- und Ergebnisdateien
- Sitzungsverlauf

### Empfohlenes Terminal-Layout

Verwenden Sie 3 Terminals für optimale Sichtbarkeit:

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   Terminal 1:           │   Terminal 2:        │
│   oma dashboard         │   Agent-Spawn-       │
│   (Live-Überwachung)    │   Befehle            │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   Terminal 3:                                  │
│   Test-/Build-Logs, Git-Operationen            │
│                                                │
└────────────────────────────────────────────────┘
```

### Einzelnen Agentenstatus prüfen

```bash
oma agent:status <session-id> <agent-id>
```

Gibt den aktuellen Status eines bestimmten Agenten zurück: laufend, abgeschlossen oder fehlgeschlagen, zusammen mit Zugzähler und letzter Aktivität.

---

## Sitzungs-ID-Strategie

Sitzungs-IDs gruppieren Agenten, die am selben Feature arbeiten. Best Practices:

- **Eine Sitzung pro Feature:** Alle Agenten, die an "Benutzerauthentifizierung" arbeiten, teilen `session-auth-01`
- **Format:** Beschreibende IDs verwenden: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **Automatisch generiert:** Der Orchestrator generiert IDs im Format `session-YYYYMMDD-HHMMSS`
- **Wiederverwendbar für Iteration:** Dieselbe Sitzungs-ID verwenden, wenn Agenten mit Verfeinerungen erneut gestartet werden

Sitzungs-IDs bestimmen:
- Welche Memory-Dateien Agenten lesen und schreiben (`progress-{agent}.md`, `result-{agent}.md`)
- Was das Dashboard überwacht
- Wie Ergebnisse im Abschlussbericht gruppiert werden

---

## Tipps zur parallelen Ausführung

### Empfohlen

1. **API-Verträge zuerst festlegen.** `/plan` vor dem Starten von Implementierungsagenten ausführen, damit Frontend- und Backend-Agenten über Endpunkte, Anfrage-/Antwort-Schemata und Fehlerformate einig sind.

2. **Eine Sitzungs-ID pro Feature verwenden.** Dies hält Agentenausgaben gruppiert und die Dashboard-Überwachung kohärent.

3. **Separate Workspaces zuweisen.** Immer `-w` verwenden, um Agenten zu isolieren:
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **Aktiv überwachen.** Ein Dashboard-Terminal öffnen, um Probleme frühzeitig zu erkennen — ein fehlgeschlagener Agent verschwendet Züge, wenn er nicht schnell erkannt wird.

5. **QA nach der Implementierung ausführen.** Den QA-Agenten sequenziell nach Abschluss aller Implementierungsagenten starten:
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent:spawn qa "Review all changes" session-01
   ```

6. **Mit Re-Spawns iterieren.** Wenn die Ausgabe eines Agenten Verfeinerung braucht, den Agenten mit der ursprünglichen Aufgabe plus Korrekturkontext erneut starten. Keine neue Sitzung beginnen.

7. **Mit `/work` beginnen, wenn unsicher.** Der Work-Workflow führt Sie schrittweise durch den Prozess mit Benutzerbestätigung an jedem Gate.

### Nicht empfohlen

1. **Keine Agenten im selben Workspace starten.** Zwei Agenten, die in dasselbe Verzeichnis schreiben, erzeugen Merge-Konflikte und überschreiben gegenseitig ihre Arbeit.

2. **MAX_PARALLEL (Standard 3) nicht überschreiten.** Mehr gleichzeitige Agenten bedeuten nicht immer schnellere Ergebnisse. Jeder Agent benötigt Memory- und CPU-Ressourcen. Der Standard von 3 ist für die meisten Systeme optimiert.

3. **Den Planungsschritt nicht überspringen.** Agenten ohne Plan zu starten führt zu nicht abgestimmten Implementierungen — das Frontend baut gegen eine API-Form, während das Backend eine andere baut.

4. **Fehlgeschlagene Agenten nicht ignorieren.** Die Arbeit eines fehlgeschlagenen Agenten ist unvollständig. `result-{agent}.md` auf den Fehlgrund prüfen, den Prompt korrigieren und erneut starten.

5. **Sitzungs-IDs für verwandte Arbeit nicht mischen.** Wenn Backend- und Frontend-Agenten am selben Feature arbeiten, müssen sie eine Sitzungs-ID teilen, damit der Orchestrator sie koordinieren kann.

---

## Durchgängiges Beispiel

Ein vollständiger paralleler Ausführungsworkflow zum Erstellen eines Benutzerauthentifizierungs-Features:

```bash
# Schritt 1: Feature planen
# (In Ihrer KI-IDE /plan ausführen oder das Feature beschreiben)
# Dies erstellt .agents/plan.json mit Aufgabenaufschlüsselung

# Schritt 2: Implementierungsagenten parallel starten
oma agent:spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use bcrypt for password hashing. Follow the API contract in .agents/skills/_shared/core/api-contracts/" session-auth-01 -w ./apps/api &
oma agent:spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent:spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Schritt 3: In einem separaten Terminal überwachen
# Terminal 2:
oma dashboard

# Schritt 4: Auf alle Implementierungsagenten warten
wait

# Schritt 5: QA-Review ausführen
oma agent:spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Schritt 6: Falls QA Probleme findet, spezifische Agenten mit Korrekturen erneut starten
oma agent:spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Schritt 7: QA erneut zur Verifikation ausführen
oma agent:spawn qa "Re-review backend auth after fixes." session-auth-01
```
