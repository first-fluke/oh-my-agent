---
title: Schnellstart
description: Eine abgegrenzte Aufgabe von der Installation bis zur Verifizierung ausführen, mit erwarteter Ausgabe und Wiederherstellung.
---

# Schnellstart

Verwenden Sie diese Seite, um eine kleine Aufgabe auszuführen und ein konkretes Ergebnis festzuhalten. Sie benötigen ein Projektverzeichnis und mindestens eine unterstützte KI-CLI oder IDE. Der Installer kann `bun`, `uv`, Serena und CUE unter macOS, Linux oder Windows einrichten. Für den ersten Prompt ist die ausgewählte Host-Integration erforderlich; Provider- und Browser-Integrationen sind optional.

## 1. Installieren

### Schnellster Weg — Skills in Ihre Agenten

```bash
npx skills add first-fluke/oh-my-agent
```

Dadurch wird das OMA-Skill-Paket in die erkannten Agent-Laufzeiten installiert (Claude Code, Cursor, Codex und weitere). Skills bringen dem Agenten bei, wie er arbeiten soll. Für Stop-Hook-Gates, Artefaktverifizierung, unabhängige Judges und die `oma`-CLI installieren Sie unten das vollständige Harness.

Reine Skill-Installationen stellen die `oma`-CLI, Hooks, Workflows und Judges nicht bereit. Verwenden Sie für die erste Aufgabe unten einen benannten, installierten Skill; verwenden Sie das vollständige Harness, wenn Sie die CLI-Prüfungen benötigen.

### Vollständiges Harness (Gates, Hooks, CLI)

Führen Sie aus dem Projektverzeichnis den Bootstrap-Installer aus:

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Führen Sie unter Windows PowerShell Folgendes aus:

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Die interaktive Einrichtung fragt nach Antwortsprache, CLI-Vendoren, Fähigkeits-Providern, dem Modell-Preset, dem Projekt-Skill-Preset und einer Stack-Variante. Verwenden Sie beim ersten Lauf die Standardwerte, wählen Sie den Vendor, den Sie bereits nutzen, und wählen Sie das Projekt-Preset, das dem Repository am nächsten kommt.

Wenn `bun` bereits installiert ist, verwenden Sie den Installer direkt:

```bash
bunx oh-my-agent@latest
```

Die Bootstrap-Skripte installieren OMA im aktuellen Projekt. Verwenden Sie `oma install --global` für eine Installation auf HOME-Ebene; lesen Sie [Installation](./installation.md), bevor Sie Projekt- und globale Installationen mischen.

## 2. Ergebnis prüfen (nur vollständiges Harness)

Wenn Sie das vollständige Harness installiert haben, führen Sie die Gesundheitsprüfung aus demselben Projektverzeichnis aus:

```bash
oma doctor
```

Der Textbefehl gibt einen Bericht mit Abschnitten wie `CLI Status` und `Skills Status` aus und liefert anschließend den Shell-Status zurück. Die genauen Zeilen hängen von den im Projekt installierten Hosts ab:

```text
┌   🩺 oh-my-agent doctor
◇  CLI Status ...
◇  Skills Status ...
$ echo $?
0
```

Optionale MCP-, Browser-, Memory- oder Code-Intelligence-Integrationen können als Warnungen erscheinen; sie werden nur für Aufgaben benötigt, die sie verwenden. Für einen maschinenlesbaren Status liefert `oma doctor --json` einen Status ungleich null, wenn der Bericht Probleme enthält. Mit `oma doctor --profile` sehen Sie das aufgelöste Modell und die CLI für jede kanonische Agentenrolle.

Wenn `oma` nicht verfügbar, Bun aber installiert ist, führen Sie dieselbe Prüfung ohne den globalen Befehl aus:

```bash
bunx oh-my-agent@latest doctor
```

Fehlt der Befehl `oma` selbst weiterhin, öffnen Sie eine neue Shell oder fügen Sie das Bin-Verzeichnis des Paketmanagers Ihrem `PATH` hinzu. Meldet `oma doctor` eine ungültige Konfiguration, korrigieren Sie das genannte Feld und führen Sie den Befehl erneut aus. Löschen Sie `.agents/oma-config.yaml` nicht zur Wiederherstellung: Diese benutzereigene Konfiguration bewahrt Ihre Einstellungen über Updates hinweg.

Wenn Sie nur Skills installiert haben, überspringen Sie diese CLI-Prüfung und fahren Sie mit der Aufgabe mit benanntem Skill weiter unten fort.

## 3. Eine kleine Aufgabe ausführen

Öffnen Sie das Repository im konfigurierten KI-Tool und fordern Sie einen benannten Skill und ein in sich geschlossenes Ergebnis an:

```text
Use the discovered `oma-docs` skill to check one existing link in this project's README. If it is stale, update only that link. Done when you report the inspected target, the exact verification command, and its exit status.
```

Der Host sollte den ausgewählten Skill identifizieren, ein Ziel prüfen und entweder eine gezielte Änderung des Links oder die Feststellung melden, dass der Link bereits gültig ist. Für jede tatsächlich ausgeführte Prüfung gehören Befehlsausgabe und Exit-Status in den Bericht. Eine reine Skill-Installation fügt `/debug`, `/ralph`, Hooks und Workflow-Gates nicht hinzu; die Anforderung des benannten Skills hält diese erste Aufgabe im Rahmen der installierten Fähigkeiten.

Wenn der Keyword-Hook für den ausgewählten Host aktiviert ist, kann er einen passenden Workflow starten. Das Skill-Routing erfolgt durch den Host oder den ausgewählten Workflow. Ein beliebiger Host-Prompt garantiert daher keinen Hook, keinen bestimmten Skill und keinen `CHARTER_CHECK`. Der Ausführungsvertrag sollte trotzdem die Repository-Konventionen prüfen, nur die abgegrenzte Änderung vornehmen und die Verifizierung melden. Die konkreten Dateien und Befehle hängen vom Projekt ab.

Für eine Aufgabe, die API- und UI-Grenzen überschreitet, wählen Sie ausdrücklich `/work` oder `/orchestrate`. Für eine einzelne Domäne fahren Sie mit [Ausführung eines einzelnen Skills](../guide/single-skill.md) fort. Der [Nutzungsleitfaden](../guide/usage.md) enthält längere Beispiele.

## 4. Vor der Skalierung die Standardwerte kennen

OMA startet mit `model_preset: auto`, Serena für Code-Intelligence, Agent Memory für semantischen Speicher, nativer Websuche und deaktivierter Telemetrie. Serena verwendet den gemeinsamen `bridge`-Transport und aktualisiert sich automatisch, sofern dies nicht anders konfiguriert ist. Browser-DevTools-MCP ist Opt-in; eine neue interaktive Einrichtung bietet zuerst Aside an. Unter [Wichtige Standardwerte](./important-defaults.md) finden Sie die Auswirkungen und Schlüssel zum Überschreiben.

Wenn eine verwaltete Aufgabe hängen bleibt, beginnen Sie mit `oma agent status <session-id> [agent-id]`. Prüfen Sie dann den Ausführungsbeleg (Receipt) unter `.agents/state/agent-runs/` und den Pfad der injizierten strukturierten Ergebnisdeklaration (Claim). Diese Aufzeichnungen enthalten Lauf, Aufgabe, Workspace, Exit-Code und Verifizierungsstatus. Menschenlesbare `result-*.md`- und `progress-*.md`-Dateien unter `.agents/state/memories/` liefern zusätzliche Informationen, sofern vorhanden. Führen Sie nur den kleinsten fehlgeschlagenen Befehl erneut aus, nachdem Sie bestätigt haben, dass der Lauf nicht mehr aktiv ist. Ein persistenter Workflow bleibt aktiv, bis er abgeschlossen ist oder Sie `workflow done` sagen; zur Wiederherstellung der Zustandsdatei siehe [Workflows](../core-concepts/workflows.md#persistent-mode-mechanics).

## Nächste Schritte

- [Wichtige Standardwerte](./important-defaults.md) für Vorrangregeln, Provider und Wiederherstellungsentscheidungen
- [Installation](./installation.md) für Presets, Vendor-Einrichtung, globale Installationen und Updates
- [Agenten](../core-concepts/agents.md) für die 33 Skill-Pakete und Dispatch-Rollen
- [Workflows](../core-concepts/workflows.md) für Planung, parallele Ausführung, QA und persistente Modi
