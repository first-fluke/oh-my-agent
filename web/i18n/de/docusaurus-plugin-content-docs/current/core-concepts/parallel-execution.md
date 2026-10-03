---
title: Parallele Ausführung
description: Anleitung zum parallelen Ausführen mehrerer OMA-Dispatch-Rollen mit aktueller CLI-Syntax, Task-Dateien, Inline-Modus, Workspace-Isolation, Modell- und Vendor-Auflösung, Überwachung, Sitzungs-IDs und Wiederherstellungsmustern.
---

# Parallele Ausführung

Der zentrale Vorteil von oh-my-agent ist das gleichzeitige Ausführen mehrerer spezialisierter Agenten. Während der Backend-Agent eine API implementiert, erstellt der Frontend-Agent die Benutzeroberfläche und der Mobile-Agent die App-Screens; der Orchestrator koordiniert sie über dauerhaften Laufzeitstatus und Ausführungsbelege (Receipts).

---

## agent spawn — Einzelnes Agenten-Spawning

### Grundsyntax

```bash
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

### Parameter

| Parameter | Erforderlich | Beschreibung |
|-----------|----------|-------------|
| `agent-id` | Ja | Kanonische Dispatch-Rolle: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` oder `explore` |
| `prompt` | Ja | Aufgabenbeschreibung (Zeichenkette in Anführungszeichen oder Pfad zu einer Prompt-Datei) |
| `session-id` | Ja | Gruppiert Agenten, die am selben Feature arbeiten. Format: `session-YYYYMMDD-HHMMSS` oder eine beliebige eindeutige Zeichenkette. |
| `options` | Nein | Siehe Optionstabelle unten |

### Optionen

| Flag | Kurz | Beschreibung |
|------|-------|-------------|
| `--workspace <path>` | `-w` | Arbeitsverzeichnis für den Agenten. Agenten modifizieren nur Dateien innerhalb dieses Verzeichnisses. |
| `--model <vendor>` | `-m` | CLI-Vendor für diesen Spawn überschreiben (`antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` oder `pi`). |
| `--resumed-from <run-id>` | | Retry mit dem vorherigen evidenzbasierten Lauf verknüpfen. |
| `--fallback-vendors <vendors>` | | Geordnete, durch Kommas getrennte Vendor-Fallbacks, wenn der primäre Vendor nicht laufen kann. |
| `--task-id <id>` | | Den Spawn an eine Task-ID aus dem Sitzungsplan binden. |
| `--isolation <mode>` | | `worktree` erstellt ein frisches Git-Worktree unter dem temporären OMA-Worktree-Verzeichnis. Es bleibt für Review und Merge/Verwerfen erhalten. |
| `--read-only` | | Den gestarteten Agenten auf nicht-destruktive Tools beschränken. |

### Beispiele

```bash
# Spawn a backend agent with default vendor
oma agent spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Spawn with workspace isolation
oma agent spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Override the CLI vendor for this specific spawn
oma agent spawn frontend "Build login form" session-01 --vendor claude -w ./apps/web

# Retry a run while preserving its evidence chain
oma agent spawn backend "Fix the payment gateway issue" session-01 --resumed-from run-123

# Use a prompt file instead of inline text
oma agent spawn backend ./prompts/auth-api.md session-01 -w ./apps/api

# Run inside an isolated git worktree (hypothesis spawn pattern)
oma agent spawn backend "Try a Drizzle-based rewrite" session-01 --isolation worktree
```

---

## Paralleles Spawning mit Hintergrundprozessen

Um mehrere Agenten gleichzeitig auszuführen, verwenden Sie Shell-Hintergrundprozesse:

```bash
# Spawn 3 agents in parallel
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Block until all agents complete
```

Das `&` führt jeden Agenten im Hintergrund aus. `wait` blockiert, bis alle Hintergrundprozesse abgeschlossen sind.

### Workspace-bewusstes Muster {#workspace-aware-pattern}

Weisen Sie beim parallelen Ausführen immer separate Workspaces zu, um Dateikonflikte zu vermeiden:

```bash
# Full-stack parallel execution
oma agent spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# After implementation, run QA (sequential; depends on implementation)
oma agent spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent parallel — Inline-Parallelmodus

Für eine sauberere Syntax, die die Hintergrundprozessverwaltung automatisch übernimmt:

### Syntax

```bash
oma agent parallel --inline "<agent1>:<prompt1>" "<agent2>:<prompt2>" [options]
```

### Beispiele

```bash
# Basic parallel execution
oma agent parallel --inline \
  "backend:Implement auth API" \
  "frontend:Build login form" \
  "mobile:Auth screens"

# With no-wait (fire and forget)
oma agent parallel --inline "backend:Auth API" "frontend:Login form" --no-wait

# All agents share the same session automatically
oma agent parallel --inline \
  "backend:JWT auth with refresh tokens" \
  "frontend:Login form with email validation" \
  "db:User schema with soft delete and audit trail" \
  --session session-auth-01
```

Das `--inline`-Flag zerlegt jedes Argument `agent:task`. Wenn die Aufgabe einen eigenen Workspace benötigt, fügen Sie einen dritten, durch Doppelpunkte getrennten Pfad (`agent:task:workspace`) hinzu. Ohne `--inline` übergeben Sie eine YAML-Taskdatei mit `{tasks: [{id?, agent, task, workspace?}]}`. `--session` ordnet parallele Ergebnisse einer bestehenden Sitzung zu.

---

## Multi-CLI-Konfiguration

oh-my-agent leitet jeden Agenten über `model_preset` in `.agents/oma-config.yaml` an die passende CLI. Wähle ein eingebautes Preset für deinen Vendor und überschreibe bei Bedarf einzelne Agenten.

### Konfigurationsbeispiel

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed   # mixed: Claude for coordination, Codex for implementation/explore

# Override specific agents on top of the preset
agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }
  backend:  { model: openai/gpt-5.5, effort: high }
```

Eingebaute Presets: `auto`, `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` und `mixed`. Details unter [Modelle pro Agent](../guide/per-agent-models.md).

### Vendor-Auflösung

Wenn `oma agent spawn` ermittelt, welche CLI verwendet wird:

| Priorität | Quelle | Beispiel |
|----------|--------|---------|
| 1 (höchste) | `--vendor`-Flag | `oma agent spawn backend "task" session-01 --vendor claude` |
| 2 | `agents:`-Überschreibung in `oma-config.yaml` | `agents: { backend: { model: openai/gpt-5.5 } }` |
| 3 | Agenten-Standardwerte des aktiven `model_preset` | Preset-Nachschlag für die Agentenrolle |

Das `--vendor`-Flag gewinnt immer. Ohne Flag prüft das System zuerst `agents:`-Überschreibungen, dann die Preset-Standardwerte und schließlich den konfigurierten Fallback-Vendor. Bei `model_preset: auto` liefern die nativen Einstellungen der aktuellen Laufzeit das Modell.

---

## Vendor-spezifische Startmethoden

Der Startmechanismus variiert je nach IDE/CLI:

| Vendor | Wie Agenten gestartet werden | Ergebnisbehandlung |
|--------|----------------------|-----------------|
| **Claude Code** | Aufgaben desselben Vendors verwenden das Agent-Tool mit `.claude/agents/{name}.md`; vendorübergreifende Aufgaben fallen auf `oma agent spawn` zurück. | Synchrone Rückgabe |
| **Codex CLI** | Aufgaben desselben Vendors verwenden native Custom-Agents aus `.codex/agents/{name}.toml`; vendorübergreifende Aufgaben fallen auf `oma agent spawn` zurück. | JSON-Ausgabe |
| **Antigravity CLI/IDE** | `oma agent spawn` über die `agy`-Laufzeit; native Custom-Subagenten sind nicht erforderlich | Dauerhafter Ausführungsbeleg (Receipt) und Abfrage der Ergebnisdatei |
| **Cursor** | Verwendet, sofern vorhanden, die generierte Cursor-Integration; andernfalls `oma agent spawn` | Abfrage der Ergebnisdatei |
| **OpenCode / pi** | Verwendet bei Auswahl die In-Process-Extension-Bridge; vendorübergreifende Arbeit läuft über `oma agent spawn` | Abfrage der Ergebnisdatei |
| **CLI-Fallback** | `oma agent spawn {agent} {prompt} {session} -w {workspace}` | Evidenzbasierte Ergebnisabfrage |

Innerhalb von Claude Code verwendet der Workflow das `Agent`-Tool direkt:
```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Mehrere Agent-Tool-Aufrufe in derselben Nachricht werden als echte Parallelität ausgeführt — kein sequenzielles Warten.

Dieselbe Dispatch-Regel gilt für alle Vendors:

1. `target_vendor_for_agent` aus `.agents/oma-config.yaml` auflösen
2. Bei Übereinstimmung mit dem aktuellen Runtime-Vendor die native Agentendatei dieses Vendors verwenden
3. Bei Abweichung nur für diesen Agenten `oma agent spawn` verwenden

---

## Agentenüberwachung

### Terminal-Dashboard

```bash
oma dashboard terminal
```

Zeigt eine Live-Tabelle mit:
- Sitzungs-ID und Gesamtstatus
- Pro-Agent-Status (läuft, abgeschlossen, fehlgeschlagen)
- Zugzähler
- Neueste Aktivität aus Fortschrittsdateien
- Verstrichene Zeit

Das Dashboard überwacht `.agents/state/memories/` für Echtzeit-Updates. Es aktualisiert sich, wenn Agenten Fortschritte schreiben.

### Web-Dashboard

```bash
oma dashboard web
# Opens http://localhost:9847
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
│   oma dashboard terminal         │   Agent spawn        │
│   (live monitoring)     │   commands           │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   Terminal 3:                                  │
│   Test/build logs, git operations              │
│                                                │
└────────────────────────────────────────────────┘
```

### Einzelnen Agentenstatus prüfen

```bash
oma agent status <session-id> <agent-id>
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
- Welche run-bezogenen Memory-Dateien Agenten lesen und schreiben (`progress-{agentId}-{taskId}-{runId}-{sessionId}.md`, `result-{agentId}-{taskId}-{runId}-{sessionId}.md`)
- Was das Dashboard überwacht
- Wie Ergebnisse im Abschlussbericht gruppiert werden

---

## Tipps zur parallelen Ausführung

### Empfohlen

1. **API-Verträge zuerst festlegen.** `/plan` vor dem Starten von Implementierungsagenten ausführen, damit Frontend- und Backend-Agenten über Endpunkte, Anfrage-/Antwort-Schemata und Fehlerformate einig sind.

2. **Eine Sitzungs-ID pro Feature verwenden.** Dies hält Agentenausgaben gruppiert und die Dashboard-Überwachung kohärent.

3. **Separate Workspaces zuweisen.** Immer `-w` verwenden, um Agenten zu isolieren:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **Aktiv überwachen.** Ein Dashboard-Terminal öffnen, um Probleme frühzeitig zu erkennen — ein fehlgeschlagener Agent verschwendet Züge, wenn er nicht schnell erkannt wird.

5. **QA nach der Implementierung ausführen.** Den QA-Agenten sequenziell nach Abschluss aller Implementierungsagenten starten:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent spawn qa "Review all changes" session-01
   ```

6. **Mit Re-Spawns iterieren.** Wenn die Ausgabe eines Agenten Verfeinerung braucht, den Agenten mit der ursprünglichen Aufgabe plus Korrekturkontext erneut starten. Keine neue Sitzung beginnen.

7. **Mit `/work` beginnen, wenn unsicher.** Der Work-Workflow führt Sie schrittweise durch den Prozess mit Benutzerbestätigung an jedem Gate.

### Nicht empfohlen

1. **Keine Agenten im selben Workspace starten.** Zwei Agenten, die in dasselbe Verzeichnis schreiben, erzeugen Merge-Konflikte und überschreiben gegenseitig ihre Arbeit.

2. **MAX_PARALLEL (Standard 3) nicht überschreiten.** Mehr gleichzeitige Agenten bedeuten nicht immer schnellere Ergebnisse. Jeder Agent benötigt Memory- und CPU-Ressourcen. Der Standard von 3 ist für die meisten Systeme optimiert.

3. **Den Planungsschritt nicht überspringen.** Agenten ohne Plan zu starten führt zu nicht abgestimmten Implementierungen — das Frontend baut gegen eine API-Form, während das Backend eine andere baut.

4. **Fehlgeschlagene Agenten nicht ignorieren.** Die Arbeit eines fehlgeschlagenen Agenten ist unvollständig. Die strukturierte Ergebnisdeklaration (Claim) oder die run-bezogene Ergebnisdatei auf den Fehlgrund prüfen, den Prompt korrigieren und erneut starten.

5. **Sitzungs-IDs für verwandte Arbeit nicht mischen.** Wenn Backend- und Frontend-Agenten am selben Feature arbeiten, müssen sie eine Sitzungs-ID teilen, damit der Orchestrator sie koordinieren kann.

---

## Durchgängiges Beispiel

Ein vollständiger paralleler Ausführungsworkflow zum Erstellen eines Benutzerauthentifizierungs-Features:

```bash
# Step 1: Plan the feature
# (In your AI IDE, run /plan or describe the feature)
# This creates .agents/results/plan-{sessionId}.json with task breakdown

# Step 2: Spawn implementation agents in parallel
oma agent spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use Argon2id for password hashing. Follow the API contract in .agents/results/api-contracts/" session-auth-01 -w ./apps/api &
oma agent spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Step 3: Monitor in a separate terminal
# Terminal 2:
oma dashboard terminal

# Step 4: Wait for all implementation agents
wait

# Step 5: Run QA review
oma agent spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Step 6: If QA finds issues, re-spawn specific agents with fixes
oma agent spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Step 7: Re-run QA to verify fixes
oma agent spawn qa "Re-review backend auth after fixes." session-auth-01
```
