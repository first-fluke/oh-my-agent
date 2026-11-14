---
title: Eine Admin-UI an ihren tatsächlichen Aufgaben ausrichten
description: Legen Sie Hierarchie, Tabellendichte, Zustände und die Design-Übergabe eines Admin-Bildschirms fest und behalten Sie Stack und visuellen Vertrag des Projekts.
---

# Eine Admin-UI an ihren tatsächlichen Aufgaben ausrichten

Verwenden Sie `oma-design`, um zu entscheiden, wie ein Admin-Bildschirm seine Benutzer unterstützen soll, bevor Sie Anwendungscode ändern.

## Den Skill laden

Bitten Sie Ihren Coding-Agenten, diesen Befehl auszuführen und die zurückgegebenen Anweisungen sowie das Support-Verzeichnis zu lesen:

```bash
bunx skills use first-fluke/oh-my-agent@oma-design
```

## Die Eingabe bereitstellen

- Einen laufenden Bildschirm, Screenshots oder die relevanten Komponenten.
- Wer den Bildschirm nutzt und welche Aktionen diese Personen abschließen müssen.
- Vorhandene `DESIGN.md`, Tokens, Komponenten, Sprachen und Anforderungen an Responsivität und Barrierefreiheit.

## Die Aufgabe stellen

```text
Use oma-design to define the direction for our customer-support admin.
Support agents triage a ticket table, filter by status and assignee, and open
ticket details in a drawer. Keep our React stack, existing component primitives,
brand palette, and Korean/English content. Cover loading, empty, error, keyboard
focus, and narrow-screen states. Return layout decisions and a semantic-token
handoff. Update DESIGN.md if the visual system changes. Do not edit application
code or install packages.
```

## Das Ergebnis prüfen

Erwarten Sie bildschirmspezifische Entscheidungen zu Hierarchie und Dichte, das Verhalten der Zustände, die Zuordnung semantischer Tokens und eine Übergabe für die Implementierung. Angenommene Änderungen am System gehören in die kanonische `DESIGN.md` des Projekts.

Prüfen Sie den Vorschlag an der Triage-Aufgabe: Kann eine Person das nächste Ticket erkennen, Filter ändern, Details öffnen und sich von Fehlern erholen? Prüfen Sie Tastaturfokus, lesbaren koreanischen und englischen Text und das Verhalten auf schmalen Bildschirmen, wenn ein gerendertes Exemplar vorliegt. Eine reine Dokumentübergabe lässt die Ausführung im Browser und die Barrierefreiheit ungeprüft.

## Abhängigkeiten und nächster Schritt

Für eine neue Richtung einer Admin- oder Produktoberfläche wählt der [Routing-Vertrag](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/.agents/skills/oma-design/resources/external-design-skills.md) Interface Design. Kritik, Audit und Feinschliff einer bestehenden UI wählen Impeccable; andere Web-Art-Direction verwendet Taste. Für die aktuelle Operation wird ein Lieferant geladen.

Diese externen Anweisungen können eigene Downloads oder Laufzeitwerkzeuge brauchen. Der vorhandene Stack, die Marke, die CJK-Abdeckung, das WCAG-Ziel und die Anforderungen an reduzierte Bewegung bleiben Einschränkungen. Das Laden der Anweisungen rendert die UI nicht und prüft sie nicht.

Verwenden Sie für die Implementierung den Frontend-Spezialisten des Projekts. Für Projekt-Hooks und Workflows [wählen Sie eine Laufzeiteinrichtung](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset), die `oma-design` enthält.
