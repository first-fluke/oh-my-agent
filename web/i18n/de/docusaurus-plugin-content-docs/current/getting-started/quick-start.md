---
title: Schnellstart
description: Eine abgegrenzte Aufgabe von der Installation bis zur Verifizierung ausführen, mit erwarteter Ausgabe und Wiederherstellung.
---

# Schnellstart

Verwenden Sie eine fokussierte Aufgabe, um das Ergebnis zu prüfen. Laden Sie einen Skill in dem Coding-Agenten, den Sie bereits nutzen, oder installieren Sie die Laufzeit, wenn Sie Projekt-Hooks, Spezialisten-Agenten und Workflows brauchen. [Setup wählen](./choose-setup.md) erklärt die verfügbaren Wege und ihre Abhängigkeiten.

## 1. Setup wählen {#1-install}

Bitten Sie Ihren Agenten für die schreibgeschützte Git-Aufgabe unten, den Skill zu laden und dessen Anweisungen und Support-Verzeichnis zu lesen:

```bash
bunx skills use first-fluke/oh-my-agent@oma-scm
```

Fahren Sie mit der Aufgabe in Schritt 3 fort. Die CLI-Operationen des Skills, andere Skills, Projektregeln und externe Dienste bleiben eigenständige Abhängigkeiten. Das Laden dieses Skills führt den OMA-Installer nicht aus.

### Laufzeit bei Bedarf installieren

Der Laufzeit-Bootstrap kann `bun`, `uv`, Serena, CUE und den globalen Befehl `oma` einrichten. Wählen Sie die KI-CLI oder IDE, die Sie bereits nutzen; Provider- und Browser-Integrationen hängen von den Aufgaben ab, die Sie ausführen möchten.

Führen Sie aus dem Projektverzeichnis den Bootstrap-Installer aus:

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Führen Sie unter Windows PowerShell Folgendes aus:

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Die Einrichtung behält eine vorhandene Antwortsprache bei oder erkennt die Systemsprache automatisch. Die interaktive Einrichtung fragt nach CLI-Vendoren, [Fähigkeits-Providern](./glossary.md#capability-provider), dem [Modell-Preset](./glossary.md#model-preset), dem Projekt-[Skill-Preset](./glossary.md#skill-preset) und einer Stack-Variante. Verwenden Sie beim ersten Lauf die Standardwerte, wählen Sie den Vendor, den Sie bereits nutzen, und wählen Sie das Projekt-Preset, das dem Repository am nächsten kommt. Unter [Presets](./installation.md#presets) finden Sie die Skills jedes Presets sowie [Workflows, die Skills außerhalb eines Presets benötigen](./installation.md#workflows-that-need-skills-outside-a-preset).

Wenn `bun` bereits installiert ist, verwenden Sie den Installer direkt:

```bash
bunx oh-my-agent@latest
```

Die Bootstrap-Skripte installieren OMA im aktuellen Projekt. Verwenden Sie `oma install --global` für eine Installation auf HOME-Ebene; lesen Sie [Globale Installation](../guide/global-install.md), bevor Sie Projekt- und globale Installationen mischen.

## 2. Ergebnis prüfen

Bestätigen Sie beim temporären Laden eines Skills, dass der Agent die ausgewählten Anweisungen gelesen hat, und prüfen Sie die Aufgabe selbst. Führen Sie bei einer Laufzeitinstallation die Gesundheitsprüfung aus demselben Projektverzeichnis aus:

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

`oma doctor` kann Probleme mit optionalen Integrationen als Warnungen melden. Die standardmäßige Vorbereitung von AgentMemory wird während `oma install` und `oma update` geprüft; Fehler bei Installation, Start oder Health-Check brechen diese Befehle ab. Wenn Sie `providers.semantic_memory: none` oder `honcho` auswählen oder `OMA_NO_AGENTMEMORY=1` setzen, wird diese Vorbereitung übersprungen.

Für einen maschinenlesbaren Status liefert `oma doctor --json` einen Status ungleich null, wenn der Bericht Probleme enthält. Mit `oma doctor --profile` sehen Sie das aufgelöste Modell und die CLI für jede kanonische Agentenrolle.

Wenn `oma` nicht verfügbar, Bun aber installiert ist, führen Sie dieselbe Prüfung ohne den globalen Befehl aus:

```bash
bunx oh-my-agent@latest doctor
```

Fehlt der Befehl `oma` selbst weiterhin, öffnen Sie eine neue Shell oder fügen Sie das Bin-Verzeichnis des Paketmanagers Ihrem `PATH` hinzu; unter [Installation](./installation.md#method-3-global-install) erfahren Sie, wie Sie den Befehl `oma` installieren. Meldet `oma doctor` eine ungültige Konfiguration, korrigieren Sie das genannte Feld und führen Sie den Befehl erneut aus. Löschen Sie `.agents/oma-config.yaml` nicht zur Wiederherstellung: Diese benutzereigene Konfiguration bewahrt Ihre Einstellungen über Updates hinweg.

## 3. Eine kleine Aufgabe ausführen

Öffnen Sie ein bestehendes Git-Repository in Ihrem KI-Tool. Verwenden Sie den geladenen Skill `oma-scm` oder die Kopie, die ein benanntes Laufzeit-Preset installiert hat. Wenn Sie die benutzerdefinierte Auswahl (Custom) verwendet haben, nehmen Sie `oma-scm` für dieses Beispiel hinzu:

```text
Use oma-scm to inspect this repository's current branch and working tree. Do not edit, stage, commit, or contact remotes. Report staged, unstaged, and untracked changes, with the Git commands and exit statuses actually observed.
```

Vergleichen Sie den gemeldeten Branch und die gemeldeten Änderungen mit der tatsächlichen Git-Ausgabe. Der Agent sollte melden, welche Befehle liefen und mit welchem Exit-Status. Diese schreibgeschützte Aufgabe braucht weder Code-Test noch Build.

Ein einfacher Prompt startet keinen Workflow; wo der Prompt-Hook aktiviert ist, ergänzt er einen unverbindlichen Skill-Hinweis. Das Skill-Routing erfolgt durch den Host oder den ausgewählten Workflow. Ein beliebiger Host-Prompt garantiert daher keinen Hook und keinen bestimmten Skill. Der Ausführungsvertrag sollte trotzdem die Repository-Konventionen prüfen, den angeforderten schreibgeschützten Umfang einhalten und die beobachteten Prüfungen melden. Die konkreten Dateien und Befehle hängen vom Projekt ab.

Für eine Aufgabe, die API- und UI-Grenzen überschreitet, wählen Sie ausdrücklich `/work` oder `/orchestrate`. Für eine einzelne Domäne fahren Sie mit [Ausführung eines einzelnen Skills](../guide/single-skill.md) fort. Der [Nutzungsleitfaden](../guide/usage.md) enthält längere Beispiele.

## 4. Vor der Skalierung die Laufzeit-Standardwerte kennen

Temporäres Laden eines Skills konfiguriert diese Laufzeit-Standardwerte nicht. Für Projekt-Hooks, Provider-Einrichtung oder Team-Workflows verwenden Sie den Laufzeitweg unter [Setup wählen](./choose-setup.md).

OMA startet mit `model_preset: auto`, Serena für Code-Intelligence, Agent Memory für semantischen Speicher, nativer Websuche und deaktivierter Telemetrie. Serena verwendet den gemeinsamen `bridge`-Transport und aktualisiert sich automatisch, sofern dies nicht anders konfiguriert ist. Browser-DevTools-MCP ist Opt-in; eine neue interaktive Einrichtung bietet zuerst Aside an. Unter [Wichtige Standardwerte](./important-defaults.md) finden Sie die Auswirkungen und Schlüssel zum Überschreiben.

Wenn eine verwaltete Aufgabe hängen bleibt, beginnen Sie mit `oma agent status <session-id> [agent-id]`. Prüfen Sie dann den Ausführungsbeleg (Receipt) unter `.agents/state/agent-runs/` und den Pfad der injizierten strukturierten Ergebnisdeklaration (Claim). Diese Aufzeichnungen enthalten Lauf, Aufgabe, Workspace, Exit-Code und Verifizierungsstatus. Menschenlesbare `result-*.md`- und `progress-*.md`-Dateien unter `.agents/state/memories/` liefern zusätzliche Informationen, sofern vorhanden. Führen Sie nur den kleinsten fehlgeschlagenen Befehl erneut aus, nachdem Sie bestätigt haben, dass der Lauf nicht mehr aktiv ist. Ein [persistenter Workflow](./glossary.md#persistent-workflow) bleibt aktiv, bis er abgeschlossen ist oder Sie `workflow done` sagen; zur Wiederherstellung der Zustandsdatei siehe [Workflows](../core-concepts/workflows.md#persistent-mode-mechanics).

## Nächste Schritte

- [Setup wählen](./choose-setup.md) für einen einzelnen Skill, ein Laufzeit-Preset oder das Claude-Code-Plugin
- [Wichtige Standardwerte](./important-defaults.md) für Vorrangregeln, Provider und Wiederherstellungsentscheidungen
- [Installation](./installation.md) für Presets, Vendor-Einrichtung, globale Installationen und Updates
- [Agenten](../core-concepts/agents.md) für die 33 Skill-Pakete und Dispatch-Rollen
- [Workflows](../core-concepts/workflows.md) für Planung, parallele Ausführung, QA und persistente Modi
- [Fehlerbehebung](../guide/troubleshooting.md), wenn sich die Installation, ein Vendor oder ein Hook nicht wie erwartet verhält
