---
title: Warum oh-my-agent
description: Entscheiden Sie sich für oh-my-agent, wenn Ihr Repository eigene Agenten-Skills, Workflows, Multi-Vendor-Dispatch und ausdrückliche Verifikation braucht.
---

# Warum oh-my-agent

oh-my-agent ergänzt die Agenten-CLIs Ihres Teams um eine vom Repository verwaltete Ebene. Im Verzeichnis `.agents/` liegen [Skills](./glossary.md#skill), [Workflows](./glossary.md#workflow), [Agentendefinitionen](./glossary.md#agent-definition), Regeln und die Modellkonfiguration. Vendor-native Dateien werden aus dieser [Wahrheitsquelle](./glossary.md#ssot) erzeugt. Dadurch kann das Projektverhalten gemeinsam geprüft und geändert werden.

## Wählen Sie es, wenn das Repository die Koordinationsebene braucht

OMA passt gut, wenn Sie mindestens eines dieser Ziele haben:

- **Mehrere Agenten-Hosts oder Vendors.** `model_preset: auto` verwendet die native Konfiguration der aktuellen Laufzeit. Feste und benutzerdefinierte Presets können Rollen an andere Vendors weiterleiten; `oma agent spawn` übernimmt nicht nativen Dispatch.
- **Einen wiederholbaren Team-Workflow.** `/work` bearbeitet eine abgegrenzte Aufgabe, `/orchestrate` koordiniert delegierte Arbeit, `/ultrawork` führt parallele Arbeit mit Review-Schritten aus und `/ralph` wiederholt eine Aufgabe mit einer ausdrücklichen Judge-Phase.
- **Vom Repository verwaltete Anweisungen.** Skills, Workflows, Regeln und Agentendefinitionen liegen neben dem Code. `oma link` überträgt die ausgewählten Dateien in unterstützte Vendor-Formate.
- **Mechanische Prüfungen und dauerhafte Ergebnisse.** Agentenläufe können strukturierte Status- und Ergebnisaufzeichnungen schreiben, während `oma verify agent <agent-type>` und `oma docs verify` ausdrückliche Prüfungen bereitstellen.

Wenn ein Projekt nur einen Host verwendet und keine gemeinsamen Skills, Workflows oder Vendor-Routen benötigt, rechtfertigen die zusätzlichen `.agents/`-Dateien und CLI-Befehle den Einrichtungsaufwand möglicherweise nicht. OMA ist eine Koordinationsebene. Es ersetzt weder das Modell des Hosts noch den Editor oder die projektspezifischen Akzeptanzkriterien.

## Verifikation ist ein Befehl, den Sie auswählen

Führen Sie `oma verify agent <agent-type> --workspace <path>` aus, wenn Sie die Prüfungen für eine Backend-, Frontend-, Mobile-, QA-, Debug- oder Planungsrolle benötigen. Der Verifizierer verbindet statische Inspektionen mit konfigurierten Befehlen wie Tests, Typprüfungen, SQL-Prüfungen oder `flutter analyze`. Einzelheiten stehen in [`cli/commands/verify/report.ts`](https://github.com/first-fluke/oh-my-agent/blob/main/cli/commands/verify/report.ts). Der Bericht zeigt das Ergebnis jeder Prüfung. Bestehende Prüfungen beweisen allein nicht, dass ein Feature seine Produkt- oder Domänenanforderungen erfüllt; die Akzeptanzkriterien der Aufgabe müssen weiterhin geprüft werden.

`/ralph` fügt eine eigene [Judge](./glossary.md#judge)-Phase hinzu, wenn Sie diesen Workflow auswählen. Er prüft die erklärten Kriterien über mehrere Iterationen erneut und zeichnet die Workflow-Artefakte auf. Er ist kein Gate, das bei jeder gewöhnlichen Eingabe ausgeführt wird. Auch das Laden eines Skills startet nicht automatisch jeden Workflow oder jeden Verifikationsbefehl.

## Dispatch bleibt sichtbar

`oma doctor --profile` zeigt den aufgelösten Vendor und das Modell für jede Dispatch-Rolle. `oma agent spawn <agent-id> <prompt> <session-id>` ist der ausdrückliche CLI-Weg, wenn eine Rolle nicht vom aktuellen Host behandelt wird. Die Regeln für die Modellauflösung und das Verhalten der Provider sind unter [Wichtige Standardwerte](./important-defaults.md) und [Modelle pro Agent](../guide/per-agent-models.md) dokumentiert.

Hooks können einen Workflow nur aktivieren, wenn die entsprechende Host-Integration eingeschaltet ist. Native Skill-Routen werden vom Host ausgeführt; Workflow-Routen folgen dem ausgewählten Workflow oder Hook. Eine einfache Eingabe garantiert daher nicht, dass ein bestimmter Skill oder ein bestimmtes Gate läuft.

Optionale Koordinationsgrenzen sind in der [Session-Quota-Grenze](../guide/configuration-reference.md#session-quota-caps), der [Retry- und Exploration-Schleife von `/orchestrate`](../core-concepts/workflows.md#orchestrate) und der [Workspace-Zuweisung](../core-concepts/parallel-execution.md#workspace-aware-pattern) beschrieben.

## Der praktische Kompromiss

OMA gibt einem Team einen gemeinsamen Ort für Routing, Ausführungsschritte, Prüfungen und Ausgabedateien. Dafür muss das Team diese Repository-Konfiguration aktuell halten und entscheiden, welche Workflows oder Verifikationsbefehle zu seinem Akzeptanzvertrag gehören. Dieser Kompromiss ist sinnvoll, wenn Konsistenz zwischen Mitwirkenden wichtiger ist als die kleinstmögliche Installation.

Die ursprüngliche Diskussion zur Positionierung finden Sie in [Issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589).

## Nächste Schritte

- [Schnellstart](./quick-start.md): installieren, die Einrichtung prüfen und eine abgegrenzte Aufgabe ausführen
- [Wichtige Standardwerte](./important-defaults.md): was der Installer aktiviert und wie Sie es ändern
- [Installation](./installation.md#presets): ein Skill-Preset wählen, das die geplanten Workflows abdeckt
- [Workflows](../core-concepts/workflows.md): wann Sie `/work`, `/orchestrate`, `/ultrawork` und `/ralph` verwenden
- [Fehlerbehebung](../guide/troubleshooting.md): Lösungen für Probleme mit Installation, Vendors und Hooks
